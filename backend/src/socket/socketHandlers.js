const Presentation = require('../models/Presentation');
const Slide = require('../models/Slide');
const Response = require('../models/Response');
const Logger = require('../utils/logger');
const { getHandler } = require('../interactions');
const {
  handleOpenEndedSubmission,
  attachOpenEndedVotingHandlers
} = require('./openEnded');
const {
  initializeSession: initializeQnaSession,
  submitQuestion: submitQnaQuestion,
  markAnswered: markQnaAnswered,
  clearQuestions: clearQnaQuestions,
  getState: getQnaState,
  updateSettings: updateQnaSettings,
  setActiveQuestion: setQnaActiveQuestion
} = require('../services/qnaSession');
const {
  initializeSession: initializeGuessSession,
  submitGuess,
  getState: getGuessState,
  clearResponses: clearGuessResponses
} = require('../services/guessNumberSession');
const {
  attachQuizHandlers
} = require('./quizHandlers');
const { checkAudienceLimit } = require('../middleware/checkPlanLimits');

const activePresentations = new Map();

// Track all connected users on the platform (not just in presentations)
let totalPlatformUsers = 0;

function buildSlidePayload(slide) {
  const openEndedSettings = slide.openEndedSettings && typeof slide.openEndedSettings.toObject === 'function'
    ? slide.openEndedSettings.toObject()
    : (slide.openEndedSettings || {});
  const qnaSettings = slide.qnaSettings && typeof slide.qnaSettings.toObject === 'function'
    ? slide.qnaSettings.toObject()
    : (slide.qnaSettings || {});
  let guessNumberSettings = slide.guessNumberSettings && typeof slide.guessNumberSettings.toObject === 'function'
    ? slide.guessNumberSettings.toObject()
    : (slide.guessNumberSettings || {});
  // Ensure guess_number slides always have settings
  if (slide.type === 'guess_number' && (!guessNumberSettings || Object.keys(guessNumberSettings).length === 0)) {
    guessNumberSettings = { minValue: 1, maxValue: 10, correctAnswer: 5 };
  }

  const quizSettings = slide.quizSettings && typeof slide.quizSettings.toObject === 'function'
    ? slide.quizSettings.toObject()
    : (slide.quizSettings || null);
  const leaderboardSettings = slide.leaderboardSettings && typeof slide.leaderboardSettings.toObject === 'function'
    ? slide.leaderboardSettings.toObject()
    : (slide.leaderboardSettings || null);

  return {
    id: slide._id,
    type: slide.type,
    question: slide.question,
    options: slide.options,
    minValue: slide.minValue,
    maxValue: slide.maxValue,
    minLabel: slide.minLabel,
    maxLabel: slide.maxLabel,
    statements: slide.statements,
    rankingItems: slide.rankingItems,
    hundredPointsItems: slide.hundredPointsItems,
    gridItems: slide.gridItems,
    gridAxisXLabel: slide.gridAxisXLabel,
    gridAxisYLabel: slide.gridAxisYLabel,
    gridAxisRange: slide.gridAxisRange,
    maxWordsPerParticipant: slide.maxWordsPerParticipant,
    openEndedSettings,
    qnaSettings,
    guessNumberSettings,
    pinOnImageSettings: slide.pinOnImageSettings,
    quizSettings,
    leaderboardSettings,
    // Fields for "Bring Your Slides In" slide types
    miroUrl: slide.miroUrl,
    powerpointUrl: slide.powerpointUrl,
    powerpointPublicId: slide.powerpointPublicId,
    googleSlidesUrl: slide.googleSlidesUrl,
    uploadedFileUrl: slide.uploadedFileUrl,
    uploadedFilePublicId: slide.uploadedFilePublicId,
    uploadedFileName: slide.uploadedFileName
  };
}

function buildQnaPayload(slideId) {
  const state = getQnaState(slideId) || { allowMultiple: false, questions: [] };
  return {
    slideId,
    allowMultiple: Boolean(state.allowMultiple),
    questions: Array.isArray(state.questions) ? state.questions : [],
    activeQuestionId: state.activeQuestionId || null
  };
}

function emitQnaState({ io, presentationId, slideId }) {
  const payload = buildQnaPayload(slideId);
  io.to(`presentation-${presentationId}`).emit('qna-updated', payload);
  io.to(`presenter-${presentationId}`).emit('qna-updated', payload);
}

function buildResultsPayload(slide, responses) {
  const openEndedSettings = slide.openEndedSettings && typeof slide.openEndedSettings.toObject === 'function'
    ? slide.openEndedSettings.toObject()
    : (slide.openEndedSettings || {});
  const qnaSettings = slide.qnaSettings && typeof slide.qnaSettings.toObject === 'function'
    ? slide.qnaSettings.toObject()
    : (slide.qnaSettings || {});

  const payload = { totalResponses: responses.length };
  const handler = getHandler(slide.type);
  if (handler && typeof handler.buildResults === 'function') {
    Object.assign(
      payload,
      handler.buildResults(slide, responses, {
        openEndedSettings,
        qnaSettings
      })
    );
  }
  return payload;
}

const setupSocketHandlers = (io, socket) => {
  // Increment count when any user connects to the platform
  totalPlatformUsers++;
  // Emit updated total to all clients in the landing page room
  io.to('landing-page').emit('platform-users-updated', { count: totalPlatformUsers });

  // Handle user authentication and join user-specific room for plan updates
  socket.on('authenticate-user', ({ userId }) => {
    if (userId) {
      socket.join(`user-${userId}`);
      Logger.debug(`User ${userId} joined their notification room`);
    }
  });

  // Presenter starts presentation
  socket.on('start-presentation', async ({ presentationId, userId, startIndex }) => {
    try {
      const presentation = await Presentation.findOne({ _id: presentationId, userId });

      if (!presentation) {
        socket.emit('error', { message: 'Presentation not found' });
        return;
      }

      const slides = await Slide.find({ presentationId }).sort({ order: 1 });

      if (!slides.length) {
        socket.emit('error', { message: 'No slides available to present' });
        return;
      }

      let sanitizedIndex = parseInt(startIndex, 10);
      if (Number.isNaN(sanitizedIndex)) {
        sanitizedIndex = 0;
      }

      if (sanitizedIndex < 0 || sanitizedIndex >= slides.length) {
        sanitizedIndex = 0;
      }

      // Update presentation to live
      presentation.isLive = true;
      presentation.currentSlideIndex = sanitizedIndex;
      await presentation.save();
      // Join presentation room
      socket.join(`presentation-${presentationId}`);
      socket.join(`presenter-${presentationId}`);

      // Store presenter socket
      const presentationKey = presentation._id.toString();
      let activePresentationEntry = activePresentations.get(presentationKey);

      if (!activePresentationEntry) {
        activePresentationEntry = {
          presenterSocket: socket.id,
          participants: new Map()
        };
        activePresentations.set(presentationKey, activePresentationEntry);
      } else {
        activePresentationEntry.presenterSocket = socket.id;
        if (!activePresentationEntry.participants) {
          activePresentationEntry.participants = new Map();
        }
      }

      const roomName = `presentation-${presentationId}`;
      const presentationRoom = io.sockets.adapter.rooms.get(roomName);
      const updatedParticipants = new Map();

      if (presentationRoom) {
        presentationRoom.forEach(socketId => {
          if (socketId !== socket.id && activePresentationEntry.participants.has(socketId)) {
            // Preserve existing participant names when rebuilding the map
            updatedParticipants.set(socketId, activePresentationEntry.participants.get(socketId));
          }
        });
      }

      activePresentationEntry.participants = updatedParticipants;

      const participantCount = activePresentationEntry.participants.size;

      const currentSlide = slides[sanitizedIndex];

      socket.emit('presentation-started', {
        presentation: {
          id: presentation._id,
          title: presentation.title,
          accessCode: presentation.accessCode,
          isLive: presentation.isLive,
          currentSlideIndex: presentation.currentSlideIndex
        },
        slides: slides.map(s => ({
          id: s._id,
          type: s.type,
          question: s.question,
          options: s.options,
          minValue: s.minValue,
          maxValue: s.maxValue,
          minLabel: s.minLabel,
          maxLabel: s.maxLabel,
          statements: s.statements,
          rankingItems: s.rankingItems,
          gridItems: s.gridItems,
          gridAxisXLabel: s.gridAxisXLabel,
          gridAxisYLabel: s.gridAxisYLabel,
          gridAxisRange: s.gridAxisRange,
          maxWordsPerParticipant: s.maxWordsPerParticipant,
          qnaSettings: s.qnaSettings,
          guessNumberSettings: s.type === 'guess_number'
            ? (s.guessNumberSettings || { minValue: 1, maxValue: 10, correctAnswer: 5 })
            : undefined,
          pinOnImageSettings: s.pinOnImageSettings,
          quizSettings: s.quizSettings,
          // Fields for "Bring Your Slides In" slide types
          miroUrl: s.miroUrl,
          powerpointUrl: s.powerpointUrl,
          powerpointPublicId: s.powerpointPublicId,
          googleSlidesUrl: s.googleSlidesUrl,
          uploadedFileUrl: s.uploadedFileUrl,
          uploadedFilePublicId: s.uploadedFilePublicId,
          uploadedFileName: s.uploadedFileName
        })),
        participantCount
      });

      // Initialize and broadcast existing results for the current slide
      if (currentSlide) {
        if (currentSlide.type === 'qna') {
          initializeQnaSession({
            slideId: currentSlide._id,
            allowMultiple: Boolean(currentSlide.qnaSettings?.allowMultiple)
          });
        }
        const responses = await Response.find({ slideId: currentSlide._id });
        const results = buildResultsPayload(currentSlide, responses);

        const participantPayload = {
          presentation: {
            id: presentation._id,
            title: presentation.title,
            accessCode: presentation.accessCode,
            currentSlideIndex: presentation.currentSlideIndex
          },
          slide: buildSlidePayload(currentSlide),
          slideId: currentSlide._id,
          ...results
        };

        io.to(`presentation-${presentationId}`).emit('presentation-live', participantPayload);

        io.to(`presentation-${presentationId}`).emit('response-updated', {
          slideId: currentSlide._id.toString(),
          ...results
        });

        if (currentSlide.type === 'qna') {
          emitQnaState({ io, presentationId, slideId: currentSlide._id });
        }
      }

      Logger.debug(`Presentation ${presentationId} started`);
    } catch (error) {
      Logger.error('Start presentation error', error);
      socket.emit('error', { message: 'Failed to start presentation' });
    }
  });

  // Presenter changes slide
  socket.on('change-slide', async ({ presentationId, slideIndex }) => {
    try {
      const presentation = await Presentation.findById(presentationId);

      if (!presentation) {
        socket.emit('error', { message: 'Presentation not found' });
        return;
      }

      if (slideIndex < 0 || slideIndex >= presentation.slides?.length) {
        socket.emit('error', { message: 'Invalid slide index' });
        return;
      }

      // Update current slide index
      presentation.currentSlideIndex = slideIndex;
      await presentation.save();

      // Get current slide
      const slides = await Slide.find({ presentationId }).sort({ order: 1 });
      const currentSlide = slides[slideIndex];

      if (currentSlide) {
        if (currentSlide.type === 'qna') {
          initializeQnaSession({
            slideId: currentSlide._id,
            allowMultiple: Boolean(currentSlide.qnaSettings?.allowMultiple)
          });
        }
        // Get current responses for this slide
        const responses = await Response.find({ slideId: currentSlide._id });

        if (currentSlide.type === 'qna') {
          updateQnaSettings({
            slideId: currentSlide._id,
            allowMultiple: Boolean(currentSlide.qnaSettings?.allowMultiple)
          });
        }

        const payload = {
          slide: buildSlidePayload(currentSlide),
          slideIndex: slideIndex,
          ...buildResultsPayload(currentSlide, responses)
        };

        io.to(`presentation-${presentationId}`).emit('slide-changed', payload);

        if (currentSlide.type === 'qna') {
          emitQnaState({ io, presentationId, slideId: currentSlide._id });
        }
      }
    } catch (error) {
      Logger.error('Change slide error', error);
      socket.emit('error', { message: 'Failed to change slide' });
    }
  });

  // Presenter ends presentation
  socket.on('end-presentation', async ({ presentationId }) => {
    try {
      const presentation = await Presentation.findById(presentationId);

      if (presentation) {
        presentation.isLive = false;
        await presentation.save();

        // Notify all participants
        io.to(`presentation-${presentationId}`).emit('presentation-ended');

        // Clean up
        activePresentations.delete(presentationId);
      }

      Logger.debug(`Presentation ${presentationId} ended`);
    } catch (error) {
      Logger.error('End presentation error', error);
    }
  });

  // Participant joins presentation
  socket.on('join-presentation', async ({ accessCode, participantId, participantName }) => {
    try {
      const presentation = await Presentation.findOne({ accessCode });

      if (!presentation) {
        socket.emit('error', { message: 'Presentation not found' });
        return;
      }

      // Always join the room so they can receive presentation-ended events
      socket.join(`presentation-${presentation._id}`);

      const presentationKey = presentation._id.toString();
      let activeEntry = activePresentations.get(presentationKey);
      if (!activeEntry) {
        activeEntry = {
          presenterSocket: null,
          participants: new Map()
        };
        activePresentations.set(presentationKey, activeEntry);
      }

      // Track participant socket and name
      const wasNewParticipant = !activeEntry.participants.has(socket.id);
      activeEntry.participants.set(socket.id, participantName || 'Anonymous');

      if (!presentation.isLive) {
        socket.emit('presentation-not-live', {
          message: 'Presentation is not live yet. Waiting for presenter...'
        });
        return;
      }

      // Check audience limit
      const currentCount = activeEntry.participants.size;
      const canJoin = await checkAudienceLimit(presentation.userId, presentation._id, currentCount);

      if (!canJoin) {
        socket.emit('error', {
          message: 'Session is full. The presenter needs to upgrade their plan to admit more participants.'
        });
        // Remove from participants set since they are rejected
        activeEntry.participants.delete(socket.id);
        socket.leave(`presentation-${presentation._id}`);
        return;
      }

      // Notify presenter about new participant count and names if presenter is connected
      const participantCount = activeEntry.participants.size;
      if (activeEntry.presenterSocket) {
        // Send updated participant list to presenter
        const participantList = Array.from(activeEntry.participants.values());
        io.to(`presenter-${presentationKey}`).emit('participant-list-updated', { 
          participantCount,
          participants: participantList
        });
        
        // Also send the original event for backward compatibility
        io.to(`presenter-${presentationKey}`).emit('participant-joined', { participantCount });
      }

      // Get current slide
      const slides = await Slide.find({ presentationId: presentation._id }).sort({ order: 1 });
      const currentSlide = slides[presentation.currentSlideIndex];

      if (currentSlide) {
        // Get current responses for this slide
        const responses = await Response.find({ slideId: currentSlide._id });

        let participantResponse = null;
        let hasSubmitted = false;

        if (participantId) {
          participantResponse = await Response.findOne({ slideId: currentSlide._id, participantId });

          if (participantResponse) {
            if (currentSlide.type === 'word_cloud') {
              const maxWords = Math.max(1, Number(currentSlide.maxWordsPerParticipant) || 1);
              hasSubmitted = (participantResponse.submissionCount || 0) >= maxWords;
            } else {
              hasSubmitted = true;
            }
          }
        }

        socket.emit('joined-presentation', {
          presentation: {
            id: presentation._id,
            title: presentation.title,
            accessCode: presentation.accessCode,
            currentSlideIndex: presentation.currentSlideIndex
          },
          slide: buildSlidePayload(currentSlide),
          ...buildResultsPayload(currentSlide, responses),
          hasSubmitted,
          participantResponse: participantResponse
            ? {
              answer: participantResponse.answer,
              submissionCount: participantResponse.submissionCount || 0
            }
            : null
        });

        if (currentSlide.type === 'qna') {
          emitQnaState({ io, presentationId: presentation._id, slideId: currentSlide._id });
        }
      }
      Logger.debug(`Participant joined presentation ${presentation._id}`);
    } catch (error) {
      Logger.error('Join presentation error', error);
      socket.emit('error', { message: 'Failed to join presentation' });
    }
  });

  // Join presentation room for results viewing (no authentication required, just viewing results)
  socket.on('join-presentation-results', ({ presentationId }) => {
    if (presentationId) {
      socket.join(`presentation-${presentationId}`);
      Logger.debug(`Socket joined presentation-${presentationId} for results viewing`);
    }
  });

  // Participant submits response
  socket.on('submit-response', async ({ presentationId, slideId, participantId, participantName, answer }) => {
    try {
      const slide = await Slide.findById(slideId);
      if (!slide) {
        Logger.error(`Slide not found: ${slideId}`);
        socket.emit('error', { message: 'Slide not found' });
        return;
      }

      let normalizedAnswer = answer;
      const handler = getHandler(slide.type);
      if (handler && typeof handler.normalizeAnswer === 'function') {
        try {
          normalizedAnswer = handler.normalizeAnswer(answer, slide);
        } catch (err) {
          Logger.error('Normalization error', err);
          socket.emit('error', { message: err.message || 'Invalid answer' });
          return;
        }
      }

      // Check if response already exists
      const existingResponse = await Response.findOne({ participantId, slideId });

      let submissionCount = 1;
      let maxSubmissions = null;

      if (slide.type === 'word_cloud') {
        // For word cloud, allow multiple submissions up to maxWordsPerParticipant
        maxSubmissions = Math.max(1, Number(slide.maxWordsPerParticipant) || 1);

        if (existingResponse) {
          const currentSubmissions = existingResponse.submissionCount || 1;

          if (currentSubmissions >= maxSubmissions) {
            socket.emit('error', { message: `You can only submit ${maxSubmissions} time(s) for this slide` });
            return;
          }

          // Append new words to existing answer
          const existingWords = Array.isArray(existingResponse.answer) ? existingResponse.answer : [existingResponse.answer];
          existingResponse.answer = [...existingWords, ...normalizedAnswer];
          existingResponse.submissionCount = currentSubmissions + 1;
          existingResponse.submittedAt = new Date();
          await existingResponse.save();
          submissionCount = existingResponse.submissionCount;
        } else {
          // Create new response
          const response = new Response({
            presentationId,
            slideId,
            participantId,
            participantName,
            answer: normalizedAnswer,
            submissionCount: 1
          });
          await response.save();
          submissionCount = 1;
        }
      } else if (slide.type === 'open_ended') {
        const submissionResult = await handleOpenEndedSubmission({
          existingResponse,
          presentationId,
          slideId,
          participantId,
          participantName,
          answer: normalizedAnswer
        });

        if (!submissionResult.success) {
          socket.emit('error', { message: submissionResult.error || 'Failed to submit response' });
          return;
        }
      } else {
        // For other types (MCQ, scales), prevent duplicate submissions
        if (existingResponse) {
          socket.emit('error', { message: 'You have already submitted a response for this slide.' });
          return;
        }

        const response = new Response({
          presentationId,
          slideId,
          participantId,
          participantName,
          answer: normalizedAnswer
        });
        await response.save();
      }

      // Get updated responses for this slide
      const responses = await Response.find({ slideId });

      const results = buildResultsPayload(slide, responses);
      
      io.to(`presentation-${presentationId}`).emit('response-updated', {
        slideId: slide._id.toString(),
        ...results
      });

      const responsePayload = {
        success: true,
        slideId,
        slideType: slide.type,
      };

      if (slide.type === 'word_cloud') {
        responsePayload.submissionCount = submissionCount;
        responsePayload.maxSubmissions = maxSubmissions;
      }

      socket.emit('response-submitted', responsePayload);

      Logger.debug(`Response submitted for slide ${slideId}`);
    } catch (error) {
      Logger.error('Submit response error', error);
      socket.emit('error', { message: 'Failed to submit response' });
    }
  });
  attachOpenEndedVotingHandlers({ io, socket, buildResultsPayload });

  socket.on('submit-qna-question', async ({ presentationId, slideId, participantId, participantName, text }) => {
    try {
      const slide = await Slide.findById(slideId);
      if (!slide || slide.type !== 'qna') {
        socket.emit('error', { message: 'Q&A slide not found' });
        return;
      }

      initializeQnaSession({
        slideId: slide._id,
        allowMultiple: Boolean(slide.qnaSettings?.allowMultiple)
      });

      // Create response in DB first
      const response = new Response({
        presentationId,
        slideId: slide._id,
        participantId,
        participantName,
        answer: text,
        isAnswered: false
      });
      await response.save();

      const result = submitQnaQuestion({
        slideId: slide._id,
        participantId,
        participantName,
        text,
        id: response._id.toString()
      });

      if (result.error) {
        await Response.deleteOne({ _id: response._id });
        socket.emit('error', { message: result.error });
        return;
      }

      emitQnaState({ io, presentationId, slideId: slide._id });

      const responses = await Response.find({ slideId: slide._id });
      const results = buildResultsPayload(slide, responses);
      io.to(`presentation-${presentationId}`).emit('response-updated', {
        slideId: slide._id.toString(),
        ...results
      });

      socket.emit('qna-question-submitted', {
        slideId: slide._id,
        questionId: result.question.id
      });
    } catch (error) {
      Logger.error('Submit Q&A question error', error);
      socket.emit('error', { message: 'Failed to submit question' });
    }
  });

  socket.on('mark-qna-answered', async ({ presentationId, slideId, questionId, answered }) => {
    try {
      const slide = await Slide.findById(slideId);
      if (!slide || slide.type !== 'qna') {
        socket.emit('error', { message: 'Q&A slide not found' });
        return;
      }

      await Response.findByIdAndUpdate(questionId, { isAnswered: answered });

      const result = markQnaAnswered({ slideId: slide._id, questionId, answered });
      if (result.error) {
        Logger.warn(`In-memory QnA update failed: ${result.error}`);
      }

      emitQnaState({ io, presentationId, slideId: slide._id });

      const responses = await Response.find({ slideId: slide._id });
      const results = buildResultsPayload(slide, responses);
      io.to(`presentation-${presentationId}`).emit('response-updated', {
        slideId: slide._id.toString(),
        ...results
      });
    } catch (error) {
      Logger.error('Mark Q&A answered error', error);
      socket.emit('error', { message: 'Failed to update question status' });
    }
  });

  socket.on('set-qna-active-question', async ({ presentationId, slideId, questionId }) => {
    try {
      const slide = await Slide.findById(slideId);
      if (!slide || slide.type !== 'qna') {
        socket.emit('error', { message: 'Q&A slide not found' });
        return;
      }

      const result = setQnaActiveQuestion({ slideId: slide._id, questionId });
      if (result.error) {
        socket.emit('error', { message: result.error });
        return;
      }

      emitQnaState({ io, presentationId, slideId: slide._id });
    } catch (error) {
      Logger.error('Set Q&A active question error', error);
      socket.emit('error', { message: 'Failed to set active question' });
    }
  });

  socket.on('clear-qna-questions', async ({ presentationId, slideId }) => {
    try {
      const slide = await Slide.findById(slideId);
      if (!slide || slide.type !== 'qna') {
        socket.emit('error', { message: 'Q&A slide not found' });
        return;
      }

      await Response.deleteMany({ slideId: slide._id });

      const result = clearQnaQuestions({ slideId: slide._id });
      if (result.error) {
        socket.emit('error', { message: result.error });
        return;
      }

      emitQnaState({ io, presentationId, slideId: slide._id });

      const responses = [];
      const results = buildResultsPayload(slide, responses);
      io.to(`presentation-${presentationId}`).emit('response-updated', {
        slideId: slide._id.toString(),
        ...results
      });
    } catch (error) {
      Logger.error('Clear Q&A questions error', error);
      socket.emit('error', { message: 'Failed to clear questions' });
    }
  });

  socket.on('update-qna-settings', async ({ presentationId, slideId, allowMultiple }) => {
    try {
      const slide = await Slide.findById(slideId);
      if (!slide || slide.type !== 'qna') {
        socket.emit('error', { message: 'Q&A slide not found' });
        return;
      }

      updateQnaSettings({ slideId: slide._id, allowMultiple });
      emitQnaState({ io, presentationId, slideId: slide._id });
    } catch (error) {
      Logger.error('Update Q&A settings error', error);
      socket.emit('error', { message: 'Failed to update Q&A settings' });
    }
  });

  socket.on('request-qna-state', ({ presentationId, slideId }) => {
    try {
      const payload = buildQnaPayload(slideId);
      socket.emit('qna-updated', payload);
    } catch (error) {
      Logger.error('Request Q&A state error', error);
    }
  });

  // Guess Number handlers
  socket.on('submit-guess', async ({ presentationId, slideId, participantId, guess }) => {
    try {
      const slide = await Slide.findById(slideId);
      if (!slide || slide.type !== 'guess_number') {
        socket.emit('error', { message: 'Guess slide not found' });
        return;
      }

      const { minValue, maxValue, correctAnswer } = slide.guessNumberSettings || {};

      initializeGuessSession({
        slideId: slide._id,
        minValue,
        maxValue,
        correctAnswer
      });

      // Create response in DB first
      const response = new Response({
        presentationId,
        slideId: slide._id,
        participantId,
        answer: guess,
        submissionCount: 1
      });
      await response.save();

      const result = submitGuess({
        slideId: slide._id,
        participantId,
        guess
      });

      if (result.error) {
        // Rollback DB if in-memory fails
        await Response.deleteOne({ _id: response._id });
        socket.emit('error', { message: result.error });
        return;
      }

      // Also emit standard response-updated event for consistency
      const responses = await Response.find({ slideId: slide._id });
      const results = buildResultsPayload(slide, responses);
      io.to(`presentation-${presentationId}`).emit('response-updated', {
        slideId: slide._id.toString(),
        slide: buildSlidePayload(slide),
        ...results
      });

      socket.emit('guess-submitted', { success: true });
    } catch (error) {
      Logger.error('Submit guess error', error);
      socket.emit('error', { message: 'Failed to submit guess' });
    }
  });

  socket.on('clear-guess-responses', async ({ presentationId, slideId }) => {
    try {
      const slide = await Slide.findById(slideId);
      if (!slide || slide.type !== 'guess_number') {
        socket.emit('error', { message: 'Guess slide not found' });
        return;
      }

      await Response.deleteMany({ slideId: slide._id });

      const result = clearGuessResponses({ slideId: slide._id });
      if (result.error) {
        socket.emit('error', { message: result.error });
        return;
      }

      io.to(`presentation-${presentationId}`).emit('guess-reset', {
        slideId: slide._id
      });

      // Emit empty responses
      const responses = [];
      const results = buildResultsPayload(slide, responses);
      io.to(`presentation-${presentationId}`).emit('response-updated', {
        slideId: slide._id.toString(),
        slide: buildSlidePayload(slide),
        ...results
      });
    } catch (error) {
      Logger.error('Clear guess responses error', error);
      socket.emit('error', { message: 'Failed to clear responses' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    Logger.debug(`Client disconnected: ${socket.id}`);

    // Decrement platform user count when any user disconnects
    totalPlatformUsers = Math.max(0, totalPlatformUsers - 1);
    // Emit updated total to all clients in the landing page room
    io.to('landing-page').emit('platform-users-updated', { count: totalPlatformUsers });

    let participantRemoved = false;

    // Check if disconnected socket was a presenter
    let presenterPresentationId = null;
    activePresentations.forEach((data, presentationId) => {
      if (data.presenterSocket === socket.id) {
        presenterPresentationId = presentationId;
      }
      
      // Check if disconnected socket was a participant
      if (data.participants.has(socket.id)) {
        data.participants.delete(socket.id);
        participantRemoved = true;

        // Notify presenter
        if (data.presenterSocket) {
          // Send updated participant list to presenter
          const participantList = Array.from(data.participants.values());
          io.to(`presenter-${presentationId}`).emit('participant-list-updated', { 
            participantCount: data.participants.size,
            participants: participantList
          });
          
          // Also send the original event for backward compatibility
          io.to(`presenter-${presentationId}`).emit('participant-left', {
            participantCount: data.participants.size
          });
        }
      }
    });

    // If presenter disconnected, do NOT end the presentation automatically.
    // The user wants it to end ONLY when "End Presentation" is clicked.
    if (presenterPresentationId) {
      const presentationData = activePresentations.get(presenterPresentationId);

      if (presentationData) {
        // Just mark presenter as disconnected in memory, but keep session alive
        presentationData.presenterSocket = null;
        activePresentations.set(presenterPresentationId, presentationData);
        Logger.debug(`Presenter disconnected from ${presenterPresentationId}, keeping session alive.`);
      }
    }
  });

  // Add socket to landing page room when they connect
  socket.join('landing-page');

  // Add a new event to get current platform user count
  socket.on('get-platform-users', () => {
    socket.emit('platform-users-updated', { count: totalPlatformUsers });
  });

  // Kick participant handler
  socket.on('kick-participant', ({ presentationId, participantName }) => {
    try {
      const presentationKey = presentationId.toString();
      const activeEntry = activePresentations.get(presentationKey);
      
      if (!activeEntry) {
        socket.emit('error', { message: 'Presentation not found' });
        return;
      }
      
      // Check if the requester is the presenter
      if (activeEntry.presenterSocket !== socket.id) {
        socket.emit('error', { message: 'Only the presenter can kick participants' });
        return;
      }
      
      // Find the participant socket ID by name
      let participantSocketId = null;
      for (const [socketId, name] of activeEntry.participants.entries()) {
        if (name === participantName) {
          participantSocketId = socketId;
          break;
        }
      }
      
      // Check if the participant exists
      if (!participantSocketId) {
        socket.emit('error', { message: 'Participant not found' });
        return;
      }
      
      // Notify the participant that they've been kicked
      io.to(participantSocketId).emit('kicked-by-presenter', {
        message: 'Sorry, you have been kicked out by the presenter'
      });
      
      // Disconnect the participant's socket
      io.sockets.sockets.get(participantSocketId)?.disconnect(true);
      
      // Remove participant from the list
      activeEntry.participants.delete(participantSocketId);
      
      // Update participant count for presenter
      const participantCount = activeEntry.participants.size;
      const participantList = Array.from(activeEntry.participants.values());
      
      // Notify presenter about updated participant count and names
      io.to(`presenter-${presentationKey}`).emit('participant-list-updated', { 
        participantCount,
        participants: participantList
      });
      
      Logger.debug(`Participant ${participantName} (${participantSocketId}) kicked from presentation ${presentationId}`);
    } catch (error) {
      Logger.error('Kick participant error', error);
      socket.emit('error', { message: 'Failed to kick participant' });
    }
  });

  // Attach quiz handlers
  attachQuizHandlers(io, socket);
};

module.exports = setupSocketHandlers;
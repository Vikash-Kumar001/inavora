import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import RankingParticipantInput from '../interactions/ranking/ParticipantInput';
import HundredPointsParticipantInput from '../interactions/hundredPoints/ParticipantInput';
import WordCloudParticipantInput from '../interactions/wordCloud/ParticipantInput';
import ScalesParticipantInput from '../interactions/scales/ParticipantInput';
import ParticipantOpenEnded from '../interactions/openEnded/ParticipantView';
import {
  defaultOpenEndedSettings,
  mergeOpenEndedState,
} from '../interactions/openEnded/utils';
import { v4 as uuidv4 } from 'uuid';
import ParticipantQnaView from '../interactions/qna/ParticipantView';
import MCQParticipantInput from '../interactions/mcq/ParticipantInput';
import ParticipantGuessView from '../interactions/guessNumber/ParticipantView';
import TwoByTwoGridParticipantInput from '../interactions/twoByTwoGrid/ParticipantInput';
import PinOnImageParticipantInput from '../interactions/pinOnImage/ParticipantInput';
import QuizParticipantInput from '../interactions/quiz/ParticipantInput';
import LeaderboardParticipantView from '../interactions/leaderboard/ParticipantView';
import MiroParticipantView from '../interactions/miro/participant/ParticipantView';
import PowerPointParticipantView from '../interactions/powerpoint/participant/ParticipantView';
import GoogleSlidesParticipantView from '../interactions/googleSlides/participant/ParticipantView';
import UploadParticipantView from '../interactions/upload/participant/ParticipantView';
import InstructionParticipantView from '../interactions/instruction/participant/ParticipantView';

const JoinPresentation = () => {
  let { code } = useParams();
  code = atob(code);
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [socket, setSocket] = useState(null);
  const [participantName, setParticipantName] = useState('');
  const [participantId] = useState(() => {
    // Get or create participant ID
    let id = localStorage.getItem('participantId');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('participantId', id);
    }
    return id;
  });
  const [hasJoined, setHasJoined] = useState(false);
  const [isAutoJoining, setIsAutoJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [presentation, setPresentation] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(null);
  const currentSlideRef = useRef(currentSlide);
  useEffect(() => {
    currentSlideRef.current = currentSlide;
  }, [currentSlide]);
  const [voteCounts, setVoteCounts] = useState({});

  const getSlideIdentifier = (slide) => {
    if (!slide) return null;
    const identifier = slide.id ?? slide._id ?? slide.slideId ?? null;
    return identifier ? identifier.toString() : null;
  };

  const isCurrentSlide = (slideId) => {
    if (!slideId) return false;
    const currentId = getSlideIdentifier(currentSlideRef.current);
    if (!currentId) return false;
    return slideId.toString() === currentId;
  };
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [openEndedAnswer, setOpenEndedAnswer] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingMessage, setWaitingMessage] = useState('');
  const [openEndedResponses, setOpenEndedResponses] = useState([]);
  const [openEndedSettings, setOpenEndedSettings] = useState(defaultOpenEndedSettings);
  const [participantRanking, setParticipantRanking] = useState([]);
  const [qnaQuestions, setQnaQuestions] = useState([]);
  const [qnaAllowMultiple, setQnaAllowMultiple] = useState(false);
  const [qnaActiveQuestionId, setQnaActiveQuestionId] = useState(null);
  const [quizState, setQuizState] = useState({});
  const [quizSubmissionResult, setQuizSubmissionResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showKickedModal, setShowKickedModal] = useState(false);
  const [kickMessage, setKickMessage] = useState('');

  useEffect(() => {
    // Connect to Socket.IO
    const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000');
    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // Auto-populate name for logged-in users and auto-join if already logged in
  useEffect(() => {
    if (currentUser && currentUser.displayName && socket && !hasJoined) {
      setIsAutoJoining(true);
      setJoinError(null); // Reset any previous errors
      setParticipantName(currentUser.displayName);
      // Auto-join after a short delay to allow socket connection
      const timer = setTimeout(() => {
        socket.emit('join-presentation', {
          accessCode: code,
          participantName: currentUser.displayName,
          participantId
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentUser, socket, code, participantId, hasJoined]);

  const handleJoin = () => {
    // Reset any previous errors
    setJoinError(null);
    
    if (!participantName.trim()) {
      setJoinError('Please enter your name');
      return;
    }

    if (!socket) {
      setJoinError('Connection not ready');
      return;
    }

    socket.emit('join-presentation', {
      accessCode: code,
      participantName: participantName.trim(),
      participantId
    });
  };

  useEffect(() => {
    if (!socket) return;

    const handlePresentationJoin = (data, toastMessage = 'Joined presentation!') => {
      console.log('Presentation live payload:', data);
      setPresentation(data.presentation);
      setCurrentSlide(data.slide);
      setVoteCounts(data.voteCounts || {});
      setHasJoined(true);
      setIsAutoJoining(false);
      setJoinError(null); // Clear any previous errors
      setIsWaiting(false);
      setWaitingMessage('');
      setSelectedAnswer(null);
      setTextAnswer('');
      setHasSubmitted(Boolean(data.hasSubmitted));
      if (data.participantResponse?.submissionCount) {
        setSubmissionCount(data.participantResponse.submissionCount);
      } else {
        setSubmissionCount(0);
      }
      mergeOpenEndedState({
        payload: data,
        setResponses: setOpenEndedResponses,
        setSettings: setOpenEndedSettings,
        resetResponses: true,
        resetSettings: true
      });
      if (data.slide?.type === 'ranking' && Array.isArray(data.participantResponse?.answer)) {
        setParticipantRanking(data.participantResponse.answer);
      } else {
        setParticipantRanking([]);
      }
      setOpenEndedAnswer('');
      if (toastMessage) {
        toast.success(toastMessage);
      }
    };

    socket.on('joined-presentation', (data) => {
      handlePresentationJoin(data);
    });

    socket.on('presentation-live', (data) => {
      handlePresentationJoin(data, 'Presentation is now live!');
    });

    socket.on('presentation-not-live', (data) => {
      setIsWaiting(true);
      setWaitingMessage(data.message);
      toast(data.message);
    });

    socket.on('slide-changed', (data) => {
      setCurrentSlide(data.slide);
      setVoteCounts(data.voteCounts || {});
      setSelectedAnswer(null);
      setTextAnswer('');
      setOpenEndedAnswer('');
      setHasSubmitted(false);
      setSubmissionCount(0);
      mergeOpenEndedState({
        payload: data,
        setResponses: setOpenEndedResponses,
        setSettings: setOpenEndedSettings,
        resetResponses: true,
        resetSettings: true
      });
    });

    socket.on('response-updated', (data) => {
      // Update vote counts or word frequencies when responses change
      if (data.voteCounts) {
        setVoteCounts(data.voteCounts);
      }
      mergeOpenEndedState({
        payload: data,
        setResponses: setOpenEndedResponses,
        setSettings: setOpenEndedSettings
      });
      if (data.totalResponses !== undefined) {
        // You might want to use this for displaying total responses
      }
    });

    socket.on('response-submitted', (data) => {
      if (data.success && data.slideId === currentSlide?.id) {
        if (data.slideType === 'word_cloud') {
          setSubmissionCount(data.submissionCount || 0);
          const max = Math.max(1, Number(currentSlide.maxWordsPerParticipant) || 1);
          if ((data.submissionCount || 0) >= max) {
            setHasSubmitted(true);
          }
        } else {
          setHasSubmitted(true);
        }
        setTextAnswer('');
        if (data.slideType === 'ranking' && Array.isArray(data.submittedAnswer)) {
          setParticipantRanking(data.submittedAnswer);
        }
        toast.success(t('toasts.join_presentation.response_submitted'));
      }
    });

    socket.on('presentation-ended', () => {
      setIsWaiting(true);
      setWaitingMessage('Waiting for the presenter to change slide...');
    });

    socket.on('open-ended-settings-updated', (data) => {
      if (!data || !isCurrentSlide(data.slideId)) return;
      mergeOpenEndedState({
        payload: data,
        setSettings: setOpenEndedSettings
      });
    });

    socket.on('qna-updated', (data) => {
      if (!isCurrentSlide(data.slideId)) return;
      setQnaQuestions(data.questions || []);
      setQnaAllowMultiple(Boolean(data.allowMultiple));
      setQnaActiveQuestionId(data.activeQuestionId || null);
    });

    socket.on('qna-question-submitted', () => {
      toast.success(t('toasts.join_presentation.question_submitted'));
    });

    socket.on('guess-updated', (data) => {
      // Guess updates are handled by presenter, participant doesn't need them
      if (data.slideId === currentSlide?.id) {
        // optional: handle distribution if needed in future
      }
    });

    socket.on('guess-reset', (data) => {
      if (data.slideId === currentSlide?.id) {
        setHasSubmitted(false);
        toast(t('toasts.join_presentation.guess_reset'));
      }
    });

    socket.on('guess-submitted', () => {
      toast.success(t('toasts.join_presentation.guess_submitted'));
      setHasSubmitted(true);
    });

    socket.on('quiz-started', (data) => {
      if (!isCurrentSlide(data.slideId)) return;
      setQuizState({
        isActive: true,
        startTime: data.startTime,
        timeLimit: data.timeLimit
      });
      setHasSubmitted(false);
      setQuizSubmissionResult(null);
    });

    socket.on('quiz-answer-submitted', (data) => {
      setQuizSubmissionResult(data);
      setHasSubmitted(true);
    });

    socket.on('quiz-ended', (data) => {
      if (!isCurrentSlide(data.slideId)) return;
      setQuizState(prev => ({
        ...prev,
        isActive: false
      }));
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    });

    socket.on('leaderboard-data', (data) => {
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    });

    const handleKickedByPresenter = (data) => {
      setKickMessage(data.message || 'Sorry, you were kicked by the presenter');
      setShowKickedModal(true);
      // Disconnect the socket
      if (socket) {
        socket.disconnect();
      }
    };

    socket.on('error', (data) => {
      setIsAutoJoining(false);
      setJoinError(data.message);
    });

    socket.on('kicked-by-presenter', handleKickedByPresenter);

    return () => {
      socket.off('joined-presentation');
      socket.off('presentation-live');
      socket.off('presentation-not-live');
      socket.off('slide-changed');
      socket.off('response-updated');
      socket.off('response-submitted');
      socket.off('presentation-ended');
      socket.off('open-ended-settings-updated');
      socket.off('qna-updated');
      socket.off('qna-question-submitted');
      socket.off('guess-updated');
      socket.off('guess-reset');
      socket.off('guess-submitted');
      socket.off('quiz-started');
      socket.off('quiz-answer-submitted');
      socket.off('quiz-ended');
      socket.off('leaderboard-data');
      socket.off('error');
      socket.off('kicked-by-presenter', handleKickedByPresenter);
    };
    // eslint-disable-next-line
  }, [socket, currentSlide]);


  const handleSubmitResponse = (answerPayload) => {
    if (!currentSlide) return;
    if (currentSlide.type === 'multiple_choice') {
      if (!selectedAnswer) {
        toast.error(t('toasts.join_presentation.select_answer'));
        return;
      }
      socket.emit('submit-response', {
        presentationId: presentation.id,
        slideId: currentSlide.id,
        participantId,
        participantName,
        answer: selectedAnswer
      });
      setHasSubmitted(true);
      toast.success(t('toasts.join_presentation.response_submitted'));
    } else if (currentSlide.type === 'scales') {
      if (answerPayload === null || answerPayload === undefined) {
        toast.error(t('toasts.join_presentation.select_value'));
        return;
      }
      socket.emit('submit-response', {
        presentationId: presentation.id,
        slideId: currentSlide.id,
        participantId,
        participantName,
        answer: answerPayload
      });
      setHasSubmitted(true);
      toast.success(t('toasts.join_presentation.response_submitted'));
    } else if (currentSlide.type === 'word_cloud') {
      const tokens = String(textAnswer || '')
        .toLowerCase()
        .split(/[^a-zA-Z0-9]+/)
        .map(t => t.trim())
        .filter(Boolean);
      if (tokens.length === 0) {
        toast.error(t('toasts.join_presentation.enter_at_least_one_word'));
        return;
      }
      // Allow multiple words based on maxWordsPerParticipant setting
      const maxWords = Math.max(1, Number(currentSlide.maxWordsPerParticipant) || 1);
      const limited = tokens.slice(0, maxWords);
      socket.emit('submit-response', {
        presentationId: presentation.id,
        slideId: currentSlide.id,
        participantId,
        participantName,
        answer: limited
      });
    } else if (currentSlide.type === 'open_ended') {
      const trimmed = (openEndedAnswer || '').trim();
      if (!trimmed) {
        toast.error(t('toasts.join_presentation.enter_response'));
        return;
      }
      socket.emit('submit-response', {
        presentationId: presentation.id,
        slideId: currentSlide.id,
        participantId,
        participantName,
        answer: trimmed.slice(0, 300)
      });
      setHasSubmitted(true);
    } else if (currentSlide.type === 'ranking') {
      if (!Array.isArray(answerPayload) || answerPayload.length === 0) {
        toast.error(t('toasts.join_presentation.rank_at_least_one'));
        return;
      }
      socket.emit('submit-response', {
        presentationId: presentation.id,
        slideId: currentSlide.id,
        participantId,
        participantName,
        answer: answerPayload
      });
      setHasSubmitted(true);
      setParticipantRanking(answerPayload);
      toast.success(t('toasts.join_presentation.ranking_submitted'));
    } else if (currentSlide.type === 'hundred_points') {
      if (!Array.isArray(answerPayload) || answerPayload.length === 0) {
        toast.error(t('toasts.join_presentation.allocate_points'));
        return;
      }
      socket.emit('submit-response', {
        presentationId: presentation.id,
        slideId: currentSlide.id,
        participantId,
        participantName,
        answer: answerPayload
      });
      setHasSubmitted(true);
      toast.success(t('toasts.join_presentation.points_allocated'));
    } else if (currentSlide.type === '2x2_grid') {
      if (!Array.isArray(answerPayload) || answerPayload.length === 0) {
        toast.error(t('toasts.join_presentation.position_all_items'));
        return;
      }
      socket.emit('submit-response', {
        presentationId: presentation.id,
        slideId: currentSlide.id,
        participantId,
        participantName,
        answer: answerPayload
      });
      setHasSubmitted(true);
      toast.success(t('toasts.join_presentation.positions_submitted'));
    } else if (currentSlide.type === 'pin_on_image') {
      if (!answerPayload || typeof answerPayload !== 'object') {
        toast.error(t('toasts.join_presentation.place_pin'));
        return;
      }
      console.log('Submitting pin response:', answerPayload);
      socket.emit('submit-response', {
        presentationId: presentation.id,
        slideId: currentSlide.id,
        participantId,
        participantName,
        answer: answerPayload
      });
      setHasSubmitted(true);
      toast.success(t('toasts.join_presentation.pin_submitted'));
    }
  };

  const handleVoteOpenEndedResponse = (responseId) => {
    if (!socket || !presentation || !currentSlide) return;
    socket.emit('vote-open-ended-response', {
      presentationId: presentation.id,
      slideId: currentSlide.id,
      responseId,
      participantId
    });
  };

  const handleSubmitQuizAnswer = (selectedOptionId, responseTime) => {
    if (!socket || !presentation || !currentSlide) return;
    socket.emit('submit-quiz-answer', {
      presentationId: presentation.id,
      slideId: currentSlide.id,
      participantId,
      participantName,
      answer: selectedOptionId,
      responseTime
    });
  };

  const renderSlideContent = () => {
    if (!currentSlide) return null;

    switch (currentSlide.type) {
      case 'multiple_choice':
        return (
          <MCQParticipantInput
            slide={currentSlide}
            selectedAnswer={selectedAnswer}
            onSelect={setSelectedAnswer}
            hasSubmitted={hasSubmitted}
            voteCounts={voteCounts}
            onSubmit={handleSubmitResponse}
          />
        );
      case 'word_cloud':
        return (
          <WordCloudParticipantInput
            slide={currentSlide}
            textAnswer={textAnswer}
            onTextChange={setTextAnswer}
            hasSubmitted={hasSubmitted}
            onSubmit={handleSubmitResponse}
            submissionCount={submissionCount}
            maxSubmissions={currentSlide.maxWordsPerParticipant || 1}
          />
        );
      case 'open_ended':
        return (
          <ParticipantOpenEnded
            slide={currentSlide}
            responses={openEndedResponses}
            answer={openEndedAnswer}
            onAnswerChange={setOpenEndedAnswer}
            onSubmit={handleSubmitResponse}
            hasSubmitted={hasSubmitted}
            isVotingEnabled={openEndedSettings.isVotingEnabled}
            participantId={participantId}
            onVote={handleVoteOpenEndedResponse}
          />
        );
      case 'scales':
        return (
          <ScalesParticipantInput
            slide={currentSlide}
            onSubmit={handleSubmitResponse}
            hasSubmitted={hasSubmitted}
          />
        );
      case 'ranking':
        return (
          <RankingParticipantInput
            slide={currentSlide}
            onSubmit={handleSubmitResponse}
            hasSubmitted={hasSubmitted}
            initialRanking={participantRanking}
          />
        );
      case 'qna':
        return (
          <ParticipantQnaView
            slide={currentSlide}
            questions={qnaQuestions}
            allowMultiple={qnaAllowMultiple}
            activeQuestionId={qnaActiveQuestionId}
            participantId={participantId}
            onSubmit={(text) => {
              if (!socket) return;
              socket.emit('submit-qna-question', {
                presentationId: presentation.id,
                slideId: currentSlide.id,
                participantId,
                participantName,
                text
              });
            }}
          />
        );
      case 'guess_number':
        return (
          <ParticipantGuessView
            slide={currentSlide}
            hasSubmitted={hasSubmitted}
            onSubmit={(guess) => {
              if (!socket) return;
              socket.emit('submit-guess', {
                presentationId: presentation.id,
                slideId: currentSlide.id,
                participantId,
                guess
              });
            }}
          />
        );
      case 'hundred_points':
        return (
          <HundredPointsParticipantInput
            slide={currentSlide}
            onSubmit={handleSubmitResponse}
            hasSubmitted={hasSubmitted}
          />
        );
      case '2x2_grid':
        return (
          <TwoByTwoGridParticipantInput
            slide={currentSlide}
            onSubmit={handleSubmitResponse}
            hasSubmitted={hasSubmitted}
          />
        );
      case 'pin_on_image':
        return (
          <PinOnImageParticipantInput
            slide={currentSlide}
            onSubmit={handleSubmitResponse}
            hasSubmitted={hasSubmitted}
          />
        );
      case 'quiz':
        return (
          <QuizParticipantInput
            slide={currentSlide}
            quizState={quizState}
            hasSubmitted={hasSubmitted}
            submissionResult={quizSubmissionResult}
            onSubmit={handleSubmitQuizAnswer}
          />
        );
      case 'leaderboard':
        return (
          <LeaderboardParticipantView
            slide={currentSlide}
            leaderboard={leaderboard}
            participantId={participantId}
          />
        );
      case 'miro':
        return (
          <MiroParticipantView
            slide={currentSlide}
          />
        );
      case 'powerpoint':
        return (
          <PowerPointParticipantView
            slide={currentSlide}
          />
        );
      case 'google_slides':
        return (
          <GoogleSlidesParticipantView
            slide={currentSlide}
          />
        );
      case 'upload':
        return (
          <UploadParticipantView
            slide={currentSlide}
          />
        );
      case 'instruction':
        return (
          <InstructionParticipantView
            slide={currentSlide}
            presentation={presentation}
          />
        );
      default:
        return (
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#E0E0E0]">{currentSlide.question}</h2>
          </div>
        );
    }
  };

  // Kick Modal
  if (showKickedModal) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-600/10 blur-[120px] animate-pulse delay-1000" />
        </div>
        
        <div className="bg-[#1F1F1F] border border-[#2A2A2A] rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center relative z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Removed from Presentation</h2>
          <p className="text-[#B0B0B0] mb-6">{kickMessage}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg hover:shadow-teal-500/25 text-white rounded-lg font-bold transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Auto-join loading screen for authenticated users
  if (isAutoJoining) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-600/10 blur-[120px] animate-pulse delay-1000" />
        </div>
        
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-md w-full text-center relative z-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            <h2 className="text-xl font-bold text-white">Joining as {participantName}...</h2>
            <p className="text-gray-400">Setting up your connection</p>
          </div>
        </div>
      </div>
    );
  }

  // Name entry form (when not joined and not auto-joining)
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-600/10 blur-[120px] animate-pulse delay-1000" />
        </div>
        
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-md w-full relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">{t('join_presentation.join_presentation_title')}</h1>
            <p className="text-gray-400">{t('join_presentation.enter_your_name')}</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <input
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder={t('join_presentation.name_placeholder')}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              />
              {joinError && (
                <p className="mt-2 text-red-400 text-sm">{joinError}</p>
              )}
            </div>
            
            <button
              onClick={handleJoin}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg hover:shadow-teal-500/25 text-white rounded-lg font-bold transition-all"
            >
              {t('join_presentation.continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // If user is logged in but not auto-joining (fallback)
  if (currentUser && !isAutoJoining) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-600/10 blur-[120px] animate-pulse delay-1000" />
        </div>
        
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-md w-full text-center relative z-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            <h2 className="text-xl font-bold text-white">{t('join_presentation.preparing_to_join', { name: currentUser.displayName })}</h2>
            <p className="text-gray-400">{t('join_presentation.setting_up_connection')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Waiting screen
  if (isWaiting) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-600/10 blur-[120px] animate-pulse delay-1000" />
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-12 max-w-md w-full text-center relative z-10">
          <h2 className="text-2xl font-bold text-white">
            {waitingMessage || t('join_presentation.waiting_for_presentation')}
          </h2>
        </div>
      </div>
    );
  }

  // Presentation screen
  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#E0E0E0] flex flex-col">
      {/* Top Bar */}
      <div className="bg-[#1F1F1F] border-b border-[#2A2A2A] px-4 sm:px-6 py-3 sm:py-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-[#E0E0E0] truncate">{presentation?.title || t('presentation.untitled')}</h1>
            <p className="text-xs sm:text-sm text-[#B0B0B0]">{t('presentation.welcome')}, <span className="text-[#4CAF50] font-medium">{participantName}</span>!</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#1D2A20] border border-[#2E7D32]/30 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-[#4CAF50] rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm font-medium text-[#4CAF50]">{t('presentation.live')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto w-full">
          <div className="w-full bg-[#1F1F1F] rounded-2xl border border-[#2A2A2A] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 sm:p-8 lg:p-10">
            {renderSlideContent()}
          </div>
        </div>
      </div>
    </div>
  );

};

export default JoinPresentation;
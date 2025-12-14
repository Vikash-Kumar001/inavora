import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

/**
 * Export utilities for CSV, Excel, and PDF formats
 * Industry-level implementation with beautiful PDF design
 */

// Color palette for PDF design
const PDF_COLORS = {
  primary: '#4CAF50',
  secondary: '#2196F3',
  accent: '#FF9800',
  danger: '#F44336',
  dark: '#1F1F1F',
  light: '#E0E0E0',
  background: '#FFFFFF',
  header: '#2E7D32',
  text: '#212121',
  border: '#E0E0E0',
  gradient1: '#4CAF50',
  gradient2: '#45A049',
  chartColors: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#FFC107', '#795548']
};

/**
 * Convert hex to RGB
 */
const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const normalizeResponse = (response) => {
  if (!response || typeof response !== 'object') {
    return {
      participantName: 'Anonymous',
      participantId: 'N/A',
      answer: null,
      createdAt: null,
      votes: 0,
      isCorrect: false,
      responseTime: null
    };
  }
  return {
    participantName: response.participantName || 'Anonymous',
    participantId: response.participantId || 'N/A',
    answer: response.answer,
    createdAt: response.createdAt || response.created_at,
    votes: response.votes || response.voteCount || 0,
    isCorrect: Boolean(response.isCorrect),
    responseTime: response.responseTime || response.response_time || null
  };
};

const formatParticipantName = (name) => name || 'Anonymous';
const formatParticipantId = (id) => id || 'N/A';
const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleString();
  } catch {
    return 'N/A';
  }
};
const formatPercentage = (count, total) => {
  if (!total || total === 0) return '0.00%';
  return `${((count / total) * 100).toFixed(2)}%`;
};
const safeArray = (value) => Array.isArray(value) ? value : (value != null ? [value] : []);
const safeArrayFirst = (value) => {
  const arr = safeArray(value);
  return arr.length > 0 ? arr[0] : null;
};

/**
 * Format data for export based on slide type
 */
export const formatSlideDataForExport = (slide, responses, aggregatedData = {}) => {
  if (!slide || typeof slide !== 'object') {
    slide = {};
  }
  if (!Array.isArray(responses)) {
    responses = [];
  }
  if (!aggregatedData || typeof aggregatedData !== 'object') {
    aggregatedData = {};
  }

  const normalizedResponses = responses.map(normalizeResponse);
  const slideType = slide.type || 'unknown';
  const question = slide.question || 'No question';
  const timestamp = new Date().toLocaleString();

  switch (slideType) {
    case 'multiple_choice':
    case 'pick_answer':
      return formatChoiceData(slide, normalizedResponses, aggregatedData, question, timestamp);
    
    case 'word_cloud':
      return formatWordCloudData(slide, normalizedResponses, aggregatedData, question, timestamp);
    
    case 'open_ended':
    case 'type_answer':
      return formatOpenEndedData(slide, normalizedResponses, aggregatedData, question, timestamp);
    
    case 'scales':
      return formatScalesData(slide, normalizedResponses, aggregatedData, question, timestamp);
    
    case 'ranking':
      return formatRankingData(slide, normalizedResponses, aggregatedData, question, timestamp);
    
    case 'hundred_points':
      return formatHundredPointsData(slide, normalizedResponses, aggregatedData, question, timestamp);
    
    case '2x2_grid':
      return formatGridData(slide, normalizedResponses, aggregatedData, question, timestamp);
    
    case 'pin_on_image':
      return formatPinOnImageData(slide, normalizedResponses, aggregatedData, question, timestamp);
    
    case 'guess_number':
      return formatGuessNumberData(slide, normalizedResponses, aggregatedData, question, timestamp);
    
    case 'quiz':
      return formatQuizData(slide, normalizedResponses, aggregatedData, question, timestamp);
    
    case 'qna':
      return formatQnaData(slide, normalizedResponses, aggregatedData, question, timestamp);
    
    case 'leaderboard':
      return formatLeaderboardData(slide, normalizedResponses, aggregatedData, question, timestamp);
    
    case 'instruction':
      return formatInstructionData(slide, normalizedResponses, aggregatedData, question, timestamp);
    
    default:
      return formatGenericData(slide, normalizedResponses, question, timestamp);
  }
};

/**
 * Format choice-based data (MCQ, Pick Answer)
 */
const formatChoiceData = (slide, responses, aggregatedData, question, timestamp) => {
  const options = Array.isArray(slide?.options) ? slide.options : [];
  const voteCounts = aggregatedData?.voteCounts || {};
  const totalResponses = aggregatedData?.totalResponses || (Array.isArray(responses) ? responses.length : 0);

  const detailedRows = responses.map((response, index) => ({
    'Response #': index + 1,
    'Participant Name': formatParticipantName(response.participantName),
    'Participant ID': formatParticipantId(response.participantId),
    'Selected Option': safeArrayFirst(response.answer) || 'N/A',
    'Submitted At': formatDate(response.createdAt)
  }));

  const summaryRows = options.map(option => {
    const optionText = typeof option === 'string' ? option : (option?.text || String(option || ''));
    const count = voteCounts[optionText] || 0;
    return {
      'Option': optionText,
      'Votes': count,
      'Percentage': formatPercentage(count, totalResponses),
      'Total Responses': totalResponses
    };
  });

  return {
    question,
    timestamp,
    slideType: slide.type,
    summary: summaryRows,
    detailed: detailedRows,
    metadata: {
      totalResponses,
      totalOptions: options.length
    }
  };
};

/**
 * Format word cloud data
 */
const formatWordCloudData = (slide, responses, aggregatedData, question, timestamp) => {
  const wordFrequencies = aggregatedData?.wordFrequencies || {};
  const totalResponses = aggregatedData?.totalResponses || (Array.isArray(responses) ? responses.length : 0);

  const summaryRows = Object.entries(wordFrequencies)
    .filter(([word]) => word != null && word !== '')
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .map(([word, frequency]) => ({
      'Word': String(word),
      'Frequency': Number(frequency) || 0,
      'Percentage': formatPercentage(frequency || 0, totalResponses)
    }));

  const detailedRows = responses.map((response, index) => {
    const words = safeArray(response.answer).filter(w => w != null && w !== '');
    return {
      'Response #': index + 1,
      'Participant Name': formatParticipantName(response.participantName),
      'Participant ID': formatParticipantId(response.participantId),
      'Words Submitted': words.join(', '),
      'Word Count': words.length,
      'Submitted At': formatDate(response.createdAt)
    };
  });

  return {
    question,
    timestamp,
    slideType: 'word_cloud',
    summary: summaryRows,
    detailed: detailedRows,
    metadata: {
      totalResponses,
      uniqueWords: Object.keys(wordFrequencies).length
    }
  };
};

/**
 * Format open-ended data
 */
const formatOpenEndedData = (slide, responses, aggregatedData, question, timestamp) => {
  const detailedRows = responses.map((response, index) => {
    const answerArr = safeArray(response.answer);
    return {
      'Response #': index + 1,
      'Participant Name': formatParticipantName(response.participantName),
      'Participant ID': formatParticipantId(response.participantId),
      'Response Text': answerArr.join(' ') || 'N/A',
      'Votes': response.votes || 0,
      'Submitted At': formatDate(response.createdAt)
    };
  });

  return {
    question,
    timestamp,
    slideType: 'open_ended',
    summary: [],
    detailed: detailedRows,
    metadata: {
      totalResponses: responses.length
    }
  };
};

/**
 * Format scales data
 */
const formatScalesData = (slide, responses, aggregatedData, question, timestamp) => {
  const statements = Array.isArray(slide?.statements) ? slide.statements : [];
  const scaleDistribution = aggregatedData?.scaleDistribution || {};
  const scaleAverage = Number(aggregatedData?.scaleAverage) || 0;
  const scaleStatementAverages = Array.isArray(aggregatedData?.scaleStatementAverages) ? aggregatedData.scaleStatementAverages : [];
  const minValue = Number(slide?.minValue) || 1;
  const maxValue = Number(slide?.maxValue) || 5;
  const totalResponses = aggregatedData?.totalResponses || (Array.isArray(responses) ? responses.length : 0);

  const summaryRows = [];
  if (statements.length > 0) {
    statements.forEach((statement, index) => {
      const avg = Number(scaleStatementAverages[index]) || 0;
      summaryRows.push({
        'Statement': String(statement || ''),
        'Average Rating': avg.toFixed(2),
        'Scale Range': `${minValue} - ${maxValue}`
      });
    });
  } else {
    summaryRows.push({
      'Question': question,
      'Average Rating': scaleAverage.toFixed(2),
      'Scale Range': `${minValue} - ${maxValue}`,
      'Total Responses': totalResponses
    });
  }

  const distributionRows = Object.entries(scaleDistribution)
    .filter(([value]) => value != null)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([value, count]) => ({
      'Rating Value': String(value),
      'Count': Number(count) || 0,
      'Percentage': formatPercentage(count || 0, totalResponses)
    }));

  const detailedRows = responses.map((response, index) => {
    const ratings = safeArray(response.answer);
    const ratingText = statements.length > 0
      ? statements.map((stmt, idx) => `${stmt}: ${ratings[idx] != null ? ratings[idx] : 'N/A'}`).join('; ')
      : (ratings[0] != null ? String(ratings[0]) : 'N/A');
    
    return {
      'Response #': index + 1,
      'Participant Name': formatParticipantName(response.participantName),
      'Participant ID': formatParticipantId(response.participantId),
      'Ratings': ratingText,
      'Submitted At': formatDate(response.createdAt)
    };
  });

  return {
    question,
    timestamp,
    slideType: 'scales',
    summary: [...summaryRows, ...distributionRows],
    detailed: detailedRows,
    metadata: {
      totalResponses,
      averageRating: scaleAverage
    }
  };
};

/**
 * Format ranking data
 */
const formatRankingData = (slide, responses, aggregatedData, question, timestamp) => {
  const rankingResults = Array.isArray(aggregatedData?.rankingResults) ? aggregatedData.rankingResults : [];
  const totalResponses = aggregatedData?.totalResponses || (Array.isArray(responses) ? responses.length : 0);

  const summaryRows = rankingResults.map((result, index) => ({
    'Rank': index + 1,
    'Item': result?.label || result?.itemId || 'N/A',
    'Average Position': result?.averageRank != null ? Number(result.averageRank).toFixed(2) : 'N/A',
    'Score': Number(result?.score) || 0,
    'Response Count': Number(result?.responseCount) || 0
  }));

  const detailedRows = responses.map((response, index) => {
    const ranking = safeArray(response.answer).filter(r => r != null);
    return {
      'Response #': index + 1,
      'Participant Name': formatParticipantName(response.participantName),
      'Participant ID': formatParticipantId(response.participantId),
      'Ranking': ranking.join(' → ') || 'N/A',
      'Submitted At': formatDate(response.createdAt)
    };
  });

  return {
    question,
    timestamp,
    slideType: 'ranking',
    summary: summaryRows,
    detailed: detailedRows,
    metadata: {
      totalResponses
    }
  };
};

/**
 * Format hundred points data
 */
const formatHundredPointsData = (slide, responses, aggregatedData, question, timestamp) => {
  const hundredPointsResults = Array.isArray(aggregatedData?.hundredPointsResults) ? aggregatedData.hundredPointsResults : [];
  const totalResponses = aggregatedData?.totalResponses || (Array.isArray(responses) ? responses.length : 0);

  const summaryRows = hundredPointsResults.map((result) => ({
    'Item': result?.label || result?.itemId || 'N/A',
    'Total Points': Number(result?.totalPoints) || 0,
    'Average Points': result?.averagePoints != null ? Number(result.averagePoints).toFixed(1) : '0.0',
    'Participants': Number(result?.participantCount) || 0
  }));

  const detailedRows = responses.map((response, index) => {
    const allocations = safeArray(response.answer).filter(a => a && typeof a === 'object');
    const allocationText = allocations.map(a => `${a.item || 'N/A'}: ${a.points || 0}pts`).join('; ') || 'N/A';
    const total = allocations.reduce((sum, a) => sum + (Number(a.points) || 0), 0);
    
    return {
      'Response #': index + 1,
      'Participant Name': formatParticipantName(response.participantName),
      'Participant ID': formatParticipantId(response.participantId),
      'Allocations': allocationText,
      'Total Points': total,
      'Submitted At': formatDate(response.createdAt)
    };
  });

  return {
    question,
    timestamp,
    slideType: 'hundred_points',
    summary: summaryRows,
    detailed: detailedRows,
    metadata: {
      totalResponses
    }
  };
};

/**
 * Format grid data
 */
const formatGridData = (slide, responses, aggregatedData, question, timestamp) => {
  const gridResults = Array.isArray(aggregatedData?.gridResults) ? aggregatedData.gridResults : [];
  const totalResponses = aggregatedData?.totalResponses || (Array.isArray(responses) ? responses.length : 0);

  const summaryRows = gridResults.map((result) => ({
    'Item': result?.label || result?.itemId || 'N/A',
    'Average X': result?.averageX != null ? Number(result.averageX).toFixed(2) : '0.00',
    'Average Y': result?.averageY != null ? Number(result.averageY).toFixed(2) : '0.00',
    'Response Count': Number(result?.count) || 0
  }));

  const detailedRows = responses.map((response, index) => {
    const positions = safeArray(response.answer).filter(p => p && typeof p === 'object');
    const positionText = positions.map(p => `${p.item || 'N/A'}: (${p.x != null ? p.x : 'N/A'}, ${p.y != null ? p.y : 'N/A'})`).join('; ') || 'N/A';
    
    return {
      'Response #': index + 1,
      'Participant Name': formatParticipantName(response.participantName),
      'Participant ID': formatParticipantId(response.participantId),
      'Positions': positionText,
      'Submitted At': formatDate(response.createdAt)
    };
  });

  return {
    question,
    timestamp,
    slideType: '2x2_grid',
    summary: summaryRows,
    detailed: detailedRows,
    metadata: {
      totalResponses
    }
  };
};

/**
 * Format pin on image data
 */
const formatPinOnImageData = (slide, responses, aggregatedData, question, timestamp) => {
  const pinResults = Array.isArray(aggregatedData?.pinResults) ? aggregatedData.pinResults : [];
  const totalResponses = aggregatedData?.totalResponses || (Array.isArray(responses) ? responses.length : 0);

  const validPins = pinResults.filter(p => p && (p.x != null || p.y != null));
  const avgX = validPins.length > 0 
    ? (validPins.reduce((sum, p) => sum + (Number(p.x) || 0), 0) / validPins.length).toFixed(2)
    : '0.00';
  const avgY = validPins.length > 0
    ? (validPins.reduce((sum, p) => sum + (Number(p.y) || 0), 0) / validPins.length).toFixed(2)
    : '0.00';

  const summaryRows = [{
    'Total Pins': totalResponses,
    'Average X': avgX,
    'Average Y': avgY
  }];

  const detailedRows = responses.map((response, index) => {
    const pin = response.answer && typeof response.answer === 'object' ? response.answer : {};
    return {
      'Response #': index + 1,
      'Participant Name': formatParticipantName(response.participantName),
      'Participant ID': formatParticipantId(response.participantId),
      'X Coordinate': pin.x != null ? Number(pin.x).toFixed(2) : 'N/A',
      'Y Coordinate': pin.y != null ? Number(pin.y).toFixed(2) : 'N/A',
      'Submitted At': formatDate(response.createdAt)
    };
  });

  return {
    question,
    timestamp,
    slideType: 'pin_on_image',
    summary: summaryRows,
    detailed: detailedRows,
    metadata: {
      totalResponses
    }
  };
};

/**
 * Format guess number data
 */
const formatGuessNumberData = (slide, responses, aggregatedData, question, timestamp) => {
  const distribution = aggregatedData?.guessNumberState?.distribution || aggregatedData?.guessDistribution || {};
  const correctAnswer = slide?.guessNumberSettings?.correctAnswer;
  const minValue = Number(slide?.guessNumberSettings?.minValue) || 1;
  const maxValue = Number(slide?.guessNumberSettings?.maxValue) || 10;
  const totalResponses = Array.isArray(responses) ? responses.length : 0;

  const summaryRows = Object.entries(distribution)
    .filter(([guess]) => guess != null)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([guess, count]) => {
      const isCorrect = correctAnswer != null && Number(guess) === Number(correctAnswer);
      return {
        'Guess': String(guess),
        'Count': Number(count) || 0,
        'Percentage': formatPercentage(count || 0, totalResponses),
        'Correct Answer': isCorrect ? 'Yes' : 'No'
      };
    });

  const detailedRows = responses.map((response, index) => {
    const guess = safeArrayFirst(response.answer);
    const isCorrect = correctAnswer != null && guess != null && Number(guess) === Number(correctAnswer);
    
    return {
      'Response #': index + 1,
      'Participant Name': formatParticipantName(response.participantName),
      'Participant ID': formatParticipantId(response.participantId),
      'Guess': guess != null ? String(guess) : 'N/A',
      'Correct': isCorrect ? 'Yes' : 'No',
      'Correct Answer': correctAnswer != null ? String(correctAnswer) : 'N/A',
      'Submitted At': formatDate(response.createdAt)
    };
  });

  return {
    question,
    timestamp,
    slideType: 'guess_number',
    summary: summaryRows,
    detailed: detailedRows,
    metadata: {
      totalResponses,
      correctAnswer,
      range: `${minValue} - ${maxValue}`
    }
  };
};

/**
 * Format quiz data
 */
const formatQuizData = (slide, responses, aggregatedData, question, timestamp) => {
  const quizState = aggregatedData?.quizState || {};
  const results = quizState?.results || {};
  const optionCounts = results?.optionCounts || aggregatedData?.voteCounts || {};
  const totalResponses = results?.totalResponses || aggregatedData?.totalResponses || (Array.isArray(responses) ? responses.length : 0);
  const correctCount = Number(results?.correctCount) || 0;
  const incorrectCount = Number(results?.incorrectCount) || 0;

  const summaryRows = Object.entries(optionCounts)
    .filter(([option]) => option != null)
    .map(([option, count]) => ({
      'Option': String(option),
      'Votes': Number(count) || 0,
      'Percentage': formatPercentage(count || 0, totalResponses)
    }));

  summaryRows.push({
    'Option': '--- Summary ---',
    'Votes': '',
    'Percentage': ''
  });

  summaryRows.push({
    'Option': 'Total Responses',
    'Votes': totalResponses,
    'Percentage': '100%'
  });

  summaryRows.push({
    'Option': 'Correct Answers',
    'Votes': correctCount,
    'Percentage': formatPercentage(correctCount, totalResponses)
  });

  summaryRows.push({
    'Option': 'Incorrect Answers',
    'Votes': incorrectCount,
    'Percentage': formatPercentage(incorrectCount, totalResponses)
  });

  const detailedRows = responses.map((response, index) => ({
    'Response #': index + 1,
    'Participant Name': formatParticipantName(response.participantName),
    'Participant ID': formatParticipantId(response.participantId),
    'Selected Option': response.answer != null ? String(response.answer) : 'N/A',
    'Correct': response.isCorrect ? 'Yes' : 'No',
    'Response Time (ms)': response.responseTime != null ? String(response.responseTime) : 'N/A',
    'Submitted At': formatDate(response.createdAt)
  }));

  return {
    question,
    timestamp,
    slideType: 'quiz',
    summary: summaryRows,
    detailed: detailedRows,
    metadata: {
      totalResponses,
      correctCount,
      incorrectCount,
      averageResponseTime: results?.averageResponseTime || 0
    }
  };
};

/**
 * Format QnA data
 */
const formatQnaData = (slide, responses, aggregatedData, question, timestamp) => {
  const questions = Array.isArray(aggregatedData?.questions) ? aggregatedData.questions : [];
  const totalResponses = questions.length;

  const summaryRows = questions.map((q, index) => ({
    'Question #': index + 1,
    'Question Text': q?.text || 'N/A',
    'Asked By': formatParticipantName(q?.participantName),
    'Answered': q?.answered ? 'Yes' : 'No',
    'Votes': Number(q?.votes || q?.voteCount) || 0,
    'Asked At': formatDate(q?.createdAt)
  }));

  return {
    question,
    timestamp,
    slideType: 'qna',
    summary: summaryRows,
    detailed: [],
    metadata: {
      totalResponses
    }
  };
};

/**
 * Format leaderboard data
 */
const formatLeaderboardData = (slide, responses, aggregatedData, question, timestamp) => {
  const leaderboard = Array.isArray(aggregatedData?.leaderboard) ? aggregatedData.leaderboard : [];
  const totalResponses = leaderboard.length;

  const summaryRows = leaderboard.map((participant, index) => ({
    'Rank': index + 1,
    'Participant Name': formatParticipantName(participant.participantName),
    'Participant ID': formatParticipantId(participant.participantId),
    'Total Score': Math.round(participant.totalScore || participant.score || 0),
    'Quizzes Played': participant.quizCount || 0
  }));

  return {
    question: question || 'Quiz Leaderboard',
    timestamp,
    slideType: 'leaderboard',
    summary: summaryRows,
    detailed: [],
    metadata: {
      totalResponses
    }
  };
};

/**
 * Format instruction slide data
 */
const formatInstructionData = (slide, responses, aggregatedData, question, timestamp) => {
  // Instruction slides may have content object or instructionContent string
  const content = slide?.content || {};
  const instructionContent = slide?.instructionContent || '';
  const website = content.website || 'www.inavora.com';
  const description = content.description || instructionContent || 'Join via website or scan QR code';
  const accessCode = aggregatedData?.accessCode || '';

  const summaryRows = [
    {
      'Type': 'Instruction Slide',
      'Content': 'Join Instructions',
      'Website': website,
      'Description': description,
      'Join Presentation Code': accessCode || 'N/A'
    }
  ];

  return {
    question: question || 'Instructions',
    timestamp,
    slideType: 'instruction',
    summary: summaryRows,
    detailed: [],
    metadata: {
      totalResponses: 0,
      accessCode: accessCode // Store access code in metadata for QR code generation
    }
  };
};

/**
 * Format generic data
 */
const formatGenericData = (slide, responses, question, timestamp) => {
  const detailedRows = responses.map((response, index) => {
    let answerStr = 'N/A';
    if (response.answer != null) {
      if (Array.isArray(response.answer)) {
        answerStr = JSON.stringify(response.answer);
      } else {
        answerStr = String(response.answer);
      }
    }
    return {
      'Response #': index + 1,
      'Participant Name': formatParticipantName(response.participantName),
      'Participant ID': formatParticipantId(response.participantId),
      'Answer': answerStr,
      'Submitted At': formatDate(response.createdAt)
    };
  });

  return {
    question,
    timestamp,
    slideType: slide?.type || 'unknown',
    summary: [],
    detailed: detailedRows,
    metadata: {
      totalResponses: responses.length
    }
  };
};

/**
 * Export to CSV
 */
export const exportToCSV = (formattedData, filename) => {
  if (!formattedData || typeof formattedData !== 'object') {
    return;
  }
  const { question = '', timestamp = '', summary = [], detailed = [], metadata = {} } = formattedData;
  
  let csvContent = `"${question}"\n`;
  csvContent += `"Exported: ${timestamp}"\n`;
  csvContent += `"Total Responses: ${metadata.totalResponses || 0}"\n\n`;
  
  if (Array.isArray(summary) && summary.length > 0 && summary[0] && typeof summary[0] === 'object') {
    csvContent += '"SUMMARY"\n';
    const summaryHeaders = Object.keys(summary[0]);
    csvContent += summaryHeaders.map(h => `"${h}"`).join(',') + '\n';
    summary.forEach(row => {
      csvContent += summaryHeaders.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    csvContent += '\n';
  }
  
  if (Array.isArray(detailed) && detailed.length > 0 && detailed[0] && typeof detailed[0] === 'object') {
    csvContent += '"DETAILED RESPONSES"\n';
    const detailedHeaders = Object.keys(detailed[0]);
    csvContent += detailedHeaders.map(h => `"${h}"`).join(',') + '\n';
    detailed.forEach(row => {
      csvContent += detailedHeaders.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
  }
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename || 'export'}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export to Excel
 */
export const exportToExcel = (formattedData, filename) => {
  if (!formattedData || typeof formattedData !== 'object') {
    return;
  }
  const { question = '', timestamp = '', summary = [], detailed = [], metadata = {}, slideType = 'unknown' } = formattedData;
  
  const wb = XLSX.utils.book_new();
  
  const metadataSheet = [
    ['Question', question],
    ['Exported', timestamp],
    ['Total Responses', metadata.totalResponses || 0],
    ['Slide Type', slideType]
  ];
  const wsMetadata = XLSX.utils.aoa_to_sheet(metadataSheet);
  XLSX.utils.book_append_sheet(wb, wsMetadata, 'Metadata');
  
  if (Array.isArray(summary) && summary.length > 0) {
    const wsSummary = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  }
  
  if (Array.isArray(detailed) && detailed.length > 0) {
    const wsDetailed = XLSX.utils.json_to_sheet(detailed);
    XLSX.utils.book_append_sheet(wb, wsDetailed, 'Detailed Responses');
  }
  
  // Write file
  XLSX.writeFile(wb, `${filename || 'export'}.xlsx`);
};

/**
 * Export to PDF with beautiful design
 */
export const exportToPDF = (formattedData, presentationTitle, filename, slide = null) => {
  if (!formattedData || typeof formattedData !== 'object') {
    return;
  }
  const { question = '', timestamp = '', summary = [], detailed = [], metadata = {}, slideType = 'unknown' } = formattedData;
  
  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;
  
  // Helper function to add new page if needed
  const checkNewPage = (requiredHeight) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };
  
  // Helper function to draw gradient background (professional blue-gray gradient)
  const drawGradientHeader = (y, height) => {
    const steps = 20;
    const stepHeight = height / steps;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const r = Math.round(30 + (20 - 30) * ratio);
      const g = Math.round(58 + (45 - 58) * ratio);
      const b = Math.round(138 + (110 - 138) * ratio);
      pdf.setFillColor(r, g, b);
      pdf.rect(margin, y + (i * stepHeight), contentWidth, stepHeight, 'F');
    }
  };
  
  // Header with gradient
  const headerHeight = 25;
  drawGradientHeader(yPosition, headerHeight);
  
  // Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(presentationTitle || 'Presentation Results', margin + 5, yPosition + 12);
  
  // Slide type badge
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const slideTypeText = slideType.replace(/_/g, ' ').toUpperCase();
  pdf.text(slideTypeText, pageWidth - margin - 5, yPosition + 12, { align: 'right' });
  
  yPosition += headerHeight + 10;
  
  // Question section
  pdf.setTextColor(33, 33, 33);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Question:', margin, yPosition);
  yPosition += 7;
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const questionLines = pdf.splitTextToSize(question, contentWidth);
  pdf.text(questionLines, margin, yPosition);
  yPosition += questionLines.length * 6 + 8;
  
  // Metadata box
  pdf.setFillColor(240, 248, 255);
  pdf.setDrawColor(33, 150, 243);
  pdf.roundedRect(margin, yPosition, contentWidth, 15, 3, 3, 'FD');
  
  pdf.setFontSize(10);
  pdf.setTextColor(33, 150, 243);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Export Information', margin + 5, yPosition + 7);
  
  pdf.setTextColor(66, 66, 66);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Exported: ${timestamp}`, margin + 5, yPosition + 12);
  pdf.text(`Total Responses: ${metadata.totalResponses}`, margin + contentWidth / 2, yPosition + 12);
  
  yPosition += 25; // Increased spacing after metadata box
  
  // Helper function to truncate long UUIDs or IDs for display
  const formatLongId = (id, maxLength = 16) => {
    if (!id || typeof id !== 'string') return id;
    // For UUIDs (contains dashes and is long), truncate more aggressively
    if (id.includes('-') && id.length > 20) {
      // Show first 6 chars and last 4 chars for UUIDs
      return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
    }
    // For other long strings, truncate to maxLength
    if (id.length <= maxLength) return id;
    return id.substring(0, maxLength - 3) + '...';
  };

  // Helper function to draw a bar chart
  const drawBarChart = (chartData, x, y, width, height, options = {}) => {
    const {
      maxValue = null,
      colors = ['#3b82f6', '#10b981', '#eab308', '#a855f7', '#ec4899', '#ef4444'],
      showValues = true,
      showLabels = true,
      correctIndices = [] // For quiz slides to highlight correct answers
    } = options;

    const { labels = [], values = [] } = chartData;
    if (!labels.length || !values.length) return y;

    const maxVal = maxValue !== null ? maxValue : Math.max(...values, 1);
    const barCount = labels.length;
    const barSpacing = 3; // mm between bars
    const labelHeight = showLabels ? 15 : 0;
    const valueHeight = showValues ? 8 : 0;
    const chartHeight = height - labelHeight - valueHeight;
    const availableWidth = width - (barSpacing * (barCount - 1));
    const barWidth = Math.min(availableWidth / barCount, 20); // Max 20mm per bar

    let currentX = x;
    const chartY = y + valueHeight;

    values.forEach((value, index) => {
      const barHeight = maxVal > 0 ? (value / maxVal) * chartHeight : 0;
      const barX = currentX;
      const barY = chartY + (chartHeight - barHeight);

      // Choose color - green for correct answers in quiz, otherwise use color array
      let barColor;
      if (correctIndices.includes(index)) {
        barColor = { r: 16, g: 185, b: 129 }; // Green for correct
      } else {
        const colorIndex = index % colors.length;
        const hex = colors[colorIndex];
        const rgb = hexToRgb(hex) || { r: 59, g: 130, b: 246 };
        barColor = rgb;
      }

      // Draw bar with rounded top
      pdf.setFillColor(barColor.r, barColor.g, barColor.b);
      pdf.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F');
      
      // Draw border
      pdf.setDrawColor(barColor.r * 0.7, barColor.g * 0.7, barColor.b * 0.7);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'D');

      // Draw value on top of bar
      if (showValues && value > 0) {
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        const valueText = String(value);
        const textWidth = pdf.getTextWidth(valueText);
        pdf.text(valueText, barX + (barWidth / 2) - (textWidth / 2), barY - 1);
      }

      // Draw label below bar
      if (showLabels) {
        pdf.setFontSize(7);
        pdf.setTextColor(33, 33, 33);
        pdf.setFont('helvetica', 'normal');
        const labelText = formatLongId(String(labels[index]), 15);
        const labelLines = pdf.splitTextToSize(labelText, barWidth);
        labelLines.forEach((line, lineIndex) => {
          const lineWidth = pdf.getTextWidth(line);
          pdf.text(line, barX + (barWidth / 2) - (lineWidth / 2), chartY + chartHeight + 5 + (lineIndex * 4));
        });
      }

      currentX += barWidth + barSpacing;
    });

    return y + height;
  };

  // Helper function to calculate optimal column widths based on content
  const calculateOptimalColumnWidths = (headers, rows, contentWidth, minColWidth = 15, maxColWidth = 60) => {
    pdf.setFontSize(8);
    const colWidths = headers.map(() => 0);
    
    // Calculate width needed for each column based on header and content
    headers.forEach((header, colIndex) => {
      let maxCharCount = header.length;
      
      // Check all rows for this column to find longest content
      rows.forEach(row => {
        const cellText = String(row[header] || '');
        // Only truncate IDs, not regular text
        const isId = header.toLowerCase().includes('id') || 
                     (cellText.includes('-') && cellText.length > 20);
        const formattedText = isId ? formatLongId(cellText) : cellText;
        maxCharCount = Math.max(maxCharCount, formattedText.length);
      });
      
      // Estimate width: approximately 0.5mm per character for font size 8
      // Adjust based on column type
      const lowerHeader = header.toLowerCase();
      let charWidth = 0.5;
      if (lowerHeader.includes('participant id') || (lowerHeader.includes('option') && lowerHeader.includes('selected'))) {
        charWidth = 0.4; // Smaller for UUIDs
      } else if (lowerHeader.includes('name')) {
        charWidth = 0.45;
      } else if (lowerHeader.includes('response #') || lowerHeader.includes('#')) {
        charWidth = 0.6;
      }
      
      const estimatedWidth = maxCharCount * charWidth;
      // Add padding (4mm on each side = 8mm total)
      colWidths[colIndex] = Math.max(minColWidth, Math.min(maxColWidth, estimatedWidth + 8));
    });
    
    // Normalize to fit contentWidth
    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
    if (totalWidth > contentWidth) {
      const scaleFactor = contentWidth / totalWidth;
      colWidths.forEach((w, i) => colWidths[i] = w * scaleFactor);
    } else {
      // Distribute extra space proportionally
      const extraSpace = contentWidth - totalWidth;
      const totalOriginal = colWidths.reduce((sum, w) => sum + w, 0);
      if (totalOriginal > 0) {
        colWidths.forEach((w, i) => {
          colWidths[i] = w + (extraSpace * (w / totalOriginal));
        });
      }
    }
    
    return colWidths;
  };

  // Helper function to calculate row height based on cell content
  const calculateRowHeight = (row, headers, colWidths, fontSize, lineHeight) => {
    let maxLines = 1;
    pdf.setFontSize(fontSize);
    headers.forEach((header, colIndex) => {
      const cellText = String(row[header] || '');
      // Only truncate IDs, not regular text
      const isId = header.toLowerCase().includes('id') || 
                   (cellText.includes('-') && cellText.length > 20);
      const formattedText = isId ? formatLongId(cellText) : cellText;
      const textLines = pdf.splitTextToSize(formattedText, Math.max(5, colWidths[colIndex] - 4));
      maxLines = Math.max(maxLines, textLines.length);
    });
    return Math.max(8, maxLines * lineHeight + 3); // Minimum 8mm, add 3mm padding
  };

  if (Array.isArray(summary) && summary.length > 0 && summary[0] && typeof summary[0] === 'object') {
    checkNewPage(30);
    
    yPosition += 5;
    
    pdf.setFontSize(14);
    pdf.setTextColor(46, 125, 50);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', margin, yPosition);
    yPosition += 10;
    
    const headers = Object.keys(summary[0]);
    if (headers.length === 0) return;
    // Calculate optimal column widths based on actual content
    const colWidths = calculateOptimalColumnWidths(headers, summary, contentWidth, 20, 50);
    
    const headerHeight = 10; // Increased header height
    pdf.setFillColor(46, 125, 50);
    pdf.setDrawColor(46, 125, 50);
    pdf.rect(margin, yPosition, contentWidth, headerHeight, 'FD');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    let xPos = margin;
    headers.forEach((header, index) => {
      const headerLines = pdf.splitTextToSize(header, colWidths[index] - 4);
      pdf.text(headerLines, xPos + 2, yPosition + 6.5); // Centered in taller header
      xPos += colWidths[index];
    });
    
    yPosition += headerHeight + 2; // Added spacing after header
    
    // Table rows
    pdf.setTextColor(33, 33, 33);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const lineHeight = 4.5;
    
    summary.forEach((row, rowIndex) => {
      // Calculate row height based on content
      const rowHeight = calculateRowHeight(row, headers, colWidths, 8, lineHeight);
      checkNewPage(rowHeight);
      
      // Alternate row colors
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
      } else {
        pdf.setFillColor(255, 255, 255);
      }
      pdf.rect(margin, yPosition, contentWidth, rowHeight, 'F');
      
      pdf.setDrawColor(224, 224, 224);
      pdf.rect(margin, yPosition, contentWidth, rowHeight, 'D');
      
      // Draw vertical lines between columns
      xPos = margin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        xPos += colWidths[i];
        pdf.setDrawColor(224, 224, 224);
        pdf.line(xPos, yPosition, xPos, yPosition + rowHeight);
      }
      
      xPos = margin;
      headers.forEach((header, colIndex) => {
        const cellText = String(row[header] || '');
        // Only truncate IDs, not regular text
        const isId = header.toLowerCase().includes('id') || 
                     (cellText.includes('-') && cellText.length > 20);
        const formattedText = isId ? formatLongId(cellText) : cellText;
        const cellWidth = Math.max(5, colWidths[colIndex] - 4);
        const textLines = pdf.splitTextToSize(formattedText, cellWidth);
        const cellHeight = textLines.length * lineHeight;
        const textY = yPosition + (rowHeight / 2) - (cellHeight / 2) + lineHeight;
        // Clip text to cell boundaries
        pdf.text(textLines, xPos + 2, textY, { maxWidth: cellWidth });
        xPos += colWidths[colIndex];
      });
      
      yPosition += rowHeight + 1; // Added spacing between rows
    });
    
    yPosition += 10; // Increased spacing after summary section
  }
  
  if (Array.isArray(detailed) && detailed.length > 0 && detailed[0] && typeof detailed[0] === 'object') {
    checkNewPage(30);
    
    yPosition += 5;
    
    pdf.setFontSize(14);
    pdf.setTextColor(33, 150, 243);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Detailed Responses', margin, yPosition);
    yPosition += 10;
    
    const headers = Object.keys(detailed[0]);
    if (headers.length === 0) return;
    // Calculate optimal column widths based on actual content
    // Use smaller min width for detailed table since it has more columns
    const colWidths = calculateOptimalColumnWidths(headers, detailed, contentWidth, 12, 40);
    
    const headerHeight = 10; // Increased header height
    pdf.setFillColor(33, 150, 243);
    pdf.setDrawColor(33, 150, 243);
    pdf.rect(margin, yPosition, contentWidth, headerHeight, 'FD');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    let xPos = margin;
    headers.forEach((header, index) => {
      const headerLines = pdf.splitTextToSize(header, colWidths[index] - 4);
      pdf.text(headerLines, xPos + 2, yPosition + 6.5); // Centered in taller header
      xPos += colWidths[index];
    });
    
    yPosition += headerHeight + 2; // Added spacing after header
    
    // Table rows
    pdf.setTextColor(33, 33, 33);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    const lineHeight = 4;
    
    detailed.forEach((row, rowIndex) => {
      // Calculate row height based on content
      const rowHeight = calculateRowHeight(row, headers, colWidths, 7, lineHeight);
      checkNewPage(rowHeight);
      
      // Alternate row colors
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
      } else {
        pdf.setFillColor(255, 255, 255);
      }
      pdf.rect(margin, yPosition, contentWidth, rowHeight, 'F');
      
      pdf.setDrawColor(224, 224, 224);
      pdf.rect(margin, yPosition, contentWidth, rowHeight, 'D');
      
      // Draw vertical lines between columns
      xPos = margin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        xPos += colWidths[i];
        pdf.setDrawColor(224, 224, 224);
        pdf.line(xPos, yPosition, xPos, yPosition + rowHeight);
      }
      
      xPos = margin;
      headers.forEach((header, colIndex) => {
        const cellText = String(row[header] || '');
        // Only truncate IDs, not regular text
        const isId = header.toLowerCase().includes('id') || 
                     (cellText.includes('-') && cellText.length > 20);
        const formattedText = isId ? formatLongId(cellText) : cellText;
        const cellWidth = Math.max(5, colWidths[colIndex] - 4);
        const textLines = pdf.splitTextToSize(formattedText, cellWidth);
        const cellHeight = textLines.length * lineHeight;
        const textY = yPosition + (rowHeight / 2) - (cellHeight / 2) + lineHeight;
        // Clip text to cell boundaries
        pdf.text(textLines, xPos + 2, textY, { maxWidth: cellWidth });
        xPos += colWidths[colIndex];
      });
      
      yPosition += rowHeight + 1; // Added spacing between rows
    });
    
    yPosition += 10; // Spacing after detailed responses table
  }
  
  if ((Array.isArray(summary) && summary.length > 0) || (Array.isArray(detailed) && detailed.length > 0)) {
    checkNewPage(50);
    yPosition += 5;
    
    let chartData = null;
    let chartOptions = {};
    
    switch (slideType) {
      case 'quiz':
      case 'pick_answer':
      case 'multiple_choice': {
        const voteCounts = {};
        if (Array.isArray(summary)) {
          summary.forEach(row => {
            if (row && typeof row === 'object' && row.Option != null && row.Votes !== undefined) {
              const optionText = formatLongId(String(row.Option), 20);
              voteCounts[optionText] = Number(row.Votes) || 0;
            }
          });
        }
        
        const labels = Object.keys(voteCounts).filter(key => !key.includes('--- Summary ---') && !key.includes('Total Responses') && !key.includes('Correct Answers') && !key.includes('Incorrect Answers'));
        const values = labels.map(label => voteCounts[label] || 0);
        
        if (labels.length > 0 && values.length > 0) {
          chartData = { labels, values };
        }
        
        // For quiz, find correct answer index
        if (slideType === 'quiz' && slide?.quizSettings?.correctOptionId) {
          const correctOptionId = slide.quizSettings.correctOptionId;
          const options = slide.quizSettings.options || [];
          // Find the index in the labels array that matches the correct option
          options.forEach((opt) => {
            if (opt.id === correctOptionId) {
              const correctLabel = formatLongId(opt.text || String(opt), 20);
              const labelIndex = labels.findIndex(l => l === correctLabel || l.includes(opt.text));
              if (labelIndex >= 0) {
                chartOptions.correctIndices = [labelIndex];
              }
            }
          });
        }
        
        chartOptions.colors = ['#3b82f6', '#10b981', '#eab308', '#a855f7', '#ec4899', '#ef4444'];
        break;
      }
      
      case 'word_cloud': {
        const wordFreq = {};
        if (Array.isArray(summary)) {
          summary.forEach(row => {
            if (row && typeof row === 'object' && row.Word != null && row.Frequency !== undefined) {
              wordFreq[String(row.Word)] = Number(row.Frequency) || 0;
            }
          });
        }
        
        const sortedWords = Object.entries(wordFreq)
          .sort((a, b) => (b[1] || 0) - (a[1] || 0))
          .slice(0, 10);
        
        if (sortedWords.length > 0) {
          chartData = {
            labels: sortedWords.map(([word]) => formatLongId(word, 15)),
            values: sortedWords.map(([, freq]) => freq || 0)
          };
        }
        chartOptions.colors = ['#10b981', '#3b82f6', '#eab308', '#a855f7', '#ec4899'];
        break;
      }
      
      case 'scales': {
        const distribution = {};
        if (Array.isArray(summary)) {
          summary.forEach(row => {
            if (row && typeof row === 'object' && row['Rating Value'] != null && row.Count !== undefined) {
              distribution[String(row['Rating Value'])] = Number(row.Count) || 0;
            }
          });
        }
        
        const sortedEntries = Object.entries(distribution)
          .filter(([val]) => val != null)
          .sort((a, b) => Number(a[0]) - Number(b[0]));
        if (sortedEntries.length > 0) {
          chartData = {
            labels: sortedEntries.map(([val]) => String(val)),
            values: sortedEntries.map(([, count]) => Number(count) || 0)
          };
        }
        chartOptions.colors = ['#4CAF50'];
        break;
      }
      
      case 'ranking': {
        const rankingData = Array.isArray(summary) ? summary.slice(0, 10).filter(row => row && typeof row === 'object') : [];
        if (rankingData.length > 0) {
          chartData = {
            labels: rankingData.map(row => formatLongId(String(row.Item || row['Item'] || 'N/A'), 15)),
            values: rankingData.map(row => Number(row.Score || row['Score']) || 0)
          };
        }
        chartOptions.colors = ['#ef4444', '#3b82f6', '#7c3aed', '#ec4899', '#f59e0b'];
        break;
      }
      
      case 'hundred_points': {
        const validRows = Array.isArray(summary) ? summary.filter(row => row && typeof row === 'object') : [];
        if (validRows.length > 0) {
          chartData = {
            labels: validRows.map(row => formatLongId(String(row.Item || row['Item'] || 'N/A'), 15)),
            values: validRows.map(row => parseFloat(row['Average Points']) || 0)
          };
        }
        chartOptions.colors = ['#ef4444', '#3b82f6', '#7c3aed', '#ec4899', '#f59e0b'];
        break;
      }
      
      case 'guess_number': {
        const distribution = {};
        if (Array.isArray(summary)) {
          summary.forEach(row => {
            if (row && typeof row === 'object' && row.Guess != null && row.Count !== undefined) {
              distribution[String(row.Guess)] = Number(row.Count) || 0;
            }
          });
        }
        
        const sortedEntries = Object.entries(distribution)
          .filter(([guess]) => guess != null)
          .sort((a, b) => Number(a[0]) - Number(b[0]));
        if (sortedEntries.length > 0) {
          chartData = {
            labels: sortedEntries.map(([guess]) => String(guess)),
            values: sortedEntries.map(([, count]) => Number(count) || 0)
          };
        }
        chartOptions.colors = ['#3b82f6'];
        break;
      }
    }
    
    // Draw chart if data is available
    if (chartData && chartData.labels.length > 0) {
      const chartHeight = 50;
      const chartWidth = contentWidth;
      
      // Chart title
      pdf.setFontSize(12);
      pdf.setTextColor(33, 33, 33);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Response Visualization', margin, yPosition);
      yPosition += 8;
      
      // Draw chart background
      pdf.setFillColor(250, 250, 250);
      pdf.setDrawColor(224, 224, 224);
      pdf.roundedRect(margin, yPosition, chartWidth, chartHeight, 3, 3, 'FD');
      
      // Draw bars
      yPosition = drawBarChart(
        chartData,
        margin + 5,
        yPosition + 5,
        chartWidth - 10,
        chartHeight - 10,
        chartOptions
      ) + 5;
      
      yPosition += 5; // Spacing after chart
    }
  }
  
  // Footer on each page
  const totalPages = pdf.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.setFont('helvetica', 'italic');
    pdf.text(
      `Page ${i} of ${totalPages} | Generated by Inavora`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  // Save PDF
  pdf.save(`${filename || 'export'}.pdf`);
};

/**
 * Export multiple slides to a single PDF
 */
export const exportAllSlidesToPDF = async (allSlideData, presentationTitle, filename) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;
  
  // Helper function to add new page if needed
  const checkNewPage = (requiredHeight) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };
  
  // Helper function to draw gradient background (professional blue-gray gradient)
  const drawGradientHeader = (y, height) => {
    const steps = 20;
    const stepHeight = height / steps;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const r = Math.round(30 + (20 - 30) * ratio);
      const g = Math.round(58 + (45 - 58) * ratio);
      const b = Math.round(138 + (110 - 138) * ratio);
      pdf.setFillColor(r, g, b);
      pdf.rect(margin, y + (i * stepHeight), contentWidth, stepHeight, 'F');
    }
  };
  
  // Title page header section
  const titleHeaderHeight = 40;
  drawGradientHeader(yPosition, titleHeaderHeight);
  
  // Main heading
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  const mainHeading = 'Presentation Result Report';
  pdf.text(mainHeading, pageWidth / 2, yPosition + 15, { align: 'center' });
  
  // Subtitle
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  const subtitle = 'Detailed Analysis of All Responses Collected';
  pdf.text(subtitle, pageWidth / 2, yPosition + 25, { align: 'center' });
  
  // Generated date
  pdf.setFontSize(11);
  const generatedDate = `Generated on: ${new Date().toLocaleString()}`;
  pdf.text(generatedDate, pageWidth / 2, yPosition + 32, { align: 'center' });
  
  yPosition += titleHeaderHeight + 20;
  
  // Export each slide
  for (let dataIndex = 0; dataIndex < allSlideData.length; dataIndex++) {
    const { slide, formattedData, slideIndex } = allSlideData[dataIndex];
    // Add page break between slides (except first)
    if (dataIndex > 0) {
      pdf.addPage();
      yPosition = margin;
    }
    
    // Use the existing exportToPDF logic but for multi-slide
    // We'll call a helper function that renders a single slide page
    // Note: renderSlideToPDF is now async to handle QR code generation
    yPosition = await renderSlideToPDF(
      pdf,
      formattedData,
      slide,
      slideIndex + 1,
      presentationTitle,
      pageWidth,
      pageHeight,
      margin,
      contentWidth,
      yPosition,
      checkNewPage
    );
  }
  
  // Add footer to all pages
  const totalPages = pdf.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.setFont('helvetica', 'italic');
    pdf.text(
      `Page ${i} of ${totalPages} | Generated by Inavora`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  // Save PDF
  pdf.save(`${filename || 'export'}.pdf`);
};

/**
 * Generate QR code as data URL
 */
const generateQRCodeDataURL = async (text) => {
  try {
    const dataURL = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 200
    });
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
};

/**
 * Render a single slide to PDF (helper function for multi-slide export)
 */
const renderSlideToPDF = async (pdf, formattedData, slide, slideNumber, presentationTitle, pageWidth, pageHeight, margin, contentWidth, startY, checkNewPage) => {
  if (!formattedData || typeof formattedData !== 'object') {
    return startY;
  }
  const { question = '', timestamp = '', summary = [], detailed = [], metadata = {}, slideType = 'unknown' } = formattedData;
  let yPosition = startY;
  
  // Store access code in slide object if available in metadata (for instruction slides)
  if (slideType === 'instruction' && metadata?.accessCode && !slide?.accessCode) {
    slide = { ...slide, accessCode: metadata.accessCode };
  }
  
  // Helper function to draw gradient background (professional blue-gray gradient)
  const drawGradientHeader = (y, height) => {
    const steps = 20;
    const stepHeight = height / steps;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const r = Math.round(30 + (20 - 30) * ratio);
      const g = Math.round(58 + (45 - 58) * ratio);
      const b = Math.round(138 + (110 - 138) * ratio);
      pdf.setFillColor(r, g, b);
      pdf.rect(margin, y + (i * stepHeight), contentWidth, stepHeight, 'F');
    }
  };
  
  // Helper function to truncate long UUIDs
  const formatLongId = (id, maxLength = 16) => {
    if (!id || typeof id !== 'string') return id;
    if (id.includes('-') && id.length > 20) {
      return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
    }
    if (id.length <= maxLength) return id;
    return id.substring(0, maxLength - 3) + '...';
  };
  
  // Header with gradient
  const headerHeight = 25;
  checkNewPage(headerHeight + 50);
  drawGradientHeader(yPosition, headerHeight);
  
  // Title with slide number
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${presentationTitle || 'Presentation Results'} - Slide ${slideNumber}`, margin + 5, yPosition + 12);
  
  // Slide type badge
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const slideTypeText = slideType.replace(/_/g, ' ').toUpperCase();
  pdf.text(slideTypeText, pageWidth - margin - 5, yPosition + 12, { align: 'right' });
  
  yPosition += headerHeight + 10;
  
  // Question section
  pdf.setTextColor(33, 33, 33);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Question:', margin, yPosition);
  yPosition += 7;
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const questionLines = pdf.splitTextToSize(question, contentWidth);
  pdf.text(questionLines, margin, yPosition);
  yPosition += questionLines.length * 6 + 8;
  
  // Metadata box
  checkNewPage(25);
  pdf.setFillColor(240, 248, 255);
  pdf.setDrawColor(33, 150, 243);
  pdf.roundedRect(margin, yPosition, contentWidth, 15, 3, 3, 'FD');
  
  pdf.setFontSize(10);
  pdf.setTextColor(33, 150, 243);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Export Information', margin + 5, yPosition + 7);
  
  pdf.setTextColor(66, 66, 66);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Exported: ${timestamp}`, margin + 5, yPosition + 12);
  pdf.text(`Total Responses: ${metadata.totalResponses}`, margin + contentWidth / 2, yPosition + 12);
  
  yPosition += 25;
  
  if (Array.isArray(summary) && summary.length > 0 && summary[0] && typeof summary[0] === 'object') {
    checkNewPage(30);
    yPosition += 5;
    
    pdf.setFontSize(14);
    pdf.setTextColor(33, 150, 243);
    pdf.setFont('helvetica', 'bold');
    // Use appropriate title based on slide type
    const sectionTitle = slideType === 'leaderboard' ? 'LEADERBOARD' : 
                         slideType === 'instruction' ? 'INSTRUCTIONS' : 
                         'Summary';
    pdf.text(sectionTitle, margin, yPosition);
    yPosition += 10;
    
    const headers = Object.keys(summary[0]);
    if (headers.length === 0) return yPosition;
    
    // Calculate optimal column widths based on content (similar to single-slide export)
    pdf.setFontSize(8);
    const colWidths = headers.map(() => 0);
    
    // Calculate width needed for each column based on header and content
    headers.forEach((header, colIndex) => {
      let maxCharCount = header.length;
      
      // Check all rows for this column to find longest content
      summary.forEach(row => {
        const cellText = String(row[header] || '');
        // Only truncate IDs, not regular text
        const isId = header.toLowerCase().includes('id') || 
                     (cellText.includes('-') && cellText.length > 20);
        const displayText = isId ? formatLongId(cellText) : cellText;
        maxCharCount = Math.max(maxCharCount, displayText.length);
      });
      
      // Estimate width: approximately 0.5mm per character for font size 8
      const charWidth = 0.5;
      const estimatedWidth = maxCharCount * charWidth;
      // Add padding (4mm on each side = 8mm total)
      colWidths[colIndex] = Math.max(20, Math.min(60, estimatedWidth + 8));
    });
    
    // Normalize to fit contentWidth
    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
    if (totalWidth > contentWidth) {
      const scaleFactor = contentWidth / totalWidth;
      colWidths.forEach((w, i) => colWidths[i] = w * scaleFactor);
    } else {
      // Distribute extra space proportionally
      const extraSpace = contentWidth - totalWidth;
      const totalOriginal = colWidths.reduce((sum, w) => sum + w, 0);
      if (totalOriginal > 0) {
        colWidths.forEach((w, i) => {
          colWidths[i] = w + (extraSpace * (w / totalOriginal));
        });
      }
    }
    
    // Table header
    const headerHeight = 10;
    pdf.setFillColor(33, 150, 243);
    pdf.setDrawColor(33, 150, 243);
    pdf.rect(margin, yPosition, contentWidth, headerHeight, 'FD');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    let xPos = margin;
    headers.forEach((header, index) => {
      const headerLines = pdf.splitTextToSize(header, colWidths[index] - 4);
      pdf.text(headerLines, xPos + 2, yPosition + 6.5);
      xPos += colWidths[index];
    });
    
    yPosition += headerHeight + 2;
    
    // Table rows
    pdf.setTextColor(33, 33, 33);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const lineHeight = 4.5;
    
    summary.forEach((row, rowIndex) => {
      // Calculate row height based on content
      let maxLines = 1;
      headers.forEach((header, colIndex) => {
        const cellText = String(row[header] || '');
        const isId = header.toLowerCase().includes('id') || 
                     (cellText.includes('-') && cellText.length > 20);
        const displayText = isId ? formatLongId(cellText) : cellText;
        const cellWidth = Math.max(5, colWidths[colIndex] - 4);
        const textLines = pdf.splitTextToSize(displayText, cellWidth);
        maxLines = Math.max(maxLines, textLines.length);
      });
      const rowHeight = Math.max(8, maxLines * lineHeight + 3);
      
      checkNewPage(rowHeight);
      
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
      } else {
        pdf.setFillColor(255, 255, 255);
      }
      pdf.rect(margin, yPosition, contentWidth, rowHeight, 'F');
      
      pdf.setDrawColor(224, 224, 224);
      pdf.rect(margin, yPosition, contentWidth, rowHeight, 'D');
      
      // Draw vertical lines between columns
      xPos = margin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        xPos += colWidths[i];
        pdf.setDrawColor(224, 224, 224);
        pdf.line(xPos, yPosition, xPos, yPosition + rowHeight);
      }
      
      xPos = margin;
      headers.forEach((header, colIndex) => {
        const cellText = String(row[header] || '');
        const isId = header.toLowerCase().includes('id') || 
                     (cellText.includes('-') && cellText.length > 20);
        const displayText = isId ? formatLongId(cellText) : cellText;
        const cellWidth = Math.max(5, colWidths[colIndex] - 4);
        const textLines = pdf.splitTextToSize(displayText, cellWidth);
        const cellHeight = textLines.length * lineHeight;
        const textY = yPosition + (rowHeight / 2) - (cellHeight / 2) + lineHeight;
        pdf.text(textLines, xPos + 2, textY, { maxWidth: cellWidth });
        xPos += colWidths[colIndex];
      });
      
      yPosition += rowHeight + 1;
    });
    
    yPosition += 10;
  }
  
  if (Array.isArray(detailed) && detailed.length > 0 && detailed[0] && typeof detailed[0] === 'object') {
    checkNewPage(30);
    yPosition += 5;
    
    pdf.setFontSize(14);
    pdf.setTextColor(33, 150, 243);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Detailed Responses', margin, yPosition);
    yPosition += 10;
    
    const headers = Object.keys(detailed[0]);
    if (headers.length === 0) return yPosition;
    
    // Calculate optimal column widths based on content
    pdf.setFontSize(7);
    const colWidths = headers.map(() => 0);
    
    // Calculate width needed for each column based on header and content
    headers.forEach((header, colIndex) => {
      let maxCharCount = header.length;
      
      // Check all rows for this column to find longest content
      detailed.forEach(row => {
        const cellText = String(row[header] || '');
        // Only truncate IDs, not regular text
        const isId = header.toLowerCase().includes('id') || 
                     (cellText.includes('-') && cellText.length > 20);
        const displayText = isId ? formatLongId(cellText) : cellText;
        maxCharCount = Math.max(maxCharCount, displayText.length);
      });
      
      // Estimate width: approximately 0.4mm per character for font size 7
      const charWidth = 0.4;
      const estimatedWidth = maxCharCount * charWidth;
      // Add padding (4mm on each side = 8mm total)
      colWidths[colIndex] = Math.max(12, Math.min(40, estimatedWidth + 8));
    });
    
    // Normalize to fit contentWidth
    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
    if (totalWidth > contentWidth) {
      const scaleFactor = contentWidth / totalWidth;
      colWidths.forEach((w, i) => colWidths[i] = w * scaleFactor);
    } else {
      // Distribute extra space proportionally
      const extraSpace = contentWidth - totalWidth;
      const totalOriginal = colWidths.reduce((sum, w) => sum + w, 0);
      if (totalOriginal > 0) {
        colWidths.forEach((w, i) => {
          colWidths[i] = w + (extraSpace * (w / totalOriginal));
        });
      }
    }
    
    const headerHeight = 10;
    pdf.setFillColor(33, 150, 243);
    pdf.setDrawColor(33, 150, 243);
    pdf.rect(margin, yPosition, contentWidth, headerHeight, 'FD');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    let xPos = margin;
    headers.forEach((header, index) => {
      const headerLines = pdf.splitTextToSize(header, colWidths[index] - 4);
      pdf.text(headerLines, xPos + 2, yPosition + 6.5);
      xPos += colWidths[index];
    });
    
    yPosition += headerHeight + 2;
    
    // Table rows
    pdf.setTextColor(33, 33, 33);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    const lineHeight = 4;
    
    detailed.forEach((row, rowIndex) => {
      // Calculate row height based on content
      let maxLines = 1;
      headers.forEach((header, colIndex) => {
        const cellText = String(row[header] || '');
        const isId = header.toLowerCase().includes('id') || 
                     (cellText.includes('-') && cellText.length > 20);
        const displayText = isId ? formatLongId(cellText) : cellText;
        const cellWidth = Math.max(5, colWidths[colIndex] - 4);
        const textLines = pdf.splitTextToSize(displayText, cellWidth);
        maxLines = Math.max(maxLines, textLines.length);
      });
      const rowHeight = Math.max(8, maxLines * lineHeight + 3);
      
      checkNewPage(rowHeight);
      
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
      } else {
        pdf.setFillColor(255, 255, 255);
      }
      pdf.rect(margin, yPosition, contentWidth, rowHeight, 'F');
      
      pdf.setDrawColor(224, 224, 224);
      pdf.rect(margin, yPosition, contentWidth, rowHeight, 'D');
      
      // Draw vertical lines between columns
      xPos = margin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        xPos += colWidths[i];
        pdf.setDrawColor(224, 224, 224);
        pdf.line(xPos, yPosition, xPos, yPosition + rowHeight);
      }
      
      xPos = margin;
      headers.forEach((header, colIndex) => {
        const cellText = String(row[header] || '');
        const isId = header.toLowerCase().includes('id') || 
                     (cellText.includes('-') && cellText.length > 20);
        const displayText = isId ? formatLongId(cellText) : cellText;
        const cellWidth = Math.max(5, colWidths[colIndex] - 4);
        const textLines = pdf.splitTextToSize(displayText, cellWidth);
        const cellHeight = textLines.length * lineHeight;
        const textY = yPosition + (rowHeight / 2) - (cellHeight / 2) + lineHeight;
        pdf.text(textLines, xPos + 2, textY, { maxWidth: cellWidth });
        xPos += colWidths[colIndex];
      });
      
      yPosition += rowHeight + 1;
    });
    
    // For instruction slides, don't add extra spacing - QR code will go directly below
    if (slideType !== 'instruction') {
      yPosition += 10;
    }
  }
  
  // For instruction slides, add QR code directly below the table
  if (slideType === 'instruction') {
    const accessCode = metadata?.accessCode || slide?.accessCode || '';
    if (accessCode) {
      try {
        // Generate join URL
        let joinUrl = '';
        try {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'https://inavora.com';
          joinUrl = `${origin}/join/${btoa(accessCode)}`;
        } catch (e) {
          console.error('Error encoding access code:', e);
          joinUrl = `https://inavora.com/join/${accessCode}`;
        }
        
        // Generate QR code
        const qrCodeDataURL = await generateQRCodeDataURL(joinUrl);
        
        if (qrCodeDataURL) {
          // Calculate required space: title (5mm) + spacing (6mm) + QR code (25mm) + spacing (6mm) + text (4mm) + footer space (15mm) = 61mm
          const requiredSpace = 61;
          const footerSpace = 15; // Space reserved for footer at bottom
          
          // Check if we need a new page, accounting for footer space
          // Only create new page if absolutely necessary
          if (yPosition + requiredSpace > pageHeight - margin - footerSpace) {
            pdf.addPage();
            yPosition = margin;
          }
          
          yPosition += 3; // Minimal spacing after table
          
          // QR Code section title - centered
          pdf.setFontSize(10);
          pdf.setTextColor(33, 33, 33);
          pdf.setFont('helvetica', 'bold');
          const titleText = 'Scan this QR code to join';
          pdf.text(titleText, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 6; // Spacing between title and QR code
          
          // Calculate QR code size (25mm x 25mm - smaller but still scannable)
          const qrSize = 25;
          const qrX = pageWidth / 2 - qrSize / 2; // Center on page
          
          // Add white background for QR code with border
          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(qrX - 2, yPosition - 2, qrSize + 4, qrSize + 4, 2, 2, 'FD');
          
          // Add QR code image
          pdf.addImage(qrCodeDataURL, 'PNG', qrX, yPosition, qrSize, qrSize);
          
          yPosition += qrSize + 6; // Spacing between QR code and description
          
          // Add instruction text below QR code - centered and more visible
          pdf.setFontSize(8);
          pdf.setTextColor(66, 66, 66);
          pdf.setFont('helvetica', 'normal');
          const instructionText = 'with your mobile device to join the presentation';
          pdf.text(instructionText, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 5; // Minimal spacing before footer
        }
      } catch (error) {
        console.error('Error adding QR code to PDF:', error);
      }
    }
  }
  
  return yPosition;
};


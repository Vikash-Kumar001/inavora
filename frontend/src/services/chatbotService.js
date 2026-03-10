/**
 * Chatbot Service - API calls for chatbot functionality
 */

import { getApiUrl } from '../utils/config';

const API_URL = getApiUrl();

/**
 * Send a message to the chatbot and handle streaming response
 * @param {string} userId - The user's ID
 * @param {string} message - The user's message
 * @param {string} language - The user's interface language
 * @param {Function} onChunk - Callback function for each text chunk
 * @returns {Promise<Object>} Final status of the request
 */
export const sendChatMessage = async (userId, message, language = 'english', onChunk) => {
  // AbortController with 60s timeout to prevent hanging on cold starts / unreachable server
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${API_URL}/api/chatbot/ask`, {
      method: 'POST',
      mode: 'cors',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        message,
        language
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
            success: false,
            error: errorData.error || 'Failed to get response from chatbot',
            canRetry: errorData.can_retry !== false
        };
    }

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        if (onChunk) onChunk(chunk);
    }

    // Check for error markers in the stream
    if (fullText.includes('[ERROR: AI service failure]')) {
        return {
            success: false,
            error: 'AI service failed during response generation.',
            canRetry: true
        };
    }

    return {
      success: true,
      response: fullText
    };
  } catch (err) {
    clearTimeout(timeoutId);

    // Distinguish timeout from generic network errors
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out. The server may be waking up — please try again in a moment.',
        canRetry: true,
        isNetworkError: true
      };
    }

    return {
      success: false,
      error: 'Network Error: The server is unreachable.',
      canRetry: true,
      isNetworkError: true
    };
  }
};

/**
 * Clear chat history for a user
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
export const clearChatHistoryAPI = async (userId) => {
    try {
        const response = await fetch(`${API_URL}/api/chatbot/clear`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });
        return await response.json();
    } catch {
        return { success: false, error: 'Failed to clear history' };
    }
};

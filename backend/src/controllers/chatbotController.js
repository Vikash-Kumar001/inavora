const chatbotService = require('../services/chatbotService');
const { info, error: logError } = require('../utils/logger');

/**
 * Controller for chatbot interaction with streaming
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const askChatbot = async (req, res) => {
  const startTime = Date.now();
   try {
     const { userId, message, language } = req.body;

       info(`[Chatbot Request] User: ${userId}, Message length: ${message?.length || 0}, Language: ${language}`);

     if (!userId || !message) {
           info(`[Chatbot Validation Failed] Missing userId or message`);
           return res.status(400).json({
             success: false,
               error: 'Missing required fields: userId and message'
           });
       }

       // Set headers for streaming
       res.setHeader('Content-Type', 'text/plain; charset=utf-8');
       res.setHeader('Transfer-Encoding', 'chunked');
       res.setHeader('Cache-Control', 'no-cache');
       res.setHeader('Connection', 'keep-alive');

       info(`[Chatbot] Calling service for user ${userId}...`);
     const { stream, finalize } = await chatbotService.generateChatResponseStream(userId, message, language);

       for await (const chunk of stream) {
         const chunkText = typeof chunk === 'string' ? chunk : chunk.text();
           res.write(chunkText);
       }

     const endTime = Date.now();
     const latency = endTime - startTime;
       info(`[Chatbot] Stream completed | Latency: ${latency}ms | User: ${userId}`);

       res.end();
       
       // Finalize history and logging after stream is sent
       await finalize();

   } catch (err) {
     const endTime = Date.now();
     const latency = endTime - startTime;
     logError(`[Chatbot Controller Error] Latency: ${latency}ms`, err);
       
       // If headers are already sent, we can't send a JSON error
     if (res.headersSent) {
           res.write('\n[ERROR: AI service failure]');
           return res.end();
       }

     const statusCode = err.status || 500;
     const errorMessage = err.message || 'Failed to get response from chatbot.';

       return res.status(statusCode).json({
         success: false,
           error: errorMessage
       });
   }
};

/**
 * Controller to clear chatbot history
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const clearChatHistory = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: userId'
            });
        }

        await chatbotService.clearUserHistory(userId);
        return res.status(200).json({
            success: true,
            message: 'Chat history cleared successfully'
        });
    } catch (err) {
        logError('Clear chat history error:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to clear chat history.'
        });
    }
};

/**
 * Controller for chatbot health check
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const getChatbotHealth = async (req, res) => {
    try {
        const isGeminiHealthy = await chatbotService.checkGeminiHealth();
        
        return res.status(200).json({
            status: 'ok',
            service: 'chatbot',
            gemini: isGeminiHealthy ? 'connected' : 'disconnected'
        });
    } catch (err) {
        logError('Chatbot health check controller error:', err);
        return res.status(500).json({
            status: 'error',
            message: 'Health check failed'
        });
    }
};

module.exports = {
    askChatbot,
    clearChatHistory,
    getChatbotHealth
};

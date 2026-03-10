const express = require('express');
const router= express.Router();
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const chatbotController= require('../controllers/chatbotController');

/**
 * Rate limiting: 10 requests per minute per user
 */
const chatbotLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    keyGenerator: (req) => {
        // Use userId if available, otherwise use IP address (properly formatted for IPv6)
        return req.body.userId || ipKeyGenerator(req.ip);
    },
    message: {
        success: false,
        error: 'Too many requests from this user, please try again after a minute.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * /api/chatbot/ask:
 *   post:
 *     summary: Ask the Inavora Chatbot
 *     tags: [Chatbot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, message, language]
 *             properties:
 *               userId:
 *                 type: string
 *               message:
 *                 type: string
 *               language:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI Response
 *       400:
 *         description: Invalid input
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Chatbot Error
 */
router.post(
    '/ask',
   chatbotLimiter,
    (req, res, next) => {
        // Manual validation
       const { userId, message, language } = req.body;
        
       if (!userId) {
            return res.status(400).json({
               success: false,
                error: 'userId is required'
            });
        }
        
       if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
               success: false,
                error: 'message must be a non-empty string'
            });
        }
        
       if (message.length > 2000) {
            return res.status(400).json({
               success: false,
                error: 'message is too long (max 2000 characters)'
            });
        }
        
       if (!language) {
            return res.status(400).json({
               success: false,
                error: 'language is required'
            });
        }
        
        next();
    },
   chatbotController.askChatbot
);

/**
 * @swagger
 * /api/chatbot/clear:
 *   post:
 *     summary: Clear chat history for a user
 *     tags: [Chatbot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: History cleared
 *       500:
 *         description: Error clearing history
 */
router.post('/clear', chatbotController.clearChatHistory);

/**
 * @swagger
 * /api/chatbot/health:
 *   get:
 *     summary: Chatbot health check
 *     tags: [Chatbot]
 *     responses:
 *       200:
 *         description: Chatbot is ok
 *       503:
 *         description: Gemini is disconnected
 */
router.get('/health', chatbotController.getChatbotHealth);

module.exports = router;

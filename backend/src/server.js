process.env.DOTENV_CONFIG_DEBUG = 'false';
require('dotenv').config();

const Logger = require('./utils/logger');
const { validateEnv } = require('./config/validateEnv');
try {
  validateEnv();
} catch (error) {
  Logger.error('Environment validation failed', error);
  process.exit(1);
}

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
const initializeFirebase = require('./config/firebase');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/sanitize');
const { rateLimiters } = require('./middleware/rateLimiter');
const { requestLogger } = require('./middleware/requestLogger');
const healthRoutes = require('./routes/healthRoutes');
const setupSwagger = require('./config/swagger');
const authRoutes = require('./routes/authRoutes');
const presentationRoutes = require('./routes/presentationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const careersRoutes = require('./routes/careersRoutes');
const jobPostingRoutes = require('./routes/jobPostingRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const institutionAdminRoutes = require('./routes/institutionAdminRoutes');
const institutionRegistrationRoutes = require('./routes/institutionRegistrationRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const testEmailRoutes = require('./routes/testEmailRoutes');
const setupSocketHandlers = require('./socket/socketHandlers');
const { checkExpiredInstitutionSubscriptions } = require('./services/institutionPlanService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [`${process.env.FRONTEND_URL}`],
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 4001;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware (skip health checks to reduce log noise)
app.use((req, res, next) => {
  if (req.path.startsWith('/health')) {
    return next();
  }
  return requestLogger(req, res, next);
});

app.use(sanitizeInput);
app.use(rateLimiters.general);

app.set('io', io);

// Health check endpoints (before other routes, no rate limiting)
app.use('/health', healthRoutes);

// Swagger API documentation (only in development)
if (process.env.NODE_ENV !== 'production') {
  setupSwagger(app);
}

app.get('/', (req, res) => {
    res.json({
        message: 'welcome to Inavora! All systems are Healthy :)',
        status: 'running',
        version: '1.0.0',
        health: '/health'
    });
});

app.use('/api/auth', rateLimiters.auth, authRoutes);
app.use('/api/password-reset', passwordResetRoutes);
// Test email routes (remove in production or add authentication)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api', testEmailRoutes);
}
app.use('/api/payments', paymentRoutes);
app.use('/api/presentations', presentationRoutes);
app.use('/api/upload', rateLimiters.upload, uploadRoutes);
app.use('/api/careers', careersRoutes);
app.use('/api/job-postings', jobPostingRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/institution-admin', institutionAdminRoutes);
app.use('/api/institution/register', institutionRegistrationRoutes);

app.use(notFound);
app.use(errorHandler);

io.on('connection', (socket) => {
    // Only log socket connections in debug mode to reduce noise
    Logger.debug(`Client connected: ${socket.id}`);
    setupSocketHandlers(io, socket);
});
const startServer = async () => {
    try {
        await connectDB();
        initializeFirebase();
        
        server.listen(PORT, () => {
            Logger.startup('\n' + '='.repeat(50));
            Logger.startup('Server initialized successfully');
            Logger.info(`Server running on port ${PORT}`);
            Logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            Logger.info(`Socket.IO ready for connections`);
            Logger.startup('='.repeat(50) + '\n');
            
            // Start scheduled job to check expired institution subscriptions
            // Run every hour
            setInterval(async () => {
                try {
                    const result = await checkExpiredInstitutionSubscriptions();
                    if (result.success && result.expiredInstitutions > 0) {
                        Logger.info(`Scheduled job: ${result.expiredInstitutions} institutions expired, ${result.updatedUsers} users updated`);
                        
                        // Emit real-time notifications to affected users
                        if (io && result.userIds && result.userIds.length > 0) {
                            result.userIds.forEach(userId => {
                                io.to(`user-${userId}`).emit('plan-updated', {
                                    plan: 'free',
                                    source: 'original',
                                    message: 'Your institution subscription has expired. Your plan has been reverted to your original subscription.'
                                });
                            });
                        }
                    }
                } catch (error) {
                    Logger.error('Error in scheduled institution subscription check', error);
                }
            }, 60 * 60 * 1000); // Every hour
            
            // Run immediately on startup
            checkExpiredInstitutionSubscriptions().catch(error => {
                Logger.error('Error in initial institution subscription check', error);
            });
        });
    } catch (error) {
        Logger.error('Failed to start server', error);
        process.exit(1);
    }
};

startServer();

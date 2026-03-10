process.env.DOTENV_CONFIG_DEBUG = 'false';
require('dotenv').config();

const { error: _error, debug, startup, info } = require('./utils/logger');
const { validateEnv } = require('./config/validateEnv');

try {
    validateEnv();
} catch (error) {
    _error('Environment validation failed', error);
    process.exit(1);
}

const express = require('express');
const { json, urlencoded } = express;
const { createServer } = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/database');
const initializeFirebase = require('./config/firebase');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/sanitize');
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
const testimonialRoutes = require('./routes/testimonialRoutes');
const contactRoutes = require('./routes/contactRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');

const { checkMaintenanceMode } = require('./middleware/maintenanceMode');
const setupSocketHandlers = require('./socket/socketHandlers');
const { checkExpiredInstitutionSubscriptions } = require('./services/institutionPlanService');

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 4001;

/* =====================================================
   CORS CONFIGURATION
===================================================== */

const getAllowedOrigins = () => {
    const origins = new Set();

    origins.add('https://www.inavora.com');
    origins.add('https://inavora.com');
    origins.add('https://api.inavora.com');

    if (process.env.FRONTEND_URL) {
        origins.add(process.env.FRONTEND_URL);
    }

    origins.add('http://localhost:5173');
    origins.add('http://localhost:3000');

    return Array.from(origins);
};

const allowedOrigins = getAllowedOrigins();

/* =====================================================
   SOCKET.IO WITH SAFE CORS
===================================================== */

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);

            const isAllowed =
                allowedOrigins.includes(origin) ||
                origin.endsWith('.inavora.com') ||
                (process.env.NODE_ENV !== 'production' && origin.includes('localhost'));

            if (isAllowed) return callback(null, true);

            console.warn('Socket CORS blocked:', origin);
            return callback(null, false);
        },
        methods: ['GET', 'POST'],
        credentials: true
    }
});

/* =====================================================
   EXPRESS CORS (ONLY ONE)
===================================================== */

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const isAllowed =
            allowedOrigins.includes(origin) ||
            origin.endsWith('.inavora.com') ||
            (process.env.NODE_ENV !== 'production' && origin.includes('localhost'));

        if (isAllowed) return callback(null, true);

        console.warn('CORS blocked:', origin);
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
}));


/* =====================================================
   BODY PARSERS
===================================================== */

app.use(json({ limit: '150mb' }));
app.use(urlencoded({ extended: true, limit: '150mb' }));

// Security headers for production readiness
app.use((req, res, next) => {
    // Required for Firebase Auth popups
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    // Prevents clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Prevents XSS attacks
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Prevents MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});

app.use((req, res, next) => {
    if (req.path.startsWith('/health')) return next();
    return requestLogger(req, res, next);
});

app.use(sanitizeInput);

app.set('io', io);

/* =====================================================
   ROUTES
===================================================== */

app.use('/health', healthRoutes);

app.use('/api/maintenance', maintenanceRoutes);

if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
}

app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Inavora!',
        status: 'running',
        version: '1.0.0',
        health: '/health'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/password-reset', passwordResetRoutes);

if (process.env.NODE_ENV !== 'production') {
    app.use('/api', testEmailRoutes);
}


app.use('/api/payments', checkMaintenanceMode, paymentRoutes);
app.use('/api/presentations', checkMaintenanceMode, presentationRoutes);
app.use('/api/upload', checkMaintenanceMode, uploadRoutes);
app.use('/api/careers', checkMaintenanceMode, careersRoutes);
app.use('/api/job-postings', checkMaintenanceMode, jobPostingRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/institution-admin', checkMaintenanceMode, institutionAdminRoutes);
app.use('/api/institution/register', checkMaintenanceMode, institutionRegistrationRoutes);
app.use('/api/testimonials', checkMaintenanceMode, testimonialRoutes);
app.use('/api/contact', checkMaintenanceMode, contactRoutes);

app.use(notFound);
app.use(errorHandler);

/* =====================================================
   SOCKET CONNECTION
===================================================== */

io.on('connection', (socket) => {
    debug(`Client connected: ${socket.id}`);
    setupSocketHandlers(io, socket);
});

/* =====================================================
   SERVER START
===================================================== */

const startServer = async () => {
    try {
        await connectDB();
        initializeFirebase();

        server.listen(PORT, () => {
            startup('\n' + '='.repeat(50));
            startup('Server initialized successfully');
            info(`Server running on port ${PORT}`);
            info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            startup('='.repeat(50) + '\n');

            setInterval(async () => {
                try {
                    const result = await checkExpiredInstitutionSubscriptions();

                    if (result.success && result.expiredInstitutions > 0) {
                        info(
                            `Scheduled job: ${result.expiredInstitutions} institutions expired`
                        );

                        if (io && result.userIds?.length) {
                            result.userIds.forEach(userId => {
                                io.to(`user-${userId}`).emit('plan-updated', {
                                    plan: 'free',
                                    source: 'original',
                                    message:
                                        'Your institution subscription has expired. Your plan has been reverted.'
                                });
                            });
                        }
                    }
                } catch (error) {
                    _error('Subscription check failed', error);
                }
            }, 60 * 60 * 1000);

            checkExpiredInstitutionSubscriptions().catch(error =>
                _error('Initial subscription check failed', error)
            );
        });

    } catch (error) {
        _error('Failed to start server', error);
        process.exit(1);
    }
};

startServer();
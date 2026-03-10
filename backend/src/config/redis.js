const Redis = require('ioredis');
const { info, error: logError } = require('../utils/logger');

const redisOptions = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
        // Keep retrying in production, but don't log errors too aggressively in dev
        const delay = Math.min(times * 100, 3000);
        return delay;
    },
    maxRetriesPerRequest: null,
    // Add lazyConnect to prevent immediate failure if Redis is optional in dev
    lazyConnect: true,
};

const redis = new Redis(redisOptions);

redis.on('connect', () => {
    info('Redis connected successfully');
});

redis.on('error', (err) => {
    // Only log every 10th error to prevent console spam if Redis is down in dev
    if (!global.redisErrorCount) global.redisErrorCount = 0;
    global.redisErrorCount++;
    if (global.redisErrorCount % 10 === 0) {
        logError('Redis connection error (retry ' + global.redisErrorCount + ')', err);
    }
});

module.exports = redis;

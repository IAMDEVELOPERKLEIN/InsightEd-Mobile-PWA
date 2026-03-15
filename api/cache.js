import { createClient } from 'redis';

let redisClient = null;
const memoryCache = new Map();

/**
 * Initializes the Redis client or falls back to memory.
 */
export const initCache = async () => {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
        console.warn('⚠️ No REDIS_URL found. Using in-memory cache.');
        return;
    }

    try {
        redisClient = createClient({ url: redisUrl });
        redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err));
        await redisClient.connect();
        console.log('✅ Redis Cache Connected');
    } catch (err) {
        console.warn('⚠️ Redis Connection Failed. Falling back to in-memory cache.', err.message);
        redisClient = null;
    }
};

/**
 * Gets a value from the cache.
 * @param {string} key 
 */
export const getCache = async (key) => {
    if (redisClient) {
        try {
            const val = await redisClient.get(key);
            return val ? JSON.parse(val) : null;
        } catch (e) {
            console.error('Redis Get Error:', e);
        }
    }
    return memoryCache.get(key) || null;
};

/**
 * Sets a value in the cache with a TTL (Time To Live).
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlSeconds Default is 3600 (1 hour)
 */
export const setCache = async (key, value, ttlSeconds = 3600) => {
    const stringVal = JSON.stringify(value);
    
    if (redisClient) {
        try {
            await redisClient.set(key, stringVal, {
                EX: ttlSeconds
            });
            return;
        } catch (e) {
            console.error('Redis Set Error:', e);
        }
    }
    
    memoryCache.set(key, value);
    // Basic memory TTL simulation
    setTimeout(() => {
        memoryCache.delete(key);
    }, ttlSeconds * 1000);
};

/**
 * Middleware for caching GET requests.
 * @param {number} ttlSeconds 
 */
export const cacheMiddleware = (ttlSeconds = 300) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') return next();

        const key = `cache:${req.originalUrl || req.url}`;
        const cachedResponse = await getCache(key);

        if (cachedResponse) {
            // console.log(`🚀 Cache Hit: ${key}`);
            return res.json(cachedResponse);
        }

        // Override res.json to capture the response and cache it
        const originalJson = res.json;
        res.json = (body) => {
            setCache(key, body, ttlSeconds);
            return originalJson.call(res, body);
        };

        next();
    };
};

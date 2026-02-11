import rateLimit from 'express-rate-limit';

/**
 * Rate Limit Middleware
 * Prevents abuse by limiting the number of requests from a single IP.
 * Configured for 100 requests per 15 minutes.
 */
export const rateLimitMiddleware = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

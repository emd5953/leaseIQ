import rateLimit from 'express-rate-limit';

// Standard rate limiter for general API endpoints
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests',
    message: 'Please try again in 15 minutes',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for expensive operations (AI analysis, document processing)
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: {
    error: 'Too many requests',
    message: 'Analysis endpoints are rate limited. Please try again in 15 minutes',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Relaxed rate limiter for search/read operations
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    error: 'Too many search requests',
    message: 'Please slow down your search requests',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Webhook rate limiter (more permissive for external services)
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too many webhook requests',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

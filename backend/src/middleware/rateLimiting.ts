import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Enhanced rate limiting with security logging
const createRateLimitHandler = (limitType: string) => {
  return (req: Request, res: Response) => {
    // Log rate limit violations
    logger.security(`Rate limit exceeded: ${limitType}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      path: req.path,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip'],
        referer: req.headers.referer,
        origin: req.headers.origin,
      },
      timestamp: new Date().toISOString(),
      limitType,
    });

    res.status(429).json({
      error: {
        type: 'RATE_LIMIT_ERROR',
        message: `Too many ${limitType} requests from this IP, please try again later.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: res.getHeader('Retry-After'),
      },
    });
  };
};

// General API rate limiting
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: createRateLimitHandler('general API'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use X-Forwarded-For if available (for proxy setups)
    return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path.startsWith('/health');
  },
});

// Strict rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: createRateLimitHandler('authentication'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  },
});

// Rate limiting for mailbox generation
export const mailboxGenerationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 mailbox generations per 5 minutes
  message: createRateLimitHandler('mailbox generation'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  },
});

// Rate limiting for mail operations
export const mailOperationRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 mail operations per minute
  message: createRateLimitHandler('mail operations'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  },
});

// Aggressive rate limiting for suspicious activity
export const suspiciousActivityRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1, // limit each IP to 1 request per hour for suspicious endpoints
  message: createRateLimitHandler('suspicious activity'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  },
});

// Dynamic rate limiting based on user behavior
export const createDynamicRateLimit = (
  windowMs: number,
  maxRequests: number,
  limitType: string
) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: createRateLimitHandler(limitType),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Combine IP with user agent for more granular tracking
      const ip =
        (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      return `${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 10)}`;
    },
    onLimitReached: (req: Request) => {
      logger.security(`Dynamic rate limit reached: ${limitType}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        timestamp: new Date().toISOString(),
      });
    },
  });
};

// Rate limiting for file uploads (if implemented)
export const uploadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // limit each IP to 5 uploads per 10 minutes
  message: createRateLimitHandler('file upload'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  },
});

// Export all rate limiters
export const rateLimiters = {
  general: generalRateLimit,
  auth: authRateLimit,
  mailboxGeneration: mailboxGenerationRateLimit,
  mailOperation: mailOperationRateLimit,
  suspiciousActivity: suspiciousActivityRateLimit,
  upload: uploadRateLimit,
  createDynamic: createDynamicRateLimit,
};

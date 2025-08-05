import { Request, Response, NextFunction } from 'express';
import csrf from 'csurf';
import { logger } from '../utils/logger';

// CSRF protection middleware configuration
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  value: (req: Request) => {
    // Check multiple sources for CSRF token
    return (
      req.body._csrf ||
      req.query._csrf ||
      req.headers['x-csrf-token'] ||
      req.headers['x-xsrf-token']
    );
  },
});

// Enhanced CSRF middleware with security logging
export const csrfMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip CSRF for health checks and public endpoints
  if (req.path.startsWith('/health') || req.path === '/api/csrf-token') {
    return next();
  }

  // In development, disable CSRF protection for easier testing
  if (process.env.NODE_ENV === 'development') {
    // Add a mock csrfToken function for development
    req.csrfToken = () => 'dev-csrf-token';
    return next();
  }

  csrfProtection(req, res, err => {
    if (err) {
      // Log CSRF attack attempts
      logger.security('CSRF token validation failed', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
        headers: {
          'x-csrf-token': req.headers['x-csrf-token'],
          'x-xsrf-token': req.headers['x-xsrf-token'],
          referer: req.headers.referer,
          origin: req.headers.origin,
        },
        body: req.method === 'POST' ? { _csrf: req.body._csrf } : undefined,
        error: err.message,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        error: {
          type: 'CSRF_ERROR',
          message: 'Invalid CSRF token',
          code: 'CSRF_TOKEN_INVALID',
        },
      });
    }

    next();
  });
};

// Endpoint to get CSRF token
export const getCsrfToken = (req: Request, res: Response) => {
  try {
    // In development, return a mock token
    if (process.env.NODE_ENV === 'development') {
      logger.security('CSRF token generated (development)', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      });

      return res.json({
        csrfToken: 'dev-csrf-token',
        expires: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      });
    }

    if (typeof req.csrfToken !== 'function') {
      throw new Error('CSRF token function not available');
    }
    const token = req.csrfToken();

    logger.security('CSRF token generated', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });

    res.json({
      csrfToken: token,
      expires: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    });
  } catch (error) {
    logger.error('Failed to generate CSRF token', error);
    res.status(500).json({
      error: {
        type: 'SERVER_ERROR',
        message: 'Failed to generate CSRF token',
        code: 'CSRF_TOKEN_GENERATION_FAILED',
      },
    });
  }
};

// Middleware to add CSRF token to response headers
export const addCsrfTokenHeader = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (typeof req.csrfToken === 'function') {
      res.setHeader('X-CSRF-Token', req.csrfToken());
    }
  } catch (error) {
    // Silently fail - CSRF token might not be available in all contexts
  }
  next();
};

// Type augmentation for Express Request
declare module 'express-serve-static-core' {
  interface Request {
    csrfToken?: () => string;
  }
}

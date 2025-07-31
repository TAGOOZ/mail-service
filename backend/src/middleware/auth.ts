import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        mailboxId: string;
        token: string;
      };
    }
  }
}

interface JWTPayload {
  mailboxId: string;
  token: string;
  iat?: number;
  exp?: number;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Authorization header is required',
          code: 'MISSING_AUTH_HEADER'
        }
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
      return res.status(401).json({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Token is required',
          code: 'MISSING_TOKEN'
        }
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({
        error: {
          type: 'SERVER_ERROR',
          message: 'Server configuration error',
          code: 'MISSING_JWT_SECRET'
        }
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    // Add user data to request object
    req.user = {
      mailboxId: decoded.mailboxId,
      token: decoded.token
    };

    logger.info(`Authentication successful for mailbox: ${decoded.mailboxId}`);
    next();
    
  } catch (error) {
    logger.warn(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        }
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        }
      });
    }
    
    return res.status(401).json({
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed',
        code: 'AUTH_FAILED'
      }
    });
  }
};

// Optional auth middleware - doesn't fail if no token provided
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next();
  }

  // If auth header exists, use regular auth middleware
  authMiddleware(req, res, next);
};

// Utility function to generate JWT token
export const generateToken = (mailboxId: string, mailboxToken: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign(
    { 
      mailboxId, 
      token: mailboxToken 
    },
    jwtSecret,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'temp-mail-api',
      audience: 'temp-mail-client'
    }
  );
};

// Utility function to verify and decode token without middleware
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    return jwt.verify(token, jwtSecret) as JWTPayload;
  } catch (error) {
    logger.warn(`Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};
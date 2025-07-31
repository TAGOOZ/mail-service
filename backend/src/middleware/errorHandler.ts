import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  type?: string;
  code?: string;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public type: string;
  public code: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    type: string = 'SERVER_ERROR',
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.code = code;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error classes for common scenarios
export class ValidationError extends CustomError {
  constructor(message: string, code: string = 'VALIDATION_FAILED') {
    super(message, 400, 'VALIDATION_ERROR', code);
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string, code: string = 'AUTH_FAILED') {
    super(message, 401, 'AUTHENTICATION_ERROR', code);
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string, code: string = 'ACCESS_DENIED') {
    super(message, 403, 'AUTHORIZATION_ERROR', code);
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string, code: string = 'NOT_FOUND') {
    super(message, 404, 'NOT_FOUND_ERROR', code);
  }
}

export class ConflictError extends CustomError {
  constructor(message: string, code: string = 'CONFLICT') {
    super(message, 409, 'CONFLICT_ERROR', code);
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string, code: string = 'RATE_LIMIT_EXCEEDED') {
    super(message, 429, 'RATE_LIMIT_ERROR', code);
  }
}

// Main error handling middleware
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error details
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode || 500,
    type: error.type || 'SERVER_ERROR',
    code: error.code || 'INTERNAL_ERROR',
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };

  // Log based on error severity
  if (error.statusCode && error.statusCode >= 500) {
    logger.error('Server Error:', errorInfo);
  } else if (error.statusCode && error.statusCode >= 400) {
    logger.warn('Client Error:', errorInfo);
  } else {
    logger.error('Unknown Error:', errorInfo);
  }

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const statusCode = error.statusCode || 500;
  
  // Prepare error response
  const errorResponse: any = {
    error: {
      type: error.type || 'SERVER_ERROR',
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR'
    }
  };

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    errorResponse.error.stack = error.stack;
  }

  // Add request ID if available
  if (req.headers['x-request-id']) {
    errorResponse.error.requestId = req.headers['x-request-id'];
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    errorResponse.error.type = 'VALIDATION_ERROR';
    errorResponse.error.code = 'VALIDATION_FAILED';
  } else if (error.name === 'CastError') {
    errorResponse.error.type = 'VALIDATION_ERROR';
    errorResponse.error.message = 'Invalid ID format';
    errorResponse.error.code = 'INVALID_ID';
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    errorResponse.error.type = 'CONFLICT_ERROR';
    errorResponse.error.message = 'Duplicate entry';
    errorResponse.error.code = 'DUPLICATE_ENTRY';
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper to catch async errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND');
  next(error);
};

// Global uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Exit process after logging
  process.exit(1);
});

// Global unhandled promise rejection handler
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
    timestamp: new Date().toISOString()
  });
  
  // Exit process after logging
  process.exit(1);
});
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, generateToken, verifyToken } from '../../middleware/auth';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    
    // Set test JWT secret
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should fail when no authorization header is provided', () => {
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Authorization header is required',
          code: 'MISSING_AUTH_HEADER'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when token is missing from authorization header', () => {
      mockRequest.headers = { authorization: 'Bearer' };

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Token is required',
          code: 'MISSING_TOKEN'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when token is invalid', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should succeed with valid token', () => {
      const payload = { mailboxId: 'test-mailbox', token: 'test-token' };
      const validToken = jwt.sign(payload, 'test-secret');
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(payload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle expired token', () => {
      const payload = { mailboxId: 'test-mailbox', token: 'test-token' };
      const expiredToken = jwt.sign(payload, 'test-secret', { expiresIn: '-1h' });
      mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const mailboxId = 'test-mailbox';
      const mailboxToken = 'test-token';

      const token = generateToken(mailboxId, mailboxToken);
      const decoded = jwt.verify(token, 'test-secret') as any;

      expect(decoded.mailboxId).toBe(mailboxId);
      expect(decoded.token).toBe(mailboxToken);
      expect(decoded.iss).toBe('temp-mail-api');
      expect(decoded.aud).toBe('temp-mail-client');
    });

    it('should throw error when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        generateToken('test-mailbox', 'test-token');
      }).toThrow('JWT_SECRET environment variable is not set');
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode valid token', () => {
      const payload = { mailboxId: 'test-mailbox', token: 'test-token' };
      const validToken = jwt.sign(payload, 'test-secret');

      const result = verifyToken(validToken);

      expect(result).toMatchObject(payload);
    });

    it('should return null for invalid token', () => {
      const result = verifyToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      const result = verifyToken('any-token');

      expect(result).toBeNull();
    });
  });
});
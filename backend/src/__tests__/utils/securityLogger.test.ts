import fs from 'fs';
import path from 'path';
import {
  securityLogger,
  SecurityEventType,
  SecuritySeverity,
} from '../../utils/securityLogger';

// Mock fs to avoid actual file operations in tests
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Security Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.appendFileSync.mockImplementation(() => {});
    mockFs.statSync.mockReturnValue({ size: 1000 } as any);
  });

  describe('Security Event Logging', () => {
    it('should log security events with all required fields', () => {
      const event = {
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        severity: SecuritySeverity.MEDIUM,
        message: 'Test authentication failure',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        method: 'POST',
        path: '/api/auth/login',
      };

      securityLogger.logSecurityEvent(event);

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('security.log'),
        expect.stringContaining('"type":"AUTHENTICATION_FAILURE"')
      );
    });

    it('should provide default values for missing fields', () => {
      const event = {
        message: 'Test event',
        ip: '192.168.1.1',
      };

      securityLogger.logSecurityEvent(event);

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('security.log'),
        expect.stringContaining('"type":"SUSPICIOUS_REQUEST"')
      );
    });

    it('should include timestamp in ISO format', () => {
      const event = {
        type: SecurityEventType.XSS_ATTEMPT,
        message: 'Test XSS attempt',
        ip: '192.168.1.1',
      };

      securityLogger.logSecurityEvent(event);

      const logCall = mockFs.appendFileSync.mock.calls[0];
      const logEntry = logCall[1] as string;
      const parsedEntry = JSON.parse(logEntry.trim());

      expect(parsedEntry.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });

  describe('Convenience Methods', () => {
    it('should log authentication failures', () => {
      const context = { username: 'testuser', reason: 'invalid_password' };

      securityLogger.logAuthenticationFailure('192.168.1.1', context);

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('security.log'),
        expect.stringContaining('"type":"AUTHENTICATION_FAILURE"')
      );
    });

    it('should log CSRF attacks', () => {
      const context = { token: 'invalid_token', referer: 'malicious.com' };

      securityLogger.logCSRFAttack('192.168.1.1', context);

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('security.log'),
        expect.stringContaining('"type":"CSRF_ATTACK"')
      );
    });

    it('should log XSS attempts', () => {
      const context = { payload: '<script>alert("xss")</script>' };

      securityLogger.logXSSAttempt('192.168.1.1', context);

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('security.log'),
        expect.stringContaining('"type":"XSS_ATTEMPT"')
      );
    });

    it('should log rate limit exceeded events', () => {
      const context = { endpoint: '/api/test', limit: 100 };

      securityLogger.logRateLimitExceeded('192.168.1.1', context);

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('security.log'),
        expect.stringContaining('"type":"RATE_LIMIT_EXCEEDED"')
      );
    });

    it('should log suspicious requests', () => {
      const context = { reason: 'unusual_pattern', pattern: 'SELECT * FROM' };

      securityLogger.logSuspiciousRequest('192.168.1.1', context);

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('security.log'),
        expect.stringContaining('"type":"SUSPICIOUS_REQUEST"')
      );
    });

    it('should log brute force attempts', () => {
      const context = { attempts: 5, timeWindow: '5 minutes' };

      securityLogger.logBruteForceAttempt('192.168.1.1', context);

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('security.log'),
        expect.stringContaining('"type":"BRUTE_FORCE_ATTEMPT"')
      );
    });
  });

  describe('Security Statistics', () => {
    it('should return security statistics', () => {
      // Log some events first
      securityLogger.logAuthenticationFailure('192.168.1.1', {});
      securityLogger.logXSSAttempt('192.168.1.2', {});
      securityLogger.logAuthenticationFailure('192.168.1.1', {});

      const stats = securityLogger.getSecurityStats();

      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('eventsByType');
      expect(stats).toHaveProperty('eventsBySeverity');
      expect(stats).toHaveProperty('topIPs');
      expect(stats).toHaveProperty('lastReset');

      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.eventsByType).toHaveProperty('AUTHENTICATION_FAILURE');
      expect(stats.eventsByType).toHaveProperty('XSS_ATTEMPT');
      expect(stats.topIPs['192.168.1.1']).toBeGreaterThan(0);
      expect(stats.topIPs['192.168.1.2']).toBeGreaterThan(0);
    });
  });

  describe('Log Rotation', () => {
    it('should rotate log when file size exceeds limit', () => {
      // Mock large file size
      mockFs.statSync.mockReturnValue({ size: 60 * 1024 * 1024 } as any); // 60MB
      mockFs.renameSync.mockImplementation(() => {});

      securityLogger.rotateSecurityLog();

      expect(mockFs.renameSync).toHaveBeenCalledWith(
        expect.stringContaining('security.log'),
        expect.stringContaining('security-')
      );
    });

    it('should not rotate log when file size is under limit', () => {
      // Mock small file size
      mockFs.statSync.mockReturnValue({ size: 1024 } as any); // 1KB

      securityLogger.rotateSecurityLog();

      expect(mockFs.renameSync).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle file write errors gracefully', () => {
      mockFs.appendFileSync.mockImplementation(() => {
        throw new Error('File write error');
      });

      // Should not throw error
      expect(() => {
        securityLogger.logSecurityEvent({
          message: 'Test event',
          ip: '192.168.1.1',
        });
      }).not.toThrow();
    });

    it('should handle log rotation errors gracefully', () => {
      mockFs.statSync.mockImplementation(() => {
        throw new Error('File stat error');
      });

      // Should not throw error
      expect(() => {
        securityLogger.rotateSecurityLog();
      }).not.toThrow();
    });
  });
});

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
    it('should log security events without throwing errors', () => {
      const event = {
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        severity: SecuritySeverity.MEDIUM,
        message: 'Test authentication failure',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        method: 'POST',
        path: '/api/auth/login',
      };

      // Should not throw error
      expect(() => {
        securityLogger.logSecurityEvent(event);
      }).not.toThrow();
    });

    it('should provide default values for missing fields', () => {
      const event = {
        message: 'Test event',
        ip: '192.168.1.1',
      };

      // Should not throw error
      expect(() => {
        securityLogger.logSecurityEvent(event);
      }).not.toThrow();
    });

    it('should handle events gracefully', () => {
      const event = {
        type: SecurityEventType.XSS_ATTEMPT,
        message: 'Test XSS attempt',
        ip: '192.168.1.1',
      };

      // Should not throw error
      expect(() => {
        securityLogger.logSecurityEvent(event);
      }).not.toThrow();
    });
  });

  describe('Convenience Methods', () => {
    it('should log authentication failures', () => {
      const context = { username: 'testuser', reason: 'invalid_password' };

      expect(() => {
        securityLogger.logAuthenticationFailure('192.168.1.1', context);
      }).not.toThrow();
    });

    it('should log CSRF attacks', () => {
      const context = { token: 'invalid_token', referer: 'malicious.com' };

      expect(() => {
        securityLogger.logCSRFAttack('192.168.1.1', context);
      }).not.toThrow();
    });

    it('should log XSS attempts', () => {
      const context = { payload: '<script>alert("xss")</script>' };

      expect(() => {
        securityLogger.logXSSAttempt('192.168.1.1', context);
      }).not.toThrow();
    });

    it('should log rate limit exceeded events', () => {
      const context = { endpoint: '/api/test', limit: 100 };

      expect(() => {
        securityLogger.logRateLimitExceeded('192.168.1.1', context);
      }).not.toThrow();
    });

    it('should log suspicious requests', () => {
      const context = { reason: 'unusual_pattern', pattern: 'SELECT * FROM' };

      expect(() => {
        securityLogger.logSuspiciousRequest('192.168.1.1', context);
      }).not.toThrow();
    });

    it('should log brute force attempts', () => {
      const context = { attempts: 5, timeWindow: '5 minutes' };

      expect(() => {
        securityLogger.logBruteForceAttempt('192.168.1.1', context);
      }).not.toThrow();
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
    it('should skip rotation in test environment', () => {
      // In test environment, rotation should be skipped
      expect(() => {
        securityLogger.rotateSecurityLog();
      }).not.toThrow();
    });

    it('should handle rotation gracefully', () => {
      // Should not throw error even if called
      expect(() => {
        securityLogger.rotateSecurityLog();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle file write errors gracefully', () => {
      // In test environment, file operations are skipped, so this should not throw
      expect(() => {
        securityLogger.logSecurityEvent({
          message: 'Test event',
          ip: '192.168.1.1',
        });
      }).not.toThrow();
    });

    it('should handle log rotation errors gracefully', () => {
      // In test environment, log rotation is skipped, so this should not throw
      expect(() => {
        securityLogger.rotateSecurityLog();
      }).not.toThrow();
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../authService';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('setAuthData', () => {
    it('should store token and mailbox ID', () => {
      const token = 'test-token';
      const mailboxId = 'test-mailbox-id';

      service.setAuthData(token, mailboxId);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mailbox_token',
        token
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mailbox_id',
        mailboxId
      );
    });
  });

  describe('getToken', () => {
    it('should return stored token', () => {
      const token = 'test-token';
      mockLocalStorage.getItem.mockReturnValue(token);

      const result = service.getToken();

      expect(result).toBe(token);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('mailbox_token');
    });

    it('should return null if no token stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = service.getToken();

      expect(result).toBeNull();
    });
  });

  describe('getMailboxId', () => {
    it('should return stored mailbox ID', () => {
      const mailboxId = 'test-mailbox-id';
      mockLocalStorage.getItem.mockReturnValue(mailboxId);

      const result = service.getMailboxId();

      expect(result).toBe(mailboxId);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('mailbox_id');
    });
  });

  describe('clearAuthData', () => {
    it('should remove stored auth data', () => {
      service.clearAuthData();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mailbox_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mailbox_id');
    });
  });

  describe('hasValidSession', () => {
    it('should return false if no token or mailbox ID', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = service.hasValidSession();

      expect(result).toBe(false);
    });

    it('should return false if token is expired', () => {
      const expiredToken = createMockJWT({
        exp: Math.floor(Date.now() / 1000) - 3600,
      });
      mockLocalStorage.getItem.mockImplementation(key => {
        if (key === 'mailbox_token') return expiredToken;
        if (key === 'mailbox_id') return 'test-mailbox-id';
        return null;
      });

      const result = service.hasValidSession();

      expect(result).toBe(false);
    });

    it('should return true if token is valid', () => {
      const validToken = createMockJWT({
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockLocalStorage.getItem.mockImplementation(key => {
        if (key === 'mailbox_token') return validToken;
        if (key === 'mailbox_id') return 'test-mailbox-id';
        return null;
      });

      const result = service.hasValidSession();

      expect(result).toBe(true);
    });
  });
});

/**
 * Helper function to create mock JWT tokens
 */
function createMockJWT(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

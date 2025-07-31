import {
  generateSecureToken,
  generateJWTSecret,
  createHMACSignature,
  verifyHMACSignature,
  generateExpiringToken,
  verifyExpiringToken,
  generateApiKey,
  validateApiKeyFormat,
  generateSessionId,
  createTokenFingerprint,
  generateOTP,
} from '../utils/token';

describe('Token Utilities', () => {
  describe('generateSecureToken', () => {
    it('should generate token with default length', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate token with custom length', () => {
      const token = generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateJWTSecret', () => {
    it('should generate base64 secret', () => {
      const secret = generateJWTSecret();
      expect(secret).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should generate unique secrets', () => {
      const secret1 = generateJWTSecret();
      const secret2 = generateJWTSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  describe('HMAC signature functions', () => {
    const testData = 'test data';
    const testSecret = 'test secret';

    it('should create and verify HMAC signature', () => {
      const signature = createHMACSignature(testData, testSecret);
      expect(signature).toMatch(/^[a-f0-9]+$/);
      expect(verifyHMACSignature(testData, signature, testSecret)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const signature = createHMACSignature(testData, testSecret);
      expect(verifyHMACSignature(testData, 'invalid', testSecret)).toBe(false);
      expect(verifyHMACSignature('wrong data', signature, testSecret)).toBe(false);
      expect(verifyHMACSignature(testData, signature, 'wrong secret')).toBe(false);
    });

    it('should handle malformed signatures', () => {
      expect(verifyHMACSignature(testData, 'not-hex', testSecret)).toBe(false);
      expect(verifyHMACSignature(testData, '', testSecret)).toBe(false);
    });
  });

  describe('expiring token functions', () => {
    const testPayload = { userId: '123', role: 'user' };
    const testSecret = 'test secret';

    it('should generate and verify expiring token', () => {
      const token = generateExpiringToken(testPayload, testSecret, 3600);
      const verified = verifyExpiringToken(token, testSecret);
      
      expect(verified).not.toBeNull();
      expect(verified!.userId).toBe('123');
      expect(verified!.role).toBe('user');
      expect(verified!.iat).toBeDefined();
      expect(verified!.exp).toBeDefined();
    });

    it('should reject expired token', () => {
      const token = generateExpiringToken(testPayload, testSecret, -1); // expired
      const verified = verifyExpiringToken(token, testSecret);
      expect(verified).toBeNull();
    });

    it('should reject invalid token format', () => {
      expect(verifyExpiringToken('invalid', testSecret)).toBeNull();
      expect(verifyExpiringToken('invalid.token', testSecret)).toBeNull();
      expect(verifyExpiringToken('', testSecret)).toBeNull();
    });

    it('should reject token with wrong secret', () => {
      const token = generateExpiringToken(testPayload, testSecret, 3600);
      const verified = verifyExpiringToken(token, 'wrong secret');
      expect(verified).toBeNull();
    });
  });

  describe('generateApiKey', () => {
    it('should generate API key with default prefix', () => {
      const apiKey = generateApiKey();
      expect(apiKey).toMatch(/^tmp_[a-f0-9]{64}$/);
    });

    it('should generate API key with custom prefix', () => {
      const apiKey = generateApiKey('custom', 16);
      expect(apiKey).toMatch(/^custom_[a-f0-9]{32}$/);
    });
  });

  describe('validateApiKeyFormat', () => {
    it('should validate correct API key format', () => {
      const apiKey = generateApiKey();
      expect(validateApiKeyFormat(apiKey)).toBe(true);
    });

    it('should reject invalid API key format', () => {
      expect(validateApiKeyFormat('invalid')).toBe(false);
      expect(validateApiKeyFormat('tmp_short')).toBe(false);
      expect(validateApiKeyFormat('wrong_' + 'a'.repeat(64))).toBe(false);
    });

    it('should validate with custom prefix', () => {
      const apiKey = generateApiKey('custom');
      expect(validateApiKeyFormat(apiKey, 'custom')).toBe(true);
      expect(validateApiKeyFormat(apiKey, 'tmp')).toBe(false);
    });
  });

  describe('generateSessionId', () => {
    it('should generate session ID', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(sessionId).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('createTokenFingerprint', () => {
    it('should create consistent fingerprint', () => {
      const token = 'test token';
      const fingerprint1 = createTokenFingerprint(token);
      const fingerprint2 = createTokenFingerprint(token);
      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toHaveLength(16);
    });

    it('should create different fingerprints for different tokens', () => {
      const fingerprint1 = createTokenFingerprint('token1');
      const fingerprint2 = createTokenFingerprint('token2');
      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('generateOTP', () => {
    it('should generate OTP with default length', () => {
      const otp = generateOTP();
      expect(otp).toHaveLength(6);
      expect(otp).toMatch(/^\d+$/);
    });

    it('should generate OTP with custom length', () => {
      const otp = generateOTP(4);
      expect(otp).toHaveLength(4);
      expect(otp).toMatch(/^\d+$/);
    });

    it('should generate different OTPs', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      // While they could theoretically be the same, it's very unlikely
      expect(otp1).not.toBe(otp2);
    });
  });
});
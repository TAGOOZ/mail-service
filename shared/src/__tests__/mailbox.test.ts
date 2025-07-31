import {
  generateMailboxAddress,
  validateMailboxAddress,
  generateMailboxId,
  calculateExpiryTime,
  isMailboxExpired,
  getRemainingMinutes,
  canExtendMailbox,
  hashMailboxAddress,
} from '../utils/mailbox';

describe('Mailbox Utilities', () => {
  describe('generateMailboxAddress', () => {
    it('should generate a valid mailbox address with default domain', () => {
      const address = generateMailboxAddress();
      expect(address).toMatch(/^[a-f0-9]{8}@nnu\.edu\.kg$/);
    });

    it('should generate a valid mailbox address with custom domain', () => {
      const address = generateMailboxAddress('example.com');
      expect(address).toMatch(/^[a-f0-9]{8}@example\.com$/);
    });

    it('should generate unique addresses', () => {
      const address1 = generateMailboxAddress();
      const address2 = generateMailboxAddress();
      expect(address1).not.toBe(address2);
    });
  });

  describe('validateMailboxAddress', () => {
    it('should validate correct mailbox addresses', () => {
      expect(validateMailboxAddress('abc12345@nnu.edu.kg')).toBe(true);
      expect(validateMailboxAddress('12345678@nnu.edu.kg')).toBe(true);
    });

    it('should reject invalid mailbox addresses', () => {
      expect(validateMailboxAddress('invalid@nnu.edu.kg')).toBe(false); // too short
      expect(validateMailboxAddress('toolongaddress@nnu.edu.kg')).toBe(false); // too long
      expect(validateMailboxAddress('abc12345@wrong.com')).toBe(false); // wrong domain
      expect(validateMailboxAddress('abc-1234@nnu.edu.kg')).toBe(false); // invalid characters
      expect(validateMailboxAddress('not-an-email')).toBe(false); // not an email
    });

    it('should validate with custom domain', () => {
      expect(validateMailboxAddress('abc12345@example.com', 'example.com')).toBe(true);
      expect(validateMailboxAddress('abc12345@nnu.edu.kg', 'example.com')).toBe(false);
    });
  });

  describe('generateMailboxId', () => {
    it('should generate a valid UUID format', () => {
      const id = generateMailboxId();
      expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateMailboxId();
      const id2 = generateMailboxId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('calculateExpiryTime', () => {
    it('should calculate expiry time correctly', () => {
      const createdAt = new Date('2023-01-01T12:00:00Z');
      const expiryTime = calculateExpiryTime(createdAt, 24);
      expect(expiryTime).toEqual(new Date('2023-01-02T12:00:00Z'));
    });

    it('should use current time as default', () => {
      const before = new Date();
      const expiryTime = calculateExpiryTime();
      const after = new Date();
      
      const expectedMin = new Date(before.getTime() + 24 * 60 * 60 * 1000);
      const expectedMax = new Date(after.getTime() + 24 * 60 * 60 * 1000);
      
      expect(expiryTime.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(expiryTime.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });
  });

  describe('isMailboxExpired', () => {
    it('should return true for expired mailbox', () => {
      const expiresAt = new Date('2023-01-01T12:00:00Z');
      const currentTime = new Date('2023-01-01T13:00:00Z');
      expect(isMailboxExpired(expiresAt, currentTime)).toBe(true);
    });

    it('should return false for non-expired mailbox', () => {
      const expiresAt = new Date('2023-01-01T13:00:00Z');
      const currentTime = new Date('2023-01-01T12:00:00Z');
      expect(isMailboxExpired(expiresAt, currentTime)).toBe(false);
    });
  });

  describe('getRemainingMinutes', () => {
    it('should calculate remaining minutes correctly', () => {
      const expiresAt = new Date('2023-01-01T13:00:00Z');
      const currentTime = new Date('2023-01-01T12:00:00Z');
      expect(getRemainingMinutes(expiresAt, currentTime)).toBe(60);
    });

    it('should return 0 for expired mailbox', () => {
      const expiresAt = new Date('2023-01-01T12:00:00Z');
      const currentTime = new Date('2023-01-01T13:00:00Z');
      expect(getRemainingMinutes(expiresAt, currentTime)).toBe(0);
    });
  });

  describe('canExtendMailbox', () => {
    it('should allow extension when under limit', () => {
      expect(canExtendMailbox(0, 2)).toBe(true);
      expect(canExtendMailbox(1, 2)).toBe(true);
    });

    it('should not allow extension when at limit', () => {
      expect(canExtendMailbox(2, 2)).toBe(false);
      expect(canExtendMailbox(3, 2)).toBe(false);
    });
  });

  describe('hashMailboxAddress', () => {
    it('should generate consistent hash for same address', () => {
      const address = 'test@nnu.edu.kg';
      const hash1 = hashMailboxAddress(address);
      const hash2 = hashMailboxAddress(address);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different addresses', () => {
      const hash1 = hashMailboxAddress('test1@nnu.edu.kg');
      const hash2 = hashMailboxAddress('test2@nnu.edu.kg');
      expect(hash1).not.toBe(hash2);
    });

    it('should be case insensitive', () => {
      const hash1 = hashMailboxAddress('Test@NNU.EDU.KG');
      const hash2 = hashMailboxAddress('test@nnu.edu.kg');
      expect(hash1).toBe(hash2);
    });
  });
});
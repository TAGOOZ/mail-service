import { MailboxService } from '../../services/mailboxService';
import { Mailbox } from '../../models/Mailbox';
import { Mail } from '../../models/Mail';

// Mock dependencies
jest.mock('../../models/Mailbox');
jest.mock('../../models/Mail');
jest.mock('@nnu/shared');
jest.mock('../../utils/logger');

const MockedMailbox = Mailbox as jest.Mocked<typeof Mailbox>;
const MockedMail = Mail as jest.Mocked<typeof Mail>;

describe('MailboxService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMailbox', () => {
    it('should generate a new mailbox successfully', async () => {
      // Arrange
      const mockMailbox = {
        id: 'mailbox-id-123',
        address: 'test@nnu.edu.kg',
        token: 'mock-token',
        expiresAt: new Date('2024-01-02T00:00:00Z'),
        save: jest.fn().mockResolvedValue(true),
      };

      MockedMailbox.findOne.mockResolvedValue(null);
      MockedMailbox.prototype.constructor = jest
        .fn()
        .mockReturnValue(mockMailbox);
      MockedMailbox.prototype.save = jest.fn().mockResolvedValue(mockMailbox);

      // Act
      const result = await MailboxService.generateMailbox();

      // Assert
      expect(result).toHaveProperty('mailboxId');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
    });
  });

  describe('getMailboxByToken', () => {
    it('should return mailbox when found', async () => {
      // Arrange
      const mockToken = 'mock-token-123';
      const mockMailbox = {
        id: 'mailbox-id-123',
        token: mockToken,
        lastAccessAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      MockedMailbox.findByToken.mockResolvedValue(mockMailbox as any);

      // Act
      const result = await MailboxService.getMailboxByToken(mockToken);

      // Assert
      expect(result).toBe(mockMailbox);
      expect(mockMailbox.save).toHaveBeenCalled();
    });

    it('should return null when not found', async () => {
      // Arrange
      MockedMailbox.findByToken.mockResolvedValue(null);

      // Act
      const result = await MailboxService.getMailboxByToken('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('deleteMailbox', () => {
    it('should delete mailbox and related mails', async () => {
      // Arrange
      const mockMailbox = { id: 'test-id', address: 'test@nnu.edu.kg' };
      MockedMailbox.findById.mockResolvedValue(mockMailbox as any);
      MockedMail.deleteMany.mockResolvedValue({ deletedCount: 3 } as any);
      MockedMailbox.findByIdAndDelete.mockResolvedValue(mockMailbox as any);

      // Act
      const result = await MailboxService.deleteMailbox('test-id');

      // Assert
      expect(result).toBe(true);
      expect(MockedMail.deleteMany).toHaveBeenCalledWith({
        mailboxId: 'test-id',
      });
      expect(MockedMailbox.findByIdAndDelete).toHaveBeenCalledWith('test-id');
    });
  });

  describe('cleanupExpiredMailboxes', () => {
    it('should cleanup expired mailboxes', async () => {
      // Arrange
      const mockExpiredMailboxes = [
        { id: 'mailbox-1', address: 'test1@nnu.edu.kg' },
        { id: 'mailbox-2', address: 'test2@nnu.edu.kg' },
      ];

      MockedMailbox.findExpiredMailboxes.mockResolvedValue(
        mockExpiredMailboxes as any
      );
      MockedMail.deleteMany.mockResolvedValue({ deletedCount: 5 } as any);
      MockedMailbox.findByIdAndDelete.mockResolvedValue({} as any);

      // Act
      const result = await MailboxService.cleanupExpiredMailboxes();

      // Assert
      expect(result).toBe(2);
      expect(MockedMail.deleteMany).toHaveBeenCalledTimes(2);
      expect(MockedMailbox.findByIdAndDelete).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateAccess', () => {
    it('should return true for valid access', async () => {
      // Arrange
      const mockMailbox = {
        id: 'test-id',
        token: 'valid-token',
        isActive: true,
        isExpired: jest.fn().mockReturnValue(false),
      };

      MockedMailbox.findById.mockResolvedValue(mockMailbox as any);

      // Act
      const result = await MailboxService.validateAccess(
        'test-id',
        'valid-token'
      );

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      // Arrange
      const mockMailbox = {
        id: 'test-id',
        token: 'different-token',
        isActive: true,
        isExpired: jest.fn().mockReturnValue(false),
      };

      MockedMailbox.findById.mockResolvedValue(mockMailbox as any);

      // Act
      const result = await MailboxService.validateAccess(
        'test-id',
        'invalid-token'
      );

      // Assert
      expect(result).toBe(false);
    });
  });
});

import { DatabaseService } from '../services/database';
import { Mailbox, IMailbox } from '../models/Mailbox';
import { Mail, IMail } from '../models/Mail';
import { SessionManager } from '../models/Session';

// Mock environment variables for testing
process.env.MONGODB_URI = 'mongodb://localhost:27017/tempmail_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';

describe('Database Configuration', () => {
  describe('Database Service', () => {
    it('should have correct initialization methods', () => {
      expect(typeof DatabaseService.initialize).toBe('function');
      expect(typeof DatabaseService.shutdown).toBe('function');
      expect(typeof DatabaseService.isReady).toBe('function');
      expect(typeof DatabaseService.getHealthStatus).toBe('function');
    });

    it('should start as not ready', () => {
      expect(DatabaseService.isReady()).toBe(false);
    });
  });

  describe('Mailbox Model Schema', () => {
    it('should have correct schema structure', () => {
      const mailboxSchema = Mailbox.schema;

      expect(mailboxSchema.paths.address).toBeDefined();
      expect(mailboxSchema.paths.token).toBeDefined();
      expect(mailboxSchema.paths.expiresAt).toBeDefined();
      expect(mailboxSchema.paths.extensionCount).toBeDefined();
      expect(mailboxSchema.paths.isActive).toBeDefined();
      expect(mailboxSchema.paths.lastAccessAt).toBeDefined();
    });

    it('should have correct default values', () => {
      const mailbox = new Mailbox({
        address: 'test@nnu.edu.kg',
        token: 'test-token',
        expiresAt: new Date(),
      });

      expect(mailbox.isActive).toBe(true);
      expect(mailbox.extensionCount).toBe(0);
    });

    it('should have required fields', () => {
      const mailboxSchema = Mailbox.schema;

      expect(mailboxSchema.paths.address.isRequired).toBe(true);
      expect(mailboxSchema.paths.token.isRequired).toBe(true);
      expect(mailboxSchema.paths.expiresAt.isRequired).toBe(true);
    });

    it('should have correct validation for address field', () => {
      const mailboxSchema = Mailbox.schema;
      const addressPath = mailboxSchema.paths.address;

      expect(addressPath.validators).toBeDefined();
      expect(addressPath.validators.length).toBeGreaterThan(0);
    });
  });

  describe('Mail Model Schema', () => {
    it('should have correct schema structure', () => {
      const mailSchema = Mail.schema;

      expect(mailSchema.paths.mailboxId).toBeDefined();
      expect(mailSchema.paths.from).toBeDefined();
      expect(mailSchema.paths.to).toBeDefined();
      expect(mailSchema.paths.subject).toBeDefined();
      expect(mailSchema.paths.textContent).toBeDefined();
      expect(mailSchema.paths.htmlContent).toBeDefined();
      expect(mailSchema.paths.attachments).toBeDefined();
      expect(mailSchema.paths.receivedAt).toBeDefined();
      expect(mailSchema.paths.isRead).toBeDefined();
      expect(mailSchema.paths.size).toBeDefined();
    });

    it('should have correct default values', () => {
      const mail = new Mail({
        mailboxId: 'test-mailbox',
        from: 'sender@example.com',
        to: 'test@nnu.edu.kg',
        size: 1024,
      });

      expect(mail.isRead).toBe(false);
      expect(mail.subject).toBe('(No Subject)');
      expect(mail.textContent).toBe('');
    });

    it('should have required fields', () => {
      const mailSchema = Mail.schema;

      expect(mailSchema.paths.mailboxId.isRequired).toBe(true);
      expect(mailSchema.paths.from.isRequired).toBe(true);
      expect(mailSchema.paths.to.isRequired).toBe(true);
      expect(mailSchema.paths.size.isRequired).toBe(true);
    });
  });

  describe('Session Manager', () => {
    it('should have correct static methods', () => {
      expect(typeof SessionManager.createSession).toBe('function');
      expect(typeof SessionManager.getSession).toBe('function');
      expect(typeof SessionManager.updateLastAccess).toBe('function');
      expect(typeof SessionManager.deleteSession).toBe('function');
      expect(typeof SessionManager.deleteMailboxSessions).toBe('function');
      expect(typeof SessionManager.getMailboxSessions).toBe('function');
      expect(typeof SessionManager.isValidSession).toBe('function');
    });
  });

  describe('Model Instance Methods', () => {
    it('should create mailbox instance with methods', () => {
      const mailboxData = {
        address: 'test@nnu.edu.kg',
        token: 'test-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const mailbox = new Mailbox(mailboxData);

      expect(typeof mailbox.isExpired).toBe('function');
      expect(typeof mailbox.canExtend).toBe('function');
      expect(typeof mailbox.extend).toBe('function');
    });

    it('should create mail instance with methods', () => {
      const mailData = {
        mailboxId: 'test-mailbox-id',
        from: 'sender@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Test Email',
        textContent: 'Test content',
        size: 1024,
      };

      const mail = new Mail(mailData);

      expect(typeof mail.markAsRead).toBe('function');
      expect(typeof mail.hasAttachments).toBe('function');
      expect(typeof mail.getAttachmentCount).toBe('function');
    });
  });

  describe('Model Static Methods', () => {
    it('should have mailbox static methods', () => {
      expect(typeof Mailbox.findByToken).toBe('function');
      expect(typeof Mailbox.findActiveMailboxes).toBe('function');
      expect(typeof Mailbox.findExpiredMailboxes).toBe('function');
    });

    it('should have mail static methods', () => {
      expect(typeof Mail.findByMailboxId).toBe('function');
      expect(typeof Mail.countByMailboxId).toBe('function');
      expect(typeof Mail.deleteByMailboxId).toBe('function');
      expect(typeof Mail.searchMails).toBe('function');
    });
  });

  describe('Model Logic Tests', () => {
    it('should correctly identify expired mailbox', () => {
      const expiredMailbox = new Mailbox({
        address: 'expired@nnu.edu.kg',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });

      expect(expiredMailbox.isExpired()).toBe(true);

      const activeMailbox = new Mailbox({
        address: 'active@nnu.edu.kg',
        token: 'active-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      expect(activeMailbox.isExpired()).toBe(false);
    });

    it('should correctly handle mailbox extension', () => {
      const mailbox = new Mailbox({
        address: 'extend@nnu.edu.kg',
        token: 'extend-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const originalExpiry = mailbox.expiresAt.getTime();

      expect(mailbox.canExtend()).toBe(true);
      mailbox.extend();

      expect(mailbox.expiresAt.getTime()).toBeGreaterThan(originalExpiry);
      expect(mailbox.extensionCount).toBe(1);

      // Test extension limit
      mailbox.extend(); // Second extension
      expect(mailbox.extensionCount).toBe(2);
      expect(mailbox.canExtend()).toBe(false);
    });

    it('should correctly handle mail attachments', () => {
      const mailWithoutAttachments = new Mail({
        mailboxId: 'test-mailbox',
        from: 'sender@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'No Attachments',
        textContent: 'Simple email',
        size: 512,
      });

      expect(mailWithoutAttachments.hasAttachments()).toBe(false);
      expect(mailWithoutAttachments.getAttachmentCount()).toBe(0);

      const mailWithAttachments = new Mail({
        mailboxId: 'test-mailbox',
        from: 'sender@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'With Attachments',
        textContent: 'Email with files',
        size: 2048,
        attachments: [
          {
            filename: 'document.pdf',
            contentType: 'application/pdf',
            size: 1024,
          },
          {
            filename: 'image.jpg',
            contentType: 'image/jpeg',
            size: 512,
          },
        ],
      });

      expect(mailWithAttachments.hasAttachments()).toBe(true);
      expect(mailWithAttachments.getAttachmentCount()).toBe(2);
    });

    it('should correctly mark mail as read', () => {
      const mail = new Mail({
        mailboxId: 'test-mailbox',
        from: 'sender@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Test Email',
        textContent: 'Test content',
        size: 1024,
      });

      expect(mail.isRead).toBe(false);
      mail.markAsRead();
      expect(mail.isRead).toBe(true);
    });
  });
});

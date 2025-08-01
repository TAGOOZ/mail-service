import mongoose from 'mongoose';
import { DatabaseService } from '../services/database';
import { Mailbox } from '../models/Mailbox';
import { Mail } from '../models/Mail';
import { SessionManager } from '../models/Session';

// Mock environment variables for testing
process.env.MONGODB_URI = 'mongodb://localhost:27017/tempmail_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';

describe('Database Service', () => {
  beforeAll(async () => {
    // Initialize database for testing
    await DatabaseService.initialize();
  });

  afterAll(async () => {
    // Clean up test data
    await Mailbox.deleteMany({});
    await Mail.deleteMany({});

    // Close database connections
    await DatabaseService.shutdown();
  });

  beforeEach(async () => {
    // Clean up before each test
    await Mailbox.deleteMany({});
    await Mail.deleteMany({});
  });

  describe('Database Initialization', () => {
    it('should initialize database service successfully', async () => {
      expect(DatabaseService.isReady()).toBe(true);
    });

    it('should return healthy status for both databases', async () => {
      const health = await DatabaseService.getHealthStatus();
      expect(health.mongodb).toBe(true);
      expect(health.redis).toBe(true);
      expect(health.overall).toBe(true);
    });
  });

  describe('Mailbox Model', () => {
    it('should create a mailbox with valid data', async () => {
      const mailboxData = {
        address: 'test123@nnu.edu.kg',
        token: 'test-token-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };

      const mailbox = new Mailbox(mailboxData);
      await mailbox.save();

      expect(mailbox.address).toBe(mailboxData.address);
      expect(mailbox.token).toBe(mailboxData.token);
      expect(mailbox.isActive).toBe(true);
      expect(mailbox.extensionCount).toBe(0);
    });

    it('should reject mailbox with invalid email format', async () => {
      const mailboxData = {
        address: 'invalid-email@wrong-domain.com',
        token: 'test-token-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const mailbox = new Mailbox(mailboxData);

      await expect(mailbox.save()).rejects.toThrow();
    });

    it('should find mailbox by token', async () => {
      const mailboxData = {
        address: 'test456@nnu.edu.kg',
        token: 'unique-token-456',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      await new Mailbox(mailboxData).save();

      const foundMailbox = await Mailbox.findByToken('unique-token-456');
      expect(foundMailbox).toBeTruthy();
      expect(foundMailbox?.address).toBe(mailboxData.address);
    });

    it('should check if mailbox is expired', async () => {
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

    it('should extend mailbox expiry', async () => {
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
    });
  });

  describe('Mail Model', () => {
    let testMailbox: any;

    beforeEach(async () => {
      testMailbox = await new Mailbox({
        address: 'mailtest@nnu.edu.kg',
        token: 'mail-test-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }).save();
    });

    it('should create a mail with valid data', async () => {
      const mailData = {
        mailboxId: testMailbox._id.toString(),
        from: 'sender@example.com',
        to: 'mailtest@nnu.edu.kg',
        subject: 'Test Email',
        textContent: 'This is a test email',
        size: 1024,
      };

      const mail = new Mail(mailData);
      await mail.save();

      expect(mail.from).toBe(mailData.from);
      expect(mail.subject).toBe(mailData.subject);
      expect(mail.isRead).toBe(false);
      expect(mail.hasAttachments()).toBe(false);
    });

    it('should find mails by mailbox ID', async () => {
      const mailData = {
        mailboxId: testMailbox._id.toString(),
        from: 'sender@example.com',
        to: 'mailtest@nnu.edu.kg',
        subject: 'Test Email',
        textContent: 'This is a test email',
        size: 1024,
      };

      await new Mail(mailData).save();
      await new Mail({ ...mailData, subject: 'Second Email' }).save();

      const mails = await Mail.findByMailboxId(testMailbox._id.toString());
      expect(mails).toHaveLength(2);
    });

    it('should count mails by mailbox ID', async () => {
      const mailData = {
        mailboxId: testMailbox._id.toString(),
        from: 'sender@example.com',
        to: 'mailtest@nnu.edu.kg',
        subject: 'Test Email',
        textContent: 'This is a test email',
        size: 1024,
      };

      await new Mail(mailData).save();
      await new Mail({
        ...mailData,
        subject: 'Second Email',
        isRead: true,
      }).save();

      const totalCount = await Mail.countByMailboxId(
        testMailbox._id.toString()
      );
      const unreadCount = await Mail.countByMailboxId(
        testMailbox._id.toString(),
        true
      );

      expect(totalCount).toBe(2);
      expect(unreadCount).toBe(1);
    });

    it('should handle attachments correctly', async () => {
      const mailWithAttachments = new Mail({
        mailboxId: testMailbox._id.toString(),
        from: 'sender@example.com',
        to: 'mailtest@nnu.edu.kg',
        subject: 'Email with Attachments',
        textContent: 'This email has attachments',
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

      await mailWithAttachments.save();

      expect(mailWithAttachments.hasAttachments()).toBe(true);
      expect(mailWithAttachments.getAttachmentCount()).toBe(2);
    });
  });

  describe('Session Management', () => {
    const testSessionData = {
      mailboxId: 'test-mailbox-id',
      token: 'test-session-token',
      createdAt: new Date(),
      lastAccessAt: new Date(),
      userAgent: 'Test User Agent',
      ipAddress: '127.0.0.1',
    };

    afterEach(async () => {
      // Clean up sessions after each test
      await SessionManager.deleteSession(testSessionData.token);
    });

    it('should create and retrieve a session', async () => {
      await SessionManager.createSession(testSessionData);

      const retrievedSession = await SessionManager.getSession(
        testSessionData.token
      );

      expect(retrievedSession).toBeTruthy();
      expect(retrievedSession?.mailboxId).toBe(testSessionData.mailboxId);
      expect(retrievedSession?.token).toBe(testSessionData.token);
    });

    it('should validate session existence', async () => {
      await SessionManager.createSession(testSessionData);

      const isValid = await SessionManager.isValidSession(
        testSessionData.token
      );
      expect(isValid).toBe(true);

      const isInvalid =
        await SessionManager.isValidSession('non-existent-token');
      expect(isInvalid).toBe(false);
    });

    it('should update session last access time', async () => {
      await SessionManager.createSession(testSessionData);

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await SessionManager.updateLastAccess(testSessionData.token);

      const updatedSession = await SessionManager.getSession(
        testSessionData.token
      );
      expect(updatedSession?.lastAccessAt.getTime()).toBeGreaterThan(
        testSessionData.lastAccessAt.getTime()
      );
    });

    it('should delete a session', async () => {
      await SessionManager.createSession(testSessionData);

      let session = await SessionManager.getSession(testSessionData.token);
      expect(session).toBeTruthy();

      await SessionManager.deleteSession(testSessionData.token);

      session = await SessionManager.getSession(testSessionData.token);
      expect(session).toBeNull();
    });

    it('should manage multiple sessions for a mailbox', async () => {
      const session1 = { ...testSessionData, token: 'token-1' };
      const session2 = { ...testSessionData, token: 'token-2' };

      await SessionManager.createSession(session1);
      await SessionManager.createSession(session2);

      const mailboxSessions = await SessionManager.getMailboxSessions(
        testSessionData.mailboxId
      );
      expect(mailboxSessions).toHaveLength(2);

      await SessionManager.deleteMailboxSessions(testSessionData.mailboxId);

      const remainingSessions = await SessionManager.getMailboxSessions(
        testSessionData.mailboxId
      );
      expect(remainingSessions).toHaveLength(0);
    });
  });
});

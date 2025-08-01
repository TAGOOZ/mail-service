import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../index';
import { MailboxService } from '../../services/mailboxService';
import { generateToken } from '../../middleware/auth';

// Mock the Mail model
jest.mock('../../models/Mail', () => ({
  Mail: {
    findByMailboxId: jest.fn(),
    countByMailboxId: jest.fn(),
    findOne: jest.fn(),
    findOneAndDelete: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
  },
}));

// Mock the Mailbox model
jest.mock('../../models/Mailbox', () => ({
  Mailbox: {},
}));

import { Mail } from '../../models/Mail';

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

// Mock the database service
jest.mock('../../services/database', () => ({
  DatabaseService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    getHealthStatus: jest.fn().mockResolvedValue({ overall: true }),
  },
}));

// Mock the cleanup scheduler
jest.mock('../../services/cleanupScheduler', () => ({
  CleanupScheduler: {
    start: jest.fn(),
    stop: jest.fn(),
    getStatus: jest.fn().mockReturnValue({ isRunning: true }),
  },
}));

// Mock the mail receiving service
jest.mock('../../services/mailReceivingService', () => ({
  mailReceivingService: {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    getStatus: jest.fn().mockReturnValue({ isRunning: true }),
  },
}));

describe('Mail API Routes', () => {
  let testMailboxId: string;
  let testToken: string;
  let authHeader: string;
  let testMails: any[] = [];

  beforeAll(async () => {
    // Mock database is already initialized via mocks
  });

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    testMails = [];

    // Setup test data
    testMailboxId = new mongoose.Types.ObjectId().toString();
    testToken = 'test-mailbox-token';
    authHeader = `Bearer ${generateToken(testMailboxId, testToken)}`;

    // Mock MailboxService.validateAccess to return true for valid requests
    jest
      .spyOn(MailboxService, 'validateAccess')
      .mockImplementation((mailboxId: string) => {
        return Promise.resolve(mailboxId === testMailboxId);
      });

    // Create mock mail data
    const mockMails = [
      {
        id: new mongoose.Types.ObjectId().toString(),
        mailboxId: testMailboxId,
        from: 'sender1@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Test Email 1',
        textContent: 'This is test email 1',
        htmlContent: '<p>This is test email 1</p>',
        attachments: [],
        receivedAt: new Date(Date.now() - 60000),
        isRead: false,
        size: 1024,
        markAsRead: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        mailboxId: testMailboxId,
        from: 'sender2@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Test Email 2',
        textContent: 'This is test email 2',
        htmlContent: '<p>This is test email 2</p>',
        attachments: [
          {
            filename: 'document.pdf',
            contentType: 'application/pdf',
            size: 2048,
            contentId: 'doc1',
          },
        ],
        receivedAt: new Date(Date.now() - 120000),
        isRead: true,
        size: 2048,
        markAsRead: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        mailboxId: testMailboxId,
        from: 'sender3@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Test Email 3',
        textContent: 'This is test email 3',
        receivedAt: new Date(Date.now() - 180000),
        isRead: false,
        size: 512,
        markAsRead: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      },
    ];

    testMails = mockMails;

    // Setup Mail model mocks
    (Mail.findByMailboxId as jest.Mock).mockImplementation(
      (mailboxId: string, options: any = {}) => {
        const { limit = 20 } = options;
        return Promise.resolve(mockMails.slice(0, limit));
      }
    );
    (Mail.countByMailboxId as jest.Mock).mockResolvedValue(3);
    (Mail.findOne as jest.Mock).mockImplementation((query: any) => {
      const mail = mockMails.find(m => m.id === query._id);
      if (mail) {
        // Create a copy with working markAsRead method
        const mailCopy = {
          ...mail,
          markAsRead: jest.fn().mockImplementation(() => {
            mailCopy.isRead = true;
          }),
          save: jest.fn().mockResolvedValue(true),
        };
        return Promise.resolve(mailCopy);
      }
      return Promise.resolve(null);
    });
    (Mail.findOneAndDelete as jest.Mock).mockImplementation((query: any) => {
      const mail = mockMails.find(m => m.id === query._id);
      return Promise.resolve(mail);
    });
    (Mail.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 3 });
    (Mail.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });
  });

  afterAll(async () => {
    // Clean up mocks
    jest.restoreAllMocks();
  });

  describe('GET /api/mail/:mailboxId', () => {
    it('should get mails list with pagination', async () => {
      const response = await request(app)
        .get(`/api/mail/${testMailboxId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body).toHaveProperty('mails');
      expect(response.body).toHaveProperty('total', 3);
      expect(response.body).toHaveProperty('hasMore', false);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 20);
      expect(response.body.mails).toHaveLength(3);

      // Check if mails are sorted by receivedAt descending
      expect(
        new Date(response.body.mails[0].receivedAt).getTime()
      ).toBeGreaterThan(new Date(response.body.mails[1].receivedAt).getTime());
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/mail/${testMailboxId}?page=1&limit=2`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.mails).toHaveLength(2);
      expect(response.body.total).toBe(3);
      expect(response.body.hasMore).toBe(true);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
    });

    it('should return 401 without authorization header', async () => {
      const response = await request(app)
        .get(`/api/mail/${testMailboxId}`)
        .expect(401);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.code).toBe('MISSING_AUTH_HEADER');
    });

    it('should return 403 for wrong mailbox access', async () => {
      const wrongMailboxId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/mail/${wrongMailboxId}`)
        .set('Authorization', authHeader)
        .expect(403);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should return 404 for non-existent mailbox', async () => {
      // Create token for non-existent mailbox
      const fakeMailboxId = new mongoose.Types.ObjectId().toString();
      const fakeToken = generateToken(fakeMailboxId, 'fake-token');

      const response = await request(app)
        .get(`/api/mail/${fakeMailboxId}`)
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(404);

      expect(response.body.error.type).toBe('MAILBOX_NOT_FOUND');
    });
  });

  describe('GET /api/mail/:mailboxId/:mailId', () => {
    it('should get mail details and mark as read', async () => {
      const unreadMail = testMails.find(mail => !mail.isRead);
      const response = await request(app)
        .get(`/api/mail/${testMailboxId}/${unreadMail.id}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body).toHaveProperty('mail');
      expect(response.body.mail.id).toBe(unreadMail.id);
      expect(response.body.mail.from).toBe(unreadMail.from);
      expect(response.body.mail.subject).toBe(unreadMail.subject);
      expect(response.body.mail.isRead).toBe(true); // Should be marked as read

      // The mail should be marked as read in the response
      // (The actual markAsRead and save calls happen on the database model, not our mock)
    });

    it('should return mail with attachments', async () => {
      const mailWithAttachment = testMails.find(
        mail => mail.attachments.length > 0
      );
      const response = await request(app)
        .get(`/api/mail/${testMailboxId}/${mailWithAttachment.id}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.mail.attachments).toHaveLength(1);
      expect(response.body.mail.attachments[0]).toMatchObject({
        filename: 'document.pdf',
        contentType: 'application/pdf',
        size: 2048,
        contentId: 'doc1',
      });
    });

    it('should return 404 for non-existent mail', async () => {
      const fakeMailId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/mail/${testMailboxId}/${fakeMailId}`)
        .set('Authorization', authHeader)
        .expect(404);

      expect(response.body.error.type).toBe('MAIL_NOT_FOUND');
    });

    it('should return 403 for wrong mailbox access', async () => {
      const wrongMailboxId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/mail/${wrongMailboxId}/${testMails[0].id}`)
        .set('Authorization', authHeader)
        .expect(403);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('DELETE /api/mail/:mailboxId/:mailId', () => {
    it('should delete a single mail', async () => {
      const mailToDelete = testMails[0];
      const response = await request(app)
        .delete(`/api/mail/${testMailboxId}/${mailToDelete.id}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mail deleted successfully');

      // Verify Mail.findOneAndDelete was called
      expect(Mail.findOneAndDelete).toHaveBeenCalledWith({
        _id: mailToDelete.id,
        mailboxId: testMailboxId,
      });
    });

    it('should return 404 for non-existent mail', async () => {
      const fakeMailId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/api/mail/${testMailboxId}/${fakeMailId}`)
        .set('Authorization', authHeader)
        .expect(404);

      expect(response.body.error.type).toBe('MAIL_NOT_FOUND');
    });

    it('should return 403 for wrong mailbox access', async () => {
      const wrongMailboxId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/api/mail/${wrongMailboxId}/${testMails[0].id}`)
        .set('Authorization', authHeader)
        .expect(403);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('DELETE /api/mail/:mailboxId', () => {
    it('should clear all mails from mailbox', async () => {
      const response = await request(app)
        .delete(`/api/mail/${testMailboxId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deletedCount).toBe(3);
      expect(response.body.message).toBe('Successfully deleted 3 mails');

      // Verify Mail.deleteMany was called
      expect(Mail.deleteMany).toHaveBeenCalledWith({
        mailboxId: testMailboxId,
      });
    });

    it('should return success even if no mails to delete', async () => {
      // Mock empty mailbox
      (Mail.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });

      const response = await request(app)
        .delete(`/api/mail/${testMailboxId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deletedCount).toBe(0);
      expect(response.body.message).toBe('Successfully deleted 0 mails');
    });

    it('should return 403 for wrong mailbox access', async () => {
      const wrongMailboxId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/api/mail/${wrongMailboxId}`)
        .set('Authorization', authHeader)
        .expect(403);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('PATCH /api/mail/:mailboxId/:mailId/read', () => {
    it('should mark mail as read', async () => {
      const unreadMail = testMails.find(mail => !mail.isRead);
      const response = await request(app)
        .patch(`/api/mail/${testMailboxId}/${unreadMail.id}/read`)
        .set('Authorization', authHeader)
        .send({ isRead: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mail marked as read');
      expect(response.body.mail.isRead).toBe(true);

      // Verify the response indicates success
      // (The actual save call happens on the database model, not our mock)
    });

    it('should mark mail as unread', async () => {
      const readMail = testMails.find(mail => mail.isRead);
      const response = await request(app)
        .patch(`/api/mail/${testMailboxId}/${readMail.id}/read`)
        .set('Authorization', authHeader)
        .send({ isRead: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mail marked as unread');
      expect(response.body.mail.isRead).toBe(false);

      // Verify the response indicates success
      // (The actual save call happens on the database model, not our mock)
    });

    it('should return 400 for invalid isRead value', async () => {
      const response = await request(app)
        .patch(`/api/mail/${testMailboxId}/${testMails[0].id}/read`)
        .set('Authorization', authHeader)
        .send({ isRead: 'invalid' })
        .expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.code).toBe('INVALID_READ_STATUS');
    });

    it('should return 404 for non-existent mail', async () => {
      const fakeMailId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .patch(`/api/mail/${testMailboxId}/${fakeMailId}/read`)
        .set('Authorization', authHeader)
        .send({ isRead: true })
        .expect(404);

      expect(response.body.error.type).toBe('MAIL_NOT_FOUND');
    });
  });

  describe('PATCH /api/mail/:mailboxId/mark-all-read', () => {
    it('should mark all unread mails as read', async () => {
      const response = await request(app)
        .patch(`/api/mail/${testMailboxId}/mark-all-read`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.updatedCount).toBe(2);
      expect(response.body.message).toBe('Marked 2 mails as read');

      // Verify Mail.updateMany was called
      expect(Mail.updateMany).toHaveBeenCalledWith(
        { mailboxId: testMailboxId, isRead: false },
        { isRead: true }
      );
    });

    it('should return 0 updated count if all mails already read', async () => {
      // Mock no unread mails
      (Mail.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      const response = await request(app)
        .patch(`/api/mail/${testMailboxId}/mark-all-read`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.updatedCount).toBe(0);
      expect(response.body.message).toBe('Marked 0 mails as read');
    });

    it('should return 403 for wrong mailbox access', async () => {
      const wrongMailboxId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .patch(`/api/mail/${wrongMailboxId}/mark-all-read`)
        .set('Authorization', authHeader)
        .expect(403);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 with invalid JWT token', async () => {
      const response = await request(app)
        .get(`/api/mail/${testMailboxId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 401 with expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { mailboxId: testMailboxId, token: testToken },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get(`/api/mail/${testMailboxId}`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should return 401 with malformed authorization header', async () => {
      const response = await request(app)
        .get(`/api/mail/${testMailboxId}`)
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock Mail.findByMailboxId to throw an error
      (Mail.findByMailboxId as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get(`/api/mail/${testMailboxId}`)
        .set('Authorization', authHeader)
        .expect(500);

      expect(response.body.error.type).toBe('SERVER_ERROR');
      expect(response.body.error.code).toBe('GET_MAILS_ERROR');
    });

    it('should handle invalid ObjectId format', async () => {
      const response = await request(app)
        .get(`/api/mail/${testMailboxId}/invalid-id`)
        .set('Authorization', authHeader)
        .expect(404);

      expect(response.body.error.type).toBe('MAIL_NOT_FOUND');
    });
  });
});

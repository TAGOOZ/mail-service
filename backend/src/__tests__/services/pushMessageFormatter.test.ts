import { PushMessageFormatter } from '../../services/pushMessageFormatter';

describe('PushMessageFormatter', () => {
  describe('formatNewMailMessage', () => {
    it('should format a valid mail object correctly', () => {
      const mailboxId = 'test-mailbox-id';
      const mail = {
        id: 'test-mail-id',
        mailboxId: 'test-mailbox-id',
        from: 'sender@example.com',
        to: 'recipient@nnu.edu.kg',
        subject: 'Test Subject',
        textContent: 'Test content',
        htmlContent: '<p>Test HTML content</p>',
        attachments: [
          {
            filename: 'test.pdf',
            contentType: 'application/pdf',
            size: 1024,
            contentId: 'attachment1',
          },
        ],
        receivedAt: new Date(),
        isRead: false,
        size: 2048,
      };

      const result = PushMessageFormatter.formatNewMailMessage(mailboxId, mail);

      expect(result).toEqual({
        mailboxId,
        mail: expect.objectContaining({
          id: mail.id,
          mailboxId: mail.mailboxId,
          from: mail.from,
          to: mail.to,
          subject: mail.subject,
          textContent: mail.textContent,
          htmlContent: mail.htmlContent,
          attachments: mail.attachments,
          receivedAt: mail.receivedAt,
          isRead: mail.isRead,
          size: mail.size,
        }),
      });
    });

    it('should handle mail with missing optional fields', () => {
      const mailboxId = 'test-mailbox-id';
      const mail = {
        id: 'test-mail-id',
        mailboxId: 'test-mailbox-id',
        from: 'sender@example.com',
        to: 'recipient@nnu.edu.kg',
        receivedAt: new Date(),
      };

      const result = PushMessageFormatter.formatNewMailMessage(mailboxId, mail);

      expect(result.mail).toEqual(
        expect.objectContaining({
          id: mail.id,
          from: mail.from,
          to: mail.to,
          subject: '(No Subject)',
          textContent: '',
          htmlContent: undefined,
          attachments: [],
          isRead: false,
          size: 0,
        })
      );
    });

    it('should handle MongoDB ObjectId as string', () => {
      const mailboxId = 'test-mailbox-id';
      const mail = {
        _id: { toString: () => 'mongodb-object-id' },
        mailboxId: 'test-mailbox-id',
        from: 'sender@example.com',
        to: 'recipient@nnu.edu.kg',
        receivedAt: new Date(),
      };

      const result = PushMessageFormatter.formatNewMailMessage(mailboxId, mail);

      expect(result.mail.id).toBe('mongodb-object-id');
    });

    it('should convert string date to Date object', () => {
      const mailboxId = 'test-mailbox-id';
      const dateString = '2023-01-01T00:00:00.000Z';
      const mail = {
        id: 'test-mail-id',
        mailboxId: 'test-mailbox-id',
        from: 'sender@example.com',
        to: 'recipient@nnu.edu.kg',
        receivedAt: dateString,
      };

      const result = PushMessageFormatter.formatNewMailMessage(mailboxId, mail);

      expect(result.mail.receivedAt).toBeInstanceOf(Date);
      expect(result.mail.receivedAt.toISOString()).toBe(dateString);
    });

    it('should sanitize attachment data', () => {
      const mailboxId = 'test-mailbox-id';
      const mail = {
        id: 'test-mail-id',
        mailboxId: 'test-mailbox-id',
        from: 'sender@example.com',
        to: 'recipient@nnu.edu.kg',
        receivedAt: new Date(),
        attachments: [
          {
            filename: '',
            contentType: '',
            size: 'invalid',
          },
          {
            filename: 'valid.txt',
            contentType: 'text/plain',
            size: 100,
            contentId: 'valid-attachment',
          },
        ],
      };

      const result = PushMessageFormatter.formatNewMailMessage(mailboxId, mail);

      expect(result.mail.attachments).toEqual([
        {
          filename: 'unknown',
          contentType: 'application/octet-stream',
          size: 0,
          contentId: undefined,
        },
        {
          filename: 'valid.txt',
          contentType: 'text/plain',
          size: 100,
          contentId: 'valid-attachment',
        },
      ]);
    });

    it('should throw error for missing required fields', () => {
      const mailboxId = 'test-mailbox-id';
      const mailWithoutId = {
        mailboxId: 'test-mailbox-id',
        from: 'sender@example.com',
        to: 'recipient@nnu.edu.kg',
        receivedAt: new Date(),
      };

      expect(() => {
        PushMessageFormatter.formatNewMailMessage(mailboxId, mailWithoutId);
      }).toThrow('Mail ID is required');

      const mailWithoutFrom = {
        id: 'test-mail-id',
        mailboxId: 'test-mailbox-id',
        to: 'recipient@nnu.edu.kg',
        receivedAt: new Date(),
      };

      expect(() => {
        PushMessageFormatter.formatNewMailMessage(mailboxId, mailWithoutFrom);
      }).toThrow('Mail from field is required');
    });
  });

  describe('formatExpiryWarningMessage', () => {
    it('should format expiry warning message correctly', () => {
      const mailboxId = 'test-mailbox-id';
      const expiresAt = new Date();
      const minutesLeft = 30;

      const result = PushMessageFormatter.formatExpiryWarningMessage(
        mailboxId,
        expiresAt,
        minutesLeft
      );

      expect(result).toEqual({
        mailboxId,
        expiresAt,
        minutesLeft,
      });
    });

    it('should throw error for invalid inputs', () => {
      const expiresAt = new Date();
      const minutesLeft = 30;

      expect(() => {
        PushMessageFormatter.formatExpiryWarningMessage(
          '',
          expiresAt,
          minutesLeft
        );
      }).toThrow('Mailbox ID is required');

      expect(() => {
        PushMessageFormatter.formatExpiryWarningMessage(
          'test-mailbox-id',
          'invalid-date' as any,
          minutesLeft
        );
      }).toThrow('Valid expiration date is required');

      expect(() => {
        PushMessageFormatter.formatExpiryWarningMessage(
          'test-mailbox-id',
          expiresAt,
          -1
        );
      }).toThrow('Valid minutes left value is required');
    });
  });

  describe('formatMailboxExpiredMessage', () => {
    it('should format mailbox expired message correctly', () => {
      const mailboxId = 'test-mailbox-id';

      const result =
        PushMessageFormatter.formatMailboxExpiredMessage(mailboxId);

      expect(result).toEqual({
        mailboxId,
        expiredAt: expect.any(Date),
      });
    });

    it('should throw error for missing mailbox ID', () => {
      expect(() => {
        PushMessageFormatter.formatMailboxExpiredMessage('');
      }).toThrow('Mailbox ID is required');
    });
  });

  describe('validateMailForBroadcast', () => {
    it('should validate a correct mail object', () => {
      const mail = {
        id: 'test-mail-id',
        mailboxId: 'test-mailbox-id',
        from: 'sender@example.com',
        to: 'recipient@nnu.edu.kg',
        receivedAt: new Date(),
      };

      expect(() => {
        PushMessageFormatter.validateMailForBroadcast(mail);
      }).not.toThrow();

      expect(PushMessageFormatter.validateMailForBroadcast(mail)).toBe(true);
    });

    it('should throw error for missing required fields', () => {
      const mailWithoutId = {
        mailboxId: 'test-mailbox-id',
        from: 'sender@example.com',
        to: 'recipient@nnu.edu.kg',
        receivedAt: new Date(),
      };

      expect(() => {
        PushMessageFormatter.validateMailForBroadcast(mailWithoutId);
      }).toThrow('Mail object missing required fields: id');
    });

    it('should throw error for invalid data types', () => {
      const mailWithInvalidId = {
        id: 123,
        mailboxId: 'test-mailbox-id',
        from: 'sender@example.com',
        to: 'recipient@nnu.edu.kg',
        receivedAt: new Date(),
      };

      expect(() => {
        PushMessageFormatter.validateMailForBroadcast(mailWithInvalidId);
      }).toThrow('Mail ID must be a string');

      const mailWithInvalidFrom = {
        id: 'test-mail-id',
        mailboxId: 'test-mailbox-id',
        from: 'invalid-email',
        to: 'recipient@nnu.edu.kg',
        receivedAt: new Date(),
      };

      expect(() => {
        PushMessageFormatter.validateMailForBroadcast(mailWithInvalidFrom);
      }).toThrow('Mail from field must be a valid email address');
    });

    it('should accept string date for receivedAt', () => {
      const mail = {
        id: 'test-mail-id',
        mailboxId: 'test-mailbox-id',
        from: 'sender@example.com',
        to: 'recipient@nnu.edu.kg',
        receivedAt: '2023-01-01T00:00:00.000Z',
      };

      expect(() => {
        PushMessageFormatter.validateMailForBroadcast(mail);
      }).not.toThrow();
    });
  });
});

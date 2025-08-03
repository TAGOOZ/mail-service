import { Mail } from '@nnu/shared';
import { logger } from '../utils/logger';

/**
 * Service for formatting push messages for WebSocket broadcast
 */
export class PushMessageFormatter {
  /**
   * Format a new mail event for WebSocket broadcast
   * @param mailboxId The mailbox ID
   * @param mail The mail object
   * @returns Formatted message data
   */
  static formatNewMailMessage(
    mailboxId: string,
    mail: any
  ): {
    mailboxId: string;
    mail: Mail;
  } {
    try {
      // Ensure all required fields are present and properly formatted
      const formattedMail: Mail = {
        id: mail.id || mail._id?.toString(),
        mailboxId: mail.mailboxId,
        from: mail.from,
        to: mail.to,
        subject: mail.subject || '(No Subject)',
        textContent: mail.textContent || '',
        htmlContent: mail.htmlContent || undefined,
        attachments: mail.attachments || [],
        receivedAt:
          mail.receivedAt instanceof Date
            ? mail.receivedAt
            : new Date(mail.receivedAt),
        isRead: Boolean(mail.isRead),
        size: Number(mail.size) || 0,
      };

      // Validate required fields
      if (!formattedMail.id) {
        throw new Error('Mail ID is required');
      }
      if (!formattedMail.from) {
        throw new Error('Mail from field is required');
      }
      if (!formattedMail.to) {
        throw new Error('Mail to field is required');
      }

      // Sanitize and validate attachments
      formattedMail.attachments = formattedMail.attachments.map(attachment => ({
        filename: attachment.filename || 'unknown',
        contentType: attachment.contentType || 'application/octet-stream',
        size: Number(attachment.size) || 0,
        contentId: attachment.contentId,
      }));

      logger.debug('Formatted new mail message for WebSocket broadcast', {
        mailId: formattedMail.id,
        mailboxId,
        from: formattedMail.from,
        subject: formattedMail.subject,
        attachmentCount: formattedMail.attachments.length,
      });

      return {
        mailboxId,
        mail: formattedMail,
      };
    } catch (error) {
      logger.error('Failed to format new mail message:', error);
      logger.error('Original mail data:', mail);
      throw new Error(
        `Failed to format new mail message: ${(error as Error).message}`
      );
    }
  }

  /**
   * Format an expiry warning message for WebSocket broadcast
   * @param mailboxId The mailbox ID
   * @param expiresAt The expiration date
   * @param minutesLeft Minutes remaining until expiration
   * @returns Formatted expiry warning data
   */
  static formatExpiryWarningMessage(
    mailboxId: string,
    expiresAt: Date,
    minutesLeft: number
  ): {
    mailboxId: string;
    expiresAt: Date;
    minutesLeft: number;
  } {
    try {
      // Validate inputs
      if (!mailboxId) {
        throw new Error('Mailbox ID is required');
      }
      if (!(expiresAt instanceof Date) || isNaN(expiresAt.getTime())) {
        throw new Error('Valid expiration date is required');
      }
      if (typeof minutesLeft !== 'number' || minutesLeft < 0) {
        throw new Error('Valid minutes left value is required');
      }

      logger.debug('Formatted expiry warning message for WebSocket broadcast', {
        mailboxId,
        expiresAt: expiresAt.toISOString(),
        minutesLeft,
      });

      return {
        mailboxId,
        expiresAt,
        minutesLeft,
      };
    } catch (error) {
      logger.error('Failed to format expiry warning message:', error);
      throw new Error(
        `Failed to format expiry warning message: ${(error as Error).message}`
      );
    }
  }

  /**
   * Format a mailbox expired message for WebSocket broadcast
   * @param mailboxId The mailbox ID
   * @returns Formatted mailbox expired data
   */
  static formatMailboxExpiredMessage(mailboxId: string): {
    mailboxId: string;
    expiredAt: Date;
  } {
    try {
      if (!mailboxId) {
        throw new Error('Mailbox ID is required');
      }

      const expiredAt = new Date();

      logger.debug(
        'Formatted mailbox expired message for WebSocket broadcast',
        {
          mailboxId,
          expiredAt: expiredAt.toISOString(),
        }
      );

      return {
        mailboxId,
        expiredAt,
      };
    } catch (error) {
      logger.error('Failed to format mailbox expired message:', error);
      throw new Error(
        `Failed to format mailbox expired message: ${(error as Error).message}`
      );
    }
  }

  /**
   * Validate that a mail object has all required fields for broadcasting
   * @param mail The mail object to validate
   * @returns True if valid, throws error if invalid
   */
  static validateMailForBroadcast(mail: any): boolean {
    const requiredFields = ['id', 'mailboxId', 'from', 'to', 'receivedAt'];
    const missingFields = requiredFields.filter(field => !mail[field]);

    if (missingFields.length > 0) {
      throw new Error(
        `Mail object missing required fields: ${missingFields.join(', ')}`
      );
    }

    // Validate data types
    if (typeof mail.id !== 'string') {
      throw new Error('Mail ID must be a string');
    }
    if (typeof mail.from !== 'string' || !mail.from.includes('@')) {
      throw new Error('Mail from field must be a valid email address');
    }
    if (typeof mail.to !== 'string' || !mail.to.includes('@')) {
      throw new Error('Mail to field must be a valid email address');
    }
    if (
      !(mail.receivedAt instanceof Date) &&
      typeof mail.receivedAt !== 'string'
    ) {
      throw new Error('Mail receivedAt must be a Date or date string');
    }

    return true;
  }
}

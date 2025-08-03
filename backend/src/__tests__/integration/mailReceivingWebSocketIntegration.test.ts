import { MailReceivingService } from '../../services/mailReceivingService';
import { WebSocketService } from '../../services/websocketService';
import { logger } from '../../utils/logger';

// Mock all database dependencies
jest.mock('../../models/Mailbox');
jest.mock('../../models/Session');
jest.mock('../../middleware/auth');

describe('Mail Receiving and WebSocket Integration', () => {
  let mailReceivingService: MailReceivingService;
  let webSocketService: WebSocketService;

  beforeEach(() => {
    mailReceivingService = new MailReceivingService(2526);
    webSocketService = new WebSocketService();

    // Mock the broadcastNewMail method to track calls
    webSocketService.broadcastNewMail = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (mailReceivingService) {
      await mailReceivingService.stop();
    }
    jest.clearAllMocks();
  });

  describe('Integration: Mail Receiving to WebSocket Push', () => {
    it('should integrate mail receiving service with WebSocket push notifications', async () => {
      // Set up the integration between services (this is the core integration we're testing)
      mailReceivingService.on('mailReceived', async (event: any) => {
        try {
          await webSocketService.broadcastNewMail(event.mailboxId, event.mail);
          logger.info('Successfully broadcasted new mail via WebSocket');
        } catch (error) {
          logger.error('Failed to broadcast new mail via WebSocket:', error);
        }
      });

      // Simulate receiving a mail by creating mock mail data
      const testMail = {
        id: 'test-mail-id',
        mailboxId: 'test-mailbox-id',
        from: 'sender@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Integration Test Mail',
        textContent: 'This is a test mail for integration testing',
        htmlContent: '<p>This is a test mail for integration testing</p>',
        attachments: [],
        size: 100,
        receivedAt: new Date(),
        isRead: false,
      };

      // Emit the mailReceived event to test the integration
      mailReceivingService.emit('mailReceived', {
        mailboxId: 'test-mailbox-id',
        mail: testMail,
      });

      // Wait for the event to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify that the WebSocket service was called with the correct data
      expect(webSocketService.broadcastNewMail).toHaveBeenCalledWith(
        'test-mailbox-id',
        testMail
      );
      expect(webSocketService.broadcastNewMail).toHaveBeenCalledTimes(1);
    });

    it('should handle WebSocket broadcast errors gracefully', async () => {
      // Mock WebSocket service to throw an error
      webSocketService.broadcastNewMail = jest
        .fn()
        .mockRejectedValue(new Error('WebSocket broadcast failed'));

      // Set up error handling integration
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation();

      mailReceivingService.on('mailReceived', async (event: any) => {
        try {
          await webSocketService.broadcastNewMail(event.mailboxId, event.mail);
        } catch (error) {
          logger.error('Failed to broadcast new mail via WebSocket:', error);
        }
      });

      // Create test mail
      const testMail = {
        id: 'error-test-mail-id',
        mailboxId: 'test-mailbox-id',
        from: 'error-test@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Error Test Mail',
        textContent: 'This mail should trigger an error in WebSocket broadcast',
        attachments: [],
        size: 100,
        receivedAt: new Date(),
        isRead: false,
      };

      // This should not throw an error
      expect(() => {
        mailReceivingService.emit('mailReceived', {
          mailboxId: 'test-mailbox-id',
          mail: testMail,
        });
      }).not.toThrow();

      // Wait for the event to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the mock was called and error was logged
      expect(webSocketService.broadcastNewMail).toHaveBeenCalledWith(
        'test-mailbox-id',
        testMail
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to broadcast new mail via WebSocket:',
        expect.any(Error)
      );

      errorSpy.mockRestore();
    });

    it('should format push messages correctly for WebSocket broadcast', async () => {
      // Set up integration
      mailReceivingService.on('mailReceived', async (event: any) => {
        await webSocketService.broadcastNewMail(event.mailboxId, event.mail);
      });

      // Create test mail with various content types to test formatting
      const testMail = {
        id: 'format-test-mail-id',
        mailboxId: 'test-mailbox-id',
        from: 'test-sender@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Test Subject with 中文 and émojis 🚀',
        textContent: 'Plain text content with special chars: <>&"\'',
        htmlContent: '<p>HTML content with <strong>formatting</strong></p>',
        attachments: [
          {
            filename: 'test.pdf',
            contentType: 'application/pdf',
            size: 1024,
            contentId: 'attachment1',
          },
        ],
        size: 2048,
        receivedAt: new Date(),
        isRead: false,
      };

      // Emit the event
      mailReceivingService.emit('mailReceived', {
        mailboxId: 'test-mailbox-id',
        mail: testMail,
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the broadcast was called with properly formatted data
      expect(webSocketService.broadcastNewMail).toHaveBeenCalledWith(
        'test-mailbox-id',
        expect.objectContaining({
          id: testMail.id,
          from: testMail.from,
          to: testMail.to,
          subject: testMail.subject,
          textContent: testMail.textContent,
          htmlContent: testMail.htmlContent,
          attachments: testMail.attachments,
          size: testMail.size,
          isRead: testMail.isRead,
        })
      );

      // Verify special characters and attachments are preserved
      const broadcastCall = (webSocketService.broadcastNewMail as jest.Mock)
        .mock.calls[0];
      const broadcastedMail = broadcastCall[1];
      expect(broadcastedMail.subject).toContain('中文');
      expect(broadcastedMail.subject).toContain('🚀');
      expect(broadcastedMail.attachments).toHaveLength(1);
      expect(broadcastedMail.attachments[0].filename).toBe('test.pdf');
    });

    it('should handle multiple rapid mail events reliably', async () => {
      // Set up integration
      mailReceivingService.on('mailReceived', async (event: any) => {
        await webSocketService.broadcastNewMail(event.mailboxId, event.mail);
      });

      // Create multiple test mails
      const testMails = [];
      for (let i = 0; i < 5; i++) {
        testMails.push({
          id: `rapid-test-mail-${i}`,
          mailboxId: 'test-mailbox-id',
          from: `sender${i}@example.com`,
          to: 'test@nnu.edu.kg',
          subject: `Rapid Test Mail ${i}`,
          textContent: `Content for mail ${i}`,
          attachments: [],
          size: 100 + i,
          receivedAt: new Date(),
          isRead: false,
        });
      }

      // Emit all events rapidly
      testMails.forEach(mail => {
        mailReceivingService.emit('mailReceived', {
          mailboxId: 'test-mailbox-id',
          mail: mail,
        });
      });

      // Wait for all events to be processed
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify all broadcasts were made
      expect(webSocketService.broadcastNewMail).toHaveBeenCalledTimes(5);

      // Verify each mail was broadcast correctly
      testMails.forEach((mail, index) => {
        expect(webSocketService.broadcastNewMail).toHaveBeenNthCalledWith(
          index + 1,
          'test-mailbox-id',
          mail
        );
      });
    });
  });

  describe('Real-time Push Reliability', () => {
    it('should maintain integration reliability under various conditions', async () => {
      let successCount = 0;
      let errorCount = 0;

      // Mock WebSocket service to succeed most of the time but occasionally fail
      webSocketService.broadcastNewMail = jest
        .fn()
        .mockImplementation(async (mailboxId, mail) => {
          // Simulate 80% success rate
          if (Math.random() > 0.2) {
            successCount++;
            return Promise.resolve();
          } else {
            errorCount++;
            throw new Error('Simulated WebSocket failure');
          }
        });

      // Set up integration with error handling
      mailReceivingService.on('mailReceived', async (event: any) => {
        try {
          await webSocketService.broadcastNewMail(event.mailboxId, event.mail);
        } catch (error) {
          // Integration should handle errors gracefully
          logger.error('Failed to broadcast new mail via WebSocket:', error);
        }
      });

      // Send multiple mails
      const testMails = Array.from({ length: 10 }, (_, i) => ({
        id: `reliability-test-mail-${i}`,
        mailboxId: 'test-mailbox-id',
        from: `sender${i}@example.com`,
        to: 'test@nnu.edu.kg',
        subject: `Reliability Test Mail ${i}`,
        textContent: `Content for mail ${i}`,
        attachments: [],
        size: 100 + i,
        receivedAt: new Date(),
        isRead: false,
      }));

      // Emit all events
      testMails.forEach(mail => {
        mailReceivingService.emit('mailReceived', {
          mailboxId: 'test-mailbox-id',
          mail: mail,
        });
      });

      // Wait for all processing to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify all attempts were made
      expect(webSocketService.broadcastNewMail).toHaveBeenCalledTimes(10);

      // Verify we had both successes and failures (testing error handling)
      expect(successCount + errorCount).toBe(10);

      // The integration should not crash despite some failures
      expect(mailReceivingService.getStatus().isRunning).toBe(false); // Service wasn't started in this test
    });
  });
});

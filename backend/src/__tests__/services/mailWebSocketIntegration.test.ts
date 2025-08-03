import { MailWebSocketIntegrationService } from '../../services/mailWebSocketIntegration';
import { MailReceivingService } from '../../services/mailReceivingService';
import { WebSocketService } from '../../services/websocketService';
import { logger } from '../../utils/logger';

// Mock all database dependencies
jest.mock('../../models/Mailbox');
jest.mock('../../models/Session');
jest.mock('../../middleware/auth');

describe('MailWebSocketIntegrationService', () => {
  let integrationService: MailWebSocketIntegrationService;
  let mailReceivingService: MailReceivingService;
  let webSocketService: WebSocketService;

  beforeEach(() => {
    integrationService = new MailWebSocketIntegrationService();
    mailReceivingService = new MailReceivingService(2527);
    webSocketService = new WebSocketService();

    // Mock the broadcastNewMail method
    webSocketService.broadcastNewMail = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (integrationService.isReady()) {
      await integrationService.shutdown();
    }
    if (mailReceivingService) {
      await mailReceivingService.stop();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(integrationService.isReady()).toBe(false);

      await integrationService.initialize(
        mailReceivingService,
        webSocketService
      );

      expect(integrationService.isReady()).toBe(true);
    });

    it('should not initialize twice', async () => {
      const loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation();

      await integrationService.initialize(
        mailReceivingService,
        webSocketService
      );
      await integrationService.initialize(
        mailReceivingService,
        webSocketService
      );

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Mail-WebSocket integration already initialized'
      );
      loggerWarnSpy.mockRestore();
    });

    it('should emit initialized event', async () => {
      const initializeEventSpy = jest.fn();
      integrationService.on('initialized', initializeEventSpy);

      await integrationService.initialize(
        mailReceivingService,
        webSocketService
      );

      expect(initializeEventSpy).toHaveBeenCalled();
    });
  });

  describe('Mail Processing', () => {
    beforeEach(async () => {
      await integrationService.initialize(
        mailReceivingService,
        webSocketService
      );
    });

    it('should process mail received events successfully', async () => {
      const testMail = {
        id: 'test-mail-id',
        mailboxId: 'test-mailbox-id',
        from: 'sender@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Test Mail',
        textContent: 'Test content',
        attachments: [],
        size: 100,
        receivedAt: new Date(),
        isRead: false,
      };

      const successEventSpy = jest.fn();
      integrationService.on('broadcastSuccess', successEventSpy);

      // Emit mail received event
      mailReceivingService.emit('mailReceived', {
        mailboxId: 'test-mailbox-id',
        mail: testMail,
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(webSocketService.broadcastNewMail).toHaveBeenCalledWith(
        'test-mailbox-id',
        expect.objectContaining({
          id: testMail.id,
          from: testMail.from,
          to: testMail.to,
          subject: testMail.subject,
        })
      );

      expect(successEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          mailboxId: 'test-mailbox-id',
          mail: expect.objectContaining({ id: testMail.id }),
          processingTime: expect.any(Number),
        })
      );
    });

    it('should handle broadcast failures gracefully', async () => {
      // Mock WebSocket service to throw an error
      webSocketService.broadcastNewMail = jest
        .fn()
        .mockRejectedValue(new Error('WebSocket broadcast failed'));

      const testMail = {
        id: 'error-test-mail-id',
        mailboxId: 'test-mailbox-id',
        from: 'error-test@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Error Test Mail',
        textContent: 'This mail should trigger an error',
        attachments: [],
        size: 100,
        receivedAt: new Date(),
        isRead: false,
      };

      const failureEventSpy = jest.fn();
      integrationService.on('broadcastFailure', failureEventSpy);

      // This should not throw an error
      expect(() => {
        mailReceivingService.emit('mailReceived', {
          mailboxId: 'test-mailbox-id',
          mail: testMail,
        });
      }).not.toThrow();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(failureEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          mailboxId: 'test-mailbox-id',
          mail: expect.objectContaining({ id: testMail.id }),
          processingTime: expect.any(Number),
        })
      );
    });

    it('should validate mail received event structure', async () => {
      const failureEventSpy = jest.fn();
      integrationService.on('broadcastFailure', failureEventSpy);

      // Test with invalid event data
      const invalidEvents = [
        null,
        undefined,
        {},
        { mailboxId: 'test' }, // missing mail
        { mail: {} }, // missing mailboxId
        { mailboxId: '', mail: {} }, // empty mailboxId
      ];

      for (const invalidEvent of invalidEvents) {
        mailReceivingService.emit('mailReceived', invalidEvent);
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(failureEventSpy).toHaveBeenCalledTimes(invalidEvents.length);
    });

    it('should track processing time statistics', async () => {
      const testMail = {
        id: 'stats-test-mail-id',
        mailboxId: 'test-mailbox-id',
        from: 'stats-test@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Stats Test Mail',
        textContent: 'Test content for stats',
        attachments: [],
        size: 100,
        receivedAt: new Date(),
        isRead: false,
      };

      // Process multiple mails
      for (let i = 0; i < 3; i++) {
        mailReceivingService.emit('mailReceived', {
          mailboxId: 'test-mailbox-id',
          mail: { ...testMail, id: `stats-test-mail-${i}` },
        });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = integrationService.getDetailedStats();
      expect(stats.totalMails).toBe(3);
      expect(stats.successfulBroadcasts).toBe(3);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('Statistics and Health Monitoring', () => {
    beforeEach(async () => {
      await integrationService.initialize(
        mailReceivingService,
        webSocketService
      );
    });

    it('should provide detailed statistics', () => {
      const stats = integrationService.getDetailedStats();

      expect(stats).toHaveProperty('totalMails');
      expect(stats).toHaveProperty('successfulBroadcasts');
      expect(stats).toHaveProperty('failedBroadcasts');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('isHealthy');
      expect(stats).toHaveProperty('averageProcessingTime');
    });

    it('should calculate success rate correctly', async () => {
      // Mock partial failures
      let callCount = 0;
      webSocketService.broadcastNewMail = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve();
        } else {
          return Promise.reject(new Error('Simulated failure'));
        }
      });

      const testMail = {
        id: 'rate-test-mail',
        mailboxId: 'test-mailbox-id',
        from: 'rate-test@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Rate Test Mail',
        textContent: 'Test content',
        attachments: [],
        size: 100,
        receivedAt: new Date(),
        isRead: false,
      };

      // Process 4 mails (2 success, 2 failures)
      for (let i = 0; i < 4; i++) {
        mailReceivingService.emit('mailReceived', {
          mailboxId: 'test-mailbox-id',
          mail: { ...testMail, id: `rate-test-mail-${i}` },
        });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 300));

      const stats = integrationService.getDetailedStats();
      expect(stats.totalMails).toBe(4);
      expect(stats.successfulBroadcasts).toBe(2);
      expect(stats.failedBroadcasts).toBe(2);
      expect(stats.successRate).toBe('50.00%');
    });

    it('should determine health status correctly', async () => {
      // Test healthy state (no mails processed yet)
      let stats = integrationService.getDetailedStats();
      expect(stats.isHealthy).toBe(true);

      // Process successful mails
      const testMail = {
        id: 'health-test-mail',
        mailboxId: 'test-mailbox-id',
        from: 'health-test@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Health Test Mail',
        textContent: 'Test content',
        attachments: [],
        size: 100,
        receivedAt: new Date(),
        isRead: false,
      };

      for (let i = 0; i < 10; i++) {
        mailReceivingService.emit('mailReceived', {
          mailboxId: 'test-mailbox-id',
          mail: { ...testMail, id: `health-test-mail-${i}` },
        });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 300));

      stats = integrationService.getDetailedStats();
      expect(stats.isHealthy).toBe(true);
      expect(stats.successRate).toBe('100.00%');
    });

    it('should reset statistics', async () => {
      const testMail = {
        id: 'reset-test-mail',
        mailboxId: 'test-mailbox-id',
        from: 'reset-test@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Reset Test Mail',
        textContent: 'Test content',
        attachments: [],
        size: 100,
        receivedAt: new Date(),
        isRead: false,
      };

      // Process some mails
      mailReceivingService.emit('mailReceived', {
        mailboxId: 'test-mailbox-id',
        mail: testMail,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      let stats = integrationService.getDetailedStats();
      expect(stats.totalMails).toBe(1);

      // Reset statistics
      const resetEventSpy = jest.fn();
      integrationService.on('statsReset', resetEventSpy);

      integrationService.resetStats();

      stats = integrationService.getDetailedStats();
      expect(stats.totalMails).toBe(0);
      expect(stats.successfulBroadcasts).toBe(0);
      expect(stats.failedBroadcasts).toBe(0);
      expect(resetEventSpy).toHaveBeenCalled();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await integrationService.initialize(
        mailReceivingService,
        webSocketService
      );
      expect(integrationService.isReady()).toBe(true);

      const shutdownEventSpy = jest.fn();
      integrationService.on('shutdown', shutdownEventSpy);

      await integrationService.shutdown();

      expect(integrationService.isReady()).toBe(false);
      expect(shutdownEventSpy).toHaveBeenCalled();
    });

    it('should clean up event listeners on shutdown', async () => {
      await integrationService.initialize(
        mailReceivingService,
        webSocketService
      );

      const eventSpy = jest.fn();
      integrationService.on('broadcastSuccess', eventSpy);

      await integrationService.shutdown();

      // Try to emit an event after shutdown
      const testMail = {
        id: 'shutdown-test-mail',
        mailboxId: 'test-mailbox-id',
        from: 'shutdown-test@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'Shutdown Test Mail',
        textContent: 'Test content',
        attachments: [],
        size: 100,
        receivedAt: new Date(),
        isRead: false,
      };

      mailReceivingService.emit('mailReceived', {
        mailboxId: 'test-mailbox-id',
        mail: testMail,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Event should not be triggered after shutdown
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await integrationService.initialize(
        mailReceivingService,
        webSocketService
      );
    });

    it('should handle PushMessageFormatter validation errors', async () => {
      const invalidMail = {
        // Missing required fields
        mailboxId: 'test-mailbox-id',
        subject: 'Invalid Mail',
      };

      const failureEventSpy = jest.fn();
      integrationService.on('broadcastFailure', failureEventSpy);

      mailReceivingService.emit('mailReceived', {
        mailboxId: 'test-mailbox-id',
        mail: invalidMail,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(failureEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          mailboxId: 'test-mailbox-id',
        })
      );
    });

    it('should handle WebSocket service errors', async () => {
      webSocketService.broadcastNewMail = jest
        .fn()
        .mockRejectedValue(new Error('WebSocket connection lost'));

      const testMail = {
        id: 'websocket-error-test-mail',
        mailboxId: 'test-mailbox-id',
        from: 'websocket-error@example.com',
        to: 'test@nnu.edu.kg',
        subject: 'WebSocket Error Test',
        textContent: 'Test content',
        attachments: [],
        size: 100,
        receivedAt: new Date(),
        isRead: false,
      };

      const failureEventSpy = jest.fn();
      integrationService.on('broadcastFailure', failureEventSpy);

      mailReceivingService.emit('mailReceived', {
        mailboxId: 'test-mailbox-id',
        mail: testMail,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(failureEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'WebSocket connection lost',
          }),
        })
      );

      const stats = integrationService.getDetailedStats();
      expect(stats.failedBroadcasts).toBe(1);
      expect(stats.lastError?.message).toBe('WebSocket connection lost');
    });
  });
});

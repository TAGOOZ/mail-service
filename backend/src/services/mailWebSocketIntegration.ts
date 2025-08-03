import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { PushMessageFormatter } from './pushMessageFormatter';
import { WebSocketService } from './websocketService';
import { MailReceivingService } from './mailReceivingService';

/**
 * Integration statistics interface
 */
interface IntegrationStats {
  totalMails: number;
  successfulBroadcasts: number;
  failedBroadcasts: number;
  lastError: Error | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  averageProcessingTime: number;
  processingTimes: number[];
}

/**
 * Mail received event interface
 */
interface MailReceivedEvent {
  mailboxId: string;
  mail: any;
  timestamp?: Date;
}

/**
 * Service responsible for integrating mail receiving with WebSocket push notifications
 * This service handles the real-time broadcasting of new mails to subscribed clients
 */
export class MailWebSocketIntegrationService extends EventEmitter {
  private stats: IntegrationStats;
  private healthReportInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    super();
    this.stats = {
      totalMails: 0,
      successfulBroadcasts: 0,
      failedBroadcasts: 0,
      lastError: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      averageProcessingTime: 0,
      processingTimes: [],
    };
  }

  /**
   * Initialize the integration between mail receiving and WebSocket services
   */
  async initialize(
    mailReceivingService: MailReceivingService,
    webSocketService: WebSocketService
  ): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Mail-WebSocket integration already initialized');
      return;
    }

    try {
      // Set up the main integration event handler
      mailReceivingService.on(
        'mailReceived',
        async (event: MailReceivedEvent) => {
          await this.handleMailReceived(event, webSocketService);
        }
      );

      // Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;

      logger.info('Mail-WebSocket integration initialized successfully', {
        features: [
          'Real-time mail push notifications',
          'Message formatting and validation',
          'Error handling and recovery',
          'Integration health monitoring',
          'Performance tracking',
        ],
      });

      // Emit initialization complete event
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Mail-WebSocket integration:', error);
      throw error;
    }
  }

  /**
   * Handle mail received event and broadcast via WebSocket
   */
  private async handleMailReceived(
    event: MailReceivedEvent,
    webSocketService: WebSocketService
  ): Promise<void> {
    const startTime = Date.now();
    this.stats.totalMails++;

    try {
      // Validate the event data structure
      this.validateMailReceivedEvent(event);

      logger.debug('Processing mail received event for WebSocket broadcast', {
        mailboxId: event.mailboxId,
        mailId: event.mail.id || event.mail._id,
        from: event.mail.from,
        subject: event.mail.subject,
        eventTimestamp:
          event.timestamp?.toISOString() || new Date().toISOString(),
      });

      // Validate mail data for broadcasting
      PushMessageFormatter.validateMailForBroadcast(event.mail);

      // Format the message for WebSocket broadcast
      const formattedMessage = PushMessageFormatter.formatNewMailMessage(
        event.mailboxId,
        event.mail
      );

      // Broadcast the formatted message to subscribed clients
      await webSocketService.broadcastNewMail(
        formattedMessage.mailboxId,
        formattedMessage.mail
      );

      // Update success statistics
      const processingTime = Date.now() - startTime;
      this.updateSuccessStats(processingTime);

      logger.info('Successfully broadcasted new mail via WebSocket', {
        mailId: formattedMessage.mail.id,
        mailboxId: formattedMessage.mailboxId,
        from: formattedMessage.mail.from,
        subject: formattedMessage.mail.subject,
        processingTimeMs: processingTime,
        attachmentCount: formattedMessage.mail.attachments?.length || 0,
        mailSize: formattedMessage.mail.size,
        integrationStats: this.getStatsSnapshot(),
      });

      // Emit success event
      this.emit('broadcastSuccess', {
        mailboxId: formattedMessage.mailboxId,
        mail: formattedMessage.mail,
        processingTime,
      });
    } catch (error) {
      // Update failure statistics
      const processingTime = Date.now() - startTime;
      this.updateFailureStats(error as Error, processingTime);

      logger.error('Failed to broadcast new mail via WebSocket', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        mailboxId: event?.mailboxId,
        mailId: event?.mail?.id || event?.mail?._id,
        from: event?.mail?.from,
        subject: event?.mail?.subject,
        processingTimeMs: processingTime,
        integrationStats: this.getStatsSnapshot(),
      });

      // Log the full event data for debugging (but only in development)
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Full event data for failed broadcast:', {
          event: JSON.stringify(event, null, 2),
        });
      }

      // Emit failure event
      this.emit('broadcastFailure', {
        error: error as Error,
        mailboxId: event?.mailboxId,
        mail: event?.mail,
        processingTime,
      });

      // Don't throw the error to prevent crashing the mail receiving service
      // The mail is still saved to the database, just not broadcasted via WebSocket
      // This ensures the core functionality (mail storage) continues to work
      // even if the real-time push feature fails
    }
  }

  /**
   * Validate mail received event structure
   */
  private validateMailReceivedEvent(event: MailReceivedEvent): void {
    if (!event) {
      throw new Error('Mail received event is null or undefined');
    }

    if (!event.mailboxId || typeof event.mailboxId !== 'string') {
      throw new Error('Invalid or missing mailboxId in mail received event');
    }

    if (!event.mail) {
      throw new Error('Missing mail data in mail received event');
    }

    // Additional validation can be added here
  }

  /**
   * Update success statistics
   */
  private updateSuccessStats(processingTime: number): void {
    this.stats.successfulBroadcasts++;
    this.stats.lastSuccessAt = new Date();
    this.updateProcessingTimeStats(processingTime);
  }

  /**
   * Update failure statistics
   */
  private updateFailureStats(error: Error, processingTime: number): void {
    this.stats.failedBroadcasts++;
    this.stats.lastError = error;
    this.stats.lastFailureAt = new Date();
    this.updateProcessingTimeStats(processingTime);
  }

  /**
   * Update processing time statistics
   */
  private updateProcessingTimeStats(processingTime: number): void {
    this.stats.processingTimes.push(processingTime);

    // Keep only the last 100 processing times for average calculation
    if (this.stats.processingTimes.length > 100) {
      this.stats.processingTimes = this.stats.processingTimes.slice(-100);
    }

    // Calculate average processing time
    this.stats.averageProcessingTime =
      this.stats.processingTimes.reduce((sum, time) => sum + time, 0) /
      this.stats.processingTimes.length;
  }

  /**
   * Get a snapshot of current statistics
   */
  private getStatsSnapshot(): object {
    const successRate =
      this.stats.totalMails > 0
        ? (
            (this.stats.successfulBroadcasts / this.stats.totalMails) *
            100
          ).toFixed(2) + '%'
        : '0%';

    return {
      totalMails: this.stats.totalMails,
      successfulBroadcasts: this.stats.successfulBroadcasts,
      failedBroadcasts: this.stats.failedBroadcasts,
      successRate,
      averageProcessingTimeMs: Math.round(this.stats.averageProcessingTime),
    };
  }

  /**
   * Start health monitoring and periodic reporting
   */
  private startHealthMonitoring(): void {
    // Report integration health every 5 minutes
    this.healthReportInterval = setInterval(
      () => {
        if (this.stats.totalMails > 0) {
          const successRate = (
            (this.stats.successfulBroadcasts / this.stats.totalMails) *
            100
          ).toFixed(2);

          logger.info('Mail-WebSocket integration health report', {
            totalMailsProcessed: this.stats.totalMails,
            successfulBroadcasts: this.stats.successfulBroadcasts,
            failedBroadcasts: this.stats.failedBroadcasts,
            successRate: successRate + '%',
            averageProcessingTimeMs: Math.round(
              this.stats.averageProcessingTime
            ),
            lastSuccessAt: this.stats.lastSuccessAt?.toISOString(),
            lastFailureAt: this.stats.lastFailureAt?.toISOString(),
            lastError: this.stats.lastError?.message,
          });

          // Emit health report event
          this.emit('healthReport', this.getDetailedStats());
        }
      },
      5 * 60 * 1000
    ); // Report every 5 minutes
  }

  /**
   * Get detailed integration statistics
   */
  getDetailedStats(): IntegrationStats & {
    successRate: string;
    isHealthy: boolean;
  } {
    const successRate =
      this.stats.totalMails > 0
        ? (
            (this.stats.successfulBroadcasts / this.stats.totalMails) *
            100
          ).toFixed(2) + '%'
        : '0%';

    // Consider integration healthy if success rate > 95% and no recent errors
    const isHealthy =
      this.stats.totalMails === 0 ||
      (this.stats.successfulBroadcasts / this.stats.totalMails > 0.95 &&
        (!this.stats.lastFailureAt ||
          Date.now() - this.stats.lastFailureAt.getTime() > 10 * 60 * 1000)); // No failures in last 10 minutes

    return {
      ...this.stats,
      successRate,
      isHealthy,
    };
  }

  /**
   * Reset integration statistics
   */
  resetStats(): void {
    this.stats = {
      totalMails: 0,
      successfulBroadcasts: 0,
      failedBroadcasts: 0,
      lastError: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      averageProcessingTime: 0,
      processingTimes: [],
    };

    logger.info('Integration statistics reset');
    this.emit('statsReset');
  }

  /**
   * Shutdown the integration service
   */
  async shutdown(): Promise<void> {
    if (this.healthReportInterval) {
      clearInterval(this.healthReportInterval);
      this.healthReportInterval = null;
    }

    this.isInitialized = false;

    logger.info('Mail-WebSocket integration service shutdown completed');

    // Emit shutdown event before removing listeners
    this.emit('shutdown');

    // Remove all listeners after emitting the shutdown event
    this.removeAllListeners();
  }

  /**
   * Check if the integration is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const mailWebSocketIntegration = new MailWebSocketIntegrationService();

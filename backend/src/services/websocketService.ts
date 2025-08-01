import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../utils/logger';
import { verifyToken } from '../middleware/auth';
import { Mailbox } from '../models/Mailbox';
import { SessionManager } from '../models/Session';
import {
  WebSocketEvent,
  SubscribeEventData,
  UnsubscribeEventData,
  NewMailEventData,
  ExpiryWarningEventData,
  MailboxExpiredEventData,
  ConnectionEstablishedEventData,
  WebSocketErrorEventData,
  SubscribeEventDataSchema,
  UnsubscribeEventDataSchema,
} from '@nnu/shared';
import { Mail } from '@nnu/shared';

interface AuthenticatedSocket extends Socket {
  mailboxId?: string;
  token?: string;
}

interface MailboxSubscription {
  socketId: string;
  mailboxId: string;
  token: string;
  subscribedAt: Date;
}

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private subscriptions: Map<string, MailboxSubscription[]> = new Map(); // mailboxId -> subscriptions
  private socketSubscriptions: Map<string, string[]> = new Map(); // socketId -> mailboxIds
  private expiryCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    this.startExpiryChecker();

    logger.info('WebSocket service initialized');
  }

  /**
   * Setup Socket.io event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Send connection established event
      const connectionData: ConnectionEstablishedEventData = {
        socketId: socket.id,
        timestamp: new Date(),
      };
      socket.emit(WebSocketEvent.CONNECTION_ESTABLISHED, connectionData);

      // Handle mailbox subscription
      socket.on(WebSocketEvent.SUBSCRIBE, async (data: SubscribeEventData) => {
        await this.handleSubscribe(socket, data);
      });

      // Handle mailbox unsubscription
      socket.on(
        WebSocketEvent.UNSUBSCRIBE,
        async (data: UnsubscribeEventData) => {
          await this.handleUnsubscribe(socket, data);
        }
      );

      // Handle client disconnect
      socket.on('disconnect', reason => {
        logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
        this.handleDisconnect(socket);
      });

      // Handle connection errors
      socket.on('error', error => {
        logger.error(`Socket error for ${socket.id}:`, error);
        this.sendError(socket, 'CONNECTION_ERROR', 'Socket connection error');
      });
    });
  }

  /**
   * Handle mailbox subscription
   */
  private async handleSubscribe(
    socket: AuthenticatedSocket,
    data: SubscribeEventData
  ): Promise<void> {
    try {
      // Validate input data
      const validationResult = SubscribeEventDataSchema.safeParse(data);
      if (!validationResult.success) {
        this.sendError(socket, 'VALIDATION_ERROR', 'Invalid subscription data');
        return;
      }

      const { mailboxId, token } = validationResult.data;

      // Verify JWT token
      const decodedToken = verifyToken(token);
      if (!decodedToken || decodedToken.mailboxId !== mailboxId) {
        this.sendError(socket, 'AUTHENTICATION_ERROR', 'Invalid token');
        return;
      }

      // Verify mailbox exists and is active
      const mailbox = await Mailbox.findByToken(decodedToken.token);
      if (!mailbox || mailbox.isExpired()) {
        this.sendError(
          socket,
          'MAILBOX_NOT_FOUND',
          'Mailbox not found or expired'
        );
        return;
      }

      // Check if already subscribed to this mailbox
      const existingSubscriptions = this.subscriptions.get(mailboxId) || [];
      const existingSubscription = existingSubscriptions.find(
        sub => sub.socketId === socket.id
      );

      if (existingSubscription) {
        logger.info(
          `Socket ${socket.id} already subscribed to mailbox ${mailboxId}`
        );
        return;
      }

      // Add subscription
      const subscription: MailboxSubscription = {
        socketId: socket.id,
        mailboxId,
        token: decodedToken.token,
        subscribedAt: new Date(),
      };

      // Update subscriptions map
      const mailboxSubscriptions = this.subscriptions.get(mailboxId) || [];
      mailboxSubscriptions.push(subscription);
      this.subscriptions.set(mailboxId, mailboxSubscriptions);

      // Update socket subscriptions map
      const socketMailboxes = this.socketSubscriptions.get(socket.id) || [];
      socketMailboxes.push(mailboxId);
      this.socketSubscriptions.set(socket.id, socketMailboxes);

      // Store authentication info on socket
      socket.mailboxId = mailboxId;
      socket.token = decodedToken.token;

      // Join socket to mailbox room
      socket.join(`mailbox:${mailboxId}`);

      logger.info(`Socket ${socket.id} subscribed to mailbox ${mailboxId}`);

      // Update session last access
      await SessionManager.updateLastAccess(token);
    } catch (error) {
      logger.error('Error handling subscription:', error);
      this.sendError(
        socket,
        'SUBSCRIPTION_ERROR',
        'Failed to subscribe to mailbox'
      );
    }
  }

  /**
   * Handle mailbox unsubscription
   */
  private async handleUnsubscribe(
    socket: AuthenticatedSocket,
    data: UnsubscribeEventData
  ): Promise<void> {
    try {
      // Validate input data
      const validationResult = UnsubscribeEventDataSchema.safeParse(data);
      if (!validationResult.success) {
        this.sendError(
          socket,
          'VALIDATION_ERROR',
          'Invalid unsubscription data'
        );
        return;
      }

      const { mailboxId } = validationResult.data;

      this.removeSubscription(socket.id, mailboxId);
      socket.leave(`mailbox:${mailboxId}`);

      logger.info(`Socket ${socket.id} unsubscribed from mailbox ${mailboxId}`);
    } catch (error) {
      logger.error('Error handling unsubscription:', error);
      this.sendError(
        socket,
        'UNSUBSCRIPTION_ERROR',
        'Failed to unsubscribe from mailbox'
      );
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: AuthenticatedSocket): void {
    const socketMailboxes = this.socketSubscriptions.get(socket.id) || [];

    // Remove all subscriptions for this socket
    socketMailboxes.forEach(mailboxId => {
      this.removeSubscription(socket.id, mailboxId);
    });

    // Clean up socket subscriptions
    this.socketSubscriptions.delete(socket.id);
  }

  /**
   * Remove subscription
   */
  private removeSubscription(socketId: string, mailboxId: string): void {
    // Remove from mailbox subscriptions
    const mailboxSubscriptions = this.subscriptions.get(mailboxId) || [];
    const updatedSubscriptions = mailboxSubscriptions.filter(
      sub => sub.socketId !== socketId
    );

    if (updatedSubscriptions.length === 0) {
      this.subscriptions.delete(mailboxId);
    } else {
      this.subscriptions.set(mailboxId, updatedSubscriptions);
    }

    // Remove from socket subscriptions
    const socketMailboxes = this.socketSubscriptions.get(socketId) || [];
    const updatedSocketMailboxes = socketMailboxes.filter(
      id => id !== mailboxId
    );

    if (updatedSocketMailboxes.length === 0) {
      this.socketSubscriptions.delete(socketId);
    } else {
      this.socketSubscriptions.set(socketId, updatedSocketMailboxes);
    }
  }

  /**
   * Send error to client
   */
  private sendError(
    socket: Socket,
    type: string,
    message: string,
    code?: string
  ): void {
    const errorData: WebSocketErrorEventData = {
      type,
      message,
      code,
    };
    socket.emit(WebSocketEvent.ERROR, errorData);
  }

  /**
   * Broadcast new mail to subscribed clients
   */
  async broadcastNewMail(mailboxId: string, mail: Mail): Promise<void> {
    if (!this.io) return;

    const eventData: NewMailEventData = {
      mailboxId,
      mail,
    };

    // Broadcast to all clients subscribed to this mailbox
    this.io.to(`mailbox:${mailboxId}`).emit(WebSocketEvent.NEW_MAIL, eventData);

    logger.info(`Broadcasted new mail to mailbox ${mailboxId} subscribers`);
  }

  /**
   * Send expiry warning to subscribed clients
   */
  async sendExpiryWarning(
    mailboxId: string,
    expiresAt: Date,
    minutesLeft: number
  ): Promise<void> {
    if (!this.io) return;

    const eventData: ExpiryWarningEventData = {
      mailboxId,
      expiresAt,
      minutesLeft,
    };

    // Send to all clients subscribed to this mailbox
    this.io
      .to(`mailbox:${mailboxId}`)
      .emit(WebSocketEvent.EXPIRY_WARNING, eventData);

    logger.info(
      `Sent expiry warning to mailbox ${mailboxId} subscribers (${minutesLeft} minutes left)`
    );
  }

  /**
   * Notify clients that mailbox has expired
   */
  async notifyMailboxExpired(mailboxId: string): Promise<void> {
    if (!this.io) return;

    const eventData: MailboxExpiredEventData = {
      mailboxId,
      expiredAt: new Date(),
    };

    // Send to all clients subscribed to this mailbox
    this.io
      .to(`mailbox:${mailboxId}`)
      .emit(WebSocketEvent.MAILBOX_EXPIRED, eventData);

    // Remove all subscriptions for this mailbox
    const subscriptions = this.subscriptions.get(mailboxId) || [];
    subscriptions.forEach(subscription => {
      this.removeSubscription(subscription.socketId, mailboxId);
    });

    logger.info(`Notified clients that mailbox ${mailboxId} has expired`);
  }

  /**
   * Start expiry checker that periodically checks for mailboxes about to expire
   */
  private startExpiryChecker(): void {
    // Check every 5 minutes
    this.expiryCheckInterval = setInterval(
      async () => {
        await this.checkMailboxExpiry();
      },
      5 * 60 * 1000
    );

    logger.info('Expiry checker started');
  }

  /**
   * Check for mailboxes about to expire and send warnings
   */
  private async checkMailboxExpiry(): Promise<void> {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      // Find active mailboxes that expire within the next hour
      const expiringMailboxes = await Mailbox.find({
        isActive: true,
        expiresAt: { $gt: now, $lt: oneHourFromNow },
      });

      for (const mailbox of expiringMailboxes) {
        const minutesLeft = Math.floor(
          (mailbox.expiresAt.getTime() - now.getTime()) / (1000 * 60)
        );

        // Only send warning if there are subscribers
        if (this.subscriptions.has(mailbox.id)) {
          await this.sendExpiryWarning(
            mailbox.id,
            mailbox.expiresAt,
            minutesLeft
          );
        }
      }

      // Find expired mailboxes and notify clients
      const expiredMailboxes = await Mailbox.find({
        isActive: true,
        expiresAt: { $lt: now },
      });

      for (const mailbox of expiredMailboxes) {
        if (this.subscriptions.has(mailbox.id)) {
          await this.notifyMailboxExpired(mailbox.id);
        }
      }
    } catch (error) {
      logger.error('Error checking mailbox expiry:', error);
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    connectedClients: number;
    totalSubscriptions: number;
    mailboxesWithSubscriptions: number;
  } {
    const connectedClients = this.io?.engine.clientsCount || 0;
    const totalSubscriptions = Array.from(this.subscriptions.values()).reduce(
      (total, subs) => total + subs.length,
      0
    );
    const mailboxesWithSubscriptions = this.subscriptions.size;

    return {
      connectedClients,
      totalSubscriptions,
      mailboxesWithSubscriptions,
    };
  }

  /**
   * Get subscriptions for a specific mailbox
   */
  getMailboxSubscriptions(mailboxId: string): MailboxSubscription[] {
    return this.subscriptions.get(mailboxId) || [];
  }

  /**
   * Shutdown WebSocket service
   */
  async shutdown(): Promise<void> {
    if (this.expiryCheckInterval) {
      clearInterval(this.expiryCheckInterval);
      this.expiryCheckInterval = null;
    }

    if (this.io) {
      // Disconnect all clients
      this.io.disconnectSockets(true);
      this.io.close();
      this.io = null;
    }

    // Clear subscriptions
    this.subscriptions.clear();
    this.socketSubscriptions.clear();

    logger.info('WebSocket service shutdown completed');
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();

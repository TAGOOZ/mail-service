import { Server as HTTPServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketService } from '../../services/websocketService';
import { WebSocketEvent } from '@nnu/shared';

// Mock dependencies
jest.mock('../../models/Mailbox');
jest.mock('../../models/Session');
jest.mock('../../middleware/auth', () => ({
  verifyToken: jest.fn(),
}));

describe('WebSocketService', () => {
  let httpServer: HTTPServer;
  let webSocketService: WebSocketService;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeEach(async () => {
    // Create HTTP server
    httpServer = new HTTPServer();
    serverPort = 3001 + Math.floor(Math.random() * 1000);

    // Initialize WebSocket service
    webSocketService = new WebSocketService();
    webSocketService.initialize(httpServer);

    // Start server
    await new Promise<void>(resolve => {
      httpServer.listen(serverPort, resolve);
    });

    // Create client socket
    clientSocket = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
    });

    // Wait for connection
    await new Promise<void>(resolve => {
      clientSocket.on('connect', resolve);
    });
  });

  afterEach(async () => {
    // Clean up
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }

    await webSocketService.shutdown();

    await new Promise<void>(resolve => {
      httpServer.close(() => resolve());
    });

    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should establish connection and send connection established event', done => {
      // Set up the listener before the connection is established
      const newClient = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      newClient.on(WebSocketEvent.CONNECTION_ESTABLISHED, (data: any) => {
        expect(data).toHaveProperty('socketId');
        expect(data).toHaveProperty('timestamp');
        expect(data.socketId).toBe(newClient.id);
        newClient.disconnect();
        done();
      });
    });

    it('should handle client disconnect', async () => {
      const initialStats = webSocketService.getStats();
      expect(initialStats.connectedClients).toBeGreaterThan(0);

      clientSocket.disconnect();

      // Wait for disconnect to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalStats = webSocketService.getStats();
      expect(finalStats.connectedClients).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should return correct connection statistics', () => {
      const stats = webSocketService.getStats();

      expect(stats).toHaveProperty('connectedClients');
      expect(stats).toHaveProperty('totalSubscriptions');
      expect(stats).toHaveProperty('mailboxesWithSubscriptions');

      expect(typeof stats.connectedClients).toBe('number');
      expect(typeof stats.totalSubscriptions).toBe('number');
      expect(typeof stats.mailboxesWithSubscriptions).toBe('number');
    });

    it('should return empty subscriptions for non-existent mailbox', () => {
      const subscriptions =
        webSocketService.getMailboxSubscriptions('non-existent');
      expect(subscriptions).toEqual([]);
    });
  });

  describe('Broadcasting', () => {
    const mockMailboxId = 'test-mailbox-id';
    const mockMail = {
      id: 'test-mail-id',
      from: 'sender@example.com',
      to: 'test@nnu.edu.kg',
      subject: 'Test Subject',
      textContent: 'Test content',
      receivedAt: new Date(),
    };

    it('should broadcast new mail (no subscribers)', async () => {
      // This should not throw an error even with no subscribers
      await expect(
        webSocketService.broadcastNewMail(mockMailboxId, mockMail as any)
      ).resolves.not.toThrow();
    });

    it('should send expiry warning (no subscribers)', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      const minutesLeft = 30;

      // This should not throw an error even with no subscribers
      await expect(
        webSocketService.sendExpiryWarning(
          mockMailboxId,
          expiresAt,
          minutesLeft
        )
      ).resolves.not.toThrow();
    });

    it('should notify mailbox expired (no subscribers)', async () => {
      // This should not throw an error even with no subscribers
      await expect(
        webSocketService.notifyMailboxExpired(mockMailboxId)
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid subscription data', done => {
      const invalidData = {
        mailboxId: 'invalid-uuid',
        token: '',
      };

      clientSocket.on(WebSocketEvent.ERROR, (errorData: any) => {
        expect(errorData.type).toBe('VALIDATION_ERROR');
        expect(errorData.message).toBe('Invalid subscription data');
        done();
      });

      clientSocket.emit(WebSocketEvent.SUBSCRIBE, invalidData);
    });

    it('should handle null subscription data', done => {
      clientSocket.on(WebSocketEvent.ERROR, (errorData: any) => {
        expect(errorData).toHaveProperty('type');
        expect(errorData).toHaveProperty('message');
        done();
      });

      // Trigger an error by sending null data
      clientSocket.emit(WebSocketEvent.SUBSCRIBE, null);
    });
  });
});

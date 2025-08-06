import { io, Socket } from 'socket.io-client';
import { Mail } from '@nnu/shared';

/**
 * WebSocket 事件类型
 */
export enum WebSocketEvent {
  // 客户端事件
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',

  // 服务器事件
  NEW_MAIL = 'newMail',
  EXPIRY_WARNING = 'expiryWarning',
  MAILBOX_EXPIRED = 'mailboxExpired',
  CONNECTION_ESTABLISHED = 'connectionEstablished',
  ERROR = 'error',
}

/**
 * 订阅邮箱事件数据
 */
export interface SubscribeEventData {
  mailboxId: string;
  token: string;
}

/**
 * 取消订阅事件数据
 */
export interface UnsubscribeEventData {
  mailboxId: string;
}

/**
 * 新邮件事件数据
 */
export interface NewMailEventData {
  mailboxId: string;
  mail: Mail;
}

/**
 * 邮箱过期警告事件数据
 */
export interface ExpiryWarningEventData {
  mailboxId: string;
  expiresAt: Date;
  minutesLeft: number;
}

/**
 * 邮箱已过期事件数据
 */
export interface MailboxExpiredEventData {
  mailboxId: string;
  expiredAt: Date;
}

/**
 * 连接建立事件数据
 */
export interface ConnectionEstablishedEventData {
  socketId: string;
  timestamp: Date;
}

/**
 * WebSocket 错误事件数据
 */
export interface WebSocketErrorEventData {
  type: string;
  message: string;
  code?: string;
}

/**
 * WebSocket 连接状态
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * WebSocket 事件监听器类型
 */
export interface WebSocketEventListeners {
  onConnectionChange?: (status: ConnectionStatus) => void;
  onNewMail?: (data: NewMailEventData) => void;
  onExpiryWarning?: (data: ExpiryWarningEventData) => void;
  onMailboxExpired?: (data: MailboxExpiredEventData) => void;
  onError?: (data: WebSocketErrorEventData) => void;
}

/**
 * WebSocket 服务类
 */
class WebSocketService {
  private socket: Socket | null = null;
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private listeners: WebSocketEventListeners = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private currentSubscription: SubscribeEventData | null = null;

  /**
   * 获取 WebSocket 服务器 URL
   */
  private getSocketUrl(): string {
    // Use WebSocket-specific environment variable first
    const wsUrl = (import.meta as any).env?.VITE_WS_URL;
    if (wsUrl) {
      return wsUrl;
    }

    // Fallback to API base URL
    const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';

    // 如果是相对路径，构建完整的 WebSocket URL
    if (apiBaseUrl.startsWith('/')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}`;
    }

    // 如果是完整 URL，提取主机部分
    if (apiBaseUrl) {
      try {
        const url = new URL(apiBaseUrl);
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${url.host}`;
      } catch {
        // 如果解析失败，使用默认值
      }
    }

    // Default to current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}:3001`;
  }

  /**
   * 连接到 WebSocket 服务器
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log(
        'WebSocket already connected, skipping duplicate connection attempt'
      );
      return;
    }

    // Prevent multiple connection attempts
    if (this.connectionStatus === ConnectionStatus.CONNECTING) {
      console.log(
        'WebSocket connection already in progress, skipping duplicate attempt'
      );
      return;
    }

    this.setConnectionStatus(ConnectionStatus.CONNECTING);

    const socketUrl = this.getSocketUrl();

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
    });

    this.setupEventListeners();
  }

  /**
   * 断开 WebSocket 连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
    this.currentSubscription = null;
    this.reconnectAttempts = 0;
  }

  /**
   * 设置事件监听器
   */
  setEventListeners(listeners: WebSocketEventListeners): void {
    this.listeners = { ...this.listeners, ...listeners };
  }

  /**
   * 订阅邮箱更新
   */
  subscribeToMailbox(mailboxId: string, token: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, attempting to connect...');
      this.connect();

      // 等待连接建立后再订阅
      this.socket?.once('connect', () => {
        this.performSubscription(mailboxId, token);
      });
      return;
    }

    this.performSubscription(mailboxId, token);
  }

  /**
   * 执行订阅操作
   */
  private performSubscription(mailboxId: string, token: string): void {
    // Prevent duplicate subscriptions to the same mailbox
    if (this.currentSubscription?.mailboxId === mailboxId) {
      console.log('Already subscribed to mailbox:', mailboxId);
      return;
    }

    const subscribeData: SubscribeEventData = { mailboxId, token };

    this.socket?.emit(WebSocketEvent.SUBSCRIBE, subscribeData);
    this.currentSubscription = subscribeData;

    console.log('Subscribed to mailbox:', mailboxId);
  }

  /**
   * 取消订阅邮箱
   */
  unsubscribeFromMailbox(mailboxId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    const unsubscribeData: UnsubscribeEventData = { mailboxId };
    this.socket.emit(WebSocketEvent.UNSUBSCRIBE, unsubscribeData);
    this.currentSubscription = null;

    console.log('Unsubscribed from mailbox:', mailboxId);
  }

  /**
   * 获取当前连接状态
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connectionStatus === ConnectionStatus.CONNECTED;
  }

  /**
   * 设置连接状态并通知监听器
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.listeners.onConnectionChange?.(status);
    }
  }

  /**
   * 设置 WebSocket 事件监听器
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.setConnectionStatus(ConnectionStatus.CONNECTED);
      this.reconnectAttempts = 0;

      // 如果有之前的订阅，重新订阅
      if (this.currentSubscription) {
        this.performSubscription(
          this.currentSubscription.mailboxId,
          this.currentSubscription.token
        );
      }
    });

    // 连接断开
    this.socket.on('disconnect', reason => {
      console.log('WebSocket disconnected:', reason);
      this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
    });

    // 连接错误
    this.socket.on('connect_error', error => {
      console.error('WebSocket connection error:', error);
      this.setConnectionStatus(ConnectionStatus.ERROR);
      this.reconnectAttempts++;
    });

    // 重连尝试
    this.socket.on('reconnect_attempt', attemptNumber => {
      console.log('WebSocket reconnect attempt:', attemptNumber);
      this.setConnectionStatus(ConnectionStatus.RECONNECTING);
    });

    // 重连成功
    this.socket.on('reconnect', attemptNumber => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.setConnectionStatus(ConnectionStatus.CONNECTED);
      this.reconnectAttempts = 0;
    });

    // 重连失败
    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      this.setConnectionStatus(ConnectionStatus.ERROR);
    });

    // 连接建立确认
    this.socket.on(
      WebSocketEvent.CONNECTION_ESTABLISHED,
      (data: ConnectionEstablishedEventData) => {
        console.log('WebSocket connection established:', data);
      }
    );

    // 新邮件事件
    this.socket.on(WebSocketEvent.NEW_MAIL, (data: NewMailEventData) => {
      console.log('New mail received:', data);
      this.listeners.onNewMail?.(data);
    });

    // 邮箱过期警告
    this.socket.on(
      WebSocketEvent.EXPIRY_WARNING,
      (data: ExpiryWarningEventData) => {
        console.log('Mailbox expiry warning:', data);
        this.listeners.onExpiryWarning?.(data);
      }
    );

    // 邮箱已过期
    this.socket.on(
      WebSocketEvent.MAILBOX_EXPIRED,
      (data: MailboxExpiredEventData) => {
        console.log('Mailbox expired:', data);
        this.listeners.onMailboxExpired?.(data);
      }
    );

    // WebSocket 错误
    this.socket.on(WebSocketEvent.ERROR, (data: WebSocketErrorEventData) => {
      console.error('WebSocket error:', data);
      this.listeners.onError?.(data);
    });
  }
}

// 创建单例实例
export const websocketService = new WebSocketService();

export default websocketService;

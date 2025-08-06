import { z } from 'zod';
import { Mail } from './mail';

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
 * WebSocket 事件数据联合类型
 */
export type WebSocketEventData =
  | SubscribeEventData
  | UnsubscribeEventData
  | NewMailEventData
  | ExpiryWarningEventData
  | MailboxExpiredEventData
  | ConnectionEstablishedEventData
  | WebSocketErrorEventData;

// Zod 验证 schemas
export const WebSocketEventSchema = z.nativeEnum(WebSocketEvent);

// MongoDB ObjectId validation regex (24 hex characters)
const mongoObjectIdRegex = /^[0-9a-fA-F]{24}$/;

export const SubscribeEventDataSchema = z.object({
  mailboxId: z.string().regex(mongoObjectIdRegex, 'Invalid mailbox ID format'),
  token: z.string().min(1),
});

export const UnsubscribeEventDataSchema = z.object({
  mailboxId: z.string().regex(mongoObjectIdRegex, 'Invalid mailbox ID format'),
});

export const NewMailEventDataSchema = z.object({
  mailboxId: z.string().regex(mongoObjectIdRegex, 'Invalid mailbox ID format'),
  mail: z.any(), // 引用 MailSchema，避免循环依赖
});

export const ExpiryWarningEventDataSchema = z.object({
  mailboxId: z.string().uuid(),
  expiresAt: z.date(),
  minutesLeft: z.number().min(0),
});

export const MailboxExpiredEventDataSchema = z.object({
  mailboxId: z.string().uuid(),
  expiredAt: z.date(),
});

export const ConnectionEstablishedEventDataSchema = z.object({
  socketId: z.string(),
  timestamp: z.date(),
});

export const WebSocketErrorEventDataSchema = z.object({
  type: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

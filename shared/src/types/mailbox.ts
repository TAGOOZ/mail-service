import { z } from 'zod';

/**
 * 邮箱模型接口
 */
export interface Mailbox {
  id: string;
  address: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  extensionCount: number;
  isActive: boolean;
  lastAccessAt: Date;
}

/**
 * 邮箱创建请求
 */
export interface CreateMailboxRequest {
  // 无需参数，系统自动生成
}

/**
 * 邮箱创建响应
 */
export interface CreateMailboxResponse {
  mailboxId: string;
  address: string;
  token: string;
  expiresAt: Date;
}

/**
 * 邮箱信息响应
 */
export interface MailboxInfoResponse {
  address: string;
  expiresAt: Date;
  mailCount: number;
  extensionCount: number;
  maxExtensions: number;
}

/**
 * 邮箱延期请求
 */
export interface ExtendMailboxRequest {
  // 无需参数
}

/**
 * 邮箱延期响应
 */
export interface ExtendMailboxResponse {
  expiresAt: Date;
  extensionsLeft: number;
}

// Zod 验证 schemas
export const MailboxSchema = z.object({
  id: z.string().uuid(),
  address: z.string().email(),
  token: z.string().min(1),
  createdAt: z.date(),
  expiresAt: z.date(),
  extensionCount: z.number().min(0).max(2),
  isActive: z.boolean(),
  lastAccessAt: z.date(),
});

export const CreateMailboxResponseSchema = z.object({
  mailboxId: z.string().uuid(),
  address: z.string().email(),
  token: z.string().min(1),
  expiresAt: z.date(),
});

export const MailboxInfoResponseSchema = z.object({
  address: z.string().email(),
  expiresAt: z.date(),
  mailCount: z.number().min(0),
  extensionCount: z.number().min(0).max(2),
  maxExtensions: z.number().min(0),
});

export const ExtendMailboxResponseSchema = z.object({
  expiresAt: z.date(),
  extensionsLeft: z.number().min(0).max(2),
});
import { z } from 'zod';

/**
 * 附件信息接口
 */
export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
}

/**
 * 邮件模型接口
 */
export interface Mail {
  id: string;
  mailboxId: string;
  from: string;
  to: string;
  subject: string;
  textContent: string;
  htmlContent?: string;
  attachments: Attachment[];
  receivedAt: Date;
  isRead: boolean;
  size: number;
}

/**
 * 邮件列表查询请求
 */
export interface GetMailsRequest {
  page?: number;
  limit?: number;
}

/**
 * 邮件列表响应
 */
export interface GetMailsResponse {
  mails: Mail[];
  total: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

/**
 * 邮件详情响应
 */
export interface GetMailResponse {
  mail: Mail;
}

/**
 * 删除邮件响应
 */
export interface DeleteMailResponse {
  success: boolean;
  message: string;
}

/**
 * 清空邮箱响应
 */
export interface ClearMailboxResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}

// Zod 验证 schemas
export const AttachmentSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().min(0),
  contentId: z.string().optional(),
});

export const MailSchema = z.object({
  id: z.string().uuid(),
  mailboxId: z.string().uuid(),
  from: z.string().email(),
  to: z.string().email(),
  subject: z.string(),
  textContent: z.string(),
  htmlContent: z.string().optional(),
  attachments: z.array(AttachmentSchema),
  receivedAt: z.date(),
  isRead: z.boolean(),
  size: z.number().min(0),
});

export const GetMailsRequestSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});

export const GetMailsResponseSchema = z.object({
  mails: z.array(MailSchema),
  total: z.number().min(0),
  hasMore: z.boolean(),
  page: z.number().min(1),
  limit: z.number().min(1),
});

export const GetMailResponseSchema = z.object({
  mail: MailSchema,
});

export const DeleteMailResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const ClearMailboxResponseSchema = z.object({
  success: z.boolean(),
  deletedCount: z.number().min(0),
  message: z.string(),
});
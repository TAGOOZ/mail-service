import { z } from 'zod';

/**
 * 会话模型接口
 */
export interface Session {
  mailboxId: string;
  token: string;
  createdAt: Date;
  lastAccessAt: Date;
  userAgent: string;
  ipAddress: string;
}

/**
 * JWT 载荷接口
 */
export interface JWTPayload {
  mailboxId: string;
  iat: number;
  exp: number;
}

/**
 * 认证请求头
 */
export interface AuthHeaders {
  authorization: string;
}

/**
 * 认证上下文
 */
export interface AuthContext {
  mailboxId: string;
  token: string;
  session: Session;
}

// Zod 验证 schemas
export const SessionSchema = z.object({
  mailboxId: z.string().uuid(),
  token: z.string().min(1),
  createdAt: z.date(),
  lastAccessAt: z.date(),
  userAgent: z.string(),
  ipAddress: z.string().ip(),
});

export const JWTPayloadSchema = z.object({
  mailboxId: z.string().uuid(),
  iat: z.number(),
  exp: z.number(),
});

export const AuthHeadersSchema = z.object({
  authorization: z.string().regex(/^Bearer .+$/),
});

export const AuthContextSchema = z.object({
  mailboxId: z.string().uuid(),
  token: z.string().min(1),
  session: SessionSchema,
});
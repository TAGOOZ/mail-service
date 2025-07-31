import { z } from 'zod';

/**
 * API 错误类型枚举
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  MAILBOX_EXPIRED = 'MAILBOX_EXPIRED',
  MAILBOX_NOT_FOUND = 'MAILBOX_NOT_FOUND',
  MAIL_NOT_FOUND = 'MAIL_NOT_FOUND',
  EXTENSION_LIMIT_REACHED = 'EXTENSION_LIMIT_REACHED',
}

/**
 * API 错误响应接口
 */
export interface ApiError {
  type: ErrorType;
  message: string;
  code: string;
  details?: any;
}

/**
 * API 错误响应
 */
export interface ErrorResponse {
  error: ApiError;
}

/**
 * API 成功响应基础接口
 */
export interface BaseResponse {
  success: boolean;
  message?: string;
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * 分页响应元数据
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Zod 验证 schemas
export const ErrorTypeSchema = z.nativeEnum(ErrorType);

export const ApiErrorSchema = z.object({
  type: ErrorTypeSchema,
  message: z.string(),
  code: z.string(),
  details: z.any().optional(),
});

export const ErrorResponseSchema = z.object({
  error: ApiErrorSchema,
});

export const BaseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export const PaginationParamsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const PaginationMetaSchema = z.object({
  total: z.number().min(0),
  page: z.number().min(1),
  limit: z.number().min(1),
  hasMore: z.boolean(),
  totalPages: z.number().min(0),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
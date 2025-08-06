import { AxiosError } from 'axios';

export interface ErrorInfo {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  retryable: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export class AppError extends Error {
  public readonly type: string;
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly statusCode?: number;

  constructor(
    message: string,
    type: string = 'UNKNOWN_ERROR',
    code: string = 'E_UNKNOWN',
    retryable: boolean = false,
    statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.retryable = retryable;
    this.statusCode = statusCode;
  }
}

export const parseError = (error: unknown): AppError => {
  // Debug logging for empty errors
  if (process.env.NODE_ENV === 'development') {
    if (!error || (typeof error === 'string' && !error.trim())) {
      console.warn('parseError received empty or null error:', error);
    }
  }

  // Handle AppError instances
  if (error instanceof AppError) {
    return error;
  }

  // Handle Axios errors
  if (error instanceof Error && 'isAxiosError' in error) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const data = axiosError.response?.data as any;

    // Handle specific HTTP status codes
    switch (status) {
      case 400:
        return new AppError(
          (data?.error?.message && data.error.message.trim()) || '请求参数错误',
          'VALIDATION_ERROR',
          'E_BAD_REQUEST',
          false,
          400
        );
      case 401:
        return new AppError(
          '会话已过期，请重新生成邮箱',
          'AUTHENTICATION_ERROR',
          'E_UNAUTHORIZED',
          false,
          401
        );
      case 403:
        return new AppError(
          '没有权限访问此资源',
          'AUTHORIZATION_ERROR',
          'E_FORBIDDEN',
          false,
          403
        );
      case 404:
        return new AppError(
          '邮箱或邮件不存在',
          'NOT_FOUND_ERROR',
          'E_NOT_FOUND',
          false,
          404
        );
      case 429:
        return new AppError(
          '请求过于频繁，请稍后再试',
          'RATE_LIMIT_ERROR',
          'E_RATE_LIMIT',
          true,
          429
        );
      case 500:
        return new AppError(
          '服务器内部错误，请稍后重试',
          'SERVER_ERROR',
          'E_INTERNAL_SERVER',
          true,
          500
        );
      case 502:
      case 503:
      case 504:
        return new AppError(
          '服务暂时不可用，请稍后重试',
          'SERVICE_UNAVAILABLE',
          'E_SERVICE_UNAVAILABLE',
          true,
          status
        );
      default:
        if (
          axiosError.code === 'NETWORK_ERROR' ||
          axiosError.code === 'ECONNABORTED'
        ) {
          return new AppError(
            '网络连接失败，请检查网络连接',
            'NETWORK_ERROR',
            'E_NETWORK',
            true
          );
        }
        return new AppError(
          (data?.error?.message && data.error.message.trim()) ||
            (axiosError.message && axiosError.message.trim()) ||
            '网络请求失败',
          'HTTP_ERROR',
          'E_HTTP',
          true,
          status
        );
    }
  }

  // Handle generic Error instances
  if (error instanceof Error) {
    const message = error.message || '发生了未知错误';
    return new AppError(message, 'GENERIC_ERROR', 'E_GENERIC', false);
  }

  // Handle unknown error types
  return new AppError('发生了未知错误', 'UNKNOWN_ERROR', 'E_UNKNOWN', false);
};

export const getErrorInfo = (
  error: unknown,
  retryCallback?: () => void
): ErrorInfo => {
  const appError = parseError(error);

  // Create base error info
  const errorInfo: ErrorInfo = {
    title: getErrorTitle(appError),
    message: (appError.message && appError.message.trim()) || '发生了未知错误',
    type: getErrorType(appError),
    retryable: appError.retryable,
  };

  // Add retry action if error is retryable and callback is provided
  if (appError.retryable && retryCallback) {
    errorInfo.action = {
      label: '重试',
      onClick: retryCallback,
    };
  }

  // Add specific actions for certain error types
  if (appError.type === 'AUTHENTICATION_ERROR') {
    errorInfo.action = {
      label: '重新开始',
      onClick: () => {
        localStorage.clear();
        window.location.href = '/';
      },
    };
  }

  return errorInfo;
};

const getErrorTitle = (error: AppError): string => {
  switch (error.type) {
    case 'NETWORK_ERROR':
      return '网络连接失败';
    case 'AUTHENTICATION_ERROR':
      return '会话已过期';
    case 'AUTHORIZATION_ERROR':
      return '权限不足';
    case 'NOT_FOUND_ERROR':
      return '资源不存在';
    case 'VALIDATION_ERROR':
      return '输入错误';
    case 'RATE_LIMIT_ERROR':
      return '请求过于频繁';
    case 'SERVER_ERROR':
      return '服务器错误';
    case 'SERVICE_UNAVAILABLE':
      return '服务不可用';
    default:
      return '操作失败';
  }
};

const getErrorType = (error: AppError): 'error' | 'warning' | 'info' => {
  switch (error.type) {
    case 'RATE_LIMIT_ERROR':
    case 'SERVICE_UNAVAILABLE':
      return 'warning';
    case 'AUTHENTICATION_ERROR':
      return 'info';
    default:
      return 'error';
  }
};

// Utility function to handle errors with toast notifications
export const handleErrorWithToast = (
  error: unknown,
  showToast: (
    type: 'error' | 'warning' | 'info',
    title: string,
    message?: string,
    options?: any
  ) => void,
  retryCallback?: () => void
) => {
  const errorInfo = getErrorInfo(error, retryCallback);

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    if (!errorInfo.title || !errorInfo.title.trim()) {
      console.warn('handleErrorWithToast: Empty title detected', {
        error,
        errorInfo,
      });
    }
    if (!errorInfo.message || !errorInfo.message.trim()) {
      console.warn('handleErrorWithToast: Empty message detected', {
        error,
        errorInfo,
      });
    }
  }

  showToast(
    errorInfo.type,
    errorInfo.title,
    errorInfo.message,
    errorInfo.action ? { action: errorInfo.action } : undefined
  );
};

// Utility function to get user-friendly error messages for specific operations
export const getOperationErrorMessage = (
  operation: string,
  error: unknown
): string => {
  const appError = parseError(error);

  const operationMessages: Record<string, Record<string, string>> = {
    generate_mailbox: {
      NETWORK_ERROR: '无法生成邮箱，请检查网络连接',
      SERVER_ERROR: '邮箱生成失败，服务器暂时不可用',
      RATE_LIMIT_ERROR: '生成邮箱过于频繁，请稍后再试',
      default: '邮箱生成失败，请重试',
    },
    load_mailbox: {
      NOT_FOUND_ERROR: '邮箱不存在或已过期',
      AUTHENTICATION_ERROR: '邮箱访问权限已过期',
      NETWORK_ERROR: '无法加载邮箱信息',
      default: '邮箱加载失败',
    },
    load_mails: {
      NOT_FOUND_ERROR: '邮箱不存在',
      NETWORK_ERROR: '无法加载邮件列表',
      default: '邮件加载失败',
    },
    delete_mail: {
      NOT_FOUND_ERROR: '邮件不存在',
      NETWORK_ERROR: '删除失败，请检查网络连接',
      default: '邮件删除失败',
    },
    extend_mailbox: {
      NOT_FOUND_ERROR: '邮箱不存在或已过期',
      VALIDATION_ERROR: '邮箱延期次数已达上限',
      default: '邮箱延期失败',
    },
  };

  const messages = operationMessages[operation];
  if (messages) {
    return messages[appError.type] || messages['default'];
  }

  return appError.message;
};

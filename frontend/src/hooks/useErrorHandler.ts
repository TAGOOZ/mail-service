import { useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import {
  parseError,
  getErrorInfo,
  handleErrorWithToast,
} from '../utils/errorHandler';
import { withRetry, RetryOptions } from '../utils/retryMechanism';

export const useErrorHandler = () => {
  const { showToast } = useToast();

  // Handle errors with toast notifications
  const handleError = useCallback(
    (error: unknown, retryCallback?: () => void, customMessage?: string) => {
      const errorInfo = getErrorInfo(error, retryCallback);

      showToast(
        errorInfo.type,
        customMessage || errorInfo.title,
        errorInfo.message,
        errorInfo.action ? { action: errorInfo.action } : undefined
      );
    },
    [showToast]
  );

  // Create a retryable operation with error handling
  const withErrorHandling = useCallback(
    <T>(
      operation: () => Promise<T>,
      options?: {
        retryOptions?: RetryOptions;
        errorMessage?: string;
        successMessage?: string;
        onRetry?: (attempt: number) => void;
      }
    ) => {
      return async (): Promise<T> => {
        try {
          const result = await withRetry(operation, {
            ...options?.retryOptions,
            onRetry: (attempt, error) => {
              if (options?.onRetry) {
                options.onRetry(attempt);
              } else {
                showToast('info', '重试中...', `正在尝试第 ${attempt} 次重试`);
              }
              options?.retryOptions?.onRetry?.(attempt, error);
            },
          });

          if (options?.successMessage) {
            showToast('success', '操作成功', options.successMessage);
          }

          return result;
        } catch (error) {
          handleError(error, undefined, options?.errorMessage);
          throw error;
        }
      };
    },
    [handleError, showToast]
  );

  // Parse error for detailed information
  const getErrorDetails = useCallback((error: unknown) => {
    return parseError(error);
  }, []);

  // Check if error is retryable
  const isRetryable = useCallback((error: unknown) => {
    const appError = parseError(error);
    return appError.retryable;
  }, []);

  // Get user-friendly error message
  const getErrorMessage = useCallback((error: unknown) => {
    const appError = parseError(error);
    return appError.message;
  }, []);

  return {
    handleError,
    withErrorHandling,
    getErrorDetails,
    isRetryable,
    getErrorMessage,
  };
};

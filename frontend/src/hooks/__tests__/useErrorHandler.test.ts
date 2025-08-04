import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useErrorHandler } from '../useErrorHandler';
import { useToast } from '../../contexts/ToastContext';
import { AppError } from '../../utils/errorHandler';

// Mock the useToast hook
vi.mock('../../contexts/ToastContext');
const mockUseToast = useToast as any;

describe('useErrorHandler', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showWarning: vi.fn(),
      showInfo: vi.fn(),
      removeToast: vi.fn(),
      clearAllToasts: vi.fn(),
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('handleError', () => {
    it('handles error without retry callback', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new AppError('Test error', 'TEST_TYPE', 'E_TEST', false);

      act(() => {
        result.current.handleError(error);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        'error',
        '操作失败',
        'Test error',
        undefined
      );
    });

    it('handles error with retry callback', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new AppError('Test error', 'TEST_TYPE', 'E_TEST', true);
      const retryCallback = vi.fn();

      act(() => {
        result.current.handleError(error, retryCallback);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        'error',
        '操作失败',
        'Test error',
        { action: { label: '重试', onClick: retryCallback } }
      );
    });

    it('handles error with custom message', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new AppError('Test error', 'TEST_TYPE', 'E_TEST', false);

      act(() => {
        result.current.handleError(error, undefined, 'Custom error message');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        'error',
        'Custom error message',
        'Test error',
        undefined
      );
    });
  });

  describe('withErrorHandling', () => {
    it('handles successful operation', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const operation = vi.fn().mockResolvedValue('success');

      const wrappedOperation = result.current.withErrorHandling(operation);
      const operationResult = await wrappedOperation();

      expect(operationResult).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('handles operation with success message', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const operation = vi.fn().mockResolvedValue('success');

      const wrappedOperation = result.current.withErrorHandling(operation, {
        successMessage: 'Operation successful',
      });

      await wrappedOperation();

      expect(mockShowToast).toHaveBeenCalledWith(
        'success',
        'Operation successful'
      );
    });

    it('handles operation failure', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new AppError(
        'Operation failed',
        'TEST_TYPE',
        'E_TEST',
        false
      );
      const operation = vi.fn().mockRejectedValue(error);

      const wrappedOperation = result.current.withErrorHandling(operation);

      await expect(wrappedOperation()).rejects.toThrow('Operation failed');
      expect(mockShowToast).toHaveBeenCalledWith(
        'error',
        '操作失败',
        'Operation failed',
        undefined
      );
    });

    it('handles retryable operation', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new AppError('Retry me', 'NETWORK_ERROR', 'E_NET', true);
      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const wrappedOperation = result.current.withErrorHandling(operation, {
        retryOptions: { maxRetries: 1 },
      });

      const promise = wrappedOperation();

      // Fast-forward through retry delay
      vi.advanceTimersByTime(1000);

      const operationResult = await promise;

      expect(operationResult).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(mockShowToast).toHaveBeenCalledWith(
        'info',
        '重试中...',
        '正在尝试第 1 次重试'
      );
    });
  });

  describe('getErrorDetails', () => {
    it('returns parsed error details', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Test error');

      const details = result.current.getErrorDetails(error);

      expect(details).toBeInstanceOf(AppError);
      expect(details.message).toBe('Test error');
      expect(details.type).toBe('GENERIC_ERROR');
    });
  });

  describe('isRetryable', () => {
    it('returns true for retryable errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new AppError('Retryable', 'NETWORK_ERROR', 'E_NET', true);

      const retryable = result.current.isRetryable(error);

      expect(retryable).toBe(true);
    });

    it('returns false for non-retryable errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new AppError(
        'Non-retryable',
        'VALIDATION_ERROR',
        'E_VAL',
        false
      );

      const retryable = result.current.isRetryable(error);

      expect(retryable).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('returns error message', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new AppError('Test message', 'TEST_TYPE', 'E_TEST', false);

      const message = result.current.getErrorMessage(error);

      expect(message).toBe('Test message');
    });
  });
});

import { vi } from 'vitest';
import { AxiosError } from 'axios';
import {
  AppError,
  parseError,
  getErrorInfo,
  handleErrorWithToast,
  getOperationErrorMessage,
} from '../errorHandler';

describe('AppError', () => {
  it('creates AppError with default values', () => {
    const error = new AppError('Test message');

    expect(error.message).toBe('Test message');
    expect(error.type).toBe('UNKNOWN_ERROR');
    expect(error.code).toBe('E_UNKNOWN');
    expect(error.retryable).toBe(false);
    expect(error.statusCode).toBeUndefined();
  });

  it('creates AppError with custom values', () => {
    const error = new AppError(
      'Custom message',
      'CUSTOM_TYPE',
      'E_CUSTOM',
      true,
      500
    );

    expect(error.message).toBe('Custom message');
    expect(error.type).toBe('CUSTOM_TYPE');
    expect(error.code).toBe('E_CUSTOM');
    expect(error.retryable).toBe(true);
    expect(error.statusCode).toBe(500);
  });
});

describe('parseError', () => {
  it('returns AppError instances as-is', () => {
    const originalError = new AppError('Test', 'TEST_TYPE', 'E_TEST', true);
    const result = parseError(originalError);

    expect(result).toBe(originalError);
  });

  it('parses 400 Axios error', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: { error: { message: 'Bad request' } },
      },
    } as AxiosError;

    const result = parseError(axiosError);

    expect(result.message).toBe('Bad request');
    expect(result.type).toBe('VALIDATION_ERROR');
    expect(result.code).toBe('E_BAD_REQUEST');
    expect(result.retryable).toBe(false);
    expect(result.statusCode).toBe(400);
  });

  it('parses 401 Axios error', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 401,
        data: {},
      },
    } as AxiosError;

    const result = parseError(axiosError);

    expect(result.message).toBe('会话已过期，请重新生成邮箱');
    expect(result.type).toBe('AUTHENTICATION_ERROR');
    expect(result.code).toBe('E_UNAUTHORIZED');
    expect(result.retryable).toBe(false);
    expect(result.statusCode).toBe(401);
  });

  it('parses network error', () => {
    const axiosError = {
      isAxiosError: true,
      code: 'NETWORK_ERROR',
      message: 'Network Error',
    } as AxiosError;

    const result = parseError(axiosError);

    expect(result.message).toBe('网络连接失败，请检查网络连接');
    expect(result.type).toBe('NETWORK_ERROR');
    expect(result.code).toBe('E_NETWORK');
    expect(result.retryable).toBe(true);
  });

  it('parses generic Error', () => {
    const error = new Error('Generic error');
    const result = parseError(error);

    expect(result.message).toBe('Generic error');
    expect(result.type).toBe('GENERIC_ERROR');
    expect(result.code).toBe('E_GENERIC');
    expect(result.retryable).toBe(false);
  });

  it('parses unknown error', () => {
    const result = parseError('string error');

    expect(result.message).toBe('发生了未知错误');
    expect(result.type).toBe('UNKNOWN_ERROR');
    expect(result.code).toBe('E_UNKNOWN');
    expect(result.retryable).toBe(false);
  });
});

describe('getErrorInfo', () => {
  it('returns error info without retry callback', () => {
    const error = new AppError('Test error', 'TEST_TYPE', 'E_TEST', true);
    const result = getErrorInfo(error);

    expect(result.title).toBe('操作失败');
    expect(result.message).toBe('Test error');
    expect(result.type).toBe('error');
    expect(result.retryable).toBe(true);
    expect(result.action).toBeUndefined();
  });

  it('returns error info with retry callback for retryable error', () => {
    const error = new AppError('Test error', 'TEST_TYPE', 'E_TEST', true);
    const retryCallback = vi.fn();
    const result = getErrorInfo(error, retryCallback);

    expect(result.action).toEqual({
      label: '重试',
      onClick: retryCallback,
    });
  });

  it('returns authentication error with specific action', () => {
    const error = new AppError(
      'Auth error',
      'AUTHENTICATION_ERROR',
      'E_AUTH',
      false
    );
    const result = getErrorInfo(error);

    expect(result.action).toEqual({
      label: '重新开始',
      onClick: expect.any(Function),
    });
  });
});

describe('handleErrorWithToast', () => {
  it('calls showToast with error info', () => {
    const error = new AppError('Test error', 'TEST_TYPE', 'E_TEST', false);
    const showToast = vi.fn();

    handleErrorWithToast(error, showToast);

    expect(showToast).toHaveBeenCalledWith(
      'error',
      '操作失败',
      'Test error',
      undefined
    );
  });

  it('calls showToast with retry action', () => {
    const error = new AppError('Test error', 'TEST_TYPE', 'E_TEST', true);
    const showToast = vi.fn();
    const retryCallback = vi.fn();

    handleErrorWithToast(error, showToast, retryCallback);

    expect(showToast).toHaveBeenCalledWith('error', '操作失败', 'Test error', {
      action: { label: '重试', onClick: retryCallback },
    });
  });
});

describe('getOperationErrorMessage', () => {
  it('returns specific message for known operation and error type', () => {
    const error = new AppError('Test', 'NETWORK_ERROR', 'E_NET', true);
    const result = getOperationErrorMessage('generate_mailbox', error);

    expect(result).toBe('无法生成邮箱，请检查网络连接');
  });

  it('returns default message for known operation and unknown error type', () => {
    const error = new AppError('Test', 'UNKNOWN_TYPE', 'E_UNKNOWN', false);
    const result = getOperationErrorMessage('generate_mailbox', error);

    expect(result).toBe('邮箱生成失败，请重试');
  });

  it('returns original error message for unknown operation', () => {
    const error = new AppError(
      'Original message',
      'NETWORK_ERROR',
      'E_NET',
      true
    );
    const result = getOperationErrorMessage('unknown_operation', error);

    expect(result).toBe('Original message');
  });
});

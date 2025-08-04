import { vi } from 'vitest';
import {
  withRetry,
  RetryableOperation,
  createRetryableFunction,
  retryConditions,
} from '../retryMechanism';
import { AppError } from '../errorHandler';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('returns result on successful operation', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await withRetry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        new AppError('Retry me', 'NETWORK_ERROR', 'E_NET', true)
      )
      .mockResolvedValue('success');

    const promise = withRetry(operation);

    // Fast-forward through the retry delay
    vi.advanceTimersByTime(1000);

    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable error', async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(
        new AppError('Do not retry', 'VALIDATION_ERROR', 'E_VAL', false)
      );

    await expect(withRetry(operation)).rejects.toThrow('Do not retry');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('respects maxRetries option', async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(
        new AppError('Always fail', 'NETWORK_ERROR', 'E_NET', true)
      );

    const promise = withRetry(operation, { maxRetries: 2 });

    // Fast-forward through all retry delays
    vi.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow('Always fail');
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('uses exponential backoff', async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(
        new AppError('Always fail', 'NETWORK_ERROR', 'E_NET', true)
      );

    const promise = withRetry(operation, {
      maxRetries: 2,
      baseDelay: 100,
      backoffFactor: 2,
    });

    // First retry after 100ms
    vi.advanceTimersByTime(100);
    expect(operation).toHaveBeenCalledTimes(2);

    // Second retry after 200ms (100 * 2^1)
    vi.advanceTimersByTime(200);
    expect(operation).toHaveBeenCalledTimes(3);

    await expect(promise).rejects.toThrow('Always fail');
  });

  it('calls onRetry callback', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        new AppError('Retry me', 'NETWORK_ERROR', 'E_NET', true)
      )
      .mockResolvedValue('success');

    const onRetry = vi.fn();

    const promise = withRetry(operation, { onRetry });

    vi.advanceTimersByTime(1000);

    await promise;

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(AppError));
  });
});

describe('RetryableOperation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('executes operation successfully', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const retryableOp = new RetryableOperation(operation);

    const result = await retryableOp.execute();

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('prevents concurrent execution', async () => {
    const operation = vi
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('success'), 1000))
      );
    const retryableOp = new RetryableOperation(operation);

    const promise1 = retryableOp.execute();

    await expect(retryableOp.execute()).rejects.toThrow(
      'Operation is already running'
    );

    vi.advanceTimersByTime(1000);
    await promise1;
  });

  it('can be aborted', async () => {
    const operation = vi
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('success'), 1000))
      );
    const retryableOp = new RetryableOperation(operation);

    const promise = retryableOp.execute();
    retryableOp.abort();

    await expect(promise).rejects.toThrow('Operation was aborted');
  });
});

describe('createRetryableFunction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('creates retryable version of function', async () => {
    const originalFn = vi
      .fn()
      .mockRejectedValueOnce(
        new AppError('Retry me', 'NETWORK_ERROR', 'E_NET', true)
      )
      .mockResolvedValue('success');

    const retryableFn = createRetryableFunction(originalFn);

    const promise = retryableFn('arg1', 'arg2');

    vi.advanceTimersByTime(1000);

    const result = await promise;

    expect(result).toBe('success');
    expect(originalFn).toHaveBeenCalledTimes(2);
    expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('retryConditions', () => {
  it('networkErrors condition', () => {
    const networkError = new AppError(
      'Network',
      'NETWORK_ERROR',
      'E_NET',
      true
    );
    const serverError = new AppError(
      'Server',
      'SERVER_ERROR',
      'E_SERVER',
      true
    );
    const validationError = new AppError(
      'Validation',
      'VALIDATION_ERROR',
      'E_VAL',
      false
    );

    expect(retryConditions.networkErrors(networkError)).toBe(true);
    expect(retryConditions.networkErrors(serverError)).toBe(true);
    expect(retryConditions.networkErrors(validationError)).toBe(false);
  });

  it('allRetryableErrors condition', () => {
    const retryableError = new AppError(
      'Retryable',
      'NETWORK_ERROR',
      'E_NET',
      true
    );
    const nonRetryableError = new AppError(
      'Non-retryable',
      'VALIDATION_ERROR',
      'E_VAL',
      false
    );

    expect(retryConditions.allRetryableErrors(retryableError)).toBe(true);
    expect(retryConditions.allRetryableErrors(nonRetryableError)).toBe(false);
  });
});

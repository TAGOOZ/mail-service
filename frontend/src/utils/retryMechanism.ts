import { parseError } from './errorHandler';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

const defaultRetryOptions: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: unknown) => {
    const appError = parseError(error);
    return appError.retryable;
  },
  onRetry: () => {},
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const config = { ...defaultRetryOptions, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!config.retryCondition(error)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );

      // Call retry callback
      config.onRetry(attempt + 1, error);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

export class RetryableOperation<T> {
  private operation: () => Promise<T>;
  private options: Required<RetryOptions>;
  private currentAttempt: number = 0;
  private isRunning: boolean = false;
  private abortController: AbortController | null = null;

  constructor(operation: () => Promise<T>, options: RetryOptions = {}) {
    this.operation = operation;
    this.options = { ...defaultRetryOptions, ...options };
  }

  async execute(): Promise<T> {
    if (this.isRunning) {
      throw new Error('Operation is already running');
    }

    this.isRunning = true;
    this.currentAttempt = 0;
    this.abortController = new AbortController();

    try {
      return await this.executeWithRetry();
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private async executeWithRetry(): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      // Check if operation was aborted
      if (this.abortController?.signal.aborted) {
        throw new Error('Operation was aborted');
      }

      this.currentAttempt = attempt;

      try {
        return await this.operation();
      } catch (error) {
        lastError = error;

        // Don't retry on the last attempt
        if (attempt === this.options.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.options.retryCondition(error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.options.baseDelay *
            Math.pow(this.options.backoffFactor, attempt),
          this.options.maxDelay
        );

        // Call retry callback
        this.options.onRetry(attempt + 1, error);

        // Wait before retrying (with abort check)
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);

      // Listen for abort signal
      if (this.abortController) {
        this.abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Operation was aborted'));
        });
      }
    });
  }

  getCurrentAttempt(): number {
    return this.currentAttempt;
  }

  isExecuting(): boolean {
    return this.isRunning;
  }
}

// Utility function to create a retryable version of an async function
export const createRetryableFunction = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) => {
  return async (...args: T): Promise<R> => {
    return withRetry(() => fn(...args), options);
  };
};

// Predefined retry conditions
export const retryConditions = {
  networkErrors: (error: unknown) => {
    const appError = parseError(error);
    return [
      'NETWORK_ERROR',
      'SERVER_ERROR',
      'SERVICE_UNAVAILABLE',
      'RATE_LIMIT_ERROR',
    ].includes(appError.type);
  },

  serverErrors: (error: unknown) => {
    const appError = parseError(error);
    return ['SERVER_ERROR', 'SERVICE_UNAVAILABLE'].includes(appError.type);
  },

  temporaryErrors: (error: unknown) => {
    const appError = parseError(error);
    return ['RATE_LIMIT_ERROR', 'SERVICE_UNAVAILABLE'].includes(appError.type);
  },

  allRetryableErrors: (error: unknown) => {
    const appError = parseError(error);
    return appError.retryable;
  },
};

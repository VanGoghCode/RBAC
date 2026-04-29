export interface RetryOptions {
  maxRetries: number;
  timeoutMs: number;
  baseDelayMs?: number;
}

const RETRYABLE_ERRORS = new Set([
  'ThrottlingException',
  'ServiceUnavailableException',
  'InternalServerError',
  'ProvisionedThroughputExceededException',
  'SlowDown',
  'NetworkingError',
  'TimeoutError',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
]);

export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly lastError: Error,
    public readonly attempts: number,
  ) {
    super(message);
    this.name = 'RetryExhaustedError';
  }
}

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const name = error.name;
    if (RETRYABLE_ERRORS.has(name)) return true;
    const message = error.message?.toLowerCase() ?? '';
    if (message.includes('throttl') || message.includes('network') || message.includes('timeout')) {
      return true;
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxRetries, timeoutMs, baseDelayMs = 500 } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs);
      });

      try {
        const result = await Promise.race([fn(), timeoutPromise]);
        return result;
      } finally {
        if (timer) clearTimeout(timer);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryable(lastError)) {
        throw lastError;
      }

      if (attempt >= maxRetries) {
        throw new RetryExhaustedError(
          `Operation failed after ${maxRetries + 1} attempts`,
          lastError,
          maxRetries + 1,
        );
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  // Unreachable — loop always returns or throws
  throw lastError!;
}

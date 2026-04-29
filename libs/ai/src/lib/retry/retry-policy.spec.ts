import {
  withRetry,
  isRetryable,
  RetryExhaustedError,
  TimeoutError,
} from './retry-policy';

describe('retry-policy', () => {
  describe('isRetryable', () => {
    it('identifies throttling errors as retryable', () => {
      const error = new Error('too many requests');
      error.name = 'ThrottlingException';
      expect(isRetryable(error)).toBe(true);
    });

    it('identifies service unavailable as retryable', () => {
      const error = new Error('unavailable');
      error.name = 'ServiceUnavailableException';
      expect(isRetryable(error)).toBe(true);
    });

    it('identifies validation errors as non-retryable', () => {
      const error = new Error('invalid input');
      error.name = 'ValidationException';
      expect(isRetryable(error)).toBe(false);
    });

    it('identifies auth errors as non-retryable', () => {
      const error = new Error('access denied');
      error.name = 'AccessDeniedException';
      expect(isRetryable(error)).toBe(false);
    });

    it('identifies connection reset as retryable', () => {
      const error = new Error('connection reset');
      error.name = 'ECONNRESET';
      expect(isRetryable(error)).toBe(true);
    });

    it('returns false for non-Error objects', () => {
      expect(isRetryable('string error')).toBe(false);
      expect(isRetryable(null)).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('returns result on first success', async () => {
      const result = await withRetry(() => Promise.resolve('ok'), {
        maxRetries: 2,
        timeoutMs: 5000,
        baseDelayMs: 10,
      });
      expect(result).toBe('ok');
    });

    it('retries on retryable error then succeeds', async () => {
      let attempt = 0;
      const fn = () => {
        attempt++;
        if (attempt < 2) {
          const err = new Error('throttled');
          err.name = 'ThrottlingException';
          return Promise.reject(err);
        }
        return Promise.resolve('ok');
      };

      const result = await withRetry(fn, {
        maxRetries: 2,
        timeoutMs: 5000,
        baseDelayMs: 10,
      });
      expect(result).toBe('ok');
      expect(attempt).toBe(2);
    });

    it('throws immediately on non-retryable error', async () => {
      const fn = () => {
        const err = new Error('bad request');
        err.name = 'ValidationException';
        return Promise.reject(err);
      };

      await expect(
        withRetry(fn, { maxRetries: 3, timeoutMs: 5000, baseDelayMs: 10 }),
      ).rejects.toThrow('bad request');
    });

    it('throws RetryExhaustedError when all retries fail', async () => {
      const fn = () => {
        const err = new Error('throttled');
        err.name = 'ThrottlingException';
        return Promise.reject(err);
      };

      await expect(
        withRetry(fn, { maxRetries: 1, timeoutMs: 5000, baseDelayMs: 10 }),
      ).rejects.toThrow('Operation failed after 2 attempts');
    });
  });
});

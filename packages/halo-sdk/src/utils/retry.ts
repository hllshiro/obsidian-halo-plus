/**
 * Halo SDK 重试机制
 */

export interface RetryOptions {
  maxRetries: number;
  delay: number;
  backoff: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  delay: 100,
  backoff: 2,
};

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带重试的执行函数
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 不重试客户端错误（4xx）
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        if (status >= 400 && status < 500) {
          throw error;
        }
      }

      // 最后一次尝试失败，抛出错误
      if (attempt === opts.maxRetries) {
        throw error;
      }

      // 等待后重试（指数退避）
      await delay(opts.delay * opts.backoff ** attempt);
    }
  }

  throw lastError;
}

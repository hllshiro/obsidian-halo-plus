/**
 * Halo SDK 错误处理
 */

export class HaloError extends Error {
  status: number;
  detail?: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = 'HaloError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * 判断是否为 Halo 错误
 */
export function isHaloError(error: unknown): error is HaloError {
  return error instanceof HaloError;
}

/**
 * 格式化错误信息
 */
export function formatError(error: unknown): string {
  if (isHaloError(error)) {
    return `[${error.status}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

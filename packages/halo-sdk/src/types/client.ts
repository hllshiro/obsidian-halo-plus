/**
 * Halo Client 配置类型定义
 */

export interface HaloClientConfig {
  /** Halo 服务器地址 */
  baseUrl: string;
  /** Personal Access Token */
  token: string;
  /** 请求超时（ms），默认 30000 */
  timeout?: number;
  /** 重试次数，默认 3 */
  retries?: number;
}

export interface HaloClientOptions {
  /** 是否启用请求日志 */
  enableLogging?: boolean;
  /** 自定义请求头 */
  headers?: Record<string, string>;
}

export interface HaloError {
  status: number;
  message: string;
  detail?: unknown;
}

export interface HaloValidationError {
  field: string;
  message: string;
}

import axios, { AxiosInstance, AxiosError } from 'axios';
import { createConsoleApiClient, createCoreApiClient, createPublicApiClient } from '@halo-dev/api-client';
import type { HaloClientConfig, HaloClientOptions, HaloError } from './types';
import type { PostV1alpha1ConsoleApi, PostV1alpha1Api, PostV1alpha1PublicApi } from '@halo-dev/api-client';

export class HaloClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly config: Required<HaloClientConfig>;
  readonly consoleApi: ReturnType<typeof createConsoleApiClient>;
  readonly coreApi: ReturnType<typeof createCoreApiClient>;
  readonly publicApi: ReturnType<typeof createPublicApiClient>;

  constructor(config: HaloClientConfig, options: HaloClientOptions = {}) {
    this.config = {
      timeout: 30000,
      retries: 3,
      ...config,
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.token}`,
        ...options.headers,
      },
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        return Promise.reject(this.handleError(error));
      },
    );

    this.consoleApi = createConsoleApiClient(this.axiosInstance);
    this.coreApi = createCoreApiClient(this.axiosInstance);
    this.publicApi = createPublicApiClient(this.axiosInstance);
  }

  getHttpClient(): AxiosInstance {
    return this.axiosInstance;
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.consoleApi.content.post.listPosts({ page: 0, size: 1 });
      return true;
    } catch {
      return false;
    }
  }

  private handleError(error: unknown): HaloError {
    if (error instanceof AxiosError) {
      const status = error.response?.status ?? 500;
      const message =
        (error.response?.data as { message?: string })?.message ?? error.message;
      const detail = error.response?.data;
      return { status, message, detail };
    }
    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
      return error as HaloError;
    }
    return {
      status: 500,
      message: error instanceof Error ? error.message : 'Unknown error',
      detail: error,
    };
  }
}

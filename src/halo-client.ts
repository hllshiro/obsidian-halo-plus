import {
  axiosInstance,
  createConsoleApiClient,
  createCoreApiClient,
  createPublicApiClient,
} from '@halo-dev/api-client';

export interface HaloClientConfig {
  baseUrl: string;
  token: string;
  timeout?: number;
}

export interface HaloClient {
  consoleApi: ReturnType<typeof createConsoleApiClient>;
  coreApi: ReturnType<typeof createCoreApiClient>;
  publicApi: ReturnType<typeof createPublicApiClient>;
  httpClient: typeof axiosInstance;
}

export function createHaloClient(config: HaloClientConfig): HaloClient {
  axiosInstance.defaults.baseURL = config.baseUrl;
  axiosInstance.defaults.timeout = config.timeout ?? 30000;
  axiosInstance.defaults.headers.common['X-Requested-With'] = undefined;
  axiosInstance.defaults.headers.common['Content-Type'] = 'application/json';
  axiosInstance.defaults.headers.common.Authorization = `Bearer ${config.token}`;
  const httpClient = axiosInstance;

  return {
    consoleApi: createConsoleApiClient(httpClient),
    coreApi: createCoreApiClient(httpClient),
    publicApi: createPublicApiClient(httpClient),
    httpClient,
  };
}

import { Logger } from './utils/logger';

export async function validateConnection(client: HaloClient): Promise<boolean> {
  const logger = Logger.getInstance();
  try {
    await client.consoleApi.content.post.listPosts({ page: 0, size: 1 });
    logger.log('Connection validated successfully');
    return true;
  } catch (e) {
    logger.error('Connection validation failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

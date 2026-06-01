import {
  createConsoleApiClient,
  createCoreApiClient,
  createPublicApiClient,
} from '@halo-dev/api-client';
import axios, { type AxiosInstance } from 'axios';

export interface HaloClientConfig {
  baseUrl: string;
  token: string;
  timeout?: number;
}

export interface HaloClient {
  consoleApi: ReturnType<typeof createConsoleApiClient>;
  coreApi: ReturnType<typeof createCoreApiClient>;
  publicApi: ReturnType<typeof createPublicApiClient>;
  httpClient: AxiosInstance;
}

export function createHaloClient(config: HaloClientConfig): HaloClient {
  const httpClient = axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout ?? 30000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
    },
  });

  return {
    consoleApi: createConsoleApiClient(httpClient),
    coreApi: createCoreApiClient(httpClient),
    publicApi: createPublicApiClient(httpClient),
    httpClient,
  };
}

export async function validateConnection(client: HaloClient): Promise<boolean> {
  try {
    await client.consoleApi.content.post.listPosts({ page: 0, size: 1 });
    return true;
  } catch {
    return false;
  }
}

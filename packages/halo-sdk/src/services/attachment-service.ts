import type { HaloClient } from '../client';
import type {
  AttachmentPage,
  HaloAttachment,
  ListAttachmentsParams,
  UploadAttachmentParams,
} from '../types';

export class AttachmentService {
  constructor(private readonly client: HaloClient) {}

  async list(params: ListAttachmentsParams = {}): Promise<AttachmentPage> {
    const httpClient = this.client.getHttpClient();
    const { page = 1, size = 20, keyword, mediaType } = params;

    const response = await httpClient.get('/apis/api.console.halo.run/v1alpha1/attachments', {
      params: {
        page: page - 1,
        size,
        keyword,
        mediaType,
      },
    });

    const data = response.data;
    return {
      items: data.items || [],
      total: data.total || 0,
      page: (data.page || 0) + 1,
      size: data.size || size,
      totalPages: Math.ceil((data.total || 0) / size),
    };
  }

  async get(name: string): Promise<HaloAttachment> {
    console.log('[AttachmentService.get] Getting attachment:', name);
    const httpClient = this.client.getHttpClient();
    const response = await httpClient.get(
      `/apis/api.console.halo.run/v1alpha1/attachments/${name}`,
    );
    console.log('[AttachmentService.get] Got attachment:', {
      name: response.data?.metadata?.name,
      displayName: response.data?.spec?.displayName,
    });
    return response.data;
  }

  async upload(params: UploadAttachmentParams): Promise<HaloAttachment> {
    const httpClient = this.client.getHttpClient();

    const formData = new FormData();
    if (params.file instanceof Blob) {
      formData.append('file', params.file, params.filename);
    } else {
      const blob = new Blob([params.file], { type: params.mimeType });
      formData.append('file', blob, params.filename);
    }

    const response = await httpClient.post(
      '/apis/console.api.storage.halo.run/v1alpha1/attachments/-/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return response.data;
  }

  async delete(name: string): Promise<void> {
    const httpClient = this.client.getHttpClient();
    await httpClient.delete(`/apis/api.console.halo.run/v1alpha1/attachments/${name}`);
  }
}

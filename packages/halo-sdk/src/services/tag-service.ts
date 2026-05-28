import type { HaloClient } from '../client';
import type { HaloTag, CreateTagParams, ListTagsParams, TagPage } from '../types';

/**
 * Halo Tag 服务
 *
 * @example
 * ```typescript
 * const tags = new TagService(client);
 *
 * // 获取标签列表
 * const tagList = await tags.list();
 *
 * // 创建标签
 * const newTag = await tags.create({ displayName: 'My Tag' });
 *
 * // 获取或创建标签
 * const tag = await tags.getOrCreate('Existing Tag');
 * ```
 */
export class TagService {
  constructor(private readonly client: HaloClient) {}

  /**
   * 获取标签列表
   */
  async list(params: ListTagsParams = {}): Promise<TagPage> {
    const httpClient = this.client.getHttpClient();
    const { page = 1, size = 50, keyword } = params;

    const response = await httpClient.get('/apis/content.halo.run/v1alpha1/tags', {
      params: {
        page: page - 1,
        size,
        keyword,
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

  /**
   * 获取单个标签
   */
  async get(name: string): Promise<HaloTag> {
    const httpClient = this.client.getHttpClient();
    const response = await httpClient.get(`/apis/content.halo.run/v1alpha1/tags/${name}`);
    return response.data;
  }

  /**
   * 创建标签
   */
  async create(params: CreateTagParams): Promise<HaloTag> {
    const httpClient = this.client.getHttpClient();

    const response = await httpClient.post('/apis/content.halo.run/v1alpha1/tags', {
      apiVersion: 'content.halo.run/v1alpha1',
      kind: 'Tag',
      spec: {
        displayName: params.displayName,
        slug: params.slug || this.generateSlug(params.displayName),
        color: params.color || '#ffffff',
        cover: params.cover || '',
        description: params.description || '',
      },
    });

    return response.data;
  }

  /**
   * 获取或创建标签
   */
  async getOrCreate(displayName: string): Promise<HaloTag> {
    // 先尝试查找现有标签
    const existingTag = await this.findByName(displayName);
    if (existingTag) {
      return existingTag;
    }

    // 不存在则创建
    return this.create({ displayName });
  }

  /**
   * 根据名称查找标签
   */
  private async findByName(displayName: string): Promise<HaloTag | null> {
    try {
      const tags = await this.list({ keyword: displayName });
      return tags.items.find((tag) => tag.spec.displayName === displayName) || null;
    } catch {
      return null;
    }
  }

  /**
   * 生成 slug
   */
  private generateSlug(displayName: string): string {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}

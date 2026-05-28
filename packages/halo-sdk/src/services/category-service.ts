import type { HaloClient } from '../client';
import type {
  CategoryPage,
  CreateCategoryParams,
  HaloCategory,
  ListCategoriesParams,
} from '../types';

/**
 * Halo Category 服务
 *
 * @example
 * ```typescript
 * const categories = new CategoryService(client);
 *
 * // 获取分类列表
 * const categoryList = await categories.list();
 *
 * // 创建分类
 * const newCategory = await categories.create({ displayName: 'My Category' });
 *
 * // 获取或创建分类
 * const category = await categories.getOrCreate('Existing Category');
 * ```
 */
export class CategoryService {
  constructor(private readonly client: HaloClient) {}

  /**
   * 获取分类列表
   */
  async list(params: ListCategoriesParams = {}): Promise<CategoryPage> {
    const httpClient = this.client.getHttpClient();
    const { page = 1, size = 50, keyword } = params;

    const response = await httpClient.get('/apis/content.halo.run/v1alpha1/categories', {
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
   * 获取单个分类
   */
  async get(name: string): Promise<HaloCategory> {
    const httpClient = this.client.getHttpClient();
    const response = await httpClient.get(`/apis/content.halo.run/v1alpha1/categories/${name}`);
    return response.data;
  }

  /**
   * 创建分类
   */
  async create(params: CreateCategoryParams): Promise<HaloCategory> {
    const httpClient = this.client.getHttpClient();

    const response = await httpClient.post('/apis/content.halo.run/v1alpha1/categories', {
      apiVersion: 'content.halo.run/v1alpha1',
      kind: 'Category',
      spec: {
        displayName: params.displayName,
        slug: params.slug || this.generateSlug(params.displayName),
        cover: params.cover || '',
        description: params.description || '',
        priority: params.priority ?? 0,
      },
    });

    return response.data;
  }

  /**
   * 获取或创建分类
   */
  async getOrCreate(displayName: string): Promise<HaloCategory> {
    // 先尝试查找现有分类
    const existingCategory = await this.findByName(displayName);
    if (existingCategory) {
      return existingCategory;
    }

    // 不存在则创建
    return this.create({ displayName });
  }

  /**
   * 根据名称查找分类
   */
  private async findByName(displayName: string): Promise<HaloCategory | null> {
    try {
      const categories = await this.list({ keyword: displayName });
      return categories.items.find((cat) => cat.spec.displayName === displayName) || null;
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

import type { Post, PostSpec } from '@halo-dev/api-client';
import type { HaloClient } from '../client';
import type {
  CreatePostParams,
  HaloContent,
  HaloPost,
  ListPostsParams,
  PostPage,
  UpdatePostParams,
} from '../types';

// 生成 UUID v4（参考官方插件）
function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class PostService {
  constructor(private readonly client: HaloClient) {}

  async list(params: ListPostsParams = {}): Promise<PostPage> {
    const { page = 1, size = 10, keyword, category, tag, publish } = params;

    const response = await this.client.consoleApi.content.post.listPosts({
      page: page - 1,
      size,
      keyword,
      category,
      tag,
      publishPhase: publish ? 'PUBLISHED' : undefined,
    });

    const data = response.data;
    return {
      items: data.items || [],
      total: data.total || 0,
      page: (data.page || 0) + 1,
      size: data.size || size,
      totalPages: data.totalPages || 0,
    };
  }

  async get(name: string): Promise<HaloPost> {
    console.log('[PostService.get] Querying post:', name);
    const httpClient = this.client.getHttpClient();
    try {
      // 使用用户中心 API（与官方插件一致）
      const response = await httpClient.get(`/apis/uc.api.content.halo.run/v1alpha1/posts/${name}`);
      console.log('[PostService.get] Got post:', response.data?.metadata?.name);
      return response.data as HaloPost;
    } catch (error) {
      console.log('[PostService.get] Failed to get post:', error);
      throw new Error(`Post not found: ${name}`);
    }
  }

  async exists(name: string): Promise<boolean> {
    console.log('[PostService.exists] Checking if post exists:', name);
    try {
      await this.get(name);
      console.log('[PostService.exists] Post exists:', name);
      return true;
    } catch (error) {
      console.log('[PostService.exists] Post not found:', name, error);
      return false;
    }
  }

  async create(params: CreatePostParams): Promise<HaloPost> {
    // 参考官方插件：客户端生成 UUID 作为 metadata.name
    const postName = randomUUID();
    console.log('[PostService.create] Creating post with name:', postName);

    const post: Post = {
      apiVersion: 'content.halo.run/v1alpha1',
      kind: 'Post',
      metadata: {
        name: postName,
        annotations: {},
      },
      spec: {
        title: params.title,
        slug: params.slug || this.generateSlug(params.title),
        cover: params.cover || '',
        deleted: false,
        publish: params.publish ?? false,
        pinned: params.pinned ?? false,
        allowComment: params.allowComment ?? true,
        visible: (params.visible ?? 'PUBLIC') as PostSpec['visible'],
        priority: params.priority ?? 0,
        excerpt: {
          autoGenerate: params.excerpt?.autoGenerate ?? true,
          raw: params.excerpt?.raw || '',
        },
        categories: params.categories || [],
        tags: params.tags || [],
        htmlMetas: params.htmlMetas || [],
      },
    };

    // 使用用户中心 API（与官方插件一致）
    const httpClient = this.client.getHttpClient();
    const response = await httpClient.post('/apis/uc.api.content.halo.run/v1alpha1/posts', post);

    console.log('[PostService.create] Created post:', response.data?.metadata?.name);
    return response.data as HaloPost;
  }

  async update(name: string, params: UpdatePostParams): Promise<HaloPost> {
    const existing = await this.get(name);

    const postToUpdate: Post = {
      ...existing,
      spec: {
        ...existing.spec,
        title: params.title ?? existing.spec.title,
        slug: params.slug ?? existing.spec.slug,
        cover: params.cover ?? existing.spec.cover,
        publish: params.publish ?? existing.spec.publish,
        pinned: params.pinned ?? existing.spec.pinned,
        allowComment: params.allowComment ?? existing.spec.allowComment,
        visible: params.visible ?? existing.spec.visible,
        priority: params.priority ?? existing.spec.priority,
        excerpt: params.excerpt
          ? {
              autoGenerate: params.excerpt.autoGenerate ?? existing.spec.excerpt.autoGenerate,
              raw: params.excerpt.raw ?? existing.spec.excerpt.raw,
            }
          : existing.spec.excerpt,
        categories: params.categories ?? existing.spec.categories,
        tags: params.tags ?? existing.spec.tags,
        htmlMetas: params.htmlMetas ?? existing.spec.htmlMetas,
      },
    };

    // 使用用户中心 API（与官方插件一致）
    const httpClient = this.client.getHttpClient();
    const response = await httpClient.put(
      `/apis/uc.api.content.halo.run/v1alpha1/posts/${name}`,
      postToUpdate,
    );
    return response.data as HaloPost;
  }

  async delete(name: string): Promise<void> {
    await this.client.consoleApi.content.post.recyclePost({ name });
  }

  async publish(name: string): Promise<void> {
    // 使用用户中心 API（与官方插件一致）
    const httpClient = this.client.getHttpClient();
    await httpClient.put(`/apis/uc.api.content.halo.run/v1alpha1/posts/${name}/publish`);
  }

  async unpublish(name: string): Promise<void> {
    // 使用用户中心 API（与官方插件一致）
    const httpClient = this.client.getHttpClient();
    await httpClient.put(`/apis/uc.api.content.halo.run/v1alpha1/posts/${name}/unpublish`);
  }

  async getContent(name: string): Promise<HaloContent> {
    // 使用用户中心 API 获取草稿内容（与官方插件一致）
    const httpClient = this.client.getHttpClient();
    const response = await httpClient.get(
      `/apis/uc.api.content.halo.run/v1alpha1/posts/${name}/draft?patched=true`,
    );
    const snapshot = response.data;
    const {
      'content.halo.run/patched-content': patchedContent,
      'content.halo.run/patched-raw': patchedRaw,
    } = snapshot.metadata?.annotations || {};
    const { rawType } = snapshot.spec || {};

    return {
      content: patchedContent || '',
      raw: patchedRaw || '',
      rawType: rawType || 'HTML',
    };
  }

  async updateContent(name: string, content: HaloContent): Promise<void> {
    // 使用用户中心 API 更新草稿内容（与官方插件一致）
    const httpClient = this.client.getHttpClient();

    // 先获取当前草稿
    const draftResponse = await httpClient.get(
      `/apis/uc.api.content.halo.run/v1alpha1/posts/${name}/draft?patched=true`,
    );
    const snapshot = draftResponse.data;

    // 更新 annotations 中的内容
    snapshot.metadata.annotations = {
      ...snapshot.metadata.annotations,
      'content.halo.run/content-json': JSON.stringify(content),
    };

    // 更新草稿
    await httpClient.put(`/apis/uc.api.content.halo.run/v1alpha1/posts/${name}/draft`, snapshot);
  }

  private generateSlug(title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
    return slug || `post-${Date.now()}`;
  }
}

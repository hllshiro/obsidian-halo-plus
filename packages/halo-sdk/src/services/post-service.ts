import type { ContentUpdateParam, Post, PostRequest, PostSpec } from '@halo-dev/api-client';
import type { HaloClient } from '../client';
import type {
  CreatePostParams,
  HaloContent,
  HaloPost,
  ListPostsParams,
  PostPage,
  UpdatePostParams,
} from '../types';

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
    const response = await this.client.consoleApi.content.post.listPosts({
      fieldSelector: [`metadata.name=${name}`],
      page: 0,
      size: 1,
    });
    const post = response.data.items?.[0];
    if (!post) {
      throw new Error(`Post not found: ${name}`);
    }
    return post as unknown as HaloPost;
  }

  async create(params: CreatePostParams): Promise<HaloPost> {
    const contentHtml = params.content || '';

    const postRequest: PostRequest = {
      post: {
        apiVersion: 'content.halo.run/v1alpha1',
        kind: 'Post',
        metadata: {
          name: '',
          generateName: 'post-',
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
      },
      content: {
        raw: contentHtml,
        content: contentHtml,
        rawType: 'HTML',
      },
    };

    const response = await this.client.consoleApi.content.post.draftPost({ postRequest });
    return response.data as unknown as HaloPost;
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

    const response = await this.client.coreApi.content.post.updatePost({
      name,
      post: postToUpdate,
    });
    return response.data as unknown as HaloPost;
  }

  async delete(name: string): Promise<void> {
    await this.client.consoleApi.content.post.recyclePost({ name });
  }

  async publish(name: string): Promise<void> {
    await this.client.consoleApi.content.post.publishPost({ name });
  }

  async unpublish(name: string): Promise<void> {
    await this.client.consoleApi.content.post.unpublishPost({ name });
  }

  async getContent(name: string): Promise<HaloContent> {
    const response = await this.client.consoleApi.content.post.fetchPostHeadContent({ name });
    return response.data as unknown as HaloContent;
  }

  async updateContent(name: string, content: HaloContent): Promise<void> {
    await this.client.consoleApi.content.post.updatePostContent({
      name,
      content: content as unknown as ContentUpdateParam,
    });
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

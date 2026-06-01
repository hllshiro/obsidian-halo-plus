import type { Post as ApiPost, PostSpec as ApiPostSpec } from '@halo-dev/api-client';
import { type App, Component, type TFile } from 'obsidian';
import {
  type ImageCacheEntry,
  generateSlug,
  parseFrontMatter,
  stringifyFrontMatter,
} from '../content/frontmatter-parser';
import { ImageHandler } from '../content/image-handler';
import { createHaloClient, validateConnection } from '../halo-client';
import type HaloPlusPlugin from '../main';
import { PreviewRenderer } from '../renderer/preview-renderer';
import type { HaloContent, HaloPost } from '../types';

export class SyncManager {
  private app: App;
  private plugin: HaloPlusPlugin;
  private syncQueue: Set<string> = new Set();
  private isSyncing = false;

  constructor(app: App, plugin: HaloPlusPlugin) {
    this.app = app;
    this.plugin = plugin;
  }

  async syncFile(file: TFile): Promise<void> {
    if (this.syncQueue.has(file.path)) {
      return;
    }

    this.syncQueue.add(file.path);

    try {
      const site = this.plugin.getDefaultSite();
      if (!site) {
        throw new Error('No Halo site configured');
      }

      const client = createHaloClient({
        baseUrl: site.url,
        token: site.token,
      });

      const isConnected = await validateConnection(client);
      if (!isConnected) {
        throw new Error('Failed to connect to Halo server');
      }

      const content = await this.app.vault.read(file);
      let frontmatter = parseFrontMatter(content);

      const component = new Component();
      component.load();

      try {
        const renderer = new PreviewRenderer(this.app, component);
        const renderResult = await renderer.renderFile(file);
        const renderedHTML = renderResult.viewEl.innerHTML;
        renderResult.cleanup();

        const imageHandler = new ImageHandler(this.app);
        const existingImageCache = (frontmatter.halo?.images as ImageCacheEntry[]) || [];
        const imageResult = await imageHandler.processImages(
          renderedHTML,
          file,
          client,
          this.plugin.settings.imageHandling.defaultMode,
          this.plugin.settings.imageHandling.base64Quality,
          undefined,
          existingImageCache,
        );
        const processedHTML = imageResult.html;
        const updatedImageCache = imageResult.imageCache;

        let post: HaloPost | undefined;
        const effectiveTitle = frontmatter.title || file.basename;
        const effectiveSlug = frontmatter.slug || generateSlug(effectiveTitle);

        // 获取远端文章，如果在回收站中则恢复，如果不存在则新建
        let existingPost: HaloPost | undefined;
        if (frontmatter.halo?.name) {
          console.log(
            `[SyncManager] Found existing halo name, trying to fetch: ${frontmatter.halo.name}`,
          );
          try {
            const getResponse = await client.httpClient.get(
              `/apis/uc.api.content.halo.run/v1alpha1/posts/${frontmatter.halo.name}`,
            );
            existingPost = getResponse.data as HaloPost;
            console.log('[SyncManager] Successfully fetched existing post');

            // 检查文章是否在回收站中
            if (existingPost.spec.deleted) {
              console.log('[SyncManager] Post is in recycle bin, restoring...');
              const restoreResponse = await client.coreApi.content.post.patchPost({
                name: frontmatter.halo.name,
                jsonPatchInner: [{ op: 'add', path: '/spec/deleted', value: false }],
              });
              existingPost = restoreResponse.data as HaloPost;
              console.log('[SyncManager] Successfully restored post from recycle bin');
            }
          } catch (error) {
            console.log('[SyncManager] Failed to fetch post, will create new one:', error);
            existingPost = undefined;
            // 文章不存在，清除本地 halo 信息
            await this.updateFrontMatter(file, { halo: undefined });
            frontmatter = { ...frontmatter, halo: undefined };
          }
        } else {
          console.log('[SyncManager] No existing halo name found, will create new post');
        }

        if (existingPost) {
          // 更新已有文章
          console.log('[SyncManager] Updating existing post:', existingPost.metadata.name);

          // GET + merge + PUT（Halo API 要求完整对象）
          const existingResponse = await client.httpClient.get(
            `/apis/uc.api.content.halo.run/v1alpha1/posts/${existingPost.metadata.name}`,
          );
          const existing = existingResponse.data;
          const postToUpdate = {
            ...existing,
            spec: {
              ...existing.spec,
              title: effectiveTitle,
              slug: effectiveSlug,
              cover: frontmatter.cover ?? existing.spec.cover,
              excerpt: frontmatter.excerpt
                ? { autoGenerate: true, raw: frontmatter.excerpt }
                : existing.spec.excerpt,
              categories: frontmatter.categories ?? existing.spec.categories,
              tags: frontmatter.tags ?? existing.spec.tags,
            },
          };
          const updateResponse = await client.httpClient.put(
            `/apis/uc.api.content.halo.run/v1alpha1/posts/${existingPost.metadata.name}`,
            postToUpdate,
          );
          post = updateResponse.data as HaloPost;

          // 更新内容（GET draft → 注入 annotation → PUT）
          const draftResponse = await client.httpClient.get(
            `/apis/uc.api.content.halo.run/v1alpha1/posts/${existingPost.metadata.name}/draft?patched=true`,
          );
          const snapshot = draftResponse.data;
          const contentData: HaloContent = {
            rawType: 'HTML',
            raw: processedHTML,
            content: processedHTML,
          };
          snapshot.metadata.annotations = {
            ...snapshot.metadata.annotations,
            'content.halo.run/content-json': JSON.stringify(contentData),
          };
          await client.httpClient.put(
            `/apis/uc.api.content.halo.run/v1alpha1/posts/${existingPost.metadata.name}/draft`,
            snapshot,
          );

          if (this.plugin.settings.publishBehavior.publishByDefault) {
            await client.httpClient.put(
              `/apis/uc.api.content.halo.run/v1alpha1/posts/${existingPost.metadata.name}/publish`,
            );
          }
        } else {
          // 创建新文章（客户端生成 UUID，通过 annotation 注入内容）
          console.log('[SyncManager] Creating new post');
          const postName = crypto.randomUUID();
          const contentData: HaloContent = {
            rawType: 'HTML',
            raw: processedHTML,
            content: processedHTML,
          };
          const newPost: ApiPost = {
            apiVersion: 'content.halo.run/v1alpha1',
            kind: 'Post',
            metadata: {
              name: postName,
              annotations: {
                'content.halo.run/content-json': JSON.stringify(contentData),
              },
            },
            spec: {
              title: effectiveTitle,
              slug: effectiveSlug,
              cover: frontmatter.cover || '',
              deleted: false,
              publish: this.plugin.settings.publishBehavior.publishByDefault,
              pinned: false,
              allowComment: true,
              visible: 'PUBLIC' as ApiPostSpec['visible'],
              priority: 0,
              excerpt: {
                autoGenerate: true,
                raw: frontmatter.excerpt || '',
              },
              categories: frontmatter.categories || [],
              tags: frontmatter.tags || [],
              htmlMetas: [],
            },
          };
          const createResponse = await client.httpClient.post(
            '/apis/uc.api.content.halo.run/v1alpha1/posts',
            newPost,
          );
          post = createResponse.data as HaloPost;
        }

        if (post) {
          await this.updateFrontMatter(file, {
            title: effectiveTitle,
            slug: effectiveSlug,
            halo: {
              site: site.url,
              name: post.metadata.name,
              publish: this.plugin.settings.publishBehavior.publishByDefault,
              images: updatedImageCache,
            },
          });
        }
      } finally {
        component.unload();
      }
    } finally {
      this.syncQueue.delete(file.path);
    }
  }

  async syncFiles(files: TFile[]): Promise<void> {
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;

    try {
      for (const file of files) {
        try {
          await this.syncFile(file);
        } catch (error) {
          console.error(`Failed to sync ${file.path}:`, error);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  getSyncStatus(): {
    queueSize: number;
    isSyncing: boolean;
  } {
    return {
      queueSize: this.syncQueue.size,
      isSyncing: this.isSyncing,
    };
  }

  private async updateFrontMatter(file: TFile, updates: Record<string, unknown>): Promise<void> {
    const content = await this.app.vault.read(file);
    const frontmatter = parseFrontMatter(content);

    const newFrontmatter = {
      ...frontmatter,
      ...updates,
      halo: updates.halo === undefined ? frontmatter.halo : updates.halo,
    };

    const newContent = stringifyFrontMatter(content, newFrontmatter);
    await this.app.vault.modify(file, newContent);
  }
}

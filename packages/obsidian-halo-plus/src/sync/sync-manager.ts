import { HaloClient, type HaloPost, PostService } from '@obsidian-halo-plus/halo-sdk';
import { type App, Component, type TFile } from 'obsidian';
import {
  type ImageCacheEntry,
  generateSlug,
  parseFrontMatter,
  stringifyFrontMatter,
} from '../content/frontmatter-parser';
import { ImageHandler } from '../content/image-handler';
import type HaloPlusPlugin from '../main';
import { PreviewRenderer } from '../renderer/preview-renderer';

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

      const client = new HaloClient({
        baseUrl: site.url,
        token: site.token,
      });

      const isConnected = await client.validateConnection();
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

        const postService = new PostService(client);
        let post: HaloPost | undefined;
        const effectiveTitle = frontmatter.title || file.basename;
        const effectiveSlug = frontmatter.slug || generateSlug(effectiveTitle);

        // 检查是否是更新操作
        let isUpdate = false;
        if (frontmatter.halo?.name) {
          // 验证文章是否真的存在于 Halo 中
          const postExists = await postService.exists(frontmatter.halo.name);
          if (postExists) {
            isUpdate = true;
          } else {
            // 文章已被删除，清除本地 halo 信息
            console.log(
              `[SyncManager] Post ${frontmatter.halo.name} not found in Halo, will create new post`,
            );
            await this.updateFrontMatter(file, { halo: undefined });
            frontmatter = { ...frontmatter, halo: undefined };
          }
        }

        const haloName = frontmatter.halo?.name;

        if (isUpdate && haloName) {
          post = await postService.update(haloName, {
            title: effectiveTitle,
            slug: effectiveSlug,
            tags: frontmatter.tags,
            categories: frontmatter.categories,
            cover: frontmatter.cover,
            excerpt: frontmatter.excerpt,
          });

          await postService.updateContent(haloName, {
            raw: processedHTML,
            content: processedHTML,
            rawType: 'HTML',
          });

          if (this.plugin.settings.publishBehavior.publishByDefault) {
            await postService.publish(haloName);
          }
        } else {
          post = await postService.create({
            title: effectiveTitle,
            slug: effectiveSlug,
            tags: frontmatter.tags,
            categories: frontmatter.categories,
            cover: frontmatter.cover,
            excerpt: frontmatter.excerpt,
            publish: this.plugin.settings.publishBehavior.publishByDefault,
            content: processedHTML,
          });
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

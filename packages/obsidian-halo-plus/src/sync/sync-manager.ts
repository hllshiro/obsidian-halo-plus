import { App, Component, TFile } from 'obsidian';
import { HaloClient, PostService } from '@obsidian-halo-plus/halo-sdk';
import type HaloPlusPlugin from '../main';
import { FrontMatterParser } from '../content/frontmatter-parser';
import { PreviewRenderer } from '../renderer/preview-renderer';
import { ImageHandler } from '../content/image-handler';

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
      const frontmatter = FrontMatterParser.parse(content);

      const component = new Component();
      component.load();

      try {
        const renderer = new PreviewRenderer(this.app, component);
        const renderResult = await renderer.renderFile(file);
        const renderedHTML = renderResult.viewEl.innerHTML;
        renderResult.cleanup();

        const imageHandler = new ImageHandler(this.app);
        const processedHTML = await imageHandler.processImages(
          renderedHTML,
          file,
          this.plugin.settings.imageHandling.defaultMode,
          this.plugin.settings.imageHandling.base64Quality,
        );

        const postService = new PostService(client);
        let post;
        const effectiveTitle = frontmatter.title || file.basename;
        const effectiveSlug = frontmatter.slug || FrontMatterParser.generateSlug(effectiveTitle);

        if (frontmatter.halo?.name) {
          post = await postService.update(frontmatter.halo.name, {
            title: effectiveTitle,
            slug: effectiveSlug,
            tags: frontmatter.tags,
            categories: frontmatter.categories,
            cover: frontmatter.cover,
            excerpt: frontmatter.excerpt,
          });

          await postService.updateContent(frontmatter.halo.name, {
            raw: processedHTML,
            content: processedHTML,
            rawType: 'HTML',
          });

          if (this.plugin.settings.publishBehavior.publishByDefault) {
            await postService.publish(frontmatter.halo.name);
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
    const frontmatter = FrontMatterParser.parse(content);

    const newFrontmatter = {
      ...frontmatter,
      ...updates,
      halo: updates.halo === undefined ? frontmatter.halo : updates.halo,
    };

    const newContent = FrontMatterParser.stringify(content, newFrontmatter);
    await this.app.vault.modify(file, newContent);
  }
}

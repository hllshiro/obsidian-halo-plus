import { HaloClient, type HaloPost, PostService } from '@obsidian-halo-plus/halo-sdk';
import { Component, Notice, Plugin, TFile } from 'obsidian';
import { generateSlug, parseFrontMatter, stringifyFrontMatter } from './content/frontmatter-parser';
import { ImageHandler } from './content/image-handler';
import { i18n, t } from './i18n';
import { PreviewRenderer } from './renderer/preview-renderer';
import type { PublishLoading } from './ui/publish-loading';
import { PublishPreviewModal } from './ui/publish-preview-modal';
import { SettingsTab } from './ui/settings-tab';

// 插件设置接口
export interface HaloSite {
  name: string;
  url: string;
  token: string;
  isDefault: boolean;
}

export interface PluginSettings {
  sites: HaloSite[];
  publishBehavior: {
    publishByDefault: boolean;
    skipPreview: boolean;
    cleanupAfterPublish: boolean;
  };
  imageHandling: {
    defaultMode: 'upload' | 'base64';
    base64Quality: number;
  };
  autoSync: {
    enabled: boolean;
    folders: string[];
  };
}

// 默认设置
const DEFAULT_SETTINGS: PluginSettings = {
  sites: [],
  publishBehavior: {
    publishByDefault: true,
    skipPreview: false,
    cleanupAfterPublish: true,
  },
  imageHandling: {
    defaultMode: 'upload',
    base64Quality: 80,
  },
  autoSync: {
    enabled: false,
    folders: [],
  },
};

/**
 * Halo Plus 插件主入口
 */
export default class HaloPlusPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    // 初始化 i18n
    i18n.init(this.app);

    // 注册命令
    this.addCommand({
      id: 'publish-to-halo',
      name: t('commands.publishToHalo'),
      editorCallback: async (_editor, view) => {
        const file = view.file;
        if (file) {
          await this.publishToHalo(file);
        }
      },
    });

    this.addCommand({
      id: 'delete-from-halo',
      name: t('commands.deleteFromHalo'),
      editorCallback: async (_editor, view) => {
        const file = view.file;
        if (file) {
          await this.deleteFromHalo(file);
        }
      },
    });

    this.addCommand({
      id: 'sync-all',
      name: t('commands.syncAll'),
      callback: async () => {
        await this.syncAll();
      },
    });

    this.addCommand({
      id: 'open-settings',
      name: t('commands.openSettings'),
      callback: async () => {
        // @ts-ignore - 打开设置
        this.app.setting?.open();
        // @ts-ignore - 滚动到插件设置
        this.app.setting?.scrollTopElement?.(this.app.setting.settingTabs);
      },
    });

    // 添加右键菜单
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && file.extension === 'md') {
          menu.addItem((item) => {
            item
              .setTitle(t('menus.publishToHalo'))
              .setIcon('upload')
              .onClick(async () => {
                await this.publishToHalo(file);
              });
          });
          menu.addItem((item) => {
            item
              .setTitle(t('menus.deleteFromHalo'))
              .setIcon('trash')
              .onClick(async () => {
                await this.deleteFromHalo(file);
              });
          });
        }
      }),
    );

    // 添加设置面板
    this.addSettingTab(new SettingsTab(this.app, this));

    // 注册文件监听（用于自动同步）
    this.registerEvent(
      this.app.vault.on('modify', async (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          if (this.settings.autoSync.enabled) {
            const isInSyncFolder = this.settings.autoSync.folders.some((folder) =>
              file.path.startsWith(folder),
            );
            if (isInSyncFolder) {
              await this.autoSync(file);
            }
          }
        }
      }),
    );

    console.log('Halo Plus plugin loaded');
  }

  onunload(): void {
    console.log('Halo Plus plugin unloaded');
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async publishToHalo(file: TFile): Promise<void> {
    if (this.settings.sites.length === 0) {
      new Notice(t('notices.siteNotConfigured'));
      return;
    }

    const content = await this.app.vault.read(file);
    const frontmatter = parseFrontMatter(content);

    const modal = new PublishPreviewModal(this.app, file, this.settings, frontmatter);
    modal.setOnPublish(async (site, imageMode, _loading) => {
      await this.doPublish(file, frontmatter, site, imageMode, _loading);
    });
    modal.open();
  }

  private async doPublish(
    file: TFile,
    frontmatter: Record<string, unknown>,
    site: HaloSite,
    imageMode: 'upload' | 'base64',
    loading: PublishLoading,
  ): Promise<void> {
    try {
      const client = new HaloClient({
        baseUrl: site.url,
        token: site.token,
      });

      const isConnected = await client.validateConnection();
      if (!isConnected) {
        new Notice(t('notices.connectionFailed'));
        return;
      }

      const component = new Component();
      component.load();

      try {
        loading.updateText('正在渲染文章...');
        console.log('[doPublish] Rendering article...');

        const renderer = new PreviewRenderer(this.app, component);
        const renderResult = await renderer.renderFile(file);
        const renderedHTML = renderResult.viewEl.innerHTML;
        renderResult.cleanup();

        loading.updateText('正在处理附件...');
        console.log('[doPublish] Processing attachments...');

        const imageHandler = new ImageHandler(this.app);
        const processedHTML = await imageHandler.processImages(
          renderedHTML,
          file,
          client,
          imageMode,
          this.settings.imageHandling.base64Quality,
          loading,
        );

        loading.updateText('正在发布文章...');
        console.log('[doPublish] Publishing article...');

        const postService = new PostService(client);
        let post: HaloPost | undefined;
        const effectiveTitle = (frontmatter.title as string) || file.basename;
        const effectiveSlug = (frontmatter.slug as string) || generateSlug(effectiveTitle);

        if (frontmatter.halo?.name) {
          post = await postService.update(frontmatter.halo.name as string, {
            title: effectiveTitle,
            slug: effectiveSlug,
            tags: frontmatter.tags as string[],
            categories: frontmatter.categories as string[],
            cover: frontmatter.cover as string,
            excerpt: frontmatter.excerpt as string,
          });

          await postService.updateContent(frontmatter.halo.name as string, {
            raw: processedHTML,
            content: processedHTML,
            rawType: 'HTML',
          });

          if (this.settings.publishBehavior.publishByDefault) {
            await postService.publish(frontmatter.halo.name as string);
          }

          console.log(`[doPublish] Article updated: ${effectiveTitle}`);
        } else {
          post = await postService.create({
            title: effectiveTitle,
            slug: effectiveSlug,
            tags: frontmatter.tags as string[],
            categories: frontmatter.categories as string[],
            cover: frontmatter.cover as string,
            excerpt: frontmatter.excerpt as string,
            publish: this.settings.publishBehavior.publishByDefault,
            content: processedHTML,
          });

          console.log(`[doPublish] Article created: ${effectiveTitle}`);
        }

        if (post) {
          await this.updateFrontMatter(file, {
            title: effectiveTitle,
            slug: effectiveSlug,
            halo: {
              site: site.url,
              name: post.metadata.name,
              publish: this.settings.publishBehavior.publishByDefault,
            },
          });
        }

        console.log(`[doPublish] Article published: ${effectiveTitle}`);
      } finally {
        component.unload();
      }
    } catch (error) {
      console.error('[doPublish] Failed:', error);
      throw error;
    }
  }

  /**
   * 从 Halo 删除文章
   */
  async deleteFromHalo(file: TFile): Promise<void> {
    const content = await this.app.vault.read(file);
    const frontmatter = parseFrontMatter(content);

    if (!frontmatter.halo?.name) {
      new Notice(t('notices.noteNotPublished'));
      return;
    }

    const site = this.getSites().find((s) => s.url === frontmatter.halo?.site);
    if (!site) {
      new Notice(t('notices.siteNotFound'));
      return;
    }

    try {
      const client = new HaloClient({
        baseUrl: site.url,
        token: site.token,
      });

      const postService = new PostService(client);
      await postService.delete(frontmatter.halo.name);

      // 清除 FrontMatter 中的 halo 字段
      await this.updateFrontMatter(file, {
        halo: undefined,
      });

      new Notice(t('notices.deleted', { title: frontmatter.title || file.basename }));
    } catch (error) {
      console.error('Failed to delete from Halo:', error);
      new Notice(
        t('notices.failedToDelete', {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * 同步所有文件
   */
  async syncAll(): Promise<void> {
    if (!this.settings.autoSync.enabled) {
      new Notice(t('notices.autoSyncNotEnabled'));
      return;
    }

    new Notice(t('notices.syncingAll'));

    for (const folder of this.settings.autoSync.folders) {
      const files = this.app.vault
        .getMarkdownFiles()
        .filter((file) => file.path.startsWith(folder));

      for (const file of files) {
        try {
          await this.publishToHalo(file);
        } catch (error) {
          console.error(`Failed to sync ${file.path}:`, error);
        }
      }
    }

    new Notice(t('notices.syncCompleted'));
  }

  /**
   * 自动同步
   */
  private async autoSync(file: TFile): Promise<void> {
    // 防抖处理
    if (this.autoSyncTimeout) {
      clearTimeout(this.autoSyncTimeout);
    }

    this.autoSyncTimeout = setTimeout(async () => {
      try {
        await this.publishToHalo(file);
      } catch (error) {
        console.error(`Auto sync failed for ${file.path}:`, error);
      }
    }, 1000);
  }

  private autoSyncTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * 获取默认站点
   */
  getDefaultSite(): HaloSite | undefined {
    return this.settings.sites.find((site) => site.isDefault) || this.settings.sites[0];
  }

  /**
   * 获取所有站点
   */
  getSites(): HaloSite[] {
    return this.settings.sites;
  }

  /**
   * 更新 FrontMatter
   */
  private async updateFrontMatter(file: TFile, updates: Record<string, unknown>): Promise<void> {
    const content = await this.app.vault.read(file);
    const frontmatter = parseFrontMatter(content);

    const newFrontmatter = {
      ...frontmatter,
      ...updates,
      halo: updates.halo === undefined ? frontmatter.halo : updates.halo,
    };

    // 重新构建文件内容
    const newContent = stringifyFrontMatter(content, newFrontmatter);
    await this.app.vault.modify(file, newContent);
  }
}

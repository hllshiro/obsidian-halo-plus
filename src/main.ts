import type { Post as ApiPost, PostSpec as ApiPostSpec } from '@halo-dev/api-client';
import { Component, Notice, Plugin, TFile } from 'obsidian';
import { type AssetCacheEntry, AssetHandler } from './content/asset-handler';
import {
  type ImageCacheEntry,
  generateSlug,
  parseFrontMatter,
  stringifyFrontMatter,
} from './content/frontmatter-parser';
import { createHaloClient, validateConnection } from './halo-client';
import { i18n, t } from './i18n';
import { PreviewRenderer } from './renderer/preview-renderer';
import { TagCategoryService } from './service/tag-category-service';
import type { HaloContent, HaloPost } from './types';
import { PublishPreviewModal } from './ui/publish-preview-modal';
import { SettingsTab } from './ui/settings-tab';
import { Logger } from './utils/logger';

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
    imageExtensions: string[]; // 新增：图片类别配置
  };
  attachmentHandling: {
    maxSizeMB: number; // 新增：附件大小限制
  };
  autoSync: {
    enabled: boolean;
    folders: string[];
    scanInterval: number;
  };
  verboseLog: boolean;
  checkOnStartup: boolean;
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
    imageExtensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'], // 新增
  },
  attachmentHandling: {
    maxSizeMB: 100, // 新增
  },
  autoSync: {
    enabled: false,
    folders: [],
    scanInterval: 30,
  },
  verboseLog: false,
  checkOnStartup: false,
};

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return hash.toString(36);
}

/**
 * 深度合并对象，确保嵌套对象的缺失字段从默认值中补齐
 * 解决 Object.assign 浅拷贝导致旧数据覆盖新结构的问题
 */
function deepMerge<T>(defaults: T, data: Partial<T>): T {
  const result = { ...defaults };
  for (const key of Object.keys(data) as Array<keyof T>) {
    const defaultVal = defaults[key];
    const dataVal = data[key];
    if (
      dataVal !== null &&
      dataVal !== undefined &&
      typeof defaultVal === 'object' &&
      !Array.isArray(defaultVal) &&
      typeof dataVal === 'object' &&
      !Array.isArray(dataVal)
    ) {
      result[key] = deepMerge(
        defaultVal as Record<string, unknown>,
        dataVal as Record<string, unknown>,
      ) as T[keyof T];
    } else if (dataVal !== undefined) {
      result[key] = dataVal as T[keyof T];
    }
  }
  return result;
}

/**
 * Halo Plus 插件主入口
 */
export default class HaloPlusPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private contentHashCache: Map<string, string> = new Map();
  private mtimeCache: Map<string, number> = new Map();
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
  private logger: Logger = Logger.init('[HaloPlus]', () => this.settings.verboseLog);

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

    // 等待 vault 就绪后再启动自动同步扫描
    if (this.settings.autoSync.enabled) {
      this.app.workspace.onLayoutReady(() => {
        this.startAutoSync();
        if (this.settings.checkOnStartup) {
          this.scanAndPublish().catch((error) => {
            this.logger.error('Startup scan failed:', error);
          });
        }
      });
    }

    this.logger.log('Plugin loaded');
  }

  onunload(): void {
    this.stopAutoSync();
    this.saveAllData();
    this.logger.log('Plugin unloaded');
  }

  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = deepMerge(DEFAULT_SETTINGS, data || {});

    // 加载文件缓存（mtime + hash）
    if (data?.fileCache?.mtime) {
      for (const [path, mtime] of Object.entries(data.fileCache.mtime)) {
        this.mtimeCache.set(path, mtime as number);
      }
    }
    if (data?.fileCache?.hash) {
      for (const [path, hash] of Object.entries(data.fileCache.hash)) {
        this.contentHashCache.set(path, hash as string);
      }
    }

    this.logger.verbose(
      `Loaded cache: ${this.mtimeCache.size} mtime, ${this.contentHashCache.size} hash`,
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveAllData();
  }

  private async saveAllData(): Promise<void> {
    const mtime: Record<string, number> = {};
    for (const [path, val] of this.mtimeCache) mtime[path] = val;
    const hash: Record<string, string> = {};
    for (const [path, val] of this.contentHashCache) hash[path] = val;

    await this.saveData({
      ...this.settings,
      fileCache: { mtime, hash },
    });
  }

  private migrateAssetCache(frontmatter: Record<string, unknown>): Record<string, unknown> {
    const halo = frontmatter.halo as Record<string, unknown> | undefined;
    if (!halo) return frontmatter;

    if (halo.assets) return frontmatter;

    if (halo.images && Array.isArray(halo.images)) {
      const assets = (halo.images as ImageCacheEntry[]).map((img) => ({
        ...img,
        assetType: 'image' as const,
      }));

      return {
        ...frontmatter,
        halo: {
          ...halo,
          assets,
          images: undefined,
        },
      };
    }

    return frontmatter;
  }

  async publishToHalo(file: TFile, forceSkipPreview = false): Promise<void> {
    if (this.settings.sites.length === 0) {
      new Notice(t('notices.siteNotConfigured'));
      return;
    }

    const content = await this.app.vault.read(file);
    let frontmatter = parseFrontMatter(content);

    frontmatter = this.migrateAssetCache(frontmatter);

    if (forceSkipPreview || this.settings.publishBehavior.skipPreview) {
      const site = this.settings.sites.find((s) => s.isDefault) || this.settings.sites[0];
      const imageMode = this.settings.imageHandling.defaultMode;
      const notice = new Notice(t('modals.publish.publishing'), 0);
      try {
        await this.doPublish(file, frontmatter, site, imageMode, notice);
        notice.hide();
      } catch (error) {
        this.logger.error('Skip preview publish failed:', error);
        notice.setMessage(
          t('modals.publish.failedToPublish', {
            error: this.extractErrorMessage(error),
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        notice.hide();
      }
      return;
    }

    const modal = new PublishPreviewModal(this.app, file, this.settings, frontmatter);
    modal.setOnPublish(async (site, imageMode, _notice) => {
      await this.doPublish(file, frontmatter, site, imageMode, _notice);
    });
    modal.open();
  }

  private async doPublish(
    file: TFile,
    frontmatter: Record<string, unknown>,
    site: HaloSite,
    imageMode: 'upload' | 'base64',
    notice?: Notice,
  ): Promise<void> {
    try {
      const client = createHaloClient({
        baseUrl: site.url,
        token: site.token,
      });

      const isConnected = await validateConnection(client);
      if (!isConnected) {
        new Notice(t('notices.connectionFailed'));
        return;
      }

      const component = new Component();
      component.load();

      try {
        notice?.setMessage('正在渲染文章...');
        this.logger.verbose('Rendering article...');

        const renderer = new PreviewRenderer(this.app, component);
        const renderResult = await renderer.renderFile(file);
        const renderedHTML = renderResult.viewEl.innerHTML;
        renderResult.cleanup();

        notice?.setMessage('正在处理附件...');
        this.logger.verbose('Processing attachments...');

        const assetHandler = new AssetHandler(this.app, this.settings);
        const existingAssetCache =
          (frontmatter.halo?.assets as AssetCacheEntry[]) ||
          (frontmatter.halo?.images as AssetCacheEntry[]) ||
          [];

        this.logger.verbose('Existing asset cache:', {
          count: existingAssetCache.length,
          assets: existingAssetCache.map((asset) => ({
            localPath: asset.localPath,
            attachmentName: asset.attachmentName,
            assetType: asset.assetType,
          })),
        });

        const assetResult = await assetHandler.processAssets(
          renderedHTML,
          file,
          client,
          imageMode,
          this.settings.imageHandling.base64Quality,
          notice,
          existingAssetCache,
        );

        const processedHTML = assetResult.html;
        const updatedAssetCache = assetResult.assetCache;

        this.logger.verbose('Updated asset cache:', {
          count: updatedAssetCache.length,
          assets: updatedAssetCache.map((asset) => ({
            localPath: asset.localPath,
            attachmentName: asset.attachmentName,
            assetType: asset.assetType,
          })),
        });

        notice?.setMessage('正在发布文章...');
        this.logger.verbose('Publishing article...');

        let post: HaloPost | undefined;
        const effectiveTitle = (frontmatter.title as string) || file.basename;
        const effectiveSlug = (frontmatter.slug as string) || generateSlug(effectiveTitle);

        // 使用局部变量避免参数重赋值
        let currentFrontmatter = frontmatter;

        // 处理标签和分类
        const tagCategoryService = new TagCategoryService(client);
        let tagNames: string[] = [];
        let categoryNames: string[] = [];

        if (currentFrontmatter.tags && currentFrontmatter.tags.length > 0) {
          tagNames = await tagCategoryService.getTagNames(currentFrontmatter.tags as string[]);
        }

        if (currentFrontmatter.categories && currentFrontmatter.categories.length > 0) {
          categoryNames = await tagCategoryService.getCategoryNames(
            currentFrontmatter.categories as string[],
          );
        }

        // 获取远端文章，如果在回收站中则恢复，如果不存在则新建
        let existingPost: HaloPost | undefined;
        if (currentFrontmatter.halo?.name) {
          this.logger.verbose(
            'Found existing halo name, trying to fetch from remote:',
            currentFrontmatter.halo.name,
          );
          try {
            const getResponse = await client.httpClient.get(
              `/apis/uc.api.content.halo.run/v1alpha1/posts/${currentFrontmatter.halo.name}`,
            );
            existingPost = getResponse.data as HaloPost;
            this.logger.verbose('Successfully fetched existing post');

            // 检查文章是否在回收站中
            if (existingPost.spec.deleted) {
              this.logger.verbose('Post is in recycle bin, restoring...');
              const restoreResponse = await client.coreApi.content.post.patchPost({
                name: currentFrontmatter.halo.name,
                jsonPatchInner: [{ op: 'add', path: '/spec/deleted', value: false }],
              });
              existingPost = restoreResponse.data as HaloPost;
              this.logger.verbose('Successfully restored post from recycle bin');
            }
          } catch (error) {
            this.logger.verbose('Failed to fetch post, will create new one:', error);
            existingPost = undefined;
            // 文章不存在，清除本地 halo 信息
            await this.updateFrontMatter(file, { halo: undefined });
            currentFrontmatter = { ...currentFrontmatter, halo: undefined };
          }
        } else {
          this.logger.verbose('No existing halo name found, will create new post');
        }

        if (existingPost) {
          // 更新已有文章
          this.logger.verbose('Updating existing post:', existingPost.metadata.name);

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
              cover: (currentFrontmatter.cover as string) ?? existing.spec.cover,
              excerpt: currentFrontmatter.excerpt
                ? { autoGenerate: true, raw: currentFrontmatter.excerpt as string }
                : existing.spec.excerpt,
              categories: categoryNames.length > 0 ? categoryNames : existing.spec.categories,
              tags: tagNames.length > 0 ? tagNames : existing.spec.tags,
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

          if (this.settings.publishBehavior.publishByDefault) {
            await client.httpClient.put(
              `/apis/uc.api.content.halo.run/v1alpha1/posts/${existingPost.metadata.name}/publish`,
            );
          }

          this.logger.verbose(`Article updated: ${effectiveTitle}`);
        } else {
          // 创建新文章（客户端生成 UUID，通过 annotation 注入内容）
          this.logger.verbose('Creating new post');
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
              cover: (currentFrontmatter.cover as string) || '',
              deleted: false,
              publish: this.settings.publishBehavior.publishByDefault,
              pinned: false,
              allowComment: true,
              visible: 'PUBLIC' as ApiPostSpec['visible'],
              priority: 0,
              excerpt: {
                autoGenerate: true,
                raw: (currentFrontmatter.excerpt as string) || '',
              },
              categories: categoryNames,
              tags: tagNames,
              htmlMetas: [],
            },
          };
          const createResponse = await client.httpClient.post(
            '/apis/uc.api.content.halo.run/v1alpha1/posts',
            newPost,
          );
          post = createResponse.data as HaloPost;

          this.logger.verbose(`Article created: ${effectiveTitle}`);
        }

        if (post) {
          await this.updateFrontMatter(file, {
            title: effectiveTitle,
            slug: effectiveSlug,
            halo: {
              site: site.url,
              name: post.metadata.name,
              publish: this.settings.publishBehavior.publishByDefault,
              assets: updatedAssetCache,
            },
          });
        }

        this.logger.verbose(`Article published: ${effectiveTitle}`);
        new Notice(t('notices.published', { title: effectiveTitle }));
      } finally {
        component.unload();
      }
    } catch (error) {
      this.logger.error('Publish failed:', error);
      new Notice(
        t('modals.publish.failedToPublish', {
          error: this.extractErrorMessage(error),
        }),
      );
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
      const client = createHaloClient({
        baseUrl: site.url,
        token: site.token,
      });

      await client.consoleApi.content.post.recyclePost({ name: frontmatter.halo.name });

      // 清除 FrontMatter 中的 halo 字段
      await this.updateFrontMatter(file, {
        halo: undefined,
      });

      new Notice(t('notices.deleted', { title: frontmatter.title || file.basename }));
    } catch (error) {
      this.logger.error('Failed to delete from Halo:', error);
      new Notice(
        t('notices.failedToDelete', {
          error: this.extractErrorMessage(error),
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
          this.logger.error(`Failed to sync ${file.path}:`, error);
        }
      }
    }

    new Notice(t('notices.syncCompleted'));
  }

  /**
   * 启动自动同步定时扫描
   */
  startAutoSync(): void {
    this.stopAutoSync();
    const intervalMs = (this.settings.autoSync.scanInterval || 30) * 1000;
    this.autoSyncTimer = setInterval(() => {
      this.scanAndPublish().catch((error) => {
        this.logger.error('Scan failed:', error);
      });
    }, intervalMs);
    this.logger.log(`Auto sync started with ${intervalMs / 1000}s interval`);
  }

  /**
   * 停止自动同步
   */
  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    this.logger.log('Auto sync stopped');
  }

  /**
   * 重启自动同步（设置变更后调用）
   */
  restartAutoSync(): void {
    this.stopAutoSync();
    if (this.settings.autoSync.enabled) {
      this.startAutoSync();
    }
  }

  /**
   * 扫描 watched folders 下所有 md 文件，两级检测后发布
   */
  private async scanAndPublish(): Promise<void> {
    const folders = this.settings.autoSync.folders;
    if (folders.length === 0) {
      this.logger.verbose('Scan skipped: no watched folders configured');
      return;
    }

    this.logger.verbose(`Scanning folders: ${folders.join(', ')}`);

    const files = this.app.vault
      .getMarkdownFiles()
      .filter((file) => folders.some((folder) => file.path.startsWith(folder)));

    this.logger.verbose(`Found ${files.length} markdown files in watched folders`);

    const isFirstRun = this.mtimeCache.size === 0;
    if (isFirstRun) {
      this.logger.verbose('First run: initializing cache only, no publishing');
    }

    let mtimeUnchanged = 0;
    let hashUnchanged = 0;
    let published = 0;
    let errors = 0;

    for (const file of files) {
      try {
        // 第一级：mtime 检测
        const cachedMtime = this.mtimeCache.get(file.path);
        if (cachedMtime === file.stat.mtime) {
          mtimeUnchanged++;
          continue;
        }

        this.logger.verbose(
          `mtime changed: ${file.path} (cached: ${cachedMtime}, current: ${file.stat.mtime})`,
        );

        // 第二级：内容 hash 检测
        const content = await this.app.vault.read(file);
        const contentHash = djb2Hash(content);
        const cachedHash = this.contentHashCache.get(file.path);

        if (cachedHash === contentHash) {
          // 内容没变，只更新 mtime 缓存
          this.mtimeCache.set(file.path, file.stat.mtime);
          hashUnchanged++;
          this.logger.verbose(`Hash unchanged: ${file.path}, only mtime cache updated`);
          continue;
        }

        this.logger.verbose(
          `Content changed: ${file.path} (hash: ${cachedHash} -> ${contentHash})`,
        );

        // 首次运行只初始化缓存，不发布
        if (isFirstRun) {
          this.mtimeCache.set(file.path, file.stat.mtime);
          this.contentHashCache.set(file.path, contentHash);
          this.logger.verbose(`Initialized cache: ${file.path}`);
          continue;
        }

        // 内容有变更，执行发布
        this.logger.verbose(`Publishing: ${file.path}...`);
        await this.publishToHalo(file, true);
        this.mtimeCache.set(file.path, file.stat.mtime);
        this.contentHashCache.set(file.path, contentHash);
        published++;
        this.logger.verbose(`Published: ${file.path}`);
      } catch (error) {
        errors++;
        this.logger.error(`Failed to sync ${file.path}:`, error);
      }
    }

    this.logger.verbose(
      `Scan complete: ${files.length} files scanned, ${mtimeUnchanged} mtime unchanged, ${hashUnchanged} hash unchanged, ${published} published, ${errors} errors`,
    );

    if (isFirstRun) {
      this.logger.log(`Initialized ${files.length} files`);
    }
  }

  /**
   * 提取错误信息，优先使用 Halo API 的 detail 字段
   */
  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response?: { data?: { detail?: string; status?: number; title?: string } };
      };
      const data = axiosError.response?.data;
      if (data?.detail) return data.detail;
      if (data?.title) return `${data.title} (${data.status})`;
    }
    if (error instanceof Error) return error.message;
    return 'Unknown error';
  }

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

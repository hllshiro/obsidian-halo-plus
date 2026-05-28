import { App, Component, Modal, Notice, Setting, TFile } from 'obsidian';
import { HaloClient, PostService } from '@obsidian-halo-plus/halo-sdk';
import { PreviewRenderer, type RenderResult } from '../renderer/preview-renderer';
import { FrontMatterParser } from '../content/frontmatter-parser';
import { ImageHandler } from '../content/image-handler';
import type { HaloSite, PluginSettings } from '../main';

/**
 * 发布预览 Modal 回调
 */
export interface PublishPreviewCallbacks {
  onPublish: (site: HaloSite, imageMode: 'upload' | 'base64') => Promise<void>;
  onCancel: () => void;
}

/**
 * 发布预览 Modal
 *
 * 双栏布局：
 * - 左侧：内容预览（渲染后的 HTML）
 * - 右侧：操作面板（站点选择、图片模式、发布按钮）
 */
export class PublishPreviewModal extends Modal {
  private file: TFile;
  private settings: PluginSettings;
  private frontmatter: Record<string, unknown>;
  private renderResult: RenderResult | null = null;
  private component: Component;

  // 操作面板状态
  private selectedSite: HaloSite;
  private imageMode: 'upload' | 'base64';
  private isPublishing = false;

  // 回调
  private onPublish?: (site: HaloSite, imageMode: 'upload' | 'base64') => Promise<void>;

  constructor(
    app: App,
    file: TFile,
    settings: PluginSettings,
    frontmatter: Record<string, unknown>,
  ) {
    super(app);
    this.file = file;
    this.settings = settings;
    this.frontmatter = frontmatter;
    this.component = new Component();

    // 默认选中默认站点
    this.selectedSite =
      settings.sites.find((s) => s.isDefault) || settings.sites[0];
    this.imageMode = settings.imageHandling.defaultMode;
  }

  /**
   * 设置发布回调
   */
  setOnPublish(callback: (site: HaloSite, imageMode: 'upload' | 'base64') => Promise<void>): void {
    this.onPublish = callback;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    // 设置 Modal 宽度（参考 obsidian-better-export-pdf）
    this.containerEl.style.setProperty('--dialog-width', '90vw');
    this.titleEl.setText('Publish to Halo');

    // 主容器 - 双栏布局
    const mainEl = contentEl.createDiv({ cls: 'halo-plus-preview-container' });

    // 左侧：预览区域
    const previewEl = mainEl.createDiv({ cls: 'halo-plus-preview-left' });
    this.renderPreview(previewEl);

    // 右侧：操作面板
    const sidebarEl = mainEl.createDiv({ cls: 'halo-plus-preview-right' });
    this.renderSidebar(sidebarEl);
  }

  onClose(): void {
    // 清理渲染结果
    if (this.renderResult) {
      this.renderResult.cleanup();
      this.renderResult = null;
    }
    this.component.unload();
    this.contentEl.empty();
  }

  /**
   * 渲染预览区域
   */
  private async renderPreview(container: HTMLElement): Promise<void> {
    // 加载状态
    const loadingEl = container.createDiv({ cls: 'halo-plus-preview-loading' });
    loadingEl.createEl('span', { cls: 'spinner' });
    loadingEl.createSpan({ text: 'Rendering content...' });

    try {
      // 加载组件
      this.component.load();

      // 创建渲染器并渲染
      const renderer = new PreviewRenderer(this.app, this.component);
      this.renderResult = await renderer.renderFile(this.file);

      // 清除加载状态
      loadingEl.remove();

      // 将渲染结果移动到预览容器
      const previewContent = container.createDiv({
        cls: 'halo-plus-preview-content',
      });

      // 克隆渲染结果到预览区域
      const clonedEl = this.renderResult.viewEl.cloneNode(true) as HTMLElement;
      previewContent.appendChild(clonedEl);
    } catch (error) {
      loadingEl.remove();
      const errorEl = container.createDiv({ cls: 'halo-plus-preview-error' });
      errorEl.createEl('p', { text: 'Failed to render content' });
      errorEl.createEl('pre', {
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 渲染侧边栏
   */
  private renderSidebar(container: HTMLElement): void {
    // 文章信息区域
    const infoSection = container.createDiv({ cls: 'halo-plus-sidebar-section' });
    infoSection.createEl('h3', { text: 'Article Info' });

    // 标题
    const title = (this.frontmatter.title as string) || this.file.basename;
    const titleEl = infoSection.createDiv({ cls: 'halo-plus-info-item' });
    titleEl.createEl('span', { text: 'Title: ', cls: 'halo-plus-info-label' });
    titleEl.createEl('span', { text: title, cls: 'halo-plus-info-value' });

    // 标签
    const tags = (this.frontmatter.tags as string[]) || [];
    if (tags.length > 0) {
      const tagsEl = infoSection.createDiv({ cls: 'halo-plus-info-item' });
      tagsEl.createEl('span', { text: 'Tags: ', cls: 'halo-plus-info-label' });
      const tagsContainer = tagsEl.createDiv({ cls: 'halo-plus-tags' });
      tags.forEach((tag) => {
        tagsContainer.createEl('span', { text: tag, cls: 'halo-plus-tag' });
      });
    }

    // 分类
    const categories = (this.frontmatter.categories as string[]) || [];
    if (categories.length > 0) {
      const categoriesEl = infoSection.createDiv({ cls: 'halo-plus-info-item' });
      categoriesEl.createEl('span', {
        text: 'Categories: ',
        cls: 'halo-plus-info-label',
      });
      const categoriesContainer = categoriesEl.createDiv({
        cls: 'halo-plus-categories',
      });
      categories.forEach((cat) => {
        categoriesContainer.createEl('span', {
          text: cat,
          cls: 'halo-plus-category',
        });
      });
    }

    // 分割线
    container.createEl('hr');

    // 站点选择区域
    const siteSection = container.createDiv({ cls: 'halo-plus-sidebar-section' });
    siteSection.createEl('h3', { text: 'Target Site' });

    // 站点选择下拉框
    new Setting(siteSection)
      .setName('Halo Site')
      .setDesc('Select the Halo site to publish to')
      .addDropdown((dropdown) => {
        this.settings.sites.forEach((site, index) => {
          dropdown.addOption(index.toString(), site.name);
        });
        const defaultIndex = this.settings.sites.indexOf(this.selectedSite);
        dropdown.setValue(defaultIndex.toString());
        dropdown.onChange((value) => {
          this.selectedSite = this.settings.sites[parseInt(value)];
        });
      });

    // 图片处理模式
    new Setting(siteSection)
      .setName('Image Handling')
      .setDesc('How to handle images in the content')
      .addDropdown((dropdown) => {
        dropdown.addOption('upload', 'Upload to Halo');
        dropdown.addOption('base64', 'Embed as Base64');
        dropdown.setValue(this.imageMode);
        dropdown.onChange((value) => {
          this.imageMode = value as 'upload' | 'base64';
        });
      });

    // 分割线
    container.createEl('hr');

    // 发布选项区域
    const optionsSection = container.createDiv({ cls: 'halo-plus-sidebar-section' });
    optionsSection.createEl('h3', { text: 'Publish Options' });

    // 是否立即发布
    let publishImmediately = this.settings.publishBehavior.publishByDefault;
    new Setting(optionsSection)
      .setName('Publish Immediately')
      .setDesc('Make the article public after publishing')
      .addToggle((toggle) => {
        toggle.setValue(publishImmediately);
        toggle.onChange((value) => {
          publishImmediately = value;
        });
      });

    // 分割线
    container.createEl('hr');

    // 按钮区域
    const buttonSection = container.createDiv({ cls: 'halo-plus-sidebar-buttons' });

    // 取消按钮
    const cancelBtn = buttonSection.createEl('button', {
      text: 'Cancel',
      cls: 'halo-plus-btn halo-plus-btn-cancel',
    });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });

    // 发布按钮
    const publishBtn = buttonSection.createEl('button', {
      text: 'Publish',
      cls: 'halo-plus-btn halo-plus-btn-publish mod-cta',
    });
    publishBtn.addEventListener('click', async () => {
      if (this.isPublishing) return;

      this.isPublishing = true;
      publishBtn.setText('Publishing...');
      publishBtn.disabled = true;

      try {
        if (this.onPublish) {
          await this.onPublish(this.selectedSite, this.imageMode);
        }
        this.close();
      } catch (error) {
        new Notice(`Publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        this.isPublishing = false;
        publishBtn.setText('Publish');
        publishBtn.disabled = false;
      }
    });
  }
}

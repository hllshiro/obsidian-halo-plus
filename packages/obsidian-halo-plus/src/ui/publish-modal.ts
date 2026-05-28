import { type App, Modal } from 'obsidian';
import { t } from '../i18n';

/**
 * 发布确认弹窗
 */
export class PublishModal extends Modal {
  private title: string;
  private tags: string[];
  private categories: string[];
  private site: string;
  private content: string;
  private imageMode: 'upload' | 'base64';
  private onConfirm: (imageMode: 'upload' | 'base64') => void;

  constructor(
    app: App,
    options: {
      title: string;
      tags: string[];
      categories: string[];
      site: string;
      content: string;
      imageMode: 'upload' | 'base64';
      onConfirm: (imageMode: 'upload' | 'base64') => void;
    },
  ) {
    super(app);
    this.title = options.title;
    this.tags = options.tags;
    this.categories = options.categories;
    this.site = options.site;
    this.content = options.content;
    this.imageMode = options.imageMode;
    this.onConfirm = options.onConfirm;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: t('modals.publish.title') });

    // 文章信息
    const infoEl = contentEl.createDiv({ cls: 'publish-modal-info' });

    const titleEl = infoEl.createDiv({ cls: 'publish-modal-title' });
    titleEl.createEl('strong', { text: t('modals.publish.titleLabel') });
    titleEl.createEl('span', { text: this.title });

    if (this.tags.length > 0) {
      const tagsEl = infoEl.createDiv({ cls: 'publish-modal-tags' });
      tagsEl.createEl('strong', { text: t('modals.publish.tags') });
      tagsEl.createEl('span', { text: this.tags.join(', ') });
    }

    if (this.categories.length > 0) {
      const categoriesEl = infoEl.createDiv({ cls: 'publish-modal-categories' });
      categoriesEl.createEl('strong', { text: t('modals.publish.categories') });
      categoriesEl.createEl('span', { text: this.categories.join(', ') });
    }

    const siteEl = infoEl.createDiv({ cls: 'publish-modal-site' });
    siteEl.createEl('strong', { text: t('modals.publish.site') });
    siteEl.createEl('span', { text: this.site });

    // 内容预览
    const previewEl = contentEl.createDiv({ cls: 'publish-modal-preview' });
    previewEl.createEl('h3', { text: t('modals.publish.contentPreview') });
    const previewContent = previewEl.createDiv({ cls: 'publish-modal-preview-content' });
    previewContent.innerHTML =
      this.content.substring(0, 500) + (this.content.length > 500 ? '...' : '');

    // 图片处理模式
    const imageModeEl = contentEl.createDiv({ cls: 'publish-modal-image-mode' });
    imageModeEl.createEl('label', { text: t('modals.publish.imageHandling') });
    const selectEl = imageModeEl.createEl('select');
    selectEl.createEl('option', {
      text: t('settings.imageHandling.uploadToHalo'),
      value: 'upload',
    });
    selectEl.createEl('option', {
      text: t('settings.imageHandling.embedAsBase64'),
      value: 'base64',
    });
    selectEl.value = this.imageMode;
    selectEl.addEventListener('change', (e) => {
      this.imageMode = (e.target as HTMLSelectElement).value as 'upload' | 'base64';
    });

    // 按钮
    const buttonEl = contentEl.createDiv({ cls: 'publish-modal-button' });

    const cancelButton = buttonEl.createEl('button', { text: t('modals.publish.cancel') });
    cancelButton.addEventListener('click', () => this.close());

    const confirmButton = buttonEl.createEl('button', {
      text: t('modals.publish.publish'),
      cls: 'mod-cta',
    });
    confirmButton.addEventListener('click', () => {
      this.onConfirm(this.imageMode);
      this.close();
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

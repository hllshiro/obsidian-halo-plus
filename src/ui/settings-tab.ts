import { type App, Modal, Notice, PluginSettingTab, Setting } from 'obsidian';
import { t } from '../i18n';
import type HaloPlusPlugin from '../main';
import type { HaloSite } from '../main';

/**
 * 设置面板
 */
export class SettingsTab extends PluginSettingTab {
  plugin: HaloPlusPlugin;

  constructor(app: App, plugin: HaloPlusPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: t('settings.title') });

    // 站点管理
    this.renderSiteManagement(containerEl);

    // 发布行为
    this.renderPublishBehavior(containerEl);

    // 图片处理
    this.renderImageHandling(containerEl);

    // 自动同步
    this.renderAutoSync(containerEl);
  }

  private renderSiteManagement(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: t('settings.siteManagement.title') });

    const sites = this.plugin.getSites();

    sites.forEach((site, index) => {
      const siteEl = containerEl.createDiv({ cls: 'halo-site-setting' });

      new Setting(siteEl)
        .setName(site.name)
        .setDesc(site.url)
        .addButton((btn) =>
          btn
            .setButtonText(t('settings.siteManagement.editSite'))
            .setCta()
            .onClick(() => {
              this.editSite(index);
            }),
        )
        .addButton((btn) =>
          btn
            .setButtonText(t('settings.siteManagement.deleteSite'))
            .setWarning()
            .onClick(async () => {
              this.plugin.settings.sites.splice(index, 1);
              await this.plugin.saveSettings();
              this.display();
            }),
        );
    });

    new Setting(containerEl)
      .setName(t('settings.siteManagement.addSite'))
      .setDesc(t('settings.siteManagement.addSite'))
      .addButton((btn) =>
        btn
          .setButtonText(t('settings.siteManagement.addSite'))
          .setCta()
          .onClick(() => {
            this.addSite();
          }),
      );
  }

  private renderPublishBehavior(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: t('settings.publishBehavior.title') });

    new Setting(containerEl)
      .setName(t('settings.publishBehavior.publishByDefault'))
      .setDesc(t('settings.publishBehavior.publishByDefaultDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.publishBehavior.publishByDefault)
          .onChange(async (value) => {
            this.plugin.settings.publishBehavior.publishByDefault = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings.publishBehavior.skipPreview'))
      .setDesc(t('settings.publishBehavior.skipPreviewDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.publishBehavior.skipPreview)
          .onChange(async (value) => {
            this.plugin.settings.publishBehavior.skipPreview = value;
            await this.plugin.saveSettings();
          }),
      );
  }

  private renderImageHandling(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: t('settings.imageHandling.title') });

    new Setting(containerEl)
      .setName(t('settings.imageHandling.defaultMode'))
      .setDesc(t('settings.imageHandling.defaultModeDesc'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('upload', t('settings.imageHandling.uploadToHalo'))
          .addOption('base64', t('settings.imageHandling.embedAsBase64'))
          .setValue(this.plugin.settings.imageHandling.defaultMode)
          .onChange(async (value: 'upload' | 'base64') => {
            this.plugin.settings.imageHandling.defaultMode = value;
            await this.plugin.saveSettings();
          }),
      );

    if (this.plugin.settings.imageHandling.defaultMode === 'base64') {
      new Setting(containerEl)
        .setName(t('settings.imageHandling.base64Quality'))
        .setDesc(t('settings.imageHandling.base64QualityDesc'))
        .addSlider((slider) =>
          slider
            .setLimits(0, 100, 5)
            .setValue(this.plugin.settings.imageHandling.base64Quality)
            .onChange(async (value) => {
              this.plugin.settings.imageHandling.base64Quality = value;
              await this.plugin.saveSettings();
            }),
        );
    }
  }

  private renderAutoSync(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: t('settings.autoSync.title') });

    new Setting(containerEl)
      .setName(t('settings.autoSync.enableAutoSync'))
      .setDesc(t('settings.autoSync.enableAutoSyncDesc'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoSync.enabled).onChange(async (value) => {
          this.plugin.settings.autoSync.enabled = value;
          await this.plugin.saveSettings();
          this.display();
        }),
      );

    if (this.plugin.settings.autoSync.enabled) {
      const folders = this.plugin.settings.autoSync.folders;

      folders.forEach((folder, index) => {
        new Setting(containerEl).setName(folder).addButton((btn) =>
          btn
            .setButtonText(t('settings.autoSync.remove'))
            .setWarning()
            .onClick(async () => {
              this.plugin.settings.autoSync.folders.splice(index, 1);
              await this.plugin.saveSettings();
              this.display();
            }),
        );
      });

      new Setting(containerEl)
        .setName(t('settings.autoSync.addFolder'))
        .setDesc(t('settings.autoSync.addFolderDesc'))
        .addText((text) =>
          text.setPlaceholder('folder/path').onChange(async (value) => {
            if (value && !folders.includes(value)) {
              this.plugin.settings.autoSync.folders.push(value);
              await this.plugin.saveSettings();
              this.display();
            }
          }),
        );
    }
  }

  private addSite(): void {
    const modal = new SiteModal(this.app, async (site) => {
      this.plugin.settings.sites.push(site);
      await this.plugin.saveSettings();
      this.display();
    });
    modal.open();
  }

  private editSite(index: number): void {
    const site = this.plugin.settings.sites[index];
    const modal = new SiteModal(
      this.app,
      async (updatedSite) => {
        this.plugin.settings.sites[index] = updatedSite;
        await this.plugin.saveSettings();
        this.display();
      },
      site,
    );
    modal.open();
  }
}

class SiteModal extends Modal {
  private onSubmit: (site: HaloSite) => void;
  private site?: HaloSite;
  private data: HaloSite;

  constructor(app: App, onSubmit: (site: HaloSite) => void, site?: HaloSite) {
    super(app);
    this.onSubmit = onSubmit;
    this.site = site;
    this.data = site ? { ...site } : { name: '', url: '', token: '', isDefault: false };
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', {
      text: this.site
        ? t('settings.siteManagement.editSite')
        : t('settings.siteManagement.addSite'),
    });

    new Setting(contentEl).setName(t('settings.siteManagement.siteName')).addText((text) =>
      text
        .setPlaceholder('My Blog')
        .setValue(this.data.name)
        .onChange((value) => {
          this.data.name = value;
        }),
    );

    new Setting(contentEl).setName(t('settings.siteManagement.siteURL')).addText((text) =>
      text
        .setPlaceholder('https://halo.example.com')
        .setValue(this.data.url)
        .onChange((value) => {
          this.data.url = value;
        }),
    );

    new Setting(contentEl).setName(t('settings.siteManagement.apiToken')).addText((text) => {
      text
        .setPlaceholder('pat_xxxxxxxx')
        .setValue(this.data.token)
        .onChange((value) => {
          this.data.token = value;
        });
      text.inputEl.type = 'password';
    });

    new Setting(contentEl).setName(t('settings.siteManagement.defaultSite')).addToggle((toggle) =>
      toggle.setValue(this.data.isDefault).onChange((value) => {
        this.data.isDefault = value;
      }),
    );

    new Setting(contentEl)
      .addButton((btn) =>
        btn.setButtonText(t('modals.publish.cancel')).onClick(() => {
          this.close();
        }),
      )
      .addButton((btn) =>
        btn
          .setButtonText(t('settings.siteManagement.save'))
          .setCta()
          .onClick(() => {
            if (this.data.name && this.data.url && this.data.token) {
              this.onSubmit(this.data);
              this.close();
            } else {
              new Notice(t('notices.pleaseFillAllFields'));
            }
          }),
      );
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

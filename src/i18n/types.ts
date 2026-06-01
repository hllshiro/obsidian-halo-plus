export type Locale = 'en' | 'zh';

export interface TranslationStructure {
  settings: {
    title: string;
    siteManagement: {
      title: string;
      addSite: string;
      editSite: string;
      deleteSite: string;
    };
    publishBehavior: {
      title: string;
      publishByDefault: string;
      publishByDefaultDesc: string;
      skipPreview: string;
      skipPreviewDesc: string;
    };
    imageHandling: {
      title: string;
      defaultMode: string;
      defaultModeDesc: string;
      uploadToHalo: string;
      embedAsBase64: string;
      base64Quality: string;
      base64QualityDesc: string;
    };
    autoSync: {
      title: string;
      enableAutoSync: string;
      enableAutoSyncDesc: string;
      addFolder: string;
      addFolderDesc: string;
      remove: string;
    };
  };
  modals: {
    publish: {
      title: string;
      cancel: string;
      publish: string;
      publishing: string;
      articleInfo: string;
      titleLabel: string;
      tags: string;
      categories: string;
      site: string;
      contentPreview: string;
      imageHandling: string;
      targetSite: string;
      selectSite: string;
      selectSiteDesc: string;
      imageHandlingDesc: string;
      publishOptions: string;
      publishImmediately: string;
      publishImmediatelyDesc: string;
      failedToPublish: string;
      failedToRender: string;
      renderingContent: string;
    };
  };
  commands: {
    publishToHalo: string;
    deleteFromHalo: string;
    syncAll: string;
    openSettings: string;
  };
  menus: {
    publishToHalo: string;
    deleteFromHalo: string;
  };
  notices: {
    siteNotConfigured: string;
    connectionFailed: string;
    published: string;
    updated: string;
    deleted: string;
    syncCompleted: string;
    syncingAll: string;
    autoSyncNotEnabled: string;
    noteNotPublished: string;
    siteNotFound: string;
    pleaseFillAllFields: string;
    failedToDelete: string;
  };
  statusBar: {
    lastSync: string;
    syncing: string;
    error: string;
  };
}

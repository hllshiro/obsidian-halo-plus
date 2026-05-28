import { type App, TFile } from 'obsidian';

/**
 * 文件夹监听器
 * 监听配置文件夹中的文件修改事件
 */
export class FolderWatcher {
  private app: App;
  private watchedFolders: Set<string> = new Set();
  private onFileModified: (file: TFile) => void;
  private eventRef: unknown = null;

  constructor(app: App, onFileModified: (file: TFile) => void) {
    this.app = app;
    this.onFileModified = onFileModified;
  }

  /**
   * 开始监听文件夹
   */
  start(folders: string[]): void {
    this.stop();

    for (const folder of folders) {
      this.watchedFolders.add(folder);
    }

    // 注册 vault modify 事件
    this.eventRef = this.app.vault.on('modify', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        if (this.isInWatchedFolder(file)) {
          this.onFileModified(file);
        }
      }
    });
  }

  /**
   * 停止监听
   */
  stop(): void {
    if (this.eventRef !== null) {
      // @ts-ignore - Obsidian 内部 API
      this.app.vault.offref(this.eventRef);
      this.eventRef = null;
    }
    this.watchedFolders.clear();
  }

  /**
   * 添加监听文件夹
   */
  addFolder(folder: string): void {
    this.watchedFolders.add(folder);
  }

  /**
   * 移除监听文件夹
   */
  removeFolder(folder: string): void {
    this.watchedFolders.delete(folder);
  }

  /**
   * 获取监听的文件夹列表
   */
  getWatchedFolders(): string[] {
    return Array.from(this.watchedFolders);
  }

  /**
   * 检查文件是否在监听的文件夹中
   */
  private isInWatchedFolder(file: TFile): boolean {
    for (const folder of this.watchedFolders) {
      if (file.path.startsWith(folder)) {
        return true;
      }
    }
    return false;
  }
}

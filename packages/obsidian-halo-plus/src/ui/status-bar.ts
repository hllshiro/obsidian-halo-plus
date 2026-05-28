import type { App, StatusBar as ObsidianStatusBar, Plugin } from 'obsidian';

/**
 * 状态栏指示器
 */
export class StatusBar {
  private app: App;
  private plugin: Plugin;
  private statusBarEl: ObsidianStatusBar | null = null;
  private statusText = 'Halo Plus';
  private lastSyncTime: Date | null = null;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
  }

  /**
   * 初始化状态栏
   */
  onload(): void {
    this.statusBarEl = this.plugin.addStatusBarItem();
    this.updateDisplay();
  }

  /**
   * 更新显示
   */
  private updateDisplay(): void {
    if (!this.statusBarEl) {
      return;
    }

    let displayText = this.statusText;

    if (this.lastSyncTime) {
      const timeStr = this.lastSyncTime.toLocaleTimeString();
      displayText += ` | Last sync: ${timeStr}`;
    }

    this.statusBarEl.setText(displayText);
  }

  /**
   * 设置状态文本
   */
  setStatus(text: string): void {
    this.statusText = text;
    this.updateDisplay();
  }

  /**
   * 更新同步时间
   */
  updateSyncTime(): void {
    this.lastSyncTime = new Date();
    this.updateDisplay();
  }

  /**
   * 显示同步中状态
   */
  showSyncing(): void {
    this.setStatus('Halo Plus | Syncing...');
  }

  /**
   * 显示就绪状态
   */
  showReady(): void {
    this.setStatus('Halo Plus');
  }

  /**
   * 显示错误状态
   */
  showError(message: string): void {
    this.setStatus(`Halo Plus | Error: ${message}`);
  }

  /**
   * 清理
   */
  onunload(): void {
    if (this.statusBarEl) {
      this.statusBarEl.remove();
    }
  }
}

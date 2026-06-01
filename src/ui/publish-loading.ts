import { Component } from 'obsidian';

/**
 * 发布进度提示组件
 *
 * 显示在发布按钮下方，动态更新文本内容
 */
export class PublishLoading extends Component {
  private containerEl: HTMLElement;
  private textEl: HTMLElement;

  constructor(private readonly parentEl: HTMLElement) {
    super();
  }

  onload(): void {
    this.containerEl = this.parentEl.createEl('div', {
      cls: 'halo-plus-publish-loading',
    });
    this.textEl = this.containerEl.createEl('span', {
      cls: 'halo-plus-publish-loading-text',
    });
  }

  /**
   * 更新提示文本
   */
  updateText(text: string): void {
    this.textEl.textContent = text;
  }

  /**
   * 显示错误信息
   */
  showError(error: string): void {
    this.textEl.textContent = error;
    this.textEl.classList.add('halo-plus-publish-loading-error');
  }

  onunload(): void {
    this.containerEl.remove();
  }
}

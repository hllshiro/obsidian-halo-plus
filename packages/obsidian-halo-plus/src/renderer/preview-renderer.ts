import { type App, type Component, MarkdownRenderer, type TFile } from 'obsidian';

/**
 * 异步函数类型
 */
type AsyncFn = () => Promise<unknown>;

/**
 * 渲染结果
 */
export interface RenderResult {
  /** 渲染后的 DOM 元素（已挂载到 document.body） */
  containerEl: HTMLDivElement;
  /** 视图元素（包含渲染内容） */
  viewEl: HTMLDivElement;
  /** 清理函数 - 调用后移除 DOM 并卸载组件 */
  cleanup: () => void;
}

/**
 * 预览渲染器
 *
 * 参考 obsidian-better-export-pdf 的 renderMarkdownV2 实现：
 * 1. 在 document.body 中创建隐藏容器
 * 2. 使用 MarkdownRenderer.render() 渲染 Markdown
 * 3. 手动调用 MarkdownRenderer.postProcess() 触发插件后处理器
 * 4. 等待所有异步内容渲染完成
 */
export class PreviewRenderer {
  private readonly app: App;
  private readonly component: Component;

  constructor(app: App, component: Component) {
    this.app = app;
    this.component = component;
  }

  /**
   * 渲染 Markdown 文件为 HTML
   *
   * @param file 要渲染的文件
   * @returns 渲染结果，包含 DOM 元素和清理函数
   */
  async renderFile(file: TFile): Promise<RenderResult> {
    const startTime = Date.now();

    const data = await this.app.vault.cachedRead(file);
    if (!data) {
      throw new Error(`File content is empty: ${file.path}`);
    }

    // 创建渲染容器（参考 obsidian-better-export-pdf）
    const containerEl = document.body.createDiv({
      cls: 'halo-plus-render-container',
    });
    containerEl.style.setProperty('position', 'absolute');
    containerEl.style.setProperty('visibility', 'hidden');
    containerEl.style.setProperty('width', '1024px'); // 固定宽度确保渲染正确

    const viewEl = containerEl.createDiv({
      cls: 'markdown-preview-view markdown-rendered',
    });

    // 预处理 Markdown（添加块 ID 等）
    const markdown = this.preprocessMarkdown(data);

    // 执行渲染
    await this.renderHtml(markdown, file, viewEl);

    // 等待动态内容（Dataview、Tasks 等）
    await this.waitForDynamicContent(data, viewEl);

    console.log(`[PreviewRenderer] Render time: ${Date.now() - startTime}ms`);

    // 清理函数
    const cleanup = () => {
      containerEl.detach();
      containerEl.remove();
    };

    return { containerEl, viewEl, cleanup };
  }

  /**
   * 预处理 Markdown
   * 处理块 ID 引用等
   */
  private preprocessMarkdown(data: string): string {
    // 简单实现 - 直接返回原始内容
    // 如果需要处理块 ID，可以参考 obsidian-better-export-pdf 的 modifyMarkdown
    return data;
  }

  /**
   * 执行 Markdown → HTML 渲染
   *
   * 两阶段渲染：
   * 1. MarkdownRenderer.render() - 转换 Markdown 为 HTML
   * 2. MarkdownRenderer.postProcess() - 触发插件后处理器（Dataview、Tasks 等）
   */
  private async renderHtml(markdown: string, file: TFile, viewEl: HTMLDivElement): Promise<void> {
    // 第一阶段：渲染 Markdown 到 fragment
    // 使用 fragment 技巧跳过自动 postProcess
    const fragment = {
      children: undefined as NodeListOf<ChildNode> | undefined,
      appendChild(e: DocumentFragment) {
        this.children = e?.childNodes;
        throw new Error('capture'); // 阻止自动 postProcess
      },
    } as unknown as HTMLElement;

    try {
      await MarkdownRenderer.render(this.app, markdown, fragment, file.path, this.component);
    } catch {
      // 捕获我们故意抛出的错误
    }

    // 将捕获的节点移动到目标容器
    if (fragment.children) {
      const el = document.createDocumentFragment();
      for (const node of Array.from(fragment.children)) {
        el.appendChild(node.cloneNode(true));
      }
      viewEl.appendChild(el);
    }

    // 第二阶段：手动执行 postProcess
    const promises: AsyncFn[] = [];

    // @ts-ignore - Obsidian 内部 API
    await MarkdownRenderer.postProcess(this.app, {
      docId: this.generateDocId(16),
      sourcePath: file.path,
      frontmatter: {},
      promises,
      addChild: (childComp: Component) => this.component.addChild(childComp),
      getSectionInfo: () => null,
      containerEl: viewEl,
      el: viewEl,
      displayMode: true,
    });

    // 等待所有异步后处理器完成
    await Promise.all(promises);
  }

  /**
   * 等待动态内容渲染完成
   */
  private async waitForDynamicContent(content: string, containerEl: HTMLElement): Promise<void> {
    // 检测是否包含需要额外等待的内容
    const hasDynamicContent =
      content.includes('```dataview') ||
      content.includes('```dataviewjs') ||
      content.includes('```tasks') ||
      content.includes('![[') ||
      content.includes('```gEvent') ||
      content.includes('```mermaid');

    if (hasDynamicContent) {
      await this.sleep(2000);
    }

    // 等待 DOM 稳定
    try {
      await this.waitForDomStable(containerEl, 3000, 300);
    } catch {
      await this.sleep(500);
    }
  }

  /**
   * 等待 DOM 稳定（无新变化）
   */
  private waitForDomStable(
    containerEl: HTMLElement,
    timeout = 3000,
    settlingTime = 300,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;

      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          observer.disconnect();
          resolve();
        }, settlingTime);
      });

      observer.observe(containerEl, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      timer = setTimeout(() => {
        observer.disconnect();
        resolve();
      }, settlingTime);

      setTimeout(() => {
        observer.disconnect();
        clearTimeout(timer);
        reject(new Error(`waitForDomStable timeout ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * 生成随机 ID
   */
  private generateDocId(length: number): string {
    return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  /**
   * 延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

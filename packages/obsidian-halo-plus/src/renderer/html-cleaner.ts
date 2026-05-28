/**
 * HTML 清理器
 * 移除 Obsidian 私有属性，保留标准 HTML
 */
export class HTMLCleaner {
  /**
   * 清理 HTML 内容
   *
   * @param rawHTML 原始 HTML
   * @returns 清理后的 HTML
   */
  static clean(rawHTML: string): string {
    // 使用 DOMParser 解析 HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHTML, 'text/html');

    // 移除 frontmatter 代码块
    this.removeFrontmatter(doc);

    // 移除 Obsidian data 属性
    this.removeDataAttributes(doc);

    // 移除折叠状态属性
    this.removeCollapseAttributes(doc);

    // 移除编辑器相关属性
    this.removeEditorAttributes(doc);

    // 移除内部链接样式
    this.removeInternalLinkStyles(doc);

    return doc.body.innerHTML;
  }

  /**
   * 移除 frontmatter 代码块
   *
   * Obsidian 渲染后，frontmatter 会显示为 YAML 代码块。
   * 这些属性已自动映射到 Halo API 参数，不需要包含在正文中。
   */
  private static removeFrontmatter(doc: Document): void {
    // 移除 Obsidian 渲染的 frontmatter 容器
    const frontmatterElements = doc.querySelectorAll(
      '.frontmatter, .frontmatter-container, [data-type="frontmatter"]'
    );
    frontmatterElements.forEach((el) => el.remove());

    // 移除 YAML 代码块（某些主题可能渲染为代码块）
    const codeBlocks = doc.querySelectorAll('pre > code.language-yaml, pre > code.language-frontmatter');
    codeBlocks.forEach((code) => {
      const pre = code.parentElement;
      pre?.remove();
    });
  }

  /**
   * 移除 data-* 属性
   */
  private static removeDataAttributes(doc: Document): void {
    const elements = doc.querySelectorAll('*');
    elements.forEach((el) => {
      const attrs = Array.from(el.attributes);
      attrs.forEach((attr) => {
        if (attr.name.startsWith('data-')) {
          el.removeAttribute(attr.name);
        }
      });
    });
  }

  /**
   * 移除折叠状态属性
   */
  private static removeCollapseAttributes(doc: Document): void {
    const elements = doc.querySelectorAll('[data-collapsed]');
    elements.forEach((el) => {
      el.removeAttribute('data-collapsed');
    });
  }

  /**
   * 移除编辑器相关属性
   */
  private static removeEditorAttributes(doc: Document): void {
    const elements = doc.querySelectorAll('[data-type], [data-line], [data-heading]');
    elements.forEach((el) => {
      el.removeAttribute('data-type');
      el.removeAttribute('data-line');
      el.removeAttribute('data-heading');
    });
  }

  /**
   * 移除内部链接样式
   */
  private static removeInternalLinkStyles(doc: Document): void {
    const elements = doc.querySelectorAll('.internal-link, .external-link');
    elements.forEach((el) => {
      el.classList.remove('internal-link', 'external-link');
    });
  }
}

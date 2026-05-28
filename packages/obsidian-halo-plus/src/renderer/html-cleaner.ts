/**
 * HTML 清理器
 * 移除 Obsidian 私有属性，保留标准 HTML
 */

/**
 * 清理 HTML 内容
 *
 * @param rawHTML 原始 HTML
 * @returns 清理后的 HTML
 */
export function cleanHTML(rawHTML: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHTML, 'text/html');

  removeFrontmatter(doc);
  removeDataAttributes(doc);
  removeCollapseAttributes(doc);
  removeEditorAttributes(doc);
  removeInternalLinkStyles(doc);

  return doc.body.innerHTML;
}

/**
 * 移除 frontmatter 代码块
 */
function removeFrontmatter(doc: Document): void {
  const frontmatterElements = doc.querySelectorAll(
    '.frontmatter, .frontmatter-container, [data-type="frontmatter"]',
  );
  for (const el of frontmatterElements) {
    el.remove();
  }

  const codeBlocks = doc.querySelectorAll(
    'pre > code.language-yaml, pre > code.language-frontmatter',
  );
  for (const code of codeBlocks) {
    const pre = code.parentElement;
    pre?.remove();
  }
}

/**
 * 移除 data-* 属性
 */
function removeDataAttributes(doc: Document): void {
  const elements = doc.querySelectorAll('*');
  for (const el of elements) {
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (attr.name.startsWith('data-')) {
        el.removeAttribute(attr.name);
      }
    }
  }
}

/**
 * 移除折叠状态属性
 */
function removeCollapseAttributes(doc: Document): void {
  const elements = doc.querySelectorAll('[data-collapsed]');
  for (const el of elements) {
    el.removeAttribute('data-collapsed');
  }
}

/**
 * 移除编辑器相关属性
 */
function removeEditorAttributes(doc: Document): void {
  const elements = doc.querySelectorAll('[data-type], [data-line], [data-heading]');
  for (const el of elements) {
    el.removeAttribute('data-type');
    el.removeAttribute('data-line');
    el.removeAttribute('data-heading');
  }
}

/**
 * 移除内部链接样式
 */
function removeInternalLinkStyles(doc: Document): void {
  const elements = doc.querySelectorAll('.internal-link, .external-link');
  for (const el of elements) {
    el.classList.remove('internal-link', 'external-link');
  }
}

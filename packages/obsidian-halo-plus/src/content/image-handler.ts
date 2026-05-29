import { type App, TFile } from 'obsidian';

/**
 * 图片处理器
 * 处理 Obsidian 笔记中的图片
 */
export class ImageHandler {
  constructor(private readonly app: App) {}

  /**
   * 处理 HTML 中的图片
   *
   * @param html 原始 HTML
   * @param currentFile 当前文件
   * @param mode 处理模式：upload 或 base64
   * @param quality Base64 压缩质量（0-100）
   * @returns 处理后的 HTML
   */
  async processImages(
    html: string,
    currentFile: TFile,
    mode: 'upload' | 'base64' = 'upload',
    quality = 80,
  ): Promise<string> {
    // 解析 HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');

    for (const img of Array.from(images)) {
      const src = img.getAttribute('src');
      if (!src) continue;

      try {
        // 解析图片路径
        const localPath = await this.resolveImagePath(src, currentFile);
        if (!localPath) continue;

        // 读取图片文件
        const imageBuffer = await this.app.vault.adapter.readBinary(localPath);
        const mimeType = this.getMimeType(localPath);

        if (mode === 'upload') {
          // TODO: 上传到 Halo（需要 AttachmentService）
          // 暂时使用 Base64
          const base64 = await this.imageToBase64(imageBuffer, mimeType, quality);
          img.setAttribute('src', `data:${mimeType};base64,${base64}`);
        } else {
          // Base64 内嵌
          const base64 = await this.imageToBase64(imageBuffer, mimeType, quality);
          img.setAttribute('src', `data:${mimeType};base64,${base64}`);
        }
      } catch (error) {
        console.error(`Failed to process image: ${src}`, error);
      }
    }

    return doc.body.innerHTML;
  }

  /**
   * 解析图片路径
   */
  private async resolveImagePath(imgSrc: string, currentFile: TFile): Promise<string | null> {
    // 网络 URL - 跳过
    if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
      return null;
    }

    // Obsidian app:// 协议路径
    if (imgSrc.startsWith('app://')) {
      // 尝试从 app:// 路径提取真实路径
      const match = imgSrc.match(/app:\/\/[^/]+\/(.+)/);
      if (match) {
        return match[1];
      }
      return null;
    }

    // 标准相对路径
    const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(imgSrc, currentFile.path);
    if (resolvedFile instanceof TFile) {
      return resolvedFile.path;
    }

    // 以 / 开头的绝对路径
    if (imgSrc.startsWith('/')) {
      const file = this.app.vault.getAbstractFileByPath(imgSrc);
      if (file instanceof TFile) {
        return file.path;
      }
    }

    return null;
  }

  /**
   * 获取 MIME 类型
   */
  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
    };
    return mimeMap[ext] || 'image/png';
  }

  /**
   * 图片转 Base64
   */
  private async imageToBase64(
    buffer: ArrayBuffer,
    mimeType: string,
    _quality: number,
  ): Promise<string> {
    // 在浏览器环境中，使用 FileReader
    if (typeof FileReader !== 'undefined') {
      return new Promise((resolve, reject) => {
        const blob = new Blob([buffer], { type: mimeType });
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // 移除 data:image/xxx;base64, 前缀
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    // 使用纯浏览器 API 转换 ArrayBuffer 为 base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }
}

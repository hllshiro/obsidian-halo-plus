import { AttachmentService, type HaloClient } from '@obsidian-halo-plus/halo-sdk';
import { type App, TFile } from 'obsidian';
import type { PublishLoading } from '../ui/publish-loading';

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
   * @param client Halo 客户端（upload 模式需要）
   * @param mode 处理模式：upload 或 base64
   * @param quality Base64 压缩质量（0-100）
   * @param loading 进度提示组件
   * @returns 处理后的 HTML
   */
  async processImages(
    html: string,
    currentFile: TFile,
    client?: HaloClient,
    mode: 'upload' | 'base64' = 'upload',
    quality = 80,
    loading?: PublishLoading,
  ): Promise<string> {
    // 解析 HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');

    // 筛选本地图片
    const localImages = Array.from(images).filter((img) => {
      const src = img.getAttribute('src');
      if (!src) return false;
      // 跳过网络图片
      if (src.startsWith('http://') || src.startsWith('https://')) {
        return false;
      }
      return true;
    });

    // Loading: 发现本地图片
    if (localImages.length > 0 && loading) {
      loading.updateText(`发现 ${localImages.length} 张本地图片`);
      console.log(`[ImageHandler] Found ${localImages.length} local images`);
    }

    const errors: Array<{ src: string; error: unknown }> = [];
    let uploadedCount = 0;
    for (const img of localImages) {
      const src = img.getAttribute('src');
      if (!src) continue;

      try {
        // 解析图片路径
        const localPath = await this.resolveImagePath(src, currentFile);
        if (!localPath) continue;

        // 读取图片文件
        const imageBuffer = await this.app.vault.adapter.readBinary(localPath);
        const mimeType = this.getMimeType(localPath);

        if (mode === 'upload' && client) {
          // Loading: 正在上传附件
          if (loading) {
            loading.updateText(`正在上传附件 (${uploadedCount + 1}/${localImages.length})`);
          }

          // 上传到 Halo
          const blob = new Blob([imageBuffer], { type: mimeType });
          const fileName = localPath.split('/').pop() || 'image.png';
          const attachmentService = new AttachmentService(client);
          const result = await attachmentService.upload({
            file: blob,
            filename: fileName,
            mimeType: mimeType,
          });

          // 替换为 permalink
          img.setAttribute('src', result.permalink);
          uploadedCount++;

          console.log(`[ImageHandler] Uploaded: ${fileName} -> ${result.permalink}`);
        } else {
          // Base64 内嵌
          const base64 = await this.imageToBase64(imageBuffer, mimeType, quality);
          img.setAttribute('src', `data:${mimeType};base64,${base64}`);
        }
      } catch (error) {
        console.error(`[ImageHandler] Failed to process image: ${src}`, error);
        errors.push({ src, error });
      }
    }

    // 如果有图片上传失败，抛出错误
    if (errors.length > 0) {
      const errorMessages = errors
        .map((e) => `${e.src}: ${e.error instanceof Error ? e.error.message : 'Unknown error'}`)
        .join('\n');
      throw new Error(`Failed to upload ${errors.length} image(s):\n${errorMessages}`);
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
      return this.getAbsolutePathFromObsidianSrc(imgSrc);
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
   * 从 Obsidian app:// 协议路径解析绝对路径
   *
   * app:// 协议格式: app://<vault-id>/<path>
   * 例如: app://68eceeb027539fc12f280ea51829b8c7957a/D:/Data/Notes/hllcloud.cn/Pasted%20image.png?1779936055537
   *
   * @returns vault 内的绝对路径
   */
  private getAbsolutePathFromObsidianSrc(src: string): string | null {
    try {
      const url = new URL(src);
      // decode URI，并去掉 pathname 前面的 /
      return decodeURIComponent(url.pathname).replace(/^\/+/, '');
    } catch (error) {
      console.error(`[ImageHandler] Failed to parse app:// path: ${src}`, error);
      return null;
    }
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

import { type App, TFile } from 'obsidian';
import type { HaloClient } from '../halo-client';
import type { HaloAttachment } from '../types';
import type { PublishLoading } from '../ui/publish-loading';
import type { ImageCacheEntry } from './frontmatter-parser';

/**
 * 图片处理结果
 */
export interface ImageProcessResult {
  /** 处理后的 HTML */
  html: string;
  /** 更新后的图片缓存 */
  imageCache: ImageCacheEntry[];
}

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
   * @param existingImageCache 已有的图片缓存
   * @returns 处理结果，包含处理后的 HTML 和更新后的图片缓存
   */
  async processImages(
    html: string,
    currentFile: TFile,
    client?: HaloClient,
    mode: 'upload' | 'base64' = 'upload',
    quality = 80,
    loading?: PublishLoading,
    existingImageCache?: ImageCacheEntry[],
  ): Promise<ImageProcessResult> {
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
    let skippedCount = 0;

    // 去重：记录已上传的文件路径和对应的 permalink
    const uploadedMap = new Map<string, string>();
    // 记录每个 <img> 元素对应的本地路径
    const imgPathMap = new Map<Element, string>();
    // 构建新的图片缓存
    const newImageCache: ImageCacheEntry[] = [];
    // 用于跟踪已处理的本地路径，避免重复添加到缓存
    const processedPaths = new Set<string>();

    // 构建现有缓存的索引（localPath -> cache entry）
    const cacheIndex = new Map<string, ImageCacheEntry>();
    if (existingImageCache) {
      for (const entry of existingImageCache) {
        cacheIndex.set(entry.localPath, entry);
      }
    }

    // 如果是上传模式，验证现有缓存中的附件是否仍然存在
    const validCacheEntries = new Map<string, ImageCacheEntry>();
    if (mode === 'upload' && client && existingImageCache && existingImageCache.length > 0) {
      console.log(`[ImageHandler] Validating ${existingImageCache.length} cached images...`);
      for (const entry of existingImageCache) {
        try {
          console.log(`[ImageHandler] Validating attachment: ${entry.attachmentName}`);
          await client.coreApi.storage.attachment.getAttachment({
            name: entry.attachmentName,
          });
          validCacheEntries.set(entry.localPath, entry);
          console.log(`[ImageHandler] Cache validated: ${entry.localPath} -> ${entry.permalink}`);
        } catch (error) {
          console.log(
            `[ImageHandler] Cache invalid (attachment deleted or not accessible): ${entry.localPath}`,
            error,
          );
        }
      }
      console.log(
        `[ImageHandler] Validation complete: ${validCacheEntries.size}/${existingImageCache.length} valid`,
      );
    }

    // 阶段一：解析所有图片路径，上传唯一文件
    for (const img of localImages) {
      const src = img.getAttribute('src');
      if (!src) continue;

      try {
        const localPath = await this.resolveImagePath(src, currentFile);
        if (!localPath) continue;

        imgPathMap.set(img, localPath);

        // 已在本次处理中上传过，跳过
        if (uploadedMap.has(localPath)) {
          console.log(`[ImageHandler] Already processed in this session: ${localPath}`);
          continue;
        }

        // 检查缓存中是否有有效的图片记录
        const cachedEntry = validCacheEntries.get(localPath);
        if (cachedEntry) {
          // 使用缓存的 permalink，跳过上传
          uploadedMap.set(localPath, cachedEntry.permalink);
          skippedCount++;

          // 添加到新缓存
          if (!processedPaths.has(localPath)) {
            newImageCache.push(cachedEntry);
            processedPaths.add(localPath);
          }

          console.log(`[ImageHandler] Skipped (cached): ${localPath} -> ${cachedEntry.permalink}`);
          continue;
        }

        console.log(`[ImageHandler] No valid cache found for: ${localPath}, will upload`);

        // 读取图片文件
        const imageBuffer = await this.app.vault.adapter.readBinary(localPath);
        const mimeType = this.getMimeType(localPath);

        if (mode === 'upload' && client) {
          if (loading) {
            loading.updateText(`正在上传附件 (${uploadedCount + 1}/${localImages.length})`);
          }

          const blob = new Blob([imageBuffer], { type: mimeType });
          const fileName = localPath.split('/').pop() || 'image.png';
          console.log(`[ImageHandler] Uploading: ${fileName}`);

          const formData = new FormData();
          formData.append('file', blob, fileName);
          const uploadResponse = await client.httpClient.post(
            '/apis/console.api.storage.halo.run/v1alpha1/attachments/-/upload',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
          );
          const result = uploadResponse.data as HaloAttachment;

          const permalink = result.status?.permalink;
          const attachmentName = result.metadata?.name;
          uploadedMap.set(localPath, permalink);
          uploadedCount++;

          // 添加到新缓存
          if (!processedPaths.has(localPath)) {
            newImageCache.push({
              localPath,
              permalink,
              attachmentName,
            });
            processedPaths.add(localPath);
          }

          console.log(`[ImageHandler] Uploaded: ${fileName} -> ${permalink}`);
        } else {
          const base64 = await this.imageToBase64(imageBuffer, mimeType, quality);
          uploadedMap.set(localPath, `data:${mimeType};base64,${base64}`);
        }
      } catch (error) {
        console.error(`[ImageHandler] Failed to process image: ${src}`, error);
        errors.push({ src, error });
      }
    }

    // 阶段二：统一替换所有 <img> 的 src（同文件的所有引用都会被替换）
    for (const [img, localPath] of imgPathMap) {
      const permalink = uploadedMap.get(localPath);
      if (permalink) {
        img.setAttribute('src', permalink);
      }
    }

    // 记录处理统计
    if (skippedCount > 0) {
      console.log(`[ImageHandler] Skipped ${skippedCount} cached images`);
    }

    // 如果有图片上传失败，抛出错误
    if (errors.length > 0) {
      const errorMessages = errors
        .map((e) => `${e.src}: ${e.error instanceof Error ? e.error.message : 'Unknown error'}`)
        .join('\n');
      throw new Error(`Failed to upload ${errors.length} image(s):\n${errorMessages}`);
    }

    return {
      html: doc.body.innerHTML,
      imageCache: newImageCache,
    };
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
   * 从 Obsidian app:// 协议路径解析 vault 内的相对路径
   *
   * app:// 协议格式: app://<vault-id>/<path>
   * 例如: app://68eceeb027539fc12f280ea51829b8c7957a/D:/Data/Notes/hllcloud.cn/Pasted%20image.png?1779936055537
   *
   * @returns vault 内的相对路径
   */
  private getAbsolutePathFromObsidianSrc(src: string): string | null {
    try {
      const url = new URL(src);
      // decode URI，并去掉 pathname 前面的 /
      const absolutePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');

      // 获取 vault 根目录
      const vaultBasePath = this.app.vault.adapter.basePath;
      if (!vaultBasePath) {
        return absolutePath;
      }

      // 将 vault 根目录标准化为正斜杠格式
      const normalizedBasePath = vaultBasePath.replace(/\\/g, '/');

      // 如果绝对路径以 vault 根目录开头，提取相对路径
      if (absolutePath.startsWith(normalizedBasePath)) {
        const relativePath = absolutePath.substring(normalizedBasePath.length);
        // 去掉开头的斜杠
        return relativePath.replace(/^\/+/, '');
      }

      // 如果不以 vault 根目录开头，返回原始绝对路径
      return absolutePath;
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

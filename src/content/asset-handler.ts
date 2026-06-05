import { type App, type Notice, TFile } from 'obsidian';
import type { HaloClient } from '../halo-client';
import type { PluginSettings } from '../main';
import type { HaloAttachment } from '../types';
import { Logger } from '../utils/logger';

// 资源类型枚举
export type AssetType = 'image' | 'attachment';

// 资源处理结果
export interface AssetProcessResult {
  html: string;
  assetCache: AssetCacheEntry[];
}

// 资源缓存条目
export interface AssetCacheEntry {
  localPath: string;
  permalink: string;
  attachmentName: string;
  assetType: AssetType;
}

// 资源处理器
export class AssetHandler {
  private logger: Logger;

  constructor(
    private readonly app: App,
    private readonly settings: PluginSettings,
  ) {
    this.logger = Logger.getInstance();
  }

  // 主处理方法
  async processAssets(
    html: string,
    currentFile: TFile,
    client?: HaloClient,
    mode: 'upload' | 'base64' = 'upload',
    quality = 80,
    notice?: Notice,
    existingAssetCache?: AssetCacheEntry[],
  ): Promise<AssetProcessResult> {
    const localFiles = await this.extractLocalFiles(html, currentFile);

    this.logger.verbose('Extracted local files:', {
      count: localFiles.length,
      files: localFiles.map((f) => ({
        path: f.path,
        originalSrc: f.originalSrc,
        type: f.type,
      })),
    });

    const images = localFiles.filter((f) => this.isImage(f.path));
    const attachments = localFiles.filter((f) => !this.isImage(f.path));

    const validFiles: typeof localFiles = [];
    for (const file of [...images, ...attachments]) {
      const fileStat = await this.app.vault.adapter.stat(file.path);
      if (fileStat && this.checkFileSize(file.path, fileStat.size)) {
        validFiles.push(file);
      } else {
        this.logger.warn(`File size exceeds limit or not found: ${file.path}`, {
          fileStat,
          maxSizeMB: this.settings.attachmentHandling.maxSizeMB,
        });
      }
    }

    this.logger.verbose('Valid files:', {
      count: validFiles.length,
      files: validFiles.map((f) => ({
        path: f.path,
        originalSrc: f.originalSrc,
        type: f.type,
      })),
    });

    // 5. 上传或嵌入（图片支持base64，附件仅支持上传）
    const uploadedMap = new Map<string, string>();
    const newAssetCache: AssetCacheEntry[] = [];
    const processedPaths = new Set<string>();

    // 构建现有缓存的索引
    const cacheIndex = new Map<string, AssetCacheEntry>();
    if (existingAssetCache) {
      for (const entry of existingAssetCache) {
        cacheIndex.set(entry.localPath, entry);
      }
    }

    // 验证现有缓存中的附件是否仍然存在
    const validCacheEntries = new Map<string, AssetCacheEntry>();
    if (mode === 'upload' && client && existingAssetCache && existingAssetCache.length > 0) {
      for (const entry of existingAssetCache) {
        try {
          await client.coreApi.storage.attachment.getAttachment({
            name: entry.attachmentName,
          });
          validCacheEntries.set(entry.localPath, entry);
        } catch (error) {
          this.logger.verbose(`Cache invalid: ${entry.localPath}`, error);
        }
      }
    }

    // 处理所有有效文件
    for (const file of validFiles) {
      try {
        // 检查缓存
        const cachedEntry = validCacheEntries.get(file.path);
        if (cachedEntry) {
          uploadedMap.set(file.path, cachedEntry.permalink);
          if (!processedPaths.has(file.path)) {
            newAssetCache.push(cachedEntry);
            processedPaths.add(file.path);
          }
          continue;
        }

        // 读取文件
        const fileBuffer = await this.app.vault.adapter.readBinary(file.path);
        const mimeType = this.getMimeType(file.path);
        const isImageFile = this.isImage(file.path);

        if (mode === 'upload' && client) {
          // 上传到Halo
          if (notice) {
            notice.setMessage(`正在上传附件 (${uploadedMap.size + 1}/${validFiles.length})`);
          }

          const blob = new Blob([fileBuffer], { type: mimeType });
          const fileName = file.path.split('/').pop() || 'file';

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
          uploadedMap.set(file.path, permalink);

          if (!processedPaths.has(file.path)) {
            newAssetCache.push({
              localPath: file.path,
              permalink,
              attachmentName,
              assetType: isImageFile ? 'image' : 'attachment',
            });
            processedPaths.add(file.path);
          }
        } else if (isImageFile) {
          // 图片Base64嵌入
          const base64 = await this.imageToBase64(fileBuffer, mimeType, quality);
          uploadedMap.set(file.path, `data:${mimeType};base64,${base64}`);
        } else {
          // 非图片附件不支持Base64
          this.logger.warn(`Non-image attachments don't support Base64: ${file.path}`);
        }
      } catch (error) {
        this.logger.error(`Failed to process file: ${file.path}`, error);
      }
    }

    // 6. 替换HTML中的引用
    const doc = new DOMParser().parseFromString(html, 'text/html');

    for (const file of validFiles) {
      const permalink = uploadedMap.get(file.path);
      if (!permalink) continue;

      if (file.type === 'embed') {
        // 处理文件嵌入：找到 file-embed-title 中的文件名文本，用 <a> 包裹
        const embedTitles = doc.querySelectorAll('div.file-embed-title');
        for (const titleDiv of Array.from(embedTitles)) {
          // 文件名是 div 中的文本节点（在 icon span 之后）
          const textNodes = Array.from(titleDiv.childNodes).filter(
            (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
          );
          for (const textNode of textNodes) {
            const fileName = textNode.textContent?.trim();
            if (fileName === file.originalSrc) {
              const link = doc.createElement('a');
              link.setAttribute('href', permalink);
              link.setAttribute('target', '_blank');
              link.setAttribute('download', fileName);
              link.textContent = fileName;
              textNode.replaceWith(link);

              // 删除对应的空 span.internal-embed.file-embed
              const emptySpan = doc.querySelector(
                `span.internal-embed.file-embed[src="${file.originalSrc}"]`,
              );
              if (emptySpan) emptySpan.remove();

              this.logger.verbose('Replaced embed (title link):', {
                fileName,
                permalink,
              });
            }
          }
        }
      } else {
        // 处理 img/video/source/a 类型
        const elements = doc.querySelectorAll(
          `[src="${file.originalSrc}"], [href="${file.originalSrc}"]`,
        );
        for (const element of Array.from(elements)) {
          if (
            element.tagName === 'IMG' ||
            element.tagName === 'VIDEO' ||
            element.tagName === 'SOURCE'
          ) {
            element.setAttribute('src', permalink);
          } else if (element.tagName === 'A') {
            element.setAttribute('href', permalink);
          }
        }
      }
    }

    return {
      html: doc.body.innerHTML,
      assetCache: newAssetCache,
    };
  }

  private async extractLocalFiles(
    html: string,
    currentFile: TFile,
  ): Promise<
    Array<{
      path: string;
      originalSrc: string;
      element: Element;
      type: 'img' | 'video' | 'a' | 'source' | 'embed';
    }>
  > {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const localFiles: Array<{
      path: string;
      originalSrc: string;
      element: Element;
      type: 'img' | 'video' | 'a' | 'source' | 'embed';
    }> = [];

    const images = doc.querySelectorAll('img');
    for (const img of Array.from(images)) {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('http://') && !src.startsWith('https://')) {
        const resolvedPath = await this.resolveFilePath(src, currentFile);
        if (resolvedPath) {
          localFiles.push({ path: resolvedPath, originalSrc: src, element: img, type: 'img' });
        }
      }
    }

    const videos = doc.querySelectorAll('video');
    for (const video of Array.from(videos)) {
      const src = video.getAttribute('src');
      if (src && !src.startsWith('http://') && !src.startsWith('https://')) {
        const resolvedPath = await this.resolveFilePath(src, currentFile);
        if (resolvedPath) {
          localFiles.push({ path: resolvedPath, originalSrc: src, element: video, type: 'video' });
        }
      }
      const sources = video.querySelectorAll('source');
      for (const source of Array.from(sources)) {
        const sourceSrc = source.getAttribute('src');
        if (sourceSrc && !sourceSrc.startsWith('http://') && !sourceSrc.startsWith('https://')) {
          const resolvedPath = await this.resolveFilePath(sourceSrc, currentFile);
          if (resolvedPath) {
            localFiles.push({
              path: resolvedPath,
              originalSrc: sourceSrc,
              element: source,
              type: 'source',
            });
          }
        }
      }
    }

    const links = doc.querySelectorAll('a');
    for (const link of Array.from(links)) {
      const href = link.getAttribute('href');
      if (
        href &&
        !href.startsWith('http://') &&
        !href.startsWith('https://') &&
        !href.startsWith('#')
      ) {
        const resolvedPath = await this.resolveFilePath(href, currentFile);
        if (resolvedPath) {
          localFiles.push({ path: resolvedPath, originalSrc: href, element: link, type: 'a' });
        }
      }
    }

    // 处理 Obsidian 的文件嵌入（span/div 内部嵌入）
    const embeds = doc.querySelectorAll('.internal-embed.file-embed[src], .file-embed[src]');
    for (const embed of Array.from(embeds)) {
      const src = embed.getAttribute('src');
      if (src && !src.startsWith('http://') && !src.startsWith('https://')) {
        const resolvedPath = await this.resolveFilePath(src, currentFile);
        if (resolvedPath) {
          localFiles.push({ path: resolvedPath, originalSrc: src, element: embed, type: 'embed' });
        }
      }
    }

    return localFiles;
  }

  private async resolveFilePath(src: string, currentFile: TFile): Promise<string | null> {
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return null;
    }

    if (src.startsWith('app://')) {
      return this.getAbsolutePathFromObsidianSrc(src);
    }

    const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(src, currentFile.path);
    if (resolvedFile instanceof TFile) {
      return resolvedFile.path;
    }

    if (src.startsWith('/')) {
      const file = this.app.vault.getAbstractFileByPath(src);
      if (file instanceof TFile) {
        return file.path;
      }
    }

    return null;
  }

  // 判断资源类型
  private isImage(filePath: string): boolean {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    return this.settings.imageHandling.imageExtensions.includes(ext);
  }

  // 获取MIME类型
  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      // 图片类型
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      // 文档类型
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // 压缩包类型
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      tar: 'application/x-tar',
      gz: 'application/gzip',
      // 视频类型
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      wmv: 'video/x-ms-wmv',
      flv: 'video/x-flv',
      webm: 'video/webm',
      // 音频类型
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      aac: 'audio/aac',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  // 检查文件大小
  private checkFileSize(_filePath: string, size: number): boolean {
    const maxSizeMB = this.settings.attachmentHandling.maxSizeMB;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return size <= maxSizeBytes;
  }

  /**
   * 从 Obsidian app:// 协议路径解析 vault 内的相对路径
   */
  private getAbsolutePathFromObsidianSrc(src: string): string | null {
    try {
      const url = new URL(src);
      const absolutePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const vaultBasePath = this.app.vault.adapter.basePath;
      if (!vaultBasePath) {
        return absolutePath;
      }
      const normalizedBasePath = vaultBasePath.replace(/\\/g, '/');
      if (absolutePath.startsWith(normalizedBasePath)) {
        const relativePath = absolutePath.substring(normalizedBasePath.length);
        return relativePath.replace(/^\/+/, '');
      }
      return absolutePath;
    } catch (error) {
      this.logger.error(`Failed to parse app:// path: ${src}`, error);
      return null;
    }
  }

  /**
   * 图片转 Base64
   */
  private async imageToBase64(
    buffer: ArrayBuffer,
    mimeType: string,
    _quality: number,
  ): Promise<string> {
    if (typeof FileReader !== 'undefined') {
      return new Promise((resolve, reject) => {
        const blob = new Blob([buffer], { type: mimeType });
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }
}

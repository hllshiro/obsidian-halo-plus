import type { App, Notice, TFile } from 'obsidian';
import type { HaloClient } from '../halo-client';
import type { PluginSettings } from '../main';
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
    _currentFile: TFile,
    _client?: HaloClient,
    _mode: 'upload' | 'base64' = 'upload',
    _quality = 80,
    _notice?: Notice,
    _existingAssetCache?: AssetCacheEntry[],
  ): Promise<AssetProcessResult> {
    // 实现细节将在后续任务中添加
    return {
      html: html,
      assetCache: [],
    };
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

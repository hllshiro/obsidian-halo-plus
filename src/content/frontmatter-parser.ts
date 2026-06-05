import matter from 'gray-matter';
import { Logger } from '../utils/logger';

/**
 * 已上传图片缓存信息
 */
export interface ImageCacheEntry {
  /** 本地图片路径（相对于 vault） */
  localPath: string;
  /** Halo 附件 permalink */
  permalink: string;
  /** Halo 附件名称（用于验证附件是否存在） */
  attachmentName: string;
}

/**
 * 资源缓存条目
 */
export interface AssetCacheEntry {
  localPath: string;
  permalink: string;
  attachmentName: string;
  assetType: 'image' | 'attachment';
}

/**
 * FrontMatter 数据接口
 */
export interface FrontMatterData {
  title?: string;
  slug?: string;
  tags?: string[];
  categories?: string[];
  cover?: string;
  excerpt?: string;
  date?: string;
  halo?: {
    site: string;
    name: string;
    publish: boolean;
    images?: ImageCacheEntry[]; // 保留旧字段以支持向后兼容
    assets?: AssetCacheEntry[]; // 新增字段
  };
  [key: string]: unknown;
}

/**
 * 解析 FrontMatter
 *
 * @param content 包含 FrontMatter 的 markdown 内容
 * @returns 解析后的 FrontMatter 数据
 */
export function parseFrontMatter(content: string): FrontMatterData {
  try {
    const { data } = matter(content);
    return data as FrontMatterData;
  } catch (error) {
    Logger.getInstance().error('Failed to parse frontmatter:', error);
    return {};
  }
}

/**
 * 将 FrontMatter 数据转换为 markdown 内容
 *
 * @param content 原始 markdown 内容
 * @param frontmatter FrontMatter 数据
 * @returns 更新后的 markdown 内容
 */
export function stringifyFrontMatter(content: string, frontmatter: FrontMatterData): string {
  const cleaned = cleanFrontMatter(frontmatter);
  return matter.stringify(content, cleaned);
}

/**
 * 清理 FrontMatter 数据
 */
function cleanFrontMatter(data: FrontMatterData): FrontMatterData {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }

  return cleaned as FrontMatterData;
}

/**
 * 生成 slug
 */
export function generateSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
  return slug || `post-${Date.now()}`;
}

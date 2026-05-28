import matter from 'gray-matter';

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
    console.error('Failed to parse frontmatter:', error);
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

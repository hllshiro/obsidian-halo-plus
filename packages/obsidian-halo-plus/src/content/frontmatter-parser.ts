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
 * FrontMatter 解析器
 */
export class FrontMatterParser {
  /**
   * 解析 FrontMatter
   *
   * @param content 包含 FrontMatter 的 markdown 内容
   * @returns 解析后的 FrontMatter 数据
   */
  static parse(content: string): FrontMatterData {
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
  static stringify(content: string, frontmatter: FrontMatterData): string {
    // 移除空值
    const cleaned = this.cleanFrontMatter(frontmatter);

    // 使用 gray-matter 重新生成内容
    return matter.stringify(content, cleaned);
  }

  /**
   * 清理 FrontMatter 数据
   */
  private static cleanFrontMatter(data: FrontMatterData): FrontMatterData {
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
  static generateSlug(title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
    // 对于中文等非ASCII字符，添加fallback
    return slug || `post-${Date.now()}`;
  }
}

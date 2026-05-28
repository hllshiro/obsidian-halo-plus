/**
 * Halo Category 类型定义
 * @see https://api.halo.run
 */

export interface HaloCategory {
  apiVersion: 'content.halo.run/v1alpha1';
  kind: 'Category';
  metadata: {
    name: string;
    annotations?: Record<string, string>;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  spec: HaloCategorySpec;
}

export interface HaloCategorySpec {
  displayName: string;
  slug: string;
  cover: string;
  description: string;
  priority: number;
  postCount?: number;
}

export interface CreateCategoryParams {
  displayName: string;
  slug?: string;
  cover?: string;
  description?: string;
  priority?: number;
}

export interface ListCategoriesParams {
  page?: number;
  size?: number;
  keyword?: string;
}

export interface CategoryPage {
  items: HaloCategory[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

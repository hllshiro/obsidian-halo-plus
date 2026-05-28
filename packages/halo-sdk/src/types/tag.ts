/**
 * Halo Tag 类型定义
 * @see https://api.halo.run
 */

export interface HaloTag {
  apiVersion: 'content.halo.run/v1alpha1';
  kind: 'Tag';
  metadata: {
    name: string;
    annotations?: Record<string, string>;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  spec: HaloTagSpec;
}

export interface HaloTagSpec {
  displayName: string;
  slug: string;
  color: string;
  cover: string;
  description: string;
  postCount?: number;
}

export interface CreateTagParams {
  displayName: string;
  slug?: string;
  color?: string;
  cover?: string;
  description?: string;
}

export interface ListTagsParams {
  page?: number;
  size?: number;
  keyword?: string;
}

export interface TagPage {
  items: HaloTag[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

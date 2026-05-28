/**
 * Halo Post 类型定义
 * @see https://api.halo.run
 */

export interface HaloPost {
  apiVersion: 'content.halo.run/v1alpha1';
  kind: 'Post';
  metadata: {
    name: string;
    annotations?: Record<string, string>;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  spec: HaloPostSpec;
}

export interface HaloPostSpec {
  title: string;
  slug: string;
  cover: string;
  deleted: boolean;
  publish: boolean;
  pinned: boolean;
  allowComment: boolean;
  visible: 'PUBLIC' | 'INTERNAL';
  priority: number;
  excerpt: HaloExcerpt;
  categories: string[];
  tags: string[];
  htmlMetas: Array<{ key: string; value: string }>;
  publishTime?: string;
  allowDownload?: boolean;
  headSnapshot?: string;
}

export interface HaloExcerpt {
  autoGenerate: boolean;
  raw: string;
}

export interface HaloContent {
  raw: string;
  content: string;
  rawType: 'HTML';
}

export interface HaloPostContent {
  apiVersion: 'content.halo.run/v1alpha1';
  kind: 'PostContent';
  metadata: {
    name: string;
  };
  spec: {
    post: string;
    headSnapshot?: string;
    releaseSnapshot?: string;
  };
  status?: {
    phase: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED';
    htmlMetas?: Array<{ key: string; value: string }>;
  };
}

export interface CreatePostParams {
  title: string;
  slug?: string;
  cover?: string;
  publish?: boolean;
  pinned?: boolean;
  allowComment?: boolean;
  visible?: 'PUBLIC' | 'INTERNAL';
  priority?: number;
  excerpt?: {
    autoGenerate?: boolean;
    raw?: string;
  };
  categories?: string[];
  tags?: string[];
  htmlMetas?: Array<{ key: string; value: string }>;
  content?: string;
}

export interface UpdatePostParams extends Partial<CreatePostParams> {}

export interface ListPostsParams {
  page?: number;
  size?: number;
  sort?: Array<{
    property: string;
    direction: 'ASC' | 'DESC';
  }>;
  keyword?: string;
  category?: string;
  tag?: string;
  publish?: boolean;
}

export interface ListedPost {
  metadata: {
    name: string;
    annotations?: Record<string, string>;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  spec: {
    title: string;
    slug: string;
    cover: string;
    publish: boolean;
    pinned: boolean;
    allowComment: boolean;
    visible: 'PUBLIC' | 'INTERNAL';
    priority: number;
    excerpt: HaloExcerpt;
    categories: string[];
    tags: string[];
    publishTime?: string;
  };
  status?: {
    phase: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED';
    permalink?: string;
    observedVersion?: number;
    lastModifyTime?: string;
  };
}

export interface PostPage {
  items: ListedPost[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

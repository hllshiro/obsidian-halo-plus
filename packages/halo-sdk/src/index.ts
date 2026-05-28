/**
 * @obsidian-halo-plus/halo-sdk
 *
 * Halo REST API SDK for obsidian-halo-plus
 *
 * @example
 * ```typescript
 * import { HaloClient, PostService } from '@obsidian-halo-plus/halo-sdk';
 *
 * const client = new HaloClient({
 *   baseUrl: 'https://halo.example.com',
 *   token: 'pat_xxxxxxxx',
 * });
 *
 * const posts = new PostService(client);
 * const page = await posts.list({ page: 1, size: 10 });
 * ```
 */

export { HaloClient } from './client';

export { PostService } from './services/post-service';
export { TagService } from './services/tag-service';
export { CategoryService } from './services/category-service';
export { AttachmentService } from './services/attachment-service';

export { HaloError, isHaloError, formatError } from './utils/error';
export { withRetry } from './utils/retry';
export type { RetryOptions } from './utils/retry';

export type {
  HaloPost,
  HaloPostSpec,
  HaloContent,
  HaloPostContent,
  HaloExcerpt,
  CreatePostParams,
  UpdatePostParams,
  ListPostsParams,
  ListedPost,
  PostPage,
  HaloTag,
  HaloTagSpec,
  CreateTagParams,
  ListTagsParams,
  TagPage,
  HaloCategory,
  HaloCategorySpec,
  CreateCategoryParams,
  ListCategoriesParams,
  CategoryPage,
  HaloAttachment,
  HaloAttachmentSpec,
  HaloAttachmentStatus,
  UploadAttachmentParams,
  ListAttachmentsParams,
  AttachmentPage,
  HaloClientConfig,
  HaloClientOptions,
  HaloValidationError,
} from './types';

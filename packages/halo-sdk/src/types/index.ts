/**
 * Halo SDK 类型导出
 */

// Post types
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
} from './post';

// Tag types
export type {
  HaloTag,
  HaloTagSpec,
  CreateTagParams,
  ListTagsParams,
  TagPage,
} from './tag';

// Category types
export type {
  HaloCategory,
  HaloCategorySpec,
  CreateCategoryParams,
  ListCategoriesParams,
  CategoryPage,
} from './category';

// Attachment types
export type {
  HaloAttachment,
  HaloAttachmentSpec,
  HaloAttachmentStatus,
  UploadAttachmentParams,
  ListAttachmentsParams,
  AttachmentPage,
} from './attachment';

// Client types
export type {
  HaloClientConfig,
  HaloClientOptions,
  HaloError,
  HaloValidationError,
} from './client';

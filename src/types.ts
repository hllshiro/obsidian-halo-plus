export interface HaloPost {
  apiVersion: 'content.halo.run/v1alpha1';
  kind: 'Post';
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
    deleted: boolean;
    publish: boolean;
    pinned: boolean;
    allowComment: boolean;
    visible: 'PUBLIC' | 'INTERNAL';
    priority: number;
    excerpt: { autoGenerate: boolean; raw: string };
    categories: string[];
    tags: string[];
    htmlMetas: Array<{ key: string; value: string }>;
    publishTime?: string;
    allowDownload?: boolean;
    headSnapshot?: string;
  };
}

export interface HaloContent {
  raw: string;
  content: string;
  rawType: 'HTML';
}

export interface HaloAttachment {
  apiVersion: 'storage.halo.run/v1alpha1';
  kind: 'Attachment';
  metadata: {
    name: string;
    annotations?: Record<string, string>;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  spec: {
    displayName: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mediaType: string;
    suffix: string;
    thumbPath?: string;
    tags?: string[];
  };
  status?: {
    phase: 'PENDING' | 'READY' | 'FAILED';
    permalink?: string;
    mediaType?: string;
    reason?: string;
  };
}

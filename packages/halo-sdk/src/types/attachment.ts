/**
 * Halo Attachment 类型定义
 * @see https://api.halo.run
 */

export interface HaloAttachment {
  apiVersion: 'storage.halo.run/v1alpha1';
  kind: 'Attachment';
  metadata: {
    name: string;
    annotations?: Record<string, string>;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  spec: HaloAttachmentSpec;
  status?: HaloAttachmentStatus;
}

export interface HaloAttachmentSpec {
  displayName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mediaType: string;
  suffix: string;
  thumbPath?: string;
  tags?: string[];
}

export interface HaloAttachmentStatus {
  phase: 'PENDING' | 'READY' | 'FAILED';
  permalink?: string;
  mediaType?: string;
  reason?: string;
}

export interface UploadAttachmentParams {
  file: File | Blob | ArrayBuffer;
  filename: string;
  mimeType: string;
}

export interface ListAttachmentsParams {
  page?: number;
  size?: number;
  keyword?: string;
  mediaType?: string;
}

export interface AttachmentPage {
  items: HaloAttachment[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

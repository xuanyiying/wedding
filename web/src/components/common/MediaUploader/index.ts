// 导出重构后的组件（默认导出新版本）
export { default as MediaUploader } from './MediaUploader';
export { default as MediaUploaderLegacy } from './MediaUploader';
export { default as MediaList } from './MediaList';
export { default as VideoCoverModal } from './VideoCoverModal';

// 导出核心逻辑类
export { MediaUploaderCore } from './MediaUploaderCore';
export { ChunkUploadManager } from './ChunkUploadManager';
export { FileValidator } from './FileValidator';
export { UploadProgressTracker } from './UploadProgressTracker';

// 导出类型定义
export type {
  MediaType,
  UploadStatus,
  MediaFileItem,
  MediaUploadConfig,
  VideoCoverSelection,
  UploadProgressInfo,
  MediaUploaderCallbacks,
  MediaUploaderProps,
  FileValidationResult,
  UploadQueue,
  NetworkStatus,
  UploadStats,
  UploadError
} from './types';

// 导出常量
export { 
  SUPPORTED_IMAGE_TYPES, 
  SUPPORTED_VIDEO_TYPES 
} from './FileValidator';

export {
  CHUNK_SIZE,
  MAX_CONCURRENT_CHUNKS,
  UPLOAD_TIMEOUT,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_BASE
} from './ChunkUploadManager';
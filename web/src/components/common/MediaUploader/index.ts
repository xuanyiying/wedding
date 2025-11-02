// 导出主要组件
export { default as MediaUploader } from './MediaUploader';
export { default as MediaList } from './MediaList';
export { default as VideoCoverModal } from './VideoCoverModal';

// 导出核心管理器
export { UploadManager } from './UploadManager';

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

// 向后兼容 - 保留旧的导出以防其他地方使用
export { default as MediaUploaderLegacy } from './MediaUploader';

// 如果需要使用旧的组件，可以单独导入
export { MediaUploaderCore } from './MediaUploaderCore';
export { ChunkUploadManager } from './ChunkUploadManager';
export { FileValidator } from './FileValidator';
export { UploadProgressTracker } from './UploadProgressTracker';
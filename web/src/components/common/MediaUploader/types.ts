/**
 * 媒体上传组件类型定义
 */

import type { DirectUploadResult, DirectUploadProgress } from '../../../utils/direct-upload';
import type { VideoFrame } from '../../../utils/video-frame-extractor';

// 支持的文件类型
export type MediaType = 'image' | 'video' | 'mixed';

// 上传状态
export const UploadStatus = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error',
  CANCELLED: 'cancelled'
} as const;

export type UploadStatus = typeof UploadStatus[keyof typeof UploadStatus];

// 媒体文件项
export interface MediaFileItem {
  id: string;
  file: File;
  type: 'image' | 'video';
  status: UploadStatus;
  progress: number;
  error?: string;
  result?: DirectUploadResult;
  preview?: string; // 预览URL
  coverFile?: File; // 视频封面文件
  coverPreview?: string; // 封面预览URL
  uploadedAt?: Date;
}

// 上传配置
export interface MediaUploadConfig {
  // 基础配置
  accept?: string[]; // 接受的文件类型
  multiple?: boolean; // 是否支持多文件
  maxCount?: number; // 最大文件数量
  maxSize?: number; // 单文件最大大小（字节）
  
  // 图片配置
  imageMaxSize?: number; // 图片最大大小
  imageCompress?: boolean; // 是否压缩图片
  imageQuality?: number; // 图片压缩质量
  
  // 视频配置
  videoMaxSize?: number; // 视频最大大小
  requireCover?: boolean; // 是否必须选择封面
  autoExtractCover?: boolean; // 是否自动提取封面
  
  // 上传配置
  category?: 'avatar' | 'work' | 'event' | 'profile' | 'cover' | 'favicon' | 'logo' | 'other';
  concurrent?: number; // 并发上传数
}

// 封面选择方式
export type CoverSelectionType = 'frame' | 'upload';

// 视频封面选择数据
export interface VideoCoverSelection {
  videoFile: File;
  coverType: CoverSelectionType;
  coverFile?: File;
  selectedFrame?: VideoFrame;
  frameTime?: number;
}

// 上传进度信息
export interface UploadProgressInfo {
  total: number;
  completed: number;
  failed: number;
  uploading: number;
  percentage: number;
  currentFile?: string;
  speed?: number;
  remainingTime?: number;
}

// 组件事件回调
export interface MediaUploaderCallbacks {
  onUploadStart?: (files: MediaFileItem[]) => void;
  onUploadProgress?: (progress: UploadProgressInfo) => void;
  onFileProgress?: (fileId: string, progress: DirectUploadProgress) => void;
  onUploadSuccess?: (results: DirectUploadResult[]) => void;
  onUploadError?: (error: Error, fileId?: string) => void;
  onFileRemove?: (fileId: string) => void;
  onPreview?: (file: MediaFileItem) => void;
  onChange?: (files: MediaFileItem[]) => void;
}

// 组件属性
export interface MediaUploaderProps extends MediaUploaderCallbacks {
  // 基础属性
  value?: MediaFileItem[];
  disabled?: boolean;
  loading?: boolean;
  
  // 上传配置
  config?: MediaUploadConfig;
  
  // 样式配置
  className?: string;
  style?: React.CSSProperties;
  
  // 显示配置
  showUploadList?: boolean;
  showProgress?: boolean;
  listType?: 'text' | 'picture' | 'picture-card';
  
  // 拖拽配置
  dragSort?: boolean;
  
  // 预览配置
  previewable?: boolean;
}

// 视频封面选择弹窗属性
export interface VideoCoverModalProps {
  visible: boolean;
  videoFile: File | null;
  onCancel: () => void;
  onConfirm: (selection: VideoCoverSelection) => void;
  loading?: boolean;
}

// 视频帧选择器属性
export interface VideoFrameSelectorProps {
  videoFile: File;
  onFrameSelect: (frame: VideoFrame) => void;
  selectedFrame?: VideoFrame;
  frameCount?: number;
  loading?: boolean;
}

// 文件验证结果
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

// 拖拽排序数据
export interface DragSortData {
  dragIndex: number;
  hoverIndex: number;
}

// 上传队列项
export interface UploadQueueItem {
  fileItem: MediaFileItem;
  priority: number;
  retryCount: number;
  maxRetries: number;
}

// 批量操作类型
export type BatchActionType = 'retry' | 'remove' | 'cancel';

// 批量操作数据
export interface BatchActionData {
  action: BatchActionType;
  fileIds: string[];
}
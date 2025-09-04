// 增强上传类型定义

// 上传状态类型
export const EnhancedUploadStatus = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused'
} as const;

export type EnhancedUploadStatusType = typeof EnhancedUploadStatus[keyof typeof EnhancedUploadStatus];

// 增强上传配置接口
export interface EnhancedUploadConfig {
  // 基本配置
  fileType: 'video' | 'image' | 'audio' | 'document' | 'other';
  category?: string;
  maxFileSize?: number;
  
  // 上传模式配置
  enableDirectUpload?: boolean; // 是否启用直传OSS
  
  // 超时配置
  timeout?: number; // 超时时间（毫秒）
  
  // 重试配置
  retryCount?: number; // 重试次数
  retryDelay?: number; // 重试延迟（毫秒）
  maxRetryDelay?: number; // 最大重试延迟（毫秒）
  retryBackoffType?: 'linear' | 'exponential' | 'fixed'; // 退避策略
  enableJitter?: boolean; // 是否启用抖动
  
  // 断点续传配置
  enableResume?: boolean; // 是否启用断点续传
  chunkSize?: number; // 分片大小（字节）
  
  // 压缩配置（图片）
  enableCompression?: boolean; // 是否启用压缩
  compressionQuality?: number; // 压缩质量 (0-1)
  maxWidth?: number; // 最大宽度
  maxHeight?: number; // 最大高度
  
  // 回调函数
  onProgress?: (progress: EnhancedUploadProgress) => void;
  onStatusChange?: (status: EnhancedUploadStatusType) => void;
  onError?: (error: Error) => void;
  onSuccess?: (result: EnhancedUploadResult) => void;
  onRetry?: (attempt: number, error: Error) => void;
}

// 上传进度信息
export interface EnhancedUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
  status: EnhancedUploadStatusType;
  chunks?: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
}

// 上传结果
export interface EnhancedUploadResult {
  fileId: string;
  filename: string;
  originalName: string;
  fileSize: number;
  url: string;
  fileType: string;
  uploadedAt: string;
  category: string;
  metadata?: Record<string, any>;
}

// 上传会话信息
export interface UploadSessionInfo {
  uploadSessionId: string;
  uploadUrl?: string;
  ossKey?: string;
  expires?: number;
  uploadMode: 'direct' | 'server';
  chunkSize?: number;
  resumable?: boolean;
}

// 批量上传进度
export interface BatchUploadProgress {
  total: number;
  completed: number;
  failed: number;
  uploading: number;
  pending: number;
  percentage: number;
}

// 批量上传结果
export interface BatchUploadResult {
  successful: EnhancedUploadResult[];
  failed: Error[];
  total: number;
  successCount: number;
  failureCount: number;
}
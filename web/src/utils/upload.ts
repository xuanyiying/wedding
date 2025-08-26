import { http } from './request';
import type { RetryConfig } from './request';

// 上传状态枚举
export const UploadStatus = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error',
  CANCELLED: 'cancelled',
} as const;

export type UploadStatus = typeof UploadStatus[keyof typeof UploadStatus];

// 上传进度信息
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number; // 上传速度 (bytes/s)
  remainingTime?: number; // 剩余时间 (seconds)
}

// 上传配置
export interface UploadConfig {
  url?: string;
  timeout?: number;
  retryConfig?: RetryConfig;
  onProgress?: (progress: UploadProgress) => void;
  onStatusChange?: (status: UploadStatus) => void;
  onRetry?: (attempt: number, error: any) => void;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  validateFile?: (file: File) => string | null; // 返回错误信息或null
}

// 文件上传器类
export class FileUploader {
  private file: File;
  private config: UploadConfig;
  private status: UploadStatus = UploadStatus.PENDING;
  private lastLoaded: number = 0;
  private lastTime: number = 0;
  private abortController?: AbortController;

  constructor(file: File, config: UploadConfig = {}) {
    this.file = file;
    this.config = {
      url: '/api/files/upload',
      timeout: 5 * 60 * 1000, // 5分钟
      retryConfig: {
        maxAttempts: 3,
        delay: 1000,
        backoff: true,
      },
      ...config,
    };
  }

  // 验证文件
  private validateFile(): string | null {
    if (this.config.validateFile) {
      return this.config.validateFile(this.file);
    }

    // 默认验证
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (this.file.size > maxSize) {
      return `文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`;
    }

    return null;
  }

  // 更新状态
  private updateStatus(status: UploadStatus) {
    this.status = status;
    this.config.onStatusChange?.(status);
  }

  // 计算上传进度
  private calculateProgress(loaded: number, total: number): UploadProgress {
    const percentage = Math.round((loaded * 100) / total);
    const currentTime = Date.now();

    let speed: number | undefined;
    let remainingTime: number | undefined;

    if (this.lastTime > 0) {
      const timeDiff = (currentTime - this.lastTime) / 1000; // 秒
      const loadedDiff = loaded - this.lastLoaded;

      if (timeDiff > 0) {
        speed = loadedDiff / timeDiff; // bytes/s

        if (speed > 0) {
          remainingTime = (total - loaded) / speed; // 秒
        }
      }
    }

    this.lastLoaded = loaded;
    this.lastTime = currentTime;

    return {
      loaded,
      total,
      percentage,
      speed,
      remainingTime,
    };
  }

  // 开始上传
  async upload(): Promise<any> {
    // 验证文件
    const validationError = this.validateFile();
    if (validationError) {
      const error = new Error(validationError);
      this.updateStatus(UploadStatus.ERROR);
      this.config.onError?.(error);
      throw error;
    }

    this.updateStatus(UploadStatus.UPLOADING);

    this.lastTime = 0;
    this.lastLoaded = 0;

    try {
      // 创建FormData
      const formData = new FormData();
      formData.append('file', this.file);

      // 创建取消控制器
      this.abortController = new AbortController();

      // 上传文件
      const response = await http.uploadWithRetry(this.config.url!, formData, {
        timeout: this.config.timeout,
        retryConfig: this.config.retryConfig,
        signal: this.abortController.signal,
        onProgress: (percentage) => {
          const progress = this.calculateProgress(
            (percentage * this.file.size) / 100,
            this.file.size
          );
          this.config.onProgress?.(progress);
        },
        onRetry: this.config.onRetry,
      });

      this.updateStatus(UploadStatus.SUCCESS);
      this.config.onSuccess?.(response);
      return response;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        this.updateStatus(UploadStatus.CANCELLED);
      } else {
        this.updateStatus(UploadStatus.ERROR);
        this.config.onError?.(error);
      }
      throw error;
    }
  }

  // 取消上传
  cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.updateStatus(UploadStatus.CANCELLED);
    }
  }

  // 获取当前状态
  getStatus(): UploadStatus {
    return this.status;
  }

  // 获取文件信息
  getFileInfo() {
    return {
      name: this.file.name,
      size: this.file.size,
      type: this.file.type,
      lastModified: this.file.lastModified,
    };
  }
}

// 批量上传管理器
export class BatchUploader {
  private uploaders: FileUploader[] = [];
  private concurrency: number;
  private onBatchProgress?: (completed: number, total: number, overallProgress: number) => void;
  private onBatchComplete?: (results: any[]) => void;
  private onBatchError?: (errors: any[]) => void;

  constructor(
    files: File[],
    config: UploadConfig = {},
    options: {
      concurrency?: number;
      onBatchProgress?: (completed: number, total: number, overallProgress: number) => void;
      onBatchComplete?: (results: any[]) => void;
      onBatchError?: (errors: any[]) => void;
    } = {}
  ) {
    this.concurrency = options.concurrency || 3;
    this.onBatchProgress = options.onBatchProgress;
    this.onBatchComplete = options.onBatchComplete;
    this.onBatchError = options.onBatchError;

    this.uploaders = files.map((file) => new FileUploader(file, config));
  }

  // 开始批量上传
  async uploadAll(): Promise<any[]> {
    const results: any[] = [];
    const errors: any[] = [];
    let completed = 0;

    // 分批并发上传
    const chunks = this.chunkArray(this.uploaders, this.concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (uploader) => {
        try {
          const result = await uploader.upload();
          completed++;
          this.updateBatchProgress(completed);
          return { success: true, result, uploader };
        } catch (error) {
          completed++;
          errors.push({ error, uploader });
          this.updateBatchProgress(completed);
          return { success: false, error, uploader };
        }
      });

      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }

    // 处理结果
    const successResults = results.filter(r => r.success).map(r => r.result);

    if (errors.length > 0) {
      this.onBatchError?.(errors);
    }

    if (successResults.length > 0) {
      this.onBatchComplete?.(successResults);
    }

    return successResults;
  }

  // 取消所有上传
  cancelAll() {
    this.uploaders.forEach(uploader => uploader.cancel());
  }

  // 获取上传状态统计
  getStatusStats() {
    const stats: Record<UploadStatus, number> = {
      [UploadStatus.PENDING]: 0,
      [UploadStatus.UPLOADING]: 0,
      [UploadStatus.SUCCESS]: 0,
      [UploadStatus.ERROR]: 0,
      [UploadStatus.CANCELLED]: 0,
    };

    this.uploaders.forEach(uploader => {
      stats[uploader.getStatus()]++;
    });

    return stats;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private updateBatchProgress(completed: number) {
    const total = this.uploaders.length;
    const overallProgress = Math.round((completed * 100) / total);
    this.onBatchProgress?.(completed, total, overallProgress);
  }
}

// 工具函数：格式化文件大小
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 工具函数：格式化剩余时间
export const formatRemainingTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}分钟`;
  } else {
    return `${Math.round(seconds / 3600)}小时`;
  }
};

// 工具函数：格式化上传速度
export const formatUploadSpeed = (bytesPerSecond: number): string => {
  return `${formatFileSize(bytesPerSecond)}/s`;
};

// 默认文件验证器
export const createFileValidator = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}) => {
  return (file: File): string | null => {
    const { maxSize, allowedTypes, allowedExtensions } = options;

    // 检查文件大小
    if (maxSize && file.size > maxSize) {
      return `文件大小不能超过 ${formatFileSize(maxSize)}`;
    }

    // 检查文件类型
    if (allowedTypes && !allowedTypes.includes(file.type)) {
      return `不支持的文件类型: ${file.type}`;
    }

    // 检查文件扩展名
    if (allowedExtensions) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        return `不支持的文件扩展名: ${extension}`;
      }
    }

    return null;
  };
};
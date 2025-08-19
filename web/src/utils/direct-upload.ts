import { uploadRequest } from './request';

// 直传上传状态
export const DirectUploadStatus = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export type DirectUploadStatusType = typeof DirectUploadStatus[keyof typeof DirectUploadStatus];

// 直传上传进度信息
export interface DirectUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
  status: DirectUploadStatusType;
}

// 直传上传配置
export interface DirectUploadConfig {
  fileType: 'video' | 'image';
  category?: 'avatar' | 'work' | 'event' | 'profile'| 'cover' | 'favicon'|'logo' | 'other';
  maxFileSize?: number;
  expires?: number; // 签名URL过期时间（秒）
  retryCount?: number; // 重试次数，默认3次
  retryDelay?: number; // 重试延迟（毫秒），默认1000ms
  enableCompression?: boolean; // 是否启用图片压缩，默认true
  compressionQuality?: number; // 压缩质量 0-1，默认0.8
  progressUpdateInterval?: number; // 进度更新间隔（毫秒），默认500ms
  onProgress?: (progress: DirectUploadProgress) => void;
  onStatusChange?: (status: DirectUploadStatusType) => void;
  onError?: (error: Error) => void;
  onSuccess?: (result: DirectUploadResult) => void;
  onRetry?: (attempt: number, error: Error) => void;
}

// 直传上传结果
export interface DirectUploadResult {
  fileId: string;
  filename: string;
  originalName: string;
  fileSize: number;
  url: string;
  fileType: string;
  uploadedAt: string;
  category: string;
}

// 预签名URL响应
interface PresignedUrlResponse {
  presignedUrl: string;
  uploadSessionId: string;
  ossKey: string;
  expires: number;
}


/**
 * 直传OSS上传器
 */
export class DirectUploader {
  private file: File;
  private config: DirectUploadConfig;
  private uploadSessionId: string | null = null;
  private uploadUrl: string | null = null;
  private abortController: AbortController | null = null;
  private status: DirectUploadStatusType = DirectUploadStatus.PENDING;
  private startTime: number = 0;
  private processedFile: File | null = null;

  constructor(file: File, config: DirectUploadConfig) {
    this.file = file;
    this.config = {
      retryCount: 3,
      retryDelay: 1000,
      enableCompression: true,
      compressionQuality: 0.8,
      progressUpdateInterval: 500,
      ...config
    };
  }

  /**
   * 开始上传
   */
  async upload(): Promise<DirectUploadResult> {
    try {
      this.updateStatus(DirectUploadStatus.PENDING);
      
      // 1. 预处理文件（压缩等）
      await this.preprocessFile();
      
      // 2. 获取预签名URL
      const presignedData = await this.getPresignedUrl();
      this.uploadSessionId = presignedData.uploadSessionId;
      this.uploadUrl = presignedData.presignedUrl;

      // 3. 直接上传到OSS（带重试机制）
      this.updateStatus(DirectUploadStatus.UPLOADING);
      await this.uploadToOssWithRetry();

      // 4. 确认上传完成
      const result = await this.confirmUpload();
      
      this.updateStatus(DirectUploadStatus.COMPLETED);
      this.config.onSuccess?.(result);
      
      return result;
    } catch (error) {
      this.updateStatus(DirectUploadStatus.FAILED);
      const uploadError = error instanceof Error ? error : new Error('上传失败');
      this.config.onError?.(uploadError);
      throw uploadError;
    }
  }

  /**
   * 取消上传
   */
  async cancel(): Promise<void> {
    try {
      this.updateStatus(DirectUploadStatus.CANCELLED);
      
      // 取消正在进行的请求
      if (this.abortController) {
        this.abortController.abort();
      }

      // 通知后端取消上传
      if (this.uploadSessionId) {
        await uploadRequest.post(`/direct-upload/cancel`, {
          uploadSessionId: this.uploadSessionId
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.warn('取消上传时发生错误:', error);
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): DirectUploadStatusType {
    return this.status;
  }

  /**
   * 获取预签名URL
   */
  /**
   * 预处理文件（压缩等）
   */
  private async preprocessFile(): Promise<void> {
    if (this.config.fileType === 'image' && this.config.enableCompression) {
      this.processedFile = await this.compressImage(this.file);
    } else {
      this.processedFile = this.file;
    }
  }

  /**
   * 压缩图片
   */
  private async compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 计算压缩后的尺寸
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制并压缩
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('图片压缩失败'));
            }
          },
          file.type,
          this.config.compressionQuality
        );
      };
      
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 带重试机制的上传到OSS
   */
  private async uploadToOssWithRetry(): Promise<void> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= (this.config.retryCount || 3); attempt++) {
      try {
        await this.uploadToOss();
        return; // 成功则返回
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('上传失败');
        
        if (attempt < (this.config.retryCount || 3)) {
          this.config.onRetry?.(attempt + 1, lastError);
          await this.delay(this.config.retryDelay || 1000);
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getPresignedUrl(): Promise<PresignedUrlResponse> {
    const fileToUpload = this.processedFile || this.file;
    const response = await uploadRequest.post('/direct-upload/presigned-url', {
      fileName: fileToUpload.name,
      fileSize: fileToUpload.size,
      contentType: fileToUpload.type,
      fileType: this.config.fileType,
      category: this.config.category,
      expires: this.config.expires || 3600
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.message || '获取预签名URL失败');
    }

    return response.data.data;
  }

  /**
   * 直接上传到OSS
   */
  private async uploadToOss(): Promise<void> {
    if (!this.uploadUrl) {
      throw new Error('上传URL不存在');
    }

    const fileToUpload = this.processedFile || this.file;
    this.abortController = new AbortController();
    this.startTime = Date.now();

    const total = fileToUpload.size;
    let loaded = 0;
    let lastTime = this.startTime;
    let lastLoaded = 0;
    const updateInterval = this.config.progressUpdateInterval || 500;

    // 创建XMLHttpRequest来支持上传进度监控
    const xhr = new XMLHttpRequest();
    
    return new Promise<void>((resolve, reject) => {
      // 监听上传进度
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          loaded = event.loaded;
          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          const loadedDiff = loaded - lastLoaded;

          if (timeDiff > updateInterval / 1000 || loaded === total) {
            const speed = loadedDiff / timeDiff;
            const remainingTime = speed > 0 ? (total - loaded) / speed : Infinity;
            const percentage = Math.round((loaded / total) * 100);

            const progress: DirectUploadProgress = {
              loaded,
              total,
              percentage,
              speed,
              remainingTime,
              status: this.status
            };
            this.config.onProgress?.(progress);

            lastTime = now;
            lastLoaded = loaded;
          }
        }
      });

      // 监听请求完成
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`));
        }
      });

      // 监听请求错误
      xhr.addEventListener('error', () => {
        reject(new Error('上传请求失败'));
      });

      // 监听请求中止
      xhr.addEventListener('abort', () => {
        reject(new Error('上传已取消'));
      });

      // 监听取消信号
       this.abortController?.signal.addEventListener('abort', () => {
         xhr.abort();
       });

       // 发送PUT请求
       xhr.open('PUT', this.uploadUrl!);
       xhr.setRequestHeader('Content-Type', fileToUpload.type);
       xhr.send(fileToUpload);
    });
  }

  /**
   * 确认上传完成
   */
  private async confirmUpload(): Promise<DirectUploadResult> {
    if (!this.uploadSessionId) {
      throw new Error('上传会话ID不存在');
    }

    const fileToUpload = this.processedFile || this.file;
    const response = await uploadRequest.post('/direct-upload/confirm', {
      uploadSessionId: this.uploadSessionId,
      actualFileSize: fileToUpload.size
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.message || '确认上传失败');
    }

    return response.data.data;
  }

  /**
   * 更新状态
   */
  private updateStatus(status: DirectUploadStatusType): void {
    this.status = status;
    this.config.onStatusChange?.(status);
  }

  /**
   * 计算上传进度
   */

}

/**
 * 批量直传上传器
 */
export class BatchDirectUploader {
  private files: File[];
  private config: DirectUploadConfig;
  private uploaders: DirectUploader[] = [];
  private results: DirectUploadResult[] = [];
  private errors: Error[] = [];
  private concurrency: number;
  private onBatchProgress?: (progress: BatchUploadProgress) => void;

  constructor(
    files: File[],
    config: DirectUploadConfig,
    options: {
      concurrency?: number;
      onBatchProgress?: (progress: BatchUploadProgress) => void;
    } = {}
  ) {
    this.files = files;
    this.config = config;
    this.concurrency = options.concurrency || 3;
    this.onBatchProgress = options.onBatchProgress;
  }

  /**
   * 开始批量上传
   */
  async upload(): Promise<BatchUploadResult> {
    this.uploaders = this.files.map(file => new DirectUploader(file, {
      ...this.config,
      onProgress: (progress) => this.handleFileProgress(progress),
      onStatusChange: (status) => this.handleStatusChange(status)
    }));

    // 分批并发上传
    const batches = this.chunkArray(this.uploaders, this.concurrency);
    
    for (const batch of batches) {
      const promises = batch.map(async (uploader) => {
        try {
          const result = await uploader.upload();
          this.results.push(result);
          return result;
        } catch (error) {
          const uploadError = error instanceof Error ? error : new Error('上传失败');
          this.errors.push(uploadError);
          throw uploadError;
        }
      });

      // 等待当前批次完成
      await Promise.allSettled(promises);
    }

    return {
      successful: this.results,
      failed: this.errors,
      total: this.files.length,
      successCount: this.results.length,
      failureCount: this.errors.length
    };
  }

  /**
   * 取消所有上传
   */
  async cancelAll(): Promise<void> {
    const cancelPromises = this.uploaders.map(uploader => uploader.cancel());
    await Promise.allSettled(cancelPromises);
  }

  /**
   * 处理单个文件进度
   */
  private handleFileProgress(_progress: DirectUploadProgress): void {
    this.updateBatchProgress();
  }

  /**
   * 处理状态变化
   */
  private handleStatusChange(_status: DirectUploadStatusType): void {
    this.updateBatchProgress();
  }

  /**
   * 更新批量上传进度
   */
  private updateBatchProgress(): void {
    const completed = this.uploaders.filter(u => 
      u.getStatus() === DirectUploadStatus.COMPLETED
    ).length;
    
    const failed = this.uploaders.filter(u => 
      u.getStatus() === DirectUploadStatus.FAILED
    ).length;
    
    const uploading = this.uploaders.filter(u => 
      u.getStatus() === DirectUploadStatus.UPLOADING
    ).length;

    const progress: BatchUploadProgress = {
      total: this.files.length,
      completed,
      failed,
      uploading,
      pending: this.files.length - completed - failed - uploading,
      percentage: Math.round((completed / this.files.length) * 100)
    };

    this.onBatchProgress?.(progress);
  }

  /**
   * 将数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
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
  successful: DirectUploadResult[];
  failed: Error[];
  total: number;
  successCount: number;
  failureCount: number;
}

/**
 * 工具函数：格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 工具函数：格式化剩余时间
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}分钟`;
  } else {
    return `${Math.round(seconds / 3600)}小时`;
  }
}

/**
 * 工具函数：格式化上传速度
 */
export function formatUploadSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`;
}

/**
 * 工具函数：验证文件类型
 */
export function validateFileType(file: File, fileType: 'video' | 'image' ): boolean {
  const typeConfig = {
    video: [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/quicktime',
      'video/flv',
      'video/webm',
      'video/mkv'
    ],
    image: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff'
    ]
  };

  return typeConfig[fileType].includes(file.type);
}

/**
 * 工具函数：验证文件大小
 */
export function validateFileSize(file: File, fileType: 'video' | 'image'): boolean {
  const sizeConfig = {
    video: 500 * 1024 * 1024, // 500MB
    image: 50 * 1024 * 1024   // 50MB
  };

  return file.size <= sizeConfig[fileType];
}

/**
 * 创建文件验证器
 */
export function createFileValidator(fileType: 'video' | 'image') {
  return {
    validateType: (file: File) => validateFileType(file, fileType),
    validateSize: (file: File) => validateFileSize(file, fileType),
    validate: (file: File) => {
      const typeValid = validateFileType(file, fileType);
      const sizeValid = validateFileSize(file, fileType);
      
      return {
        valid: typeValid && sizeValid,
        errors: [
          ...(!typeValid ? ['不支持的文件类型'] : []),
          ...(!sizeValid ? ['文件大小超过限制'] : [])
        ]
      };
    }
  };
}
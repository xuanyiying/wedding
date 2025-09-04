import { EnhancedUploader } from './enhanced-uploader';
import type { 
  EnhancedUploadConfig, 
  EnhancedUploadResult,
  BatchUploadProgress,
  BatchUploadResult
} from '../types/enhanced-upload.types';

/**
 * 批量上传器
 * 支持多文件并发上传，可控制并发数
 */
export class BatchUploader {
  private files: File[];
  private config: EnhancedUploadConfig;
  private uploaders: EnhancedUploader[] = [];
  private results: EnhancedUploadResult[] = [];
  private errors: Error[] = [];
  private concurrency: number;
  private onBatchProgress?: (progress: BatchUploadProgress) => void;
  private onBatchComplete?: (result: BatchUploadResult) => void;
  private isPaused: boolean = false;

  constructor(
    files: File[],
    config: EnhancedUploadConfig,
    options: {
      concurrency?: number;
      onBatchProgress?: (progress: BatchUploadProgress) => void;
      onBatchComplete?: (result: BatchUploadResult) => void;
    } = {}
  ) {
    this.files = files;
    this.config = config;
    this.concurrency = options.concurrency || 3;
    this.onBatchProgress = options.onBatchProgress;
    this.onBatchComplete = options.onBatchComplete;
  }

  /**
   * 开始批量上传
   */
  async upload(): Promise<BatchUploadResult> {
    this.uploaders = this.files.map(file => new EnhancedUploader(file, {
      ...this.config,
      onProgress: () => this.updateBatchProgress(),
      onStatusChange: () => this.updateBatchProgress(),
      onSuccess: (result) => {
        this.results.push(result);
        this.updateBatchProgress();
      },
      onError: (error) => {
        this.errors.push(error);
        this.updateBatchProgress();
      }
    }));

    // 分批并发上传
    const batches = this.chunkArray(this.uploaders, this.concurrency);

    for (const batch of batches) {
      if (this.isPaused) {
        break;
      }
      
      const promises = batch.map(async (uploader) => {
        try {
          return await uploader.upload();
        } catch (error) {
          // 错误已在onError回调中处理
          return null;
        }
      });

      // 等待当前批次完成
      await Promise.allSettled(promises);
    }

    const result: BatchUploadResult = {
      successful: this.results,
      failed: this.errors,
      total: this.files.length,
      successCount: this.results.length,
      failureCount: this.errors.length
    };
    
    this.onBatchComplete?.(result);
    
    return result;
  }

  /**
   * 暂停所有上传
   */
  async pauseAll(): Promise<void> {
    this.isPaused = true;
    const pausePromises = this.uploaders.map(uploader => {
      try {
        return uploader.pause();
      } catch (error) {
        console.warn('暂停上传失败:', error);
        return Promise.resolve();
      }
    });
    await Promise.allSettled(pausePromises);
  }

  /**
   * 恢复所有上传
   */
  async resumeAll(): Promise<BatchUploadResult> {
    this.isPaused = false;
    
    // 找出所有暂停状态的上传器
    const pausedUploaders = this.uploaders.filter(uploader => 
      uploader.getStatus() === 'paused'
    );
    
    // 分批恢复上传
    const batches = this.chunkArray(pausedUploaders, this.concurrency);

    for (const batch of batches) {
      if (this.isPaused) {
        break;
      }
      
      const promises = batch.map(async (uploader) => {
        try {
          return await uploader.resume();
        } catch (error) {
          // 错误已在onError回调中处理
          return null;
        }
      });

      // 等待当前批次完成
      await Promise.allSettled(promises);
    }
    
    const result: BatchUploadResult = {
      successful: this.results,
      failed: this.errors,
      total: this.files.length,
      successCount: this.results.length,
      failureCount: this.errors.length
    };
    
    this.onBatchComplete?.(result);
    
    return result;
  }

  /**
   * 取消所有上传
   */
  async cancelAll(): Promise<void> {
    const cancelPromises = this.uploaders.map(uploader => {
      try {
        return uploader.cancel();
      } catch (error) {
        console.warn('取消上传失败:', error);
        return Promise.resolve();
      }
    });
    await Promise.allSettled(cancelPromises);
    
    // 清空结果
    this.results = [];
    this.errors = [];
  }

  /**
   * 更新批量上传进度
   */
  private updateBatchProgress(): void {
    const completed = this.results.length;
    const failed = this.errors.length;
    const total = this.files.length;
    
    // 计算正在上传的文件数
    const uploading = this.uploaders.filter(u => 
      u.getStatus() === 'uploading' || u.getStatus() === 'preparing'
    ).length;
    
    // 计算等待上传的文件数
    const pending = total - completed - failed - uploading;
    
    const progress: BatchUploadProgress = {
      total,
      completed,
      failed,
      uploading,
      pending,
      percentage: Math.round((completed / total) * 100)
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
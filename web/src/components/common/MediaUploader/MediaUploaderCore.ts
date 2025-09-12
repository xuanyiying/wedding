/**
 * 媒体上传核心逻辑
 * 负责协调文件验证、分块上传、进度跟踪等功能
 */

import { message } from 'antd';
import { fileService } from '../../../services';
import { DirectUploader } from '../../../utils/direct-upload';
import type { DirectUploadResult, DirectUploadProgress } from '../../../utils/direct-upload';
import { DirectUploadStatus } from '../../../utils/direct-upload';

import { ChunkUploadManager } from './ChunkUploadManager';
import type { FileUploadState } from './ChunkUploadManager';
import { FileValidator } from './FileValidator';
import { UploadProgressTracker } from './UploadProgressTracker';
import { ProgressUpdateManager } from './ProgressThrottler';
import type {
  MediaFileItem,
  MediaUploadConfig,
  UploadProgressInfo,
  VideoCoverSelection
} from './types';
import { UploadStatus } from './types';

// 默认配置
const DEFAULT_CONFIG: MediaUploadConfig = {
  multiple: true,
  maxCount: 10,
  maxSize: 500 * 1024 * 1024, // 500MB
  imageMaxSize: 50 * 1024 * 1024, // 50MB
  videoMaxSize: 500 * 1024 * 1024, // 500MB
  imageCompress: true,
  imageQuality: 0.8,
  requireCover: true,
  autoExtractCover: false,
  category: 'other',
  concurrent: 2
};

export interface MediaUploaderCoreOptions {
  config?: Partial<MediaUploadConfig>;
  userToken?: string;
  directUploadOss?: boolean;
  onUploadStart?: (files: MediaFileItem[]) => void;
  onUploadProgress?: (progress: UploadProgressInfo) => void;
  onFileProgress?: (fileId: string, progress: DirectUploadProgress) => void;
  onUploadSuccess?: (results: DirectUploadResult[]) => void;
  onUploadError?: (error: Error, fileId?: string) => void;
  onUploadPause?: (fileId: string) => void;
  onUploadResume?: (fileId: string) => void;
  onUploadCancel?: (fileId: string) => void;
}

export class MediaUploaderCore {
  private config: MediaUploadConfig;
  private validator: FileValidator;
  private chunkManager: ChunkUploadManager;
  private progressTracker: UploadProgressTracker;
  private progressManager: ProgressUpdateManager;
  private options: MediaUploaderCoreOptions;

  // 状态管理
  private fileUploadStates = new Map<string, FileUploadState>();
  private fileProgresses = new Map<string, DirectUploadProgress>();
  private uploadAbortController: AbortController | null = null;
  private isUploading = false;

  constructor(options: MediaUploaderCoreOptions = {}) {
    this.options = options;
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.validator = new FileValidator(this.config);
    this.chunkManager = new ChunkUploadManager();
    this.progressTracker = new UploadProgressTracker();
    this.progressManager = new ProgressUpdateManager(50); // 50ms节流间隔
  }

  /**
   * 创建媒体文件项
   */
  private createMediaFileItem(file: File): MediaFileItem {
    const fileId = Math.random().toString(36).substr(2, 9);
    const fileType = this.validator.getFileType(file);

    return {
      id: fileId,
      file,
      type: fileType,
      status: UploadStatus.PENDING,
      progress: 0,
      preview: URL.createObjectURL(file)
    };
  }

  /**
   * 处理上传错误
   */
  private async handleUploadError(
    error: any,
    file: File,
    retryCount: number,
    maxRetries: number
  ): Promise<{ shouldRetry: boolean; delay: number }> {
    console.error('Upload error:', error);

    // 检查是否是取消操作
    if (error?.message === '上传已取消') {
      return { shouldRetry: false, delay: 0 };
    }

    // 检查网络错误
    if (error?.code === 'NETWORK_ERROR' || error?.name === 'NetworkError') {
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        message.warning(`网络错误，${delay / 1000}秒后重试...`);
        return { shouldRetry: true, delay };
      }
    }

    // 检查服务器错误
    if (error?.status >= 500 && retryCount < maxRetries) {
      const delay = Math.min(2000 * Math.pow(2, retryCount), 15000);
      message.warning(`服务器错误，${delay / 1000}秒后重试...`);
      return { shouldRetry: true, delay };
    }

    // 其他错误不重试
    const errorMessage = error?.message || error?.toString() || '上传失败';
    message.error(`${file.name} 上传失败: ${errorMessage}`);
    this.options.onUploadError?.(error, file.name);

    return { shouldRetry: false, delay: 0 };
  }

  /**
   * 处理视频封面上传
   */
  private async handleVideoCoverUpload(
    fileId: string,
    videoFile: File,
    videoCoverInfo: { videoFile: File; coverSelection: VideoCoverSelection }
  ): Promise<void> {
    try {
      const { coverSelection } = videoCoverInfo;

      if (coverSelection.coverType === 'upload' && coverSelection.coverFile) {
        await fileService.uploadVedioCover(coverSelection.coverFile, fileId);
        message.success('视频封面上传成功');
      } else if (coverSelection.coverType === 'frame' && coverSelection.selectedFrame) {
        // 处理视频帧封面
        const frame = coverSelection.selectedFrame;
        if (frame.blob) {
          const coverFile = new File([frame.blob], `${videoFile.name}_cover.jpg`, { type: 'image/jpeg' });
          await fileService.uploadVedioCover(coverFile, fileId);
          message.success('视频封面上传成功');
        }
      }
    } catch (error) {
      console.error('Cover upload error:', error);
      message.warning('封面上传失败，但视频上传成功');
    }
  }

  /**
   * 上传单个文件
   */
  private async uploadSingleFile(
    file: File,
    fileItem: MediaFileItem,
    videoCoverInfo?: { videoFile: File; coverSelection: VideoCoverSelection }
  ): Promise<DirectUploadResult> {
    const maxRetries = 5;
    let retryCount = 0;

    const attemptUpload = async (): Promise<DirectUploadResult> => {
      try {
        // 检查是否已取消
        if (this.uploadAbortController?.signal.aborted) {
          throw new Error('上传已取消');
        }

        const fileType = this.validator.getFileType(file);
        let result: DirectUploadResult;

        // 根据文件大小和配置选择上传方式
        const shouldUseChunkedUpload = file.size > 10 * 1024 * 1024; // 10MB以上使用分块上传

        if (shouldUseChunkedUpload) {
          // 使用分块上传
          const chunkResult = await this.chunkManager.uploadFileWithChunks(
            file,
            this.config.category!,
            (progress) => {
              // 确保进度值有效
              const validProgress = Math.min(Math.max(progress, 0), 100);
              const loadedBytes = Math.round(file.size * validProgress / 100);
              
              // 更新文件进度
              const progressInfo = this.progressTracker.updateFileProgress(
                fileItem.id,
                loadedBytes,
                file.size
              );
              
              // 存储进度信息
              this.fileProgresses.set(fileItem.id, progressInfo);
              
              // 触发文件级进度回调
              this.options.onFileProgress?.(fileItem.id, progressInfo);
              
              // 使用节流更新总体进度
              this.progressManager.throttleFileProgress(fileItem.id, () => {
                this.updateOverallProgress();
              });
              
              console.log(`📊 分片上传进度: ${validProgress}% (${loadedBytes}/${file.size} 字节)`);
            },
            (chunkIndex, chunkProgress) => {
              console.log(`📦 分片 ${chunkIndex + 1} 进度: ${chunkProgress}%`);
            }
          );

          result = {
            id: chunkResult.id,
            url: chunkResult.url,
            fileType,
            category: this.config.category!,
            filename: chunkResult.filename,
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            fileSize: file.size,
          };

        } else if (this.options.directUploadOss) {
          // OSS直传
          const onProgress = (progress: DirectUploadProgress) => {
            if (this.uploadAbortController?.signal.aborted) {
              throw new Error('上传已取消');
            }
            this.fileProgresses.set(fileItem.id, progress);
            this.options.onFileProgress?.(fileItem.id, progress);
          };

          const uploader = new DirectUploader(file, {
            fileType,
            category: this.config.category!,
            onProgress
          });

          result = await uploader.upload();

        } else {
          // 服务端上传
          this.progressTracker.initFileProgress(fileItem.id, (progress) => {
            this.fileProgresses.set(fileItem.id, progress);
            this.options.onFileProgress?.(fileItem.id, progress);
          });

          const resp = await fileService.uploadFile(file, {
            fileType,
            category: this.config.category!,
          });

          if (this.uploadAbortController?.signal.aborted) {
            throw new Error('上传已取消');
          }

          if (!resp.data || !resp.data.fileUrl || !resp.data.id) {
            throw new Error('上传失败');
          }

          result = {
            id: resp.data.id,
            url: resp.data.fileUrl,
            fileType,
            category: this.config.category!,
            filename: resp.data.filename || file.name,
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            fileSize: resp.data.fileSize || file.size,
          };

          // 更新最终进度
          this.progressTracker.updateFileProgress(fileItem.id, file.size, file.size, {
            status: DirectUploadStatus.COMPLETED
          });
        }

        if (this.uploadAbortController?.signal.aborted) {
          throw new Error('上传已取消');
        }

        if (!result || !result.id) {
          throw new Error('上传失败');
        }

        // 如果是视频文件且有封面信息，上传封面
        if (videoCoverInfo) {
          await this.handleVideoCoverUpload(result.id, file, videoCoverInfo);
        }

        message.success(`${file.name} 上传成功`);
        return result;

      } catch (error: any) {
        // 检查是否是取消操作
        if (error?.message === '上传已取消' || error?.message === 'Upload cancelled') {
          console.log(`File ${file.name} upload cancelled`);
          throw new Error('Upload cancelled');
        }

        const { shouldRetry, delay } = await this.handleUploadError(error, file, retryCount, maxRetries);

        if (shouldRetry) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptUpload();
        }

        throw error;
      }
    };

    return attemptUpload();
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(
    files: File[],
    videoCoverInfo?: { videoFile: File; coverSelection: VideoCoverSelection }
  ): Promise<DirectUploadResult[]> {
    // 验证文件
    const { validFiles, invalidFiles } = this.validator.validateFiles(files);

    if (invalidFiles.length > 0) {
      invalidFiles.forEach(({ file, error }) => {
        message.error(`${file.name}: ${error}`);
      });
    }

    if (validFiles.length === 0) {
      throw new Error('没有有效的文件可以上传');
    }

    // 创建文件项
    const fileItems = validFiles.map(file => this.createMediaFileItem(file));

    // 初始化上传状态
    this.isUploading = true;
    this.uploadAbortController = new AbortController();

    // 初始化进度跟踪
    fileItems.forEach(item => {
      this.progressTracker.initFileProgress(item.id);
    });

    // 触发上传开始回调
    this.options.onUploadStart?.(fileItems);

    try {
      // 并发上传
      const concurrency = this.config.concurrent || 2;
      const results: DirectUploadResult[] = [];

      for (let i = 0; i < validFiles.length; i += concurrency) {
        const batch = validFiles.slice(i, i + concurrency);
        const batchItems = fileItems.slice(i, i + concurrency);

        const batchPromises = batch.map((file, index) => {
          const fileItem = batchItems[index];
          return this.uploadSingleFile(file, fileItem, videoCoverInfo);
        });

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            const error = result.reason;
            // 如果是取消操作，不记录为错误
            if (error?.message !== 'Upload cancelled') {
              console.error(`File ${batch[index].name} upload failed:`, error);
            } else {
              console.log(`File ${batch[index].name} upload cancelled`);
            }
          }
        });

        // 更新总体进度
        const overallProgress = this.progressTracker.calculateOverallProgress(this.fileProgresses);
        this.options.onUploadProgress?.(overallProgress);
      }

      // 触发成功回调
      this.options.onUploadSuccess?.(results);

      return results;

    } catch (error: any) {
      // 如果是取消操作，不触发错误回调
      if (error?.message !== 'Upload cancelled') {
        this.options.onUploadError?.(error);
      }
      throw error;
    } finally {
      this.isUploading = false;
      this.uploadAbortController = null;
    }
  }

  /**
   * 取消上传
   */
  cancelUpload(): void {
    if (this.uploadAbortController) {
      this.uploadAbortController.abort();
    }
    this.chunkManager.cancelAllUploads();
    this.isUploading = false;
    message.info('已取消上传');
  }

  /**
   * 暂停上传
   */
  pauseUpload(fileId?: string): void {
    if (fileId) {
      this.chunkManager.cancelChunkUpload(fileId);
      this.progressTracker.pauseFileProgress(fileId);
      this.options.onUploadPause?.(fileId);
    }
  }

  /**
   * 恢复上传
   */
  resumeUpload(fileId?: string): void {
    if (fileId) {
      this.progressTracker.resumeFileProgress(fileId);
      this.options.onUploadResume?.(fileId);
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MediaUploadConfig>): void {
    this.config = { ...this.config, ...config };
    this.validator.updateConfig(this.config);
  }

  /**
   * 获取上传状态
   */
  getUploadStatus(): {
    isUploading: boolean;
    fileCount: number;
    overallProgress: UploadProgressInfo;
  } {
    return {
      isUploading: this.isUploading,
      fileCount: this.fileProgresses.size,
      overallProgress: this.progressTracker.calculateOverallProgress(this.fileProgresses)
    };
  }

  /**
   * 获取当前配置
   */
  getConfig(): MediaUploadConfig {
    return this.config;
  }

  /**
   * 更新总体进度
   */
  private updateOverallProgress(): void {
    const overallProgress = this.progressTracker.calculateOverallProgress(this.fileProgresses);
    this.options.onUploadProgress?.(overallProgress);
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.cancelUpload();
    this.progressTracker.cleanup();
    this.progressManager.cleanup();
    this.fileUploadStates.clear();
    this.fileProgresses.clear();
  }
}
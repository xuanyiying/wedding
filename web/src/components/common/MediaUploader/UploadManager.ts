/**
 * 统一的上传管理器
 * 整合所有上传功能：分块上传、进度跟踪、网络监控、断点续传等
 */

import { message } from 'antd';
import { directUploadService } from '../../../services';
import type { DirectUploadResult, DirectUploadProgress, DirectUploadStatusType } from '../../../utils/direct-upload';
import { DirectUploadStatus } from '../../../utils/direct-upload';
import type { MediaFileItem, MediaUploadConfig, UploadProgressInfo, VideoCoverSelection } from './types';
import { UploadStatus } from './types';
import { FileType } from "../../../types";

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


// 进度信息
interface FileProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number;
  remainingTime: number;
  status: DirectUploadStatusType;
  lastUpdate?: number;
}

export interface UploadManagerOptions {
  config?: Partial<MediaUploadConfig>;
  userToken?: string;
  directUploadOss?: boolean;
  onUploadStart?: (files: MediaFileItem[]) => void;
  onUploadProgress?: (progress: UploadProgressInfo) => void;
  onFileProgress?: (fileId: string, progress: DirectUploadProgress) => void;
  onUploadSuccess?: (results: DirectUploadResult[]) => void;
  onUploadError?: (error: Error, fileId?: string) => void;
}

export class UploadManager {
  private config: MediaUploadConfig;
  private options: UploadManagerOptions;
  
  // 状态管理
  private activeUploads = new Map<string, AbortController>();
  private fileProgresses = new Map<string, FileProgress>();
  
  // 进度节流
  private progressThrottlers = new Map<string, ReturnType<typeof setTimeout>>();
  
  constructor(options: UploadManagerOptions = {}) {
    this.options = options;
    this.config = { ...DEFAULT_CONFIG, ...options.config };
  }

  /**
   * 文件验证
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    // 检查文件大小
    if (file.size > this.config.maxSize!) {
      return { valid: false, error: `文件大小超过限制 ${this.formatFileSize(this.config.maxSize!)}` };
    }

    // 检查文件类型
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return { valid: false, error: '不支持的文件类型' };
    }

    if (isImage && file.size > this.config.imageMaxSize!) {
      return { valid: false, error: `图片大小超过限制 ${this.formatFileSize(this.config.imageMaxSize!)}` };
    }

    if (isVideo && file.size > this.config.videoMaxSize!) {
      return { valid: false, error: `视频大小超过限制 ${this.formatFileSize(this.config.videoMaxSize!)}` };
    }

    return { valid: true };
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * 创建媒体文件项
   */
  private createMediaFileItem(file: File): MediaFileItem {
    const fileId = Math.random().toString(36).slice(2, 9);
    const fileType = file.type.startsWith('image/') ? 'image' : 'video';

    return {
      id: fileId,
      file,
      type: fileType,
      status: UploadStatus.PENDING,
      progress: 0,
      preview: URL.createObjectURL(file),
    };
  }

  /**
   * 更新文件进度
   */
  private updateFileProgress(fileId: string, loaded: number, total: number): void {
    const now = Date.now();
    const existing = this.fileProgresses.get(fileId);
    
    const progress: FileProgress = {
      loaded,
      total,
      percentage: Math.round((loaded / total) * 100),
      speed: existing && existing.lastUpdate ? (loaded - existing.loaded) / ((now - existing.lastUpdate) / 1000) : 0,
      remainingTime: existing && existing.speed > 0 ? (total - loaded) / existing.speed : 0,
      status: loaded >= total ? DirectUploadStatus.COMPLETED : DirectUploadStatus.UPLOADING,
      lastUpdate: now
    };

    this.fileProgresses.set(fileId, progress);

    // 节流更新
    if (this.progressThrottlers.has(fileId)) {
      clearTimeout(this.progressThrottlers.get(fileId)!);
    }

    const timeoutId = setTimeout(() => {
      this.options.onFileProgress?.(fileId, {
        loaded,
        total,
        percentage: progress.percentage,
        speed: progress.speed,
        remainingTime: progress.remainingTime,
        status: progress.status
      });
      this.updateOverallProgress();
    }, 100);
    this.progressThrottlers.set(fileId, timeoutId);
  }

  /**
   * 更新总体进度
   */
  private updateOverallProgress(): void {
    const progresses = Array.from(this.fileProgresses.values());
    if (progresses.length === 0) return;

    const total = progresses.length;
    const completed = progresses.filter(p => p.status === DirectUploadStatus.COMPLETED).length;
    const uploading = progresses.filter(p => p.status === DirectUploadStatus.UPLOADING).length;
    const failed = progresses.filter(p => p.status === DirectUploadStatus.ERROR).length;
    
    const totalBytes = progresses.reduce((sum, p) => sum + p.total, 0);
    const loadedBytes = progresses.reduce((sum, p) => sum + p.loaded, 0);
    const avgSpeed = progresses.reduce((sum, p) => sum + p.speed, 0) / progresses.length;
    const remainingBytes = totalBytes - loadedBytes;
    const remainingTime = avgSpeed > 0 ? remainingBytes / avgSpeed : 0;

    // 修复 ESLint 错误：正确调用函数
    this.options.onUploadProgress?.({
      total,
      completed,
      failed,
      uploading,
      percentage: Math.round((loadedBytes / totalBytes) * 100),
      speed: avgSpeed,
      remainingTime
    });
  }

  /**
   * 上传单个文件
   */
  private async uploadSingleFile(
    file: File,
    fileItem: MediaFileItem,
    videoCoverInfo?: { videoFile: File; coverSelection: VideoCoverSelection }
  ): Promise<DirectUploadResult> {
    try {
      let thumbnailPromise: Promise<string | { url: string; fileId: string } | undefined> | undefined;

      // 视频文件处理逻辑：必须首先选择或上传封面图片
      if (file.type.startsWith('video/')) {
        const isTargetVideo = videoCoverInfo && file === videoCoverInfo.videoFile;
        const coverSelection = isTargetVideo ? videoCoverInfo.coverSelection : undefined;
        
        // 强制约束：如果是目标视频但没有封面信息，且配置要求封面，中止上传
        if (isTargetVideo && !coverSelection && this.config.requireCover !== false) {
          throw new Error(`视频文件 "${file.name}" 必须选择封面图才能上传`);
        }

        if (coverSelection) {
          let coverFile: File | null = null;
          if (coverSelection.coverType === 'upload' && coverSelection.coverFile) {
            coverFile = coverSelection.coverFile;
          } else if (coverSelection.coverType === 'frame' && coverSelection.selectedFrame?.blob) {
            coverFile = new File(
              [coverSelection.selectedFrame.blob],
              `${file.name}_cover.jpg`,
              { type: 'image/jpeg' }
            );
          }

          if (coverFile) {
            // 1. 系统优先上传封面图片
            try {
              const coverResp = await directUploadService.uploadFile(
                coverFile,
                FileType.IMAGE,
                this.config.category
              );
              
              // 2. 封面成功上传后，存储返回的信息，用于后续视频确认
              thumbnailPromise = Promise.resolve({
                url: coverResp.url,
                fileId: coverResp.fileId
              });
            } catch (coverError) {
              console.error('封面上传失败，中止视频上传流程:', coverError);
              throw new Error(`封面图上传失败: ${coverError instanceof Error ? coverError.message : '未知错误'}`);
            }
          }
        }
      }

      // 3. 封面成功后（或无需封面），开始上传视频文件
      const fileType = file.type.startsWith('image/') ? FileType.IMAGE : FileType.VIDEO;
      
      const result = await directUploadService.uploadFile(
        file,
        fileType,
        this.config.category,
        {
          thumbnailUrl: thumbnailPromise,
          onProgress: (progress) => {
            this.updateFileProgress(fileItem.id, progress.loaded, progress.total);
          }
        }
      );

      return result;
    } catch (error) {
      const progress = this.fileProgresses.get(fileItem.id);
      if (progress) {
        progress.status = DirectUploadStatus.ERROR;
        this.fileProgresses.set(fileItem.id, progress);
      }
      throw error;
    }
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(
    files: File[],
    videoCoverInfo?: { videoFile: File; coverSelection: VideoCoverSelection }
  ): Promise<DirectUploadResult[]> {
    // 验证文件
    const validFiles: File[] = [];
    const invalidFiles: { file: File; error: string }[] = [];

    files.forEach(file => {
      const validation = this.validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        invalidFiles.push({ file, error: validation.error! });
      }
    });

    // 显示验证错误
    invalidFiles.forEach(({ file, error }) => {
      message.error(`${file.name}: ${error}`);
    });

    if (validFiles.length === 0) {
      throw new Error('没有有效的文件可以上传');
    }

    // 创建文件项
    const fileItems = validFiles.map(file => this.createMediaFileItem(file));
    
    // 初始化进度跟踪
    fileItems.forEach(item => {
      this.fileProgresses.set(item.id, {
        loaded: 0,
        total: item.file.size,
        percentage: 0,
        speed: 0,
        remainingTime: 0,
        status: DirectUploadStatus.PENDING
      });
    });

    // 触发开始回调
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
          const controller = new AbortController();
          this.activeUploads.set(fileItem.id, controller);
          
          return this.uploadSingleFile(file, fileItem, videoCoverInfo);
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          const fileItem = batchItems[index];
          this.activeUploads.delete(fileItem.id);
          
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error(`File ${batch[index].name} upload failed:`, result.reason);
          }
        });
      }

      this.options.onUploadSuccess?.(results);
      return results;
    } catch (error) {
      this.options.onUploadError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 取消上传
   */
  cancelUpload(fileId?: string): void {
    if (fileId) {
      const controller = this.activeUploads.get(fileId);
      if (controller) {
        controller.abort();
        this.activeUploads.delete(fileId);
      }
    } else {
      // 取消所有上传
      this.activeUploads.forEach(controller => controller.abort());
      this.activeUploads.clear();
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MediaUploadConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): MediaUploadConfig {
    return this.config;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.cancelUpload();
    this.fileProgresses.clear();
    this.progressThrottlers.forEach(timeoutId => clearTimeout(timeoutId));
    this.progressThrottlers.clear();
  }
}
/**
 * 统一的上传管理器
 * 整合所有上传功能：分块上传、进度跟踪、网络监控、断点续传等
 */

import { message } from 'antd';
import { fileService } from '../../../services';
import { DirectUploader } from '../../../utils/direct-upload';
import type { DirectUploadResult, DirectUploadProgress, DirectUploadStatusType } from '../../../utils/direct-upload';
import { DirectUploadStatus } from '../../../utils/direct-upload';
import type { MediaFileItem, MediaUploadConfig, UploadProgressInfo, VideoCoverSelection } from './types';
import { UploadStatus } from './types';
import { http } from "../../../utils/request.ts";

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

// 分块配置
const CHUNK_CONFIG = {
  SMALL_FILE_THRESHOLD: 10 * 1024 * 1024, // 10MB
  DEFAULT_CHUNK_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_CHUNK_SIZE: 50 * 1024 * 1024, // 50MB
  MIN_CHUNK_SIZE: 1 * 1024 * 1024, // 1MB
  MAX_CONCURRENT: 6,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// 网络状态
interface NetworkMetrics {
  speed: number; // bytes/s
  latency: number; // ms
  stability: 'stable' | 'unstable' | 'poor';
}

// 上传会话
interface UploadSession {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  createdAt: number;
  lastActivity: number;
}

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
  private uploadSessions = new Map<string, UploadSession>();
  private fileProgresses = new Map<string, FileProgress>();
  private networkMetrics: NetworkMetrics = { speed: 0, latency: 0, stability: 'stable' };
  
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
   * 计算最优分块策略
   */
  private calculateChunkStrategy(fileSize: number): { chunkSize: number; concurrent: number } {
    const { speed, stability } = this.networkMetrics;
    
    let chunkSize = CHUNK_CONFIG.DEFAULT_CHUNK_SIZE;
    let concurrent = 3;

    // 根据文件大小调整
    if (fileSize > 100 * 1024 * 1024) { // > 100MB
      chunkSize = Math.min(20 * 1024 * 1024, CHUNK_CONFIG.MAX_CHUNK_SIZE);
      concurrent = 4;
    } else if (fileSize > 50 * 1024 * 1024) { // > 50MB
      chunkSize = 10 * 1024 * 1024;
      concurrent = 3;
    }

    // 根据网络状况调整
    if (speed > 50 * 1024 * 1024) { // > 50MB/s
      concurrent = Math.min(concurrent + 2, CHUNK_CONFIG.MAX_CONCURRENT);
    } else if (speed < 5 * 1024 * 1024) { // < 5MB/s
      concurrent = Math.max(concurrent - 1, 1);
      chunkSize = Math.max(chunkSize / 2, CHUNK_CONFIG.MIN_CHUNK_SIZE);
    }

    if (stability === 'unstable') {
      concurrent = Math.max(concurrent - 1, 1);
    } else if (stability === 'poor') {
      concurrent = 1;
      chunkSize = CHUNK_CONFIG.MIN_CHUNK_SIZE;
    }

    return { chunkSize, concurrent };
  }

  /**
   * 创建文件分块
   */
  private createFileChunks(file: File, chunkSize: number): Blob[] {
    const chunks: Blob[] = [];
    let start = 0;

    while (start < file.size) {
      const end = Math.min(start + chunkSize, file.size);
      chunks.push(file.slice(start, end));
      start = end;
    }

    return chunks;
  }

  /**
   * 上传单个分块
   */
  private async uploadChunk(
    chunk: Blob,
    chunkIndex: number,
    uploadId: string,
    fileName: string,
    retryCount = 0
  ): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('chunk', chunk, `chunk_${chunkIndex}`);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('uploadId', uploadId);

      const response = await http.upload('/files/chunk/upload', formData);

      if (!response.success) {
        throw new Error(`分块上传失败: ${response.message}`);
      }
    } catch (error) {
      if (retryCount < CHUNK_CONFIG.RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, CHUNK_CONFIG.RETRY_DELAY * (retryCount + 1)));
        return this.uploadChunk(chunk, chunkIndex, uploadId, fileName, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * 分块上传文件
   */
  private async uploadFileWithChunks(
    file: File,
    fileId: string,
    onProgress: (progress: number) => void
  ): Promise<DirectUploadResult> {
    const { chunkSize, concurrent } = this.calculateChunkStrategy(file.size);
    const chunks = this.createFileChunks(file, chunkSize);
    
    // 1. 初始化分块上传，从服务器获取 uploadId
    const initResponse = await http.post<{ uploadId: string; uploadUrl: string }>('/files/chunk/init', {
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      category: this.config.category,
      totalChunks: chunks.length
    });

    if (!initResponse.success || !initResponse.data?.uploadId) {
      throw new Error('初始化分块上传失败');
    }

    const uploadId = initResponse.data.uploadId;
    
    // 创建本地上传会话
    const session: UploadSession = {
      id: uploadId,
      fileId,
      fileName: file.name,
      fileSize: file.size,
      chunkSize,
      totalChunks: chunks.length,
      uploadedChunks: new Set(),
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    this.uploadSessions.set(uploadId, session);

    // 2. 并发上传分块
    const semaphore = new Semaphore(concurrent);
    const uploadPromises = chunks.map((chunk, index) =>
      semaphore.acquire(async () => {
        await this.uploadChunk(chunk, index, uploadId, file.name);
        session.uploadedChunks.add(index);
        session.lastActivity = Date.now();
        
        const progress = (session.uploadedChunks.size / chunks.length) * 100;
        onProgress(progress);
      })
    );

    await Promise.all(uploadPromises);

    // 3. 完成上传
    const completeResponse = await http.post('/files/chunk/complete', {
      uploadId
    });

    if (!completeResponse.success) {
      throw new Error('完成分块上传失败');
    }

    const result = completeResponse.data as DirectUploadResult;
    this.uploadSessions.delete(uploadId);

    return {
      id: result.id,
      url: result.url,
      fileType: file.type.startsWith('image/') ? 'image' : 'video',
      category: this.config.category!,
      filename: result.filename || file.name,
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size,
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
    const shouldUseChunkedUpload = file.size > CHUNK_CONFIG.SMALL_FILE_THRESHOLD;
    
    try {
      let result: DirectUploadResult;

      if (shouldUseChunkedUpload) {
        // 分块上传
        result = await this.uploadFileWithChunks(file, fileItem.id, (progress) => {
          const loadedBytes = Math.round((file.size * progress) / 100);
          this.updateFileProgress(fileItem.id, loadedBytes, file.size);
        });
      } else if (this.options.directUploadOss) {
        // OSS直传
        const uploader = new DirectUploader(file, {
          fileType: file.type.startsWith('image/') ? 'image' : 'video',
          category: this.config.category!,
          onProgress: (progress) => {
            this.updateFileProgress(fileItem.id, progress.loaded, progress.total);
          }
        });
        result = await uploader.upload();
      } else {
        // 服务端上传
        const resp = await fileService.uploadFile(file, {
          fileType: file.type.startsWith('image/') ? 'image' : 'video',
          category: this.config.category!,
        });

        if (!resp.data?.fileUrl || !resp.data?.id) {
          throw new Error('上传失败');
        }

        result = {
          id: resp.data.id,
          url: resp.data.fileUrl,
          fileType: file.type.startsWith('image/') ? 'image' : 'video',
          category: this.config.category!,
          filename: resp.data.filename || file.name,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          fileSize: resp.data.fileSize || file.size,
        };

        this.updateFileProgress(fileItem.id, file.size, file.size);
      }

      // 处理视频封面
      if (videoCoverInfo && result.id) {
        await this.handleVideoCoverUpload(result.id, file, videoCoverInfo);
      }

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
        await fileService.uploadVideoCover(coverSelection.coverFile, fileId);
      } else if (coverSelection.coverType === 'frame' && coverSelection.selectedFrame?.blob) {
        const coverFile = new File(
          [coverSelection.selectedFrame.blob],
          `${videoFile.name}_cover.jpg`,
          { type: 'image/jpeg' }
        );
        await fileService.uploadVideoCover(coverFile, fileId);
      }
    } catch (error) {
      console.warn('封面上传失败:', error);
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
    this.uploadSessions.clear();
    this.fileProgresses.clear();
    this.progressThrottlers.forEach(timeoutId => clearTimeout(timeoutId));
    this.progressThrottlers.clear();
  }
}

// 信号量控制并发
class Semaphore {
  private capacity: number;
  private running: number = 0;
  private queue: Array<() => void> = [];

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  async acquire<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = async () => {
        this.running++;
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          if (this.queue.length > 0) {
            const next = this.queue.shift()!;
            next();
          }
        }
      };

      if (this.running < this.capacity) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }
}
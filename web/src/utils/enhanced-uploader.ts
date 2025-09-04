import { http, uploadRequest } from './request';
import { EnhancedUploadStatus } from '../types/enhanced-upload.types';
import type {
  EnhancedUploadConfig,
  EnhancedUploadProgress,
  EnhancedUploadResult,
  EnhancedUploadStatusType,
  UploadSessionInfo
} from '../types/enhanced-upload.types';

/**
 * 增强上传器
 * 支持直传OSS和服务端上传两种模式
 */
export class EnhancedUploader {
  private file: File;
  private config: EnhancedUploadConfig;
  private uploadSessionId: string | null = null;
  private uploadUrl: string | null = null;
  private ossKey: string | null = null;
  private abortController: AbortController | null = null;
  private status: EnhancedUploadStatusType = EnhancedUploadStatus.PENDING;
  private startTime: number = 0;
  private processedFile: File | null = null;
  private uploadMode: 'direct' | 'server' = 'server';
  private chunks: { index: number, blob: Blob, uploaded: boolean }[] = [];
  private isPaused: boolean = false;
  private uploadedChunks: Set<number> = new Set();
  private chunkSize: number = 5 * 1024 * 1024; // 默认5MB
  private resumable: boolean = false;

  constructor(file: File, config: EnhancedUploadConfig) {
    this.file = file;
    this.config = {
      retryCount: 3,
      retryDelay: 1000,
      maxRetryDelay: 30000,
      retryBackoffType: 'exponential',
      enableJitter: true,
      timeout: 300000, // 5分钟
      enableCompression: true,
      compressionQuality: 0.8,
      enableDirectUpload: true, // 默认启用直传
      enableResume: true, // 默认启用断点续传
      chunkSize: 5 * 1024 * 1024, // 默认5MB
      ...config
    };

    if (this.config.chunkSize) {
      this.chunkSize = this.config.chunkSize;
    }
  }

  /**
   * 开始上传
   */
  async upload(): Promise<EnhancedUploadResult> {
    try {
      this.updateStatus(EnhancedUploadStatus.PREPARING);

      // 1. 预处理文件（压缩等）
      await this.preprocessFile();

      // 2. 初始化上传会话
      const sessionInfo = await this.initializeUploadSession();
      this.uploadSessionId = sessionInfo.uploadSessionId;
      this.uploadUrl = sessionInfo.uploadUrl || null;
      this.ossKey = sessionInfo.ossKey || null;
      this.uploadMode = sessionInfo.uploadMode;

      // 更新分片大小
      if (sessionInfo.chunkSize) {
        this.chunkSize = sessionInfo.chunkSize;
      }

      // 更新是否支持断点续传
      this.resumable = sessionInfo.resumable || false;

      // 3. 根据上传模式执行不同的上传流程
      this.updateStatus(EnhancedUploadStatus.UPLOADING);

      if (this.uploadMode === 'direct' && this.uploadUrl) {
        // 直传OSS
        if (this.resumable && this.config.enableResume && this.file.size > this.chunkSize) {
          // 分片上传
          await this.uploadChunksWithRetry();
        } else {
          // 普通上传
          await this.uploadToOssWithRetry();
        }
      } else {
        // 服务端上传
        await this.uploadToServerWithRetry();
      }

      // 4. 确认上传完成
      const result = await this.confirmUpload();

      this.updateStatus(EnhancedUploadStatus.COMPLETED);
      this.config.onSuccess?.(result);

      return result;
    } catch (error) {
      if (this.status !== EnhancedUploadStatus.CANCELLED) {
        this.updateStatus(EnhancedUploadStatus.FAILED);
        const uploadError = error instanceof Error ? error : new Error('上传失败');
        this.config.onError?.(uploadError);
        throw uploadError;
      }
      throw new Error('上传已取消');
    }
  }

  /**
   * 暂停上传
   */
  async pause(): Promise<void> {
    if (this.status === EnhancedUploadStatus.UPLOADING) {
      this.isPaused = true;
      this.updateStatus(EnhancedUploadStatus.PAUSED);

      // 取消当前正在进行的请求
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
    }
  }

  /**
   * 恢复上传
   */
  async resume(): Promise<EnhancedUploadResult> {
    if (this.status === EnhancedUploadStatus.PAUSED) {
      this.isPaused = false;
      this.updateStatus(EnhancedUploadStatus.UPLOADING);

      if (this.uploadMode === 'direct' && this.resumable && this.chunks.length > 0) {
        // 恢复分片上传
        await this.uploadChunksWithRetry();
      } else if (this.uploadSessionId) {
        // 尝试从服务器恢复上传
        await this.resumeUploadFromServer();
      } else {
        // 无法恢复，重新开始上传
        return this.upload();
      }

      // 确认上传完成
      const result = await this.confirmUpload();
      this.updateStatus(EnhancedUploadStatus.COMPLETED);
      this.config.onSuccess?.(result);
      return result;
    }

    throw new Error('当前状态无法恢复上传');
  }

  /**
   * 取消上传
   */
  async cancel(): Promise<void> {
    try {
      this.updateStatus(EnhancedUploadStatus.CANCELLED);

      // 取消正在进行的请求
      if (this.abortController) {
        this.abortController.abort();
      }

      // 通知后端取消上传
      if (this.uploadSessionId) {
        await http.post('/enhanced-upload/cancel', {
          uploadSessionId: this.uploadSessionId
        });
      }
    } catch (error) {
      console.warn('取消上传时发生错误:', error);
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): EnhancedUploadStatusType {
    return this.status;
  }

  /**
   * 获取OSS Key
   */
  getOssKey(): string | null {
    return this.ossKey;
  }

  /**
   * 预处理文件（压缩等）
   */
  private async preprocessFile(): Promise<void> {
    if (this.config.fileType === 'image' && this.config.enableCompression) {
      this.processedFile = await this.compressImage(this.file);
    } else {
      this.processedFile = this.file;
    }

    // 如果启用了断点续传且文件大小超过分片大小，则准备分片
    if (this.config.enableResume && this.file.size > (this.config.chunkSize || this.chunkSize)) {
      this.prepareChunks();
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
        const maxWidth = this.config.maxWidth || 1920;
        const maxHeight = this.config.maxHeight || 1080;
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
   * 准备文件分片
   */
  private prepareChunks(): void {
    const file = this.processedFile || this.file;
    const chunkSize = this.config.chunkSize || this.chunkSize;
    const chunks: { index: number, blob: Blob, uploaded: boolean }[] = [];

    let start = 0;
    let index = 0;

    while (start < file.size) {
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      chunks.push({
        index,
        blob: chunk,
        uploaded: false
      });

      start = end;
      index++;
    }

    this.chunks = chunks;
  }

  /**
   * 初始化上传会话
   */
  private async initializeUploadSession(): Promise<UploadSessionInfo> {
    const fileToUpload = this.processedFile || this.file;

    const response = await http.post<UploadSessionInfo>('/enhanced-upload/initialize', {
      fileName: fileToUpload.name,
      fileSize: fileToUpload.size,
      contentType: fileToUpload.type,
      fileType: this.config.fileType,
      category: this.config.category,
      enableDirectUpload: this.config.enableDirectUpload,
      enableResume: this.config.enableResume,
      timeout: this.config.timeout
    });

    if (!response.success || !response.data) {
      throw new Error(response.message || '初始化上传会话失败');
    }

    return response.data;
  }

  /**
   * 带重试机制的上传到OSS
   */
  private async uploadToOssWithRetry(): Promise<void> {
    let lastError: Error | null = null;
    const maxAttempts = this.config.retryCount || 3;

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      try {
        if (this.isPaused) {
          throw new Error('上传已暂停');
        }

        await this.uploadToOss();
        return; // 成功则返回
      } catch (error) {
        if (this.isPaused) {
          throw new Error('上传已暂停');
        }

        lastError = error instanceof Error ? error : new Error('上传失败');

        if (attempt < maxAttempts) {
          this.config.onRetry?.(attempt + 1, lastError);
          await this.delay(this.calculateRetryDelay(attempt));
        }
      }
    }

    throw lastError || new Error('上传失败，已达到最大重试次数');
  }

  /**
   * 带重试机制的上传到服务器
   */
  private async uploadToServerWithRetry(): Promise<void> {
    let lastError: Error | null = null;
    const maxAttempts = this.config.retryCount || 3;

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      try {
        if (this.isPaused) {
          throw new Error('上传已暂停');
        }

        await this.uploadToServer();
        return; // 成功则返回
      } catch (error) {
        if (this.isPaused) {
          throw new Error('上传已暂停');
        }

        lastError = error instanceof Error ? error : new Error('上传失败');

        if (attempt < maxAttempts) {
          this.config.onRetry?.(attempt + 1, lastError);
          await this.delay(this.calculateRetryDelay(attempt));
        }
      }
    }

    throw lastError || new Error('上传失败，已达到最大重试次数');
  }

  /**
   * 带重试机制的分片上传
   */
  private async uploadChunksWithRetry(): Promise<void> {
    if (this.chunks.length === 0) {
      this.prepareChunks();
    }

    // 如果有上传会话ID，先查询已上传的分片
    if (this.uploadSessionId && this.resumable) {
      await this.queryUploadedChunks();
    }

    // 上传所有未上传的分片
    const pendingChunks = this.chunks.filter(chunk => !chunk.uploaded && !this.uploadedChunks.has(chunk.index));

    // 更新进度信息
    this.updateChunkProgress();

    // 并发上传分片，最多5个并发
    const concurrency = 5;
    const chunks = [...pendingChunks];

    while (chunks.length > 0) {
      if (this.isPaused) {
        throw new Error('上传已暂停');
      }

      const batch = chunks.splice(0, concurrency);
      const promises = batch.map(chunk => this.uploadChunkWithRetry(chunk));

      await Promise.all(promises);
      this.updateChunkProgress();
    }

    // 完成分片上传
    await this.completeChunkedUpload();
  }

  /**
   * 上传单个分片（带重试）
   */
  private async uploadChunkWithRetry(chunk: { index: number, blob: Blob, uploaded: boolean }): Promise<void> {
    let lastError: Error | null = null;
    const maxAttempts = this.config.retryCount || 3;

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      try {
        if (this.isPaused) {
          throw new Error('上传已暂停');
        }

        await this.uploadChunk(chunk);
        chunk.uploaded = true;
        this.uploadedChunks.add(chunk.index);
        return; // 成功则返回
      } catch (error) {
        if (this.isPaused) {
          throw new Error('上传已暂停');
        }

        lastError = error instanceof Error ? error : new Error(`分片 ${chunk.index} 上传失败`);

        if (attempt < maxAttempts) {
          this.config.onRetry?.(attempt + 1, lastError);
          await this.delay(this.calculateRetryDelay(attempt));
        }
      }
    }

    throw lastError || new Error(`分片 ${chunk.index} 上传失败，已达到最大重试次数`);
  }

  /**
   * 上传单个分片
   */
  private async uploadChunk(chunk: { index: number, blob: Blob, uploaded: boolean }): Promise<void> {
    if (!this.uploadSessionId) {
      throw new Error('上传会话ID不存在');
    }

    const formData = new FormData();
    formData.append('file', chunk.blob);
    formData.append('uploadSessionId', this.uploadSessionId);
    formData.append('chunkIndex', chunk.index.toString());
    formData.append('totalChunks', this.chunks.length.toString());

    this.abortController = new AbortController();

    await uploadRequest.post('/enhanced-upload/chunk', formData, {
      signal: this.abortController.signal,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  /**
   * 查询已上传的分片
   */
  private async queryUploadedChunks(): Promise<void> {
    if (!this.uploadSessionId) {
      return;
    }

    try {
      const response = await http.get<{ uploadedChunks: number[] }>(`/enhanced-upload/chunks/${this.uploadSessionId}`);

      if (response.success && response.data && response.data.uploadedChunks) {
        // 更新已上传的分片信息
        response.data.uploadedChunks.forEach(index => {
          this.uploadedChunks.add(index);

          const chunk = this.chunks.find(c => c.index === index);
          if (chunk) {
            chunk.uploaded = true;
          }
        });
      }
    } catch (error) {
      console.warn('查询已上传分片失败:', error);
      // 继续上传，不中断流程
    }
  }

  /**
   * 完成分片上传
   */
  private async completeChunkedUpload(): Promise<void> {
    if (!this.uploadSessionId) {
      throw new Error('上传会话ID不存在');
    }

    await http.post(`/enhanced-upload/complete-chunks`, {
      uploadSessionId: this.uploadSessionId,
      totalChunks: this.chunks.length,
      fileSize: (this.processedFile || this.file).size
    });
  }

  /**
   * 从服务器恢复上传
   */
  private async resumeUploadFromServer(): Promise<void> {
    if (!this.uploadSessionId) {
      throw new Error('上传会话ID不存在');
    }

    // 查询上传状态
    const response = await http.get<{
      uploadMode: 'direct' | 'server';
      resumable: boolean;
      uploadUrl?: string;
      ossKey?: string;
      uploadedSize?: number;
      chunkSize?: number;
    }>(`/enhanced-upload/status/${this.uploadSessionId}`);

    if (!response.success || !response.data) {
      throw new Error('恢复上传失败');
    }

    const { uploadMode, resumable, uploadUrl, ossKey, chunkSize } = response.data;

    this.uploadMode = uploadMode;
    this.resumable = resumable;
    this.uploadUrl = uploadUrl || null;
    this.ossKey = ossKey || null;

    if (chunkSize) {
      this.chunkSize = chunkSize;
    }

    if (uploadMode === 'direct' && resumable && this.config.enableResume) {
      // 准备分片
      if (this.chunks.length === 0) {
        this.prepareChunks();
      }

      // 查询已上传的分片
      await this.queryUploadedChunks();

      // 继续上传分片
      await this.uploadChunksWithRetry();
    } else if (uploadMode === 'server') {
      // 服务端上传模式，从断点继续
      await this.uploadToServerWithRetry();
    } else {
      // 无法恢复，重新上传
      if (uploadMode === 'direct' && uploadUrl) {
        await this.uploadToOssWithRetry();
      } else {
        await this.uploadToServerWithRetry();
      }
    }
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
    const updateInterval = 500; // 500ms更新一次进度

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

            const progress: EnhancedUploadProgress = {
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

      // 设置超时
      if (this.config.timeout) {
        xhr.timeout = this.config.timeout;
        xhr.ontimeout = () => {
          reject(new Error('上传超时'));
        };
      }

      // 发送PUT请求
      xhr.open('PUT', this.uploadUrl as string);
      xhr.setRequestHeader('Content-Type', fileToUpload.type);
      xhr.send(fileToUpload);
    });
  }

  /**
   * 上传到服务器
   */
  private async uploadToServer(): Promise<void> {
    if (!this.uploadSessionId) {
      throw new Error('上传会话ID不存在');
    }

    const fileToUpload = this.processedFile || this.file;
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('uploadSessionId', this.uploadSessionId);

    this.abortController = new AbortController();
    this.startTime = Date.now();

    await uploadRequest.post('/enhanced-upload/upload', formData, {
      signal: this.abortController.signal,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const loaded = progressEvent.loaded;
          const total = progressEvent.total;
          const now = Date.now();
          const timeDiff = (now - this.startTime) / 1000;
          const speed = timeDiff > 0 ? loaded / timeDiff : 0;
          const remainingTime = speed > 0 ? (total - loaded) / speed : Infinity;
          const percentage = Math.round((loaded / total) * 100);

          const progress: EnhancedUploadProgress = {
            loaded,
            total,
            percentage,
            speed,
            remainingTime,
            status: this.status
          };
          this.config.onProgress?.(progress);
        }
      }
    });
  }

  /**
   * 确认上传完成
   */
  private async confirmUpload(): Promise<EnhancedUploadResult> {
    if (!this.uploadSessionId) {
      throw new Error('上传会话ID不存在');
    }

    const fileToUpload = this.processedFile || this.file;
    const response = await http.post<EnhancedUploadResult>('/enhanced-upload/confirm', {
      uploadSessionId: this.uploadSessionId,
      actualFileSize: fileToUpload.size
    });

    if (!response.success || !response.data) {
      throw new Error(response.message || '确认上传失败');
    }

    return response.data;
  }

  /**
   * 更新状态
   */
  private updateStatus(status: EnhancedUploadStatusType): void {
    this.status = status;
    this.config.onStatusChange?.(status);
  }

  /**
   * 更新分片上传进度
   */
  private updateChunkProgress(): void {
    if (this.chunks.length === 0) return;

    const fileToUpload = this.processedFile || this.file;
    const completedChunks = this.chunks.filter(chunk => chunk.uploaded || this.uploadedChunks.has(chunk.index));
    const totalChunks = this.chunks.length;
    const completedSize = completedChunks.reduce((size, chunk) => size + chunk.blob.size, 0);

    const progress: EnhancedUploadProgress = {
      loaded: completedSize,
      total: fileToUpload.size,
      percentage: Math.round((completedSize / fileToUpload.size) * 100),
      speed: 0, // 分片上传不计算速度
      remainingTime: 0,
      status: this.status,
      chunks: {
        total: totalChunks,
        completed: completedChunks.length,
        failed: 0,
        pending: totalChunks - completedChunks.length
      }
    };

    this.config.onProgress?.(progress);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 计算重试延迟时间
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay || 1000;
    const maxDelay = this.config.maxRetryDelay || 30000;
    let delay: number;

    switch (this.config.retryBackoffType) {
      case 'exponential':
        delay = baseDelay * Math.pow(2, attempt);
        break;
      case 'linear':
        delay = baseDelay * (attempt + 1);
        break;
      case 'fixed':
      default:
        delay = baseDelay;
        break;
    }

    // 应用最大延迟限制
    delay = Math.min(delay, maxDelay);

    // 应用抖动（如果启用）
    if (this.config.enableJitter) {
      const jitterFactor = 0.25; // 25%的抖动
      const jitterRange = delay * jitterFactor;
      delay = delay - jitterRange + (Math.random() * jitterRange * 2);
    }

    return delay;
  }
}
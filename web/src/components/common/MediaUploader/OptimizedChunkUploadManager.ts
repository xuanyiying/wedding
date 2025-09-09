/**
 * 优化的分片上传管理器
 * 基于最佳实践实现的高性能分片上传解决方案
 * 
 * 主要优化特性：
 * 1. 动态分片大小调整算法
 * 2. 智能并行上传控制机制
 * 3. 精确进度计算方案
 * 4. 网络状态感知和自适应
 * 5. 智能重试和错误恢复
 */

import { fileService } from '../../../services';
import { http } from '../../../utils/request';

// 动态配置常量
export const CONFIG = {
  // 分片大小配置 (字节)
  CHUNK_SIZE: {
    MIN: 1 * 1024 * 1024,      // 1MB - 最小分片
    DEFAULT: 5 * 1024 * 1024,   // 5MB - 默认分片
    MAX: 20 * 1024 * 1024,      // 20MB - 最大分片
  },
  
  // 并发控制
  CONCURRENCY: {
    MIN: 1,                     // 最小并发数
    DEFAULT: 3,                 // 默认并发数
    MAX: 6,                     // 最大并发数
  },
  
  // 网络状态阈值
  NETWORK: {
    FAST_THRESHOLD: 10 * 1024 * 1024,    // 10MB/s - 快速网络
    SLOW_THRESHOLD: 1 * 1024 * 1024,     // 1MB/s - 慢速网络
    TIMEOUT_BASE: 30000,                  // 30秒基础超时
    TIMEOUT_MAX: 120000,                  // 120秒最大超时
  },
  
  // 重试配置
  RETRY: {
    MAX_ATTEMPTS: 5,            // 最大重试次数
    BASE_DELAY: 1000,           // 基础延迟 1秒
    MAX_DELAY: 30000,           // 最大延迟 30秒
    BACKOFF_FACTOR: 2,          // 指数退避因子
  },
  
  // 性能监控
  PERFORMANCE: {
    SPEED_SAMPLE_SIZE: 5,       // 速度采样数量
    ADJUSTMENT_INTERVAL: 3,     // 调整间隔（分片数）
  }
};

// 网络状态枚举
export enum NetworkStatus {
  UNKNOWN = 'unknown',
  FAST = 'fast',
  NORMAL = 'normal',
  SLOW = 'slow'
}

// 分片状态接口
export interface ChunkState {
  index: number;
  size: number;
  uploaded: boolean;
  uploading: boolean;
  retryCount: number;
  startTime?: number;
  endTime?: number;
  speed?: number; // bytes/second
  error?: Error;
}

// 上传统计信息
export interface UploadStats {
  totalBytes: number;
  uploadedBytes: number;
  totalChunks: number;
  uploadedChunks: number;
  failedChunks: number;
  averageSpeed: number; // bytes/second
  estimatedTimeRemaining: number; // seconds
  networkStatus: NetworkStatus;
  currentConcurrency: number;
  currentChunkSize: number;
}

// 文件上传状态
export interface FileUploadState {
  uploadId?: string;
  chunks: ChunkState[];
  stats: UploadStats;
  isCompleted: boolean;
  isCancelled: boolean;
  isPaused: boolean;
  startTime: number;
  lastProgressTime: number;
  speedHistory: number[]; // 最近的速度记录
}

// 进度回调接口
export interface ProgressCallbacks {
  onProgress?: (progress: number, stats: UploadStats) => void;
  onChunkProgress?: (chunkIndex: number, progress: number) => void;
  onSpeedUpdate?: (speed: number, networkStatus: NetworkStatus) => void;
  onError?: (error: Error, chunkIndex?: number) => void;
}

/**
 * 优化的分片上传管理器
 */
export class OptimizedChunkUploadManager {
  private uploadControllers = new Map<string, AbortController>();
  private uploadStates = new Map<string, FileUploadState>();
  private globalStats = {
    activeUploads: 0,
    totalBandwidth: 0,
    networkStatus: NetworkStatus.UNKNOWN
  };

  /**
   * 动态计算最优分片大小
   * 基于文件大小、网络状态和历史性能数据
   */
  private calculateOptimalChunkSize(
    fileSize: number, 
    networkStatus: NetworkStatus,
    averageSpeed?: number
  ): number {
    let chunkSize = CONFIG.CHUNK_SIZE.DEFAULT;
    
    // 基于文件大小调整
    if (fileSize < 50 * 1024 * 1024) { // < 50MB
      chunkSize = CONFIG.CHUNK_SIZE.MIN;
    } else if (fileSize > 500 * 1024 * 1024) { // > 500MB
      chunkSize = CONFIG.CHUNK_SIZE.MAX;
    }
    
    // 基于网络状态调整
    switch (networkStatus) {
      case NetworkStatus.FAST:
        chunkSize = Math.min(chunkSize * 2, CONFIG.CHUNK_SIZE.MAX);
        break;
      case NetworkStatus.SLOW:
        chunkSize = Math.max(chunkSize / 2, CONFIG.CHUNK_SIZE.MIN);
        break;
    }
    
    // 基于历史速度微调
    if (averageSpeed) {
      if (averageSpeed > CONFIG.NETWORK.FAST_THRESHOLD) {
        chunkSize = Math.min(chunkSize * 1.5, CONFIG.CHUNK_SIZE.MAX);
      } else if (averageSpeed < CONFIG.NETWORK.SLOW_THRESHOLD) {
        chunkSize = Math.max(chunkSize * 0.7, CONFIG.CHUNK_SIZE.MIN);
      }
    }
    
    return Math.floor(chunkSize);
  }

  /**
   * 动态计算最优并发数
   * 基于网络状态、当前负载和性能表现
   */
  private calculateOptimalConcurrency(
    networkStatus: NetworkStatus,
    currentLoad: number,
    errorRate: number
  ): number {
    let concurrency = CONFIG.CONCURRENCY.DEFAULT;
    
    // 基于网络状态调整
    switch (networkStatus) {
      case NetworkStatus.FAST:
        concurrency = CONFIG.CONCURRENCY.MAX;
        break;
      case NetworkStatus.SLOW:
        concurrency = CONFIG.CONCURRENCY.MIN;
        break;
    }
    
    // 基于当前负载调整
    if (currentLoad > 0.8) {
      concurrency = Math.max(concurrency - 1, CONFIG.CONCURRENCY.MIN);
    }
    
    // 基于错误率调整
    if (errorRate > 0.2) { // 错误率超过20%
      concurrency = Math.max(concurrency - 1, CONFIG.CONCURRENCY.MIN);
    }
    
    return concurrency;
  }

  /**
   * 检测网络状态
   */
  private detectNetworkStatus(averageSpeed: number): NetworkStatus {
    if (averageSpeed >= CONFIG.NETWORK.FAST_THRESHOLD) {
      return NetworkStatus.FAST;
    } else if (averageSpeed >= CONFIG.NETWORK.SLOW_THRESHOLD) {
      return NetworkStatus.NORMAL;
    } else {
      return NetworkStatus.SLOW;
    }
  }

  /**
   * 创建动态分片
   */
  private createDynamicChunks(
    file: File, 
    chunkSize: number
  ): { chunks: Blob[], chunkStates: ChunkState[] } {
    const chunks: Blob[] = [];
    const chunkStates: ChunkState[] = [];
    let start = 0;
    let index = 0;

    while (start < file.size) {
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      chunks.push(chunk);
      chunkStates.push({
        index,
        size: chunk.size,
        uploaded: false,
        uploading: false,
        retryCount: 0
      });
      
      start = end;
      index++;
    }

    return { chunks, chunkStates };
  }

  /**
   * 计算重试延迟（指数退避）
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay = CONFIG.RETRY.BASE_DELAY * Math.pow(CONFIG.RETRY.BACKOFF_FACTOR, retryCount);
    return Math.min(delay, CONFIG.RETRY.MAX_DELAY);
  }

  /**
   * 更新上传统计信息
   */
  private updateStats(_fileId: string, state: FileUploadState): void {
    const now = Date.now();
    const uploadedChunks = state.chunks.filter(c => c.uploaded).length;
    const failedChunks = state.chunks.filter(c => c.error && c.retryCount >= CONFIG.RETRY.MAX_ATTEMPTS).length;
    const uploadedBytes = state.chunks
      .filter(c => c.uploaded)
      .reduce((sum, c) => sum + c.size, 0);

    // 计算平均速度
    const completedChunks = state.chunks.filter(c => c.uploaded && c.startTime && c.endTime);
    let averageSpeed = 0;
    
    if (completedChunks.length > 0) {
      const totalTime = completedChunks.reduce((sum, c) => {
        return sum + (c.endTime! - c.startTime!);
      }, 0) / 1000; // 转换为秒
      
      const totalBytes = completedChunks.reduce((sum, c) => sum + c.size, 0);
      averageSpeed = totalBytes / totalTime;
      
      // 更新速度历史
      state.speedHistory.push(averageSpeed);
      if (state.speedHistory.length > CONFIG.PERFORMANCE.SPEED_SAMPLE_SIZE) {
        state.speedHistory.shift();
      }
      
      // 计算平滑平均速度
      averageSpeed = state.speedHistory.reduce((sum, speed) => sum + speed, 0) / state.speedHistory.length;
    }

    // 估算剩余时间
    const remainingBytes = state.stats.totalBytes - uploadedBytes;
    const estimatedTimeRemaining = averageSpeed > 0 ? remainingBytes / averageSpeed : 0;

    // 检测网络状态
    const networkStatus = this.detectNetworkStatus(averageSpeed);

    // 更新统计信息
    state.stats = {
      ...state.stats,
      uploadedBytes,
      uploadedChunks,
      failedChunks,
      averageSpeed,
      estimatedTimeRemaining,
      networkStatus
    };

    state.lastProgressTime = now;
  }

  /**
   * 动态调整上传参数
   */
  private adjustUploadParameters(fileId: string, state: FileUploadState): void {
    const { stats } = state;
    
    // 每隔一定数量的分片进行调整
    if (stats.uploadedChunks % CONFIG.PERFORMANCE.ADJUSTMENT_INTERVAL === 0 && stats.uploadedChunks > 0) {
      // 计算错误率
      const errorRate = stats.failedChunks / stats.totalChunks;
      
      // 调整并发数
      const newConcurrency = this.calculateOptimalConcurrency(
        stats.networkStatus,
        this.globalStats.activeUploads / 10, // 简化的负载计算
        errorRate
      );
      
      if (newConcurrency !== stats.currentConcurrency) {
        console.log(`📊 [${fileId}] 调整并发数: ${stats.currentConcurrency} -> ${newConcurrency}`);
        state.stats.currentConcurrency = newConcurrency;
      }
      
      // 如果网络状态发生变化，可以考虑调整分片大小（对于后续分片）
      if (stats.networkStatus !== this.globalStats.networkStatus) {
        console.log(`🌐 [${fileId}] 网络状态变化: ${this.globalStats.networkStatus} -> ${stats.networkStatus}`);
        this.globalStats.networkStatus = stats.networkStatus;
      }
    }
  }

  /**
   * 上传单个分片（带重试机制）
   */
  private async uploadChunkWithRetry(
    chunk: Blob,
    chunkState: ChunkState,
    fileId: string,
    uploadId: string,
    callbacks: ProgressCallbacks
  ): Promise<void> {
    const controllerId = `${fileId}-${chunkState.index}`;
    
    while (chunkState.retryCount < CONFIG.RETRY.MAX_ATTEMPTS) {
      try {
        // 创建取消控制器
        const controller = new AbortController();
        this.uploadControllers.set(controllerId, controller);
        
        // 标记开始上传
        chunkState.uploading = true;
        chunkState.startTime = Date.now();
        
        // 动态计算超时时间
        const timeout = Math.min(
          CONFIG.NETWORK.TIMEOUT_BASE + (chunk.size / 1024 / 1024) * 1000, // 每MB增加1秒
          CONFIG.NETWORK.TIMEOUT_MAX
        );

        // 创建FormData
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', chunkState.index.toString());
        formData.append('uploadId', uploadId);

        console.log(`📤 上传分片 ${chunkState.index + 1} (尝试 ${chunkState.retryCount + 1}):`, {
          size: chunk.size,
          timeout,
          uploadId
        });

        // 执行上传
        const response = await http.upload('/files/chunk/upload', formData, {
          timeout,
          headers: {
            'X-Upload-Type': 'chunk',
            'X-Chunk-Index': chunkState.index.toString(),
            'X-File-ID': fileId,
          },
          onUploadProgress: (progressEvent) => {
            if (callbacks.onChunkProgress && progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              callbacks.onChunkProgress(chunkState.index, progress);
            }
          },
          signal: controller.signal
        });

        if (!response.success) {
          throw new Error(`Chunk upload failed: ${response.message || 'Unknown error'}`);
        }

        // 标记完成
        chunkState.endTime = Date.now();
        chunkState.uploaded = true;
        chunkState.uploading = false;
        chunkState.speed = chunk.size / ((chunkState.endTime - chunkState.startTime!) / 1000);
        
        console.log(`✅ 分片 ${chunkState.index + 1} 上传成功`, {
          speed: `${(chunkState.speed! / 1024 / 1024).toFixed(2)} MB/s`,
          time: `${((chunkState.endTime - chunkState.startTime!) / 1000).toFixed(2)}s`
        });
        
        return; // 成功，退出重试循环

      } catch (error: any) {
        chunkState.uploading = false;
        chunkState.retryCount++;
        chunkState.error = error;
        
        // 处理取消错误
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          console.log(`⏹️ 分片 ${chunkState.index + 1} 上传已取消`);
          throw new Error('Upload cancelled');
        }
        
        console.error(`❌ 分片 ${chunkState.index + 1} 上传失败 (尝试 ${chunkState.retryCount}):`, error.message);
        
        // 如果还有重试机会，等待后重试
        if (chunkState.retryCount < CONFIG.RETRY.MAX_ATTEMPTS) {
          const delay = this.calculateRetryDelay(chunkState.retryCount - 1);
          console.log(`⏳ ${delay}ms 后重试分片 ${chunkState.index + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // 重试次数用完，抛出错误
          console.error(`💥 分片 ${chunkState.index + 1} 重试次数用完，上传失败`);
          if (callbacks.onError) {
            callbacks.onError(error, chunkState.index);
          }
          throw error;
        }
      } finally {
        // 清理控制器
        this.uploadControllers.delete(controllerId);
      }
    }
  }

  /**
   * 并行上传分片
   */
  private async uploadChunksInParallel(
    chunks: Blob[],
    fileId: string,
    state: FileUploadState,
    callbacks: ProgressCallbacks
  ): Promise<void> {
    const { uploadId } = state;
    if (!uploadId) {
      throw new Error('Upload ID not found');
    }

    // 获取待上传的分片
    const pendingChunks = state.chunks.filter(c => !c.uploaded && !c.uploading);
    
    while (pendingChunks.length > 0 && !state.isCancelled && !state.isPaused) {
      // 获取当前并发数
      const concurrency = Math.min(state.stats.currentConcurrency, pendingChunks.length);
      
      // 选择要上传的分片
      const chunksToUpload = pendingChunks.splice(0, concurrency);
      
      // 并行上传
      const uploadPromises = chunksToUpload.map(async (chunkState) => {
        try {
          await this.uploadChunkWithRetry(
            chunks[chunkState.index],
            chunkState,
            fileId,
            uploadId,
            callbacks
          );
          
          // 更新统计信息
          this.updateStats(fileId, state);
          
          // 动态调整参数
          this.adjustUploadParameters(fileId, state);
          
          // 触发进度回调
          if (callbacks.onProgress) {
            const progress = Math.round((state.stats.uploadedBytes / state.stats.totalBytes) * 100);
            callbacks.onProgress(progress, state.stats);
          }
          
          // 触发速度更新回调
          if (callbacks.onSpeedUpdate) {
            callbacks.onSpeedUpdate(state.stats.averageSpeed, state.stats.networkStatus);
          }
          
        } catch (error) {
          // 错误已在 uploadChunkWithRetry 中处理
          console.error(`分片 ${chunkState.index + 1} 最终上传失败:`, error);
        }
      });
      
      // 等待当前批次完成
      await Promise.allSettled(uploadPromises);
      
      // 检查是否有失败的分片需要重新加入队列
      const failedChunks = state.chunks.filter(c => 
        !c.uploaded && 
        !c.uploading && 
        c.retryCount < CONFIG.RETRY.MAX_ATTEMPTS
      );
      
      pendingChunks.push(...failedChunks);
    }
  }

  /**
   * 主要的分片上传方法
   */
  public async uploadFileWithChunks(
    file: File,
    category: string,
    callbacks: ProgressCallbacks = {}
  ): Promise<any> {
    const fileId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🚀 开始优化分片上传:', {
      filename: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      category,
      fileId
    });

    try {
      // 初始化网络状态检测
      const initialNetworkStatus = this.globalStats.networkStatus || NetworkStatus.NORMAL;
      
      // 计算最优分片大小
      const optimalChunkSize = this.calculateOptimalChunkSize(
        file.size,
        initialNetworkStatus
      );
      
      // 计算最优并发数
      const optimalConcurrency = this.calculateOptimalConcurrency(
        initialNetworkStatus,
        this.globalStats.activeUploads / 10,
        0 // 初始错误率为0
      );
      
      console.log('📊 上传参数:', {
        chunkSize: `${(optimalChunkSize / 1024 / 1024).toFixed(2)} MB`,
        concurrency: optimalConcurrency,
        networkStatus: initialNetworkStatus
      });

      // 创建动态分片
      const { chunks, chunkStates } = this.createDynamicChunks(file, optimalChunkSize);
      
      // 初始化文件状态
      const state: FileUploadState = {
        chunks: chunkStates,
        stats: {
          totalBytes: file.size,
          uploadedBytes: 0,
          totalChunks: chunks.length,
          uploadedChunks: 0,
          failedChunks: 0,
          averageSpeed: 0,
          estimatedTimeRemaining: 0,
          networkStatus: initialNetworkStatus,
          currentConcurrency: optimalConcurrency,
          currentChunkSize: optimalChunkSize
        },
        isCompleted: false,
        isCancelled: false,
        isPaused: false,
        startTime: Date.now(),
        lastProgressTime: Date.now(),
        speedHistory: []
      };
      
      this.uploadStates.set(fileId, state);
      this.globalStats.activeUploads++;

      // 初始化分片上传
      const initResponse = await fileService.initChunkUpload({
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        category: category,
        totalChunks: chunks.length
      });
      
      if (!initResponse.data) {
        throw new Error('Failed to initialize chunk upload: no response data');
      }
      
      state.uploadId = initResponse.data.uploadId;
      
      console.log('✅ 分片上传初始化成功:', {
        uploadId: state.uploadId,
        totalChunks: chunks.length,
        chunkSize: `${(optimalChunkSize / 1024 / 1024).toFixed(2)} MB`
      });

      // 开始并行上传分片
      await this.uploadChunksInParallel(chunks, fileId, state, callbacks);
      
      // 检查是否所有分片都上传成功
      const failedChunks = state.chunks.filter(c => !c.uploaded);
      if (failedChunks.length > 0) {
        throw new Error(`${failedChunks.length} 个分片上传失败`);
      }

      // 完成分片上传
      const completeResponse = await fileService.completeChunkUpload({
        uploadId: state.uploadId,
        fileId: state.uploadId
      });
      
      if (!completeResponse.success) {
        throw new Error(`Failed to complete chunk upload: ${completeResponse.message}`);
      }
      
      state.isCompleted = true;
      
      const totalTime = (Date.now() - state.startTime) / 1000;
      const averageSpeed = file.size / totalTime;
      
      console.log('🎉 优化分片上传完成:', {
        filename: file.name,
        totalTime: `${totalTime.toFixed(2)}s`,
        averageSpeed: `${(averageSpeed / 1024 / 1024).toFixed(2)} MB/s`,
        totalChunks: chunks.length,
        networkStatus: state.stats.networkStatus
      });
      
      return completeResponse.data;
      
    } catch (error: any) {
      console.error('❌ 优化分片上传失败:', error);
      
      // 取消所有相关的分片上传
      this.cancelUpload(fileId);
      
      if (callbacks.onError) {
        callbacks.onError(error);
      }
      
      throw error;
    } finally {
      // 清理状态
      this.uploadStates.delete(fileId);
      this.globalStats.activeUploads = Math.max(0, this.globalStats.activeUploads - 1);
    }
  }

  /**
   * 取消上传
   */
  public cancelUpload(fileId: string): void {
    const state = this.uploadStates.get(fileId);
    if (state) {
      state.isCancelled = true;
    }
    
    // 取消所有相关的分片上传
    const controllersToCancel = Array.from(this.uploadControllers.entries())
      .filter(([id]) => id.startsWith(fileId));
    
    controllersToCancel.forEach(([id, controller]) => {
      controller.abort();
      this.uploadControllers.delete(id);
    });
    
    console.log(`🛑 已取消上传: ${fileId}`);
  }

  /**
   * 暂停上传
   */
  public pauseUpload(fileId: string): void {
    const state = this.uploadStates.get(fileId);
    if (state) {
      state.isPaused = true;
      console.log(`⏸️ 已暂停上传: ${fileId}`);
    }
  }

  /**
   * 恢复上传
   */
  public resumeUpload(fileId: string): void {
    const state = this.uploadStates.get(fileId);
    if (state) {
      state.isPaused = false;
      console.log(`▶️ 已恢复上传: ${fileId}`);
    }
  }

  /**
   * 获取上传状态
   */
  public getUploadState(fileId: string): FileUploadState | undefined {
    return this.uploadStates.get(fileId);
  }

  /**
   * 获取全局统计信息
   */
  public getGlobalStats() {
    return { ...this.globalStats };
  }

  /**
   * 取消所有上传
   */
  public cancelAllUploads(): void {
    this.uploadControllers.forEach(controller => {
      controller.abort();
    });
    this.uploadControllers.clear();
    
    this.uploadStates.forEach(state => {
      state.isCancelled = true;
    });
    
    console.log('🛑 已取消所有上传');
  }
}

// 导出单例实例
export const optimizedChunkUploadManager = new OptimizedChunkUploadManager();
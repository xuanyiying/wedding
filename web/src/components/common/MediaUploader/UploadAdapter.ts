/**
 * 上传适配器
 * 用于集成优化的分片上传管理器到现有的MediaUploaderCore中
 * 保持现有UI界面不变，仅优化底层上传逻辑
 */

import { optimizedChunkUploadManager } from './OptimizedChunkUploadManager';
import type { ProgressCallbacks, UploadStats, NetworkStatus } from './OptimizedChunkUploadManager';
import { chunkUploadManager } from './ChunkUploadManager';

// 上传模式枚举
export enum UploadMode {
  LEGACY = 'legacy',      // 使用原有的分片上传
  OPTIMIZED = 'optimized' // 使用优化的分片上传
}

// 适配器配置
export interface AdapterConfig {
  mode: UploadMode;
  enableAutoSwitch: boolean;  // 是否启用自动切换模式
  fallbackOnError: boolean;   // 错误时是否回退到原有模式
  performanceThreshold: {
    minSpeed: number;         // 最小速度阈值 (bytes/s)
    maxErrorRate: number;     // 最大错误率阈值
  };
}

// 默认配置
const DEFAULT_CONFIG: AdapterConfig = {
  mode: UploadMode.OPTIMIZED,
  enableAutoSwitch: true,
  fallbackOnError: true,
  performanceThreshold: {
    minSpeed: 500 * 1024,     // 500KB/s
    maxErrorRate: 0.3         // 30%
  }
};

// 上传进度信息（兼容现有接口）
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  estimatedTime?: number;
  networkStatus?: NetworkStatus;
}

// 上传回调接口（兼容现有接口）
export interface UploadCallbacks {
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

/**
 * 上传适配器类
 * 提供统一的上传接口，内部根据配置选择使用优化或原有的上传方式
 */
export class UploadAdapter {
  private config: AdapterConfig;
  private currentMode: UploadMode;
  private performanceStats = {
    successCount: 0,
    errorCount: 0,
    totalSpeed: 0,
    averageSpeed: 0
  };

  constructor(config: Partial<AdapterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentMode = this.config.mode;
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<AdapterConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.mode) {
      this.currentMode = config.mode;
    }
  }

  /**
   * 获取当前配置
   */
  public getConfig(): AdapterConfig {
    return { ...this.config };
  }

  /**
   * 获取当前上传模式
   */
  public getCurrentMode(): UploadMode {
    return this.currentMode;
  }

  /**
   * 获取性能统计
   */
  public getPerformanceStats() {
    return { ...this.performanceStats };
  }

  /**
   * 重置性能统计
   */
  public resetPerformanceStats(): void {
    this.performanceStats = {
      successCount: 0,
      errorCount: 0,
      totalSpeed: 0,
      averageSpeed: 0
    };
  }

  /**
   * 检查是否应该切换上传模式
   */
  private shouldSwitchMode(stats: UploadStats): boolean {
    if (!this.config.enableAutoSwitch) {
      return false;
    }

    const errorRate = stats.failedChunks / stats.totalChunks;
    
    // 如果当前是优化模式，但性能不佳，切换到原有模式
    if (this.currentMode === UploadMode.OPTIMIZED) {
      if (stats.averageSpeed < this.config.performanceThreshold.minSpeed ||
          errorRate > this.config.performanceThreshold.maxErrorRate) {
        console.log('📉 性能不佳，切换到原有上传模式', {
          speed: `${(stats.averageSpeed / 1024).toFixed(2)} KB/s`,
          errorRate: `${(errorRate * 100).toFixed(2)}%`
        });
        return true;
      }
    }

    return false;
  }

  /**
   * 更新性能统计
   */
  private updatePerformanceStats(success: boolean, speed?: number): void {
    if (success) {
      this.performanceStats.successCount++;
      if (speed) {
        this.performanceStats.totalSpeed += speed;
        this.performanceStats.averageSpeed = 
          this.performanceStats.totalSpeed / this.performanceStats.successCount;
      }
    } else {
      this.performanceStats.errorCount++;
    }
  }

  /**
   * 转换优化上传的进度信息为兼容格式
   */
  private convertOptimizedProgress(progress: number, stats: UploadStats): UploadProgress {
    return {
      loaded: stats.uploadedBytes,
      total: stats.totalBytes,
      percentage: progress,
      speed: stats.averageSpeed,
      estimatedTime: stats.estimatedTimeRemaining,
      networkStatus: stats.networkStatus
    };
  }

  /**
   * 使用优化的分片上传
   */
  private async uploadWithOptimized(
    file: File,
    category: string,
    callbacks: UploadCallbacks
  ): Promise<any> {
    console.log('🚀 使用优化分片上传模式');

    const progressCallbacks: ProgressCallbacks = {
      onProgress: (progress, stats) => {
        // 检查是否需要切换模式
        if (this.shouldSwitchMode(stats)) {
          this.currentMode = UploadMode.LEGACY;
          // 注意：这里不能直接切换，因为上传已经开始
          // 实际应用中可能需要取消当前上传并重新开始
        }

        if (callbacks.onProgress) {
          const adaptedProgress = this.convertOptimizedProgress(progress, stats);
          callbacks.onProgress(adaptedProgress);
        }
      },
      onError: (error, chunkIndex) => {
        console.error('优化上传出错:', error, chunkIndex);
        this.updatePerformanceStats(false);
        
        if (callbacks.onError) {
          callbacks.onError(error);
        }
      },
      onSpeedUpdate: (speed, networkStatus) => {
        console.log(`📊 速度更新: ${(speed / 1024 / 1024).toFixed(2)} MB/s, 网络状态: ${networkStatus}`);
      }
    };

    try {
      const result = await optimizedChunkUploadManager.uploadFileWithChunks(
        file,
        category,
        progressCallbacks
      );
      
      this.updatePerformanceStats(true, optimizedChunkUploadManager.getGlobalStats().totalBandwidth);
      
      if (callbacks.onSuccess) {
        callbacks.onSuccess(result);
      }
      
      return result;
    } catch (error: any) {
      this.updatePerformanceStats(false);
      
      // 如果启用了错误回退，尝试使用原有模式
      if (this.config.fallbackOnError && this.currentMode === UploadMode.OPTIMIZED) {
        console.log('🔄 优化上传失败，回退到原有模式');
        this.currentMode = UploadMode.LEGACY;
        return this.uploadWithLegacy(file, category, callbacks);
      }
      
      throw error;
    }
  }

  /**
   * 使用原有的分片上传
   */
  private async uploadWithLegacy(
    file: File,
    category: string,
    callbacks: UploadCallbacks
  ): Promise<any> {
    console.log('📤 使用原有分片上传模式');

    try {
      // 适配原有的ChunkUploadManager接口
      const result = await chunkUploadManager.uploadFileWithChunks(
        file,
        category,
        (progress: number) => {
          if (callbacks.onProgress) {
            callbacks.onProgress({
              loaded: Math.round((progress / 100) * file.size),
              total: file.size,
              percentage: progress
            });
          }
        },
        (chunkIndex: number, chunkProgress: number) => {
          // 分块进度回调，可以用于更详细的进度显示
          console.log(`分块 ${chunkIndex + 1} 进度: ${chunkProgress}%`);
        }
      );
      
      this.updatePerformanceStats(true);
      
      if (callbacks.onSuccess) {
        callbacks.onSuccess(result);
      }
      
      return result;
    } catch (error: any) {
      this.updatePerformanceStats(false);
      
      if (callbacks.onError) {
        callbacks.onError(error);
      }
      
      throw error;
    }
  }

  /**
   * 主要的上传方法
   * 根据当前模式选择使用优化或原有的上传方式
   */
  public async uploadFile(
    file: File,
    category: string,
    callbacks: UploadCallbacks = {}
  ): Promise<any> {
    console.log(`📁 开始上传文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`🔧 当前上传模式: ${this.currentMode}`);

    try {
      let result;
      
      if (this.currentMode === UploadMode.OPTIMIZED) {
        result = await this.uploadWithOptimized(file, category, callbacks);
      } else {
        result = await this.uploadWithLegacy(file, category, callbacks);
      }
      
      console.log('✅ 文件上传成功');
      return result;
      
    } catch (error: any) {
      console.error('❌ 文件上传失败:', error);
      throw error;
    }
  }

  /**
   * 取消上传
   */
  public cancelUpload(fileId?: string): void {
    if (this.currentMode === UploadMode.OPTIMIZED) {
      if (fileId) {
        optimizedChunkUploadManager.cancelUpload(fileId);
      } else {
        optimizedChunkUploadManager.cancelAllUploads();
      }
    } else {
      // 取消原有上传的逻辑
      if (fileId) {
        chunkUploadManager.cancelChunkUpload(fileId);
      } else {
        // 原有管理器没有取消所有上传的方法，需要逐个取消
        console.log('取消原有上传模式的所有上传');
      }
    }
  }

  /**
   * 暂停上传（仅优化模式支持）
   */
  public pauseUpload(fileId: string): void {
    if (this.currentMode === UploadMode.OPTIMIZED) {
      optimizedChunkUploadManager.pauseUpload(fileId);
    } else {
      console.warn('原有上传模式不支持暂停功能');
    }
  }

  /**
   * 恢复上传（仅优化模式支持）
   */
  public resumeUpload(fileId: string): void {
    if (this.currentMode === UploadMode.OPTIMIZED) {
      optimizedChunkUploadManager.resumeUpload(fileId);
    } else {
      console.warn('原有上传模式不支持恢复功能');
    }
  }

  /**
   * 获取上传状态（仅优化模式支持）
   */
  public getUploadState(fileId: string) {
    if (this.currentMode === UploadMode.OPTIMIZED) {
      return optimizedChunkUploadManager.getUploadState(fileId);
    } else {
      console.warn('原有上传模式不支持获取详细状态');
      return null;
    }
  }

  /**
   * 强制切换上传模式
   */
  public switchMode(mode: UploadMode): void {
    console.log(`🔄 切换上传模式: ${this.currentMode} -> ${mode}`);
    this.currentMode = mode;
    this.config.mode = mode;
  }

  /**
   * 获取支持的功能列表
   */
  public getSupportedFeatures() {
    const baseFeatures = ['upload', 'cancel'];
    
    if (this.currentMode === UploadMode.OPTIMIZED) {
      return [
        ...baseFeatures,
        'pause',
        'resume',
        'detailed_progress',
        'network_adaptation',
        'auto_retry',
        'dynamic_chunking'
      ];
    } else {
      return baseFeatures;
    }
  }
}

// 导出默认实例
export const uploadAdapter = new UploadAdapter();
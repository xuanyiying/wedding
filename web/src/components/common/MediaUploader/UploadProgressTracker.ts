/**
 * 上传进度跟踪器
 * 负责跟踪和计算上传进度、速度、剩余时间等
 */

import type { UploadProgressInfo } from './types';
import type { DirectUploadProgress } from '../../../utils/direct-upload';
import { DirectUploadStatus } from '../../../utils/direct-upload';

export interface SpeedCalculator {
  startTime: number;
  startBytes: number;
  lastUpdateTime: number;
  lastBytes: number;
}

export class UploadProgressTracker {
  private speedCalculators = new Map<string, SpeedCalculator>();
  private progressCallbacks = new Map<string, (progress: DirectUploadProgress) => void>();

  /**
   * 初始化文件进度跟踪
   */
  initFileProgress(fileId: string, onProgress?: (progress: DirectUploadProgress) => void): void {
    const now = Date.now();
    this.speedCalculators.set(fileId, {
      startTime: now,
      startBytes: 0,
      lastUpdateTime: now,
      lastBytes: 0
    });

    if (onProgress) {
      this.progressCallbacks.set(fileId, onProgress);
    }
  }

  /**
   * 更新文件进度
   */
  updateFileProgress(
    fileId: string, 
    loaded: number, 
    total: number, 
    customProgress?: Partial<DirectUploadProgress>
  ): DirectUploadProgress {
    const calculator = this.speedCalculators.get(fileId);
    const now = Date.now();
    
    if (!calculator) {
      this.initFileProgress(fileId);
      return this.updateFileProgress(fileId, loaded, total, customProgress);
    }

    // 确保loaded不超过total
    const safeLoaded = Math.min(loaded, total);
    
    // 计算基础进度
    const percentage = total > 0 ? Math.round((safeLoaded / total) * 100) : 0;
    
    // 计算速度（每秒字节数）
    const timeElapsed = (now - calculator.lastUpdateTime) / 1000;
    const bytesProgress = safeLoaded - calculator.lastBytes;
    const instantSpeed = timeElapsed > 0.1 ? bytesProgress / timeElapsed : 0; // 避免除以很小的数
    
    // 计算平均速度
    const totalTimeElapsed = (now - calculator.startTime) / 1000;
    const totalBytesProgress = safeLoaded - calculator.startBytes;
    const averageSpeed = totalTimeElapsed > 1 ? totalBytesProgress / totalTimeElapsed : instantSpeed;
    
    // 使用平均速度来计算剩余时间，更稳定
    const remainingBytes = total - safeLoaded;
    const remainingTime = averageSpeed > 0 ? remainingBytes / averageSpeed : 0;

    // 更新计算器状态
    calculator.lastUpdateTime = now;
    calculator.lastBytes = safeLoaded;

    const progress: DirectUploadProgress = {
      loaded: safeLoaded,
      total,
      percentage,
      speed: Math.max(instantSpeed, averageSpeed), // 取较大值，避免速度为0
      remainingTime: isFinite(remainingTime) ? remainingTime : 0,
      status: customProgress?.status || (percentage === 100 ? 'completed' : 'uploading'),
      ...customProgress
    };

    // 触发回调
    const callback = this.progressCallbacks.get(fileId);
    if (callback) {
      callback(progress);
    }

    return progress;
  }

  /**
   * 计算总体进度信息
   */
  calculateOverallProgress(
    fileProgresses: Map<string, DirectUploadProgress>
  ): UploadProgressInfo {
    const progresses = Array.from(fileProgresses.values());
    const total = progresses.length;
    
    if (total === 0) {
      return {
        total: 0,
        completed: 0,
        failed: 0,
        uploading: 0,
        percentage: 0
      };
    }

    let completed = 0;
    let failed = 0;
    let uploading = 0;
    let totalBytes = 0;
    let loadedBytes = 0;
    let totalSpeed = 0;
    let maxRemainingTime = 0;

    progresses.forEach(progress => {
      totalBytes += progress.total;
      loadedBytes += progress.loaded;
      
      if (progress.speed) {
        totalSpeed += progress.speed;
      }
      
      if (progress.remainingTime && progress.remainingTime > maxRemainingTime) {
        maxRemainingTime = progress.remainingTime;
      }

      switch (progress.status) {
        case DirectUploadStatus.COMPLETED:
          completed++;
          break;
        case DirectUploadStatus.FAILED:
          failed++;
          break;
        case DirectUploadStatus.UPLOADING:
        case DirectUploadStatus.PENDING:
          uploading++;
          break;
      }
    });

    const overallPercentage = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;

    return {
      total,
      completed,
      failed,
      uploading,
      percentage: overallPercentage,
      speed: totalSpeed,
      remainingTime: maxRemainingTime
    };
  }

  /**
   * 格式化速度显示
   */
  formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 B/s';
    
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const k = 1024;
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
  }

  /**
   * 格式化剩余时间显示
   */
  formatRemainingTime(seconds: number): string {
    if (seconds === 0 || !isFinite(seconds)) return '--';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${secs}秒`;
    }
  }

  /**
   * 重置文件进度
   */
  resetFileProgress(fileId: string): void {
    this.speedCalculators.delete(fileId);
    this.progressCallbacks.delete(fileId);
  }

  /**
   * 暂停文件进度跟踪
   */
  pauseFileProgress(fileId: string): void {
    const calculator = this.speedCalculators.get(fileId);
    if (calculator) {
      // 保存当前状态，但停止时间计算
      calculator.lastUpdateTime = Date.now();
    }
  }

  /**
   * 恢复文件进度跟踪
   */
  resumeFileProgress(fileId: string): void {
    const calculator = this.speedCalculators.get(fileId);
    if (calculator) {
      const now = Date.now();
      // 重置时间基准，避免暂停时间影响速度计算
      calculator.startTime = now - (calculator.lastUpdateTime - calculator.startTime);
      calculator.lastUpdateTime = now;
    }
  }

  /**
   * 清理所有进度跟踪
   */
  cleanup(): void {
    this.speedCalculators.clear();
    this.progressCallbacks.clear();
  }

  /**
   * 获取文件进度统计
   */
  getFileProgressStats(fileId: string): {
    averageSpeed: number;
    elapsedTime: number;
    estimatedTotalTime: number;
  } | null {
    const calculator = this.speedCalculators.get(fileId);
    if (!calculator) return null;

    const now = Date.now();
    const elapsedTime = (now - calculator.startTime) / 1000;
    const averageSpeed = elapsedTime > 0 ? calculator.lastBytes / elapsedTime : 0;
    const estimatedTotalTime = averageSpeed > 0 ? calculator.lastBytes / averageSpeed : 0;

    return {
      averageSpeed,
      elapsedTime,
      estimatedTotalTime
    };
  }
}
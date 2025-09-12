/**
 * 进度更新节流器
 * 用于控制进度更新的频率，避免过于频繁的UI重绘
 */

export class ProgressThrottler {
  private lastUpdateTime: number = 0;
  private pendingUpdate: (() => void) | null = null;
  private readonly throttleInterval: number;

  constructor(throttleInterval: number = 100) { // 默认100ms节流
    this.throttleInterval = throttleInterval;
  }

  /**
   * 节流执行进度更新
   */
  public throttleUpdate(updateFn: () => void): void {
    const now = Date.now();
    
    // 如果距离上次更新时间超过节流间隔，立即执行
    if (now - this.lastUpdateTime >= this.throttleInterval) {
      this.lastUpdateTime = now;
      updateFn();
      
      // 清除待执行的更新
      if (this.pendingUpdate) {
        clearTimeout(this.pendingUpdate as any);
        this.pendingUpdate = null;
      }
    } else {
      // 否则延迟执行，确保最后一次更新能被执行
      if (this.pendingUpdate) {
        clearTimeout(this.pendingUpdate as any);
      }
      
      const delay = this.throttleInterval - (now - this.lastUpdateTime);
      this.pendingUpdate = setTimeout(() => {
        this.lastUpdateTime = Date.now();
        updateFn();
        this.pendingUpdate = null;
      }, delay) as any;
    }
  }

  /**
   * 立即执行待执行的更新（用于强制完成最终更新）
   */
  public flush(): void {
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate as any);
      this.pendingUpdate = null;
    }
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.flush();
  }
}

/**
 * 进度更新管理器
 * 为每个文件维护独立的进度节流器
 */
export class ProgressUpdateManager {
  private throttlers: Map<string, ProgressThrottler> = new Map();
  private readonly throttleInterval: number;

  constructor(throttleInterval: number = 100) {
    this.throttleInterval = throttleInterval;
  }

  /**
   * 获取或创建文件的进度节流器
   */
  private getThrottler(fileId: string): ProgressThrottler {
    if (!this.throttlers.has(fileId)) {
      this.throttlers.set(fileId, new ProgressThrottler(this.throttleInterval));
    }
    return this.throttlers.get(fileId)!;
  }

  /**
   * 节流更新文件进度
   */
  public throttleFileProgress(fileId: string, updateFn: () => void): void {
    const throttler = this.getThrottler(fileId);
    throttler.throttleUpdate(updateFn);
  }

  /**
   * 完成文件上传，立即执行最终更新
   */
  public completeFileProgress(fileId: string, finalUpdateFn: () => void): void {
    const throttler = this.throttlers.get(fileId);
    if (throttler) {
      throttler.flush();
    }
    
    // 立即执行最终更新
    finalUpdateFn();
  }

  /**
   * 移除文件的进度节流器
   */
  public removeFile(fileId: string): void {
    const throttler = this.throttlers.get(fileId);
    if (throttler) {
      throttler.cleanup();
      this.throttlers.delete(fileId);
    }
  }

  /**
   * 清理所有资源
   */
  public cleanup(): void {
    this.throttlers.forEach(throttler => throttler.cleanup());
    this.throttlers.clear();
  }
}
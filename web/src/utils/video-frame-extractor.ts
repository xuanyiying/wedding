/**
 * 视频帧提取器
 * 用于从视频文件中提取关键帧和指定时间点的帧
 */

export interface VideoFrame {
  time: number;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps?: number;
}

export interface FrameExtractionOptions {
  frameCount?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  maxWidth?: number;
  maxHeight?: number;
  startTime?: number;
  endTime?: number;
}

/**
 * Canvas 池管理器
 */
class CanvasPool {
  private pool: HTMLCanvasElement[] = [];
  private readonly maxPoolSize = 5;

  getCanvas(): HTMLCanvasElement {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return document.createElement('canvas');
  }

  releaseCanvas(canvas: HTMLCanvasElement): void {
    if (this.pool.length < this.maxPoolSize) {
      // 清理 canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      this.pool.push(canvas);
    }
  }

  destroy(): void {
    this.pool.length = 0;
  }
}

/**
 * 视频帧提取器类
 */
export class VideoFrameExtractor {
  private video: HTMLVideoElement | null = null;
  private canvasPool: CanvasPool;
  private blobUrls: Set<string> = new Set();
  private abortController: AbortController | null = null;
  private isDestroyed = false;

  constructor() {
    this.canvasPool = new CanvasPool();
  }

  /**
   * 从视频文件中提取帧
   */
  async extractFrames(
    file: File,
    options: FrameExtractionOptions = {}
  ): Promise<VideoFrame[]> {
    if (this.isDestroyed) {
      throw new Error('VideoFrameExtractor has been destroyed');
    }

    const {
      frameCount = 10,
      quality = 0.8,
      format = 'image/jpeg',
      maxWidth,
      maxHeight,
      startTime = 0,
      endTime
    } = options;

    try {
      // 创建新的 AbortController
      this.abortController = new AbortController();
      
      // 初始化视频
      await this.initializeVideo(file);
      
      if (!this.video) {
        throw new Error('Failed to initialize video');
      }

      // 获取视频元数据
      const metadata = await this.getVideoMetadata();
      const actualEndTime = endTime || metadata.duration;
      const duration = actualEndTime - startTime;
      
      if (duration <= 0) {
        throw new Error('Invalid time range');
      }

      // 计算时间点
      const timePoints = this.calculateTimePoints(startTime, actualEndTime, frameCount);
      
      // 提取帧
      const frames: VideoFrame[] = [];
      for (let i = 0; i < timePoints.length; i++) {
        if (this.abortController?.signal.aborted) {
          throw new Error('Operation aborted');
        }

        const time = timePoints[i];
        try {
          const frame = await this.extractFrameAtTime(time, quality, format, maxWidth, maxHeight);
          frames.push(frame);
        } catch (error) {
          console.warn(`Failed to extract frame at time ${time}:`, error);
          // 继续处理其他帧
        }
      }

      return frames;
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * 提取单个帧
   */
  async extractSingleFrame(
    file: File,
    time: number,
    options: Partial<FrameExtractionOptions> = {}
  ): Promise<VideoFrame> {
    if (this.isDestroyed) {
      throw new Error('VideoFrameExtractor has been destroyed');
    }

    const {
      quality = 0.8,
      format = 'image/jpeg',
      maxWidth,
      maxHeight
    } = options;

    try {
      this.abortController = new AbortController();
      await this.initializeVideo(file);
      
      if (!this.video) {
        throw new Error('Failed to initialize video');
      }

      return await this.extractFrameAtTime(time, quality, format, maxWidth, maxHeight);
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * 获取视频元数据
   */
  async getVideoMetadata(): Promise<VideoMetadata> {
    if (!this.video) {
      throw new Error('Video not initialized');
    }

    // 等待元数据加载
    await this.waitForMetadata();

    return {
      duration: this.video.duration,
      width: this.video.videoWidth,
      height: this.video.videoHeight,
      fps: undefined // HTML5 Video API 不直接提供 FPS
    };
  }

  /**
   * 初始化视频元素
   */
  private async initializeVideo(file: File): Promise<void> {
    // 清理之前的视频
    this.cleanup();

    // 创建新的视频元素
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.preload = 'metadata';

    // 创建 Blob URL
    const blobUrl = URL.createObjectURL(file);
    this.blobUrls.add(blobUrl);
    this.video.src = blobUrl;

    // 等待视频加载
    await this.waitForVideoLoad();
  }

  /**
   * 等待视频加载
   */
  private async waitForVideoLoad(): Promise<void> {
    if (!this.video) {
      throw new Error('Video element not found');
    }

    return new Promise((resolve, reject) => {
      if (!this.video) {
        reject(new Error('Video element not found'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Video load timeout'));
      }, 30000);

      const onCanPlay = () => {
        clearTimeout(timeout);
        resolve();
      };

      const onError = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load video'));
      };

      this.video.addEventListener('canplay', onCanPlay, { once: true });
      this.video.addEventListener('error', onError, { once: true });

      // 如果视频已经可以播放，直接触发
      if (this.video.readyState >= 3) {
        clearTimeout(timeout);
        resolve();
      } else {
        this.video.load();
      }
    });
  }

  /**
   * 等待元数据加载
   */
  private async waitForMetadata(): Promise<void> {
    if (!this.video) {
      throw new Error('Video element not found');
    }

    return new Promise((resolve, reject) => {
      if (!this.video) {
        reject(new Error('Video element not found'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Metadata load timeout'));
      }, 15000);

      const onLoadedMetadata = () => {
        clearTimeout(timeout);
        resolve();
      };

      const onError = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load video metadata'));
      };

      this.video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
      this.video.addEventListener('error', onError, { once: true });

      // 如果元数据已经加载，直接触发
      if (this.video.readyState >= 1) {
        clearTimeout(timeout);
        resolve();
      }
    });
  }

  /**
   * 重新初始化视频元素
   */
  private async reinitializeVideo(): Promise<void> {
    try {
      // 清理当前视频
      if (this.video && this.video.src) {
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
      }

      // 重新创建视频元素
      this.video = document.createElement('video');
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.preload = 'metadata';

      // 重新设置源
      if (this.blobUrls.size > 0) {
        const blobUrl = Array.from(this.blobUrls)[0];
        this.video.src = blobUrl;
        await this.waitForVideoLoad();
      }
    } catch (error) {
      console.error('Failed to reinitialize video:', error);
      throw error;
    }
  }

  /**
   * 在指定时间提取帧
   */
   async extractFrameAtTime(
    time: number,
    quality: number,
    format: string,
    maxWidth?: number,
    maxHeight?: number
  ): Promise<VideoFrame> {
    if (!this.video) {
      throw new Error('Video not initialized');
    }

    // 验证时间值
    if (!isFinite(time) || time < 0) {
      throw new Error(`Invalid time value: ${time}`);
    }

    // 确保时间不超过视频长度
    const safetime = Math.min(time, this.video.duration - 0.1);

    try {
      // 跳转到指定时间
      await this.seekToTime(safetime);

      // 等待帧准备就绪
      await this.waitForSeek();

      // 提取帧
      return await this.performFrameExtraction(safetime, quality, format, maxWidth, maxHeight);
    } catch (error) {
      console.error(`Failed to extract frame at time ${time}:`, error);
      
      // 如果是元数据问题，尝试重新初始化
      if (error instanceof Error && error.message.includes('metadata')) {
        try {
          await this.reinitializeVideo();
          await this.seekToTime(safetime);
          await this.waitForSeek();
          return await this.performFrameExtraction(safetime, quality, format, maxWidth, maxHeight);
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  /**
   * 跳转到指定时间
   */
  private async seekToTime(time: number): Promise<void> {
    if (!this.video) {
      throw new Error('Video not initialized');
    }

    // 验证时间值
    if (!isFinite(time) || time < 0) {
      throw new Error(`Invalid seek time: ${time}`);
    }

    return new Promise((resolve, reject) => {
      if (!this.video) {
        reject(new Error('Video not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Seek timeout at time ${time}`));
      }, 10000);

      const onSeeked = () => {
        clearTimeout(timeout);
        resolve();
      };

      const onError = () => {
        clearTimeout(timeout);
        reject(new Error(`Seek failed at time ${time}`));
      };

      this.video.addEventListener('seeked', onSeeked, { once: true });
      this.video.addEventListener('error', onError, { once: true });

      // 执行跳转
      this.video.currentTime = time;
    });
  }

  /**
   * 等待跳转完成
   */
  private async waitForSeek(): Promise<void> {
    if (!this.video) {
      throw new Error('Video not initialized');
    }

    return new Promise((resolve, reject) => {
      if (!this.video) {
        reject(new Error('Video not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Wait for seek timeout'));
      }, 5000);

      // 如果视频已经准备好，直接返回
      if (this.video.readyState >= 2) {
        clearTimeout(timeout);
        resolve();
        return;
      }

      const onCanPlay = () => {
        clearTimeout(timeout);
        resolve();
      };

      const onError = () => {
        clearTimeout(timeout);
        reject(new Error('Video error during seek wait'));
      };

      this.video.addEventListener('canplay', onCanPlay, { once: true });
      this.video.addEventListener('error', onError, { once: true });
    });
  }

  /**
   * 执行帧提取
   */
  private async performFrameExtraction(
    time: number,
    quality: number,
    format: string,
    maxWidth?: number,
    maxHeight?: number
  ): Promise<VideoFrame> {
    if (!this.video) {
      throw new Error('Video not initialized');
    }

    // 检查视频状态
    if (!isFinite(this.video.duration) || this.video.duration <= 0) {
      throw new Error('Video metadata not loaded properly');
    }

    if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
      throw new Error('Video dimensions not available');
    }

    // 获取 canvas
    const canvas = this.canvasPool.getCanvas();
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      this.canvasPool.releaseCanvas(canvas);
      throw new Error('Failed to get canvas context');
    }

    try {
      // 计算尺寸
      let { width, height } = this.calculateDimensions(
        this.video.videoWidth,
        this.video.videoHeight,
        maxWidth,
        maxHeight
      );

      // 设置 canvas 尺寸
      canvas.width = width;
      canvas.height = height;

      // 绘制视频帧
      ctx.drawImage(this.video, 0, 0, width, height);

      // 转换为 Blob
      const blob = await this.canvasToBlob(canvas, format, quality);
      const dataUrl = canvas.toDataURL(format, quality);

      return {
        time,
        dataUrl,
        blob,
        width,
        height
      };
    } finally {
      // 释放 canvas
      this.canvasPool.releaseCanvas(canvas);
    }
  }

  /**
   * Canvas 转 Blob
   */
  private canvasToBlob(canvas: HTMLCanvasElement, format: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        format,
        quality
      );
    });
  }

  /**
   * 计算时间点
   */
  private calculateTimePoints(startTime: number, endTime: number, frameCount: number): number[] {
    const duration = endTime - startTime;
    const interval = duration / (frameCount - 1);
    
    const timePoints: number[] = [];
    for (let i = 0; i < frameCount; i++) {
      const time = startTime + (i * interval);
      timePoints.push(Math.min(time, endTime - 0.1)); // 确保不超过结束时间
    }
    
    return timePoints;
  }

  /**
   * 计算输出尺寸
   */
  private calculateDimensions(
    videoWidth: number,
    videoHeight: number,
    maxWidth?: number,
    maxHeight?: number
  ): { width: number; height: number } {
    let width = videoWidth;
    let height = videoHeight;

    if (maxWidth && width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (maxHeight && height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    // 清理视频元素
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
      this.video = null;
    }

    // 清理 Blob URLs
    this.blobUrls.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.blobUrls.clear();

    // 取消操作
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 销毁提取器
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.cleanup();
    this.canvasPool.destroy();
  }

  /**
   * 检查是否已销毁
   */
  get destroyed(): boolean {
    return this.isDestroyed;
  }
}

/**
 * 创建视频帧提取器实例
 */
export function createVideoFrameExtractor(): VideoFrameExtractor {
  return new VideoFrameExtractor();
}

/**
 * 便捷函数：从视频文件提取帧
 */
export async function extractVideoFrames(
  file: File,
  options?: FrameExtractionOptions
): Promise<VideoFrame[]> {
  const extractor = createVideoFrameExtractor();
  try {
    return await extractor.extractFrames(file, options);
  } finally {
    extractor.destroy();
  }
}

/**
 * 便捷函数：从视频文件提取单个帧
 */
export async function extractVideoFrame(
  file: File,
  time: number,
  options?: Partial<FrameExtractionOptions>
): Promise<VideoFrame> {
  const extractor = createVideoFrameExtractor();
  try {
    return await extractor.extractSingleFrame(file, time, options);
  } finally {
    extractor.destroy();
  }
}
/**
 * 视频帧提取工具
 * 用于从视频文件中提取帧作为封面图片
 */

export interface VideoFrame {
  time: number;
  canvas: HTMLCanvasElement;
  blob: Blob;
  dataUrl: string;
}

export interface VideoFrameExtractionOptions {
  frameCount?: number; // 提取帧数，默认8
  quality?: number; // 图片质量 0-1，默认0.8
  format?: 'image/jpeg' | 'image/png' | 'image/webp'; // 输出格式，默认jpeg
  maxWidth?: number; // 最大宽度，默认320
  maxHeight?: number; // 最大高度，默认180
  startTime?: number; // 开始时间（秒），默认0
  endTime?: number; // 结束时间（秒），默认视频总时长
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: number;
}

// Canvas池管理器 - 复用canvas以减少DOM创建开销
class CanvasPool {
  private static instance: CanvasPool;
  private pool: HTMLCanvasElement[] = [];
  private maxPoolSize = 5;

  static getInstance(): CanvasPool {
    if (!CanvasPool.instance) {
      CanvasPool.instance = new CanvasPool();
    }
    return CanvasPool.instance;
  }

  getCanvas(): HTMLCanvasElement {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return document.createElement('canvas');
  }

  returnCanvas(canvas: HTMLCanvasElement): void {
    if (this.pool.length < this.maxPoolSize) {
      // 清理canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 1;
      canvas.height = 1;
      this.pool.push(canvas);
    }
  }

  clear(): void {
    this.pool = [];
  }
}

export class VideoFrameExtractor {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDestroyed: boolean = false;
  private abortController: AbortController | null = null;
  private canvasPool: CanvasPool;
  private memoryCheckInterval: number | null = null;

  constructor() {
    this.video = document.createElement('video');
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.canvasPool = CanvasPool.getInstance();
    
    // 设置视频属性 - 优化预加载策略
    this.video.muted = true;
    this.video.preload = 'metadata'; // 改为metadata以减少初始加载时间
    this.video.crossOrigin = 'anonymous';
    this.video.playsInline = true; // 移动端优化
    
    // 添加内存管理优化
    this.setupMemoryOptimization();
  }

  /**
   * 设置内存优化策略
   */
  private setupMemoryOptimization(): void {
    // 监听内存压力事件
    if ('memory' in performance) {
      const checkMemory = () => {
        const memInfo = (performance as any).memory;
        if (memInfo) {
          const memoryUsageRatio = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
          
          // 分级内存管理
          if (memoryUsageRatio > 0.9) {
            console.warn('Critical memory usage, forcing aggressive cleanup');
            this.forceCleanup();
            this.canvasPool.clear();
          } else if (memoryUsageRatio > 0.7) {
            console.warn('High memory usage, triggering cleanup');
            this.forceCleanup();
          }
        }
      };
      
      // 定期检查内存使用情况，但避免过于频繁
      this.memoryCheckInterval = window.setInterval(checkMemory, 10000);
    }

    // 监听页面可见性变化，在页面隐藏时清理资源
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.forceCleanup();
      }
    });
  }

  /**
   * 从视频文件中提取帧 - 优化版本
   */
  async extractFrames(
    videoFile: File,
    options: VideoFrameExtractionOptions = {}
  ): Promise<VideoFrame[]> {
    const {
      frameCount = 8,
      quality = 0.5,
      format = 'image/jpeg',
      maxWidth = 320,
      maxHeight = 180,
      startTime = 0,
      endTime,
    } = options;

    // 检查是否已销毁
    if (this.isDestroyed) {
      throw new Error('VideoFrameExtractor has been destroyed');
    }

    // 创建取消控制器
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    try {
      // 检查文件大小，决定处理策略
      const fileSize = videoFile.size;
      const isLargeFile = fileSize > 50 * 1024 * 1024; // 50MB
      
      if (isLargeFile) {
        console.log('Large file detected, using optimized processing');
      }

      // 加载视频
      const metadata = await this.loadVideoOptimized(videoFile, signal);
      const actualEndTime = endTime || metadata.duration;
      const duration = actualEndTime - startTime;
      
      if (duration <= 0) {
        throw new Error('Invalid time range');
      }

      // 计算帧间隔
      const interval = duration / frameCount;
      const frames: VideoFrame[] = [];

      // 设置canvas尺寸
      this.setupCanvas(metadata, maxWidth, maxHeight);

      // 分段处理帧提取 - 避免阻塞主线程
      const batchSize = isLargeFile ? 2 : 4; // 大文件减少批次大小
      
      for (let i = 0; i < frameCount; i += batchSize) {
        // 检查是否被取消
        if (signal.aborted) {
          throw new Error('Frame extraction was cancelled');
        }

        const batchEnd = Math.min(i + batchSize, frameCount);
        const batchPromises: Promise<VideoFrame>[] = [];

        // 批量处理当前批次的帧
        for (let j = i; j < batchEnd; j++) {
          const time = startTime + (j * interval);
          batchPromises.push(this.extractFrameAtTimeOptimized(time, quality, format, signal));
        }

        // 等待当前批次完成
        const batchFrames = await Promise.all(batchPromises);
        frames.push(...batchFrames);

        // 主线程让步 - 避免长时间阻塞
        if (i + batchSize < frameCount) {
          await this.yieldToMainThread();
        }
      }

      return frames;
    } catch (error) {
      if (signal.aborted) {
        throw new Error('Frame extraction was cancelled');
      }
      throw new Error(`Failed to extract frames: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.cleanup();
      this.abortController = null;
    }
  }

  /**
   * 提取指定时间点的帧
   */
  async extractFrameAtTime(
    time: number,
    quality: number = 0.5,
    format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
  ): Promise<VideoFrame> {
    return this.extractFrameAtTimeOptimized(time, quality, format);
  }

  /**
   * 优化版本的帧提取方法
   */
  private async extractFrameAtTimeOptimized(
    time: number,
    quality: number = 0.5,
    format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
    signal?: AbortSignal
  ): Promise<VideoFrame> {
    // 检查是否被取消
    if (signal?.aborted) {
      throw new Error('Frame extraction was cancelled');
    }

    await this.seekToTimeOptimized(time, signal);
    
    // 检查视频是否准备就绪
    if (this.video.readyState < 2) {
      await this.waitForVideoReady(signal);
    }
    
    // 绘制当前帧到canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    
    // 从canvas池获取canvas用于存储这一帧
    const frameCanvas = this.canvasPool.getCanvas();
    frameCanvas.width = this.canvas.width;
    frameCanvas.height = this.canvas.height;
    const frameCtx = frameCanvas.getContext('2d')!;
    frameCtx.drawImage(this.canvas, 0, 0);
    
    // 转换为blob和dataUrl
    const blob = await this.canvasToBlobOptimized(frameCanvas, format, quality, signal);
    const dataUrl = frameCanvas.toDataURL(format, quality);
    
    const frame: VideoFrame = {
      time,
      canvas: frameCanvas,
      blob,
      dataUrl,
    };
    
    // 添加清理方法到frame对象
    (frame as any).dispose = () => {
      this.canvasPool.returnCanvas(frameCanvas);
    };
    
    return frame;
  }

  /**
   * 获取视频元数据
   */
  async getVideoMetadata(videoFile: File): Promise<VideoMetadata> {
    const metadata = await this.loadVideo(videoFile);
    this.cleanup();
    return metadata;
  }

  /**
   * 创建视频缩略图（第一帧）
   */
  async createThumbnail(
    videoFile: File,
    options: {
      time?: number;
      quality?: number;
      format?: 'image/jpeg' | 'image/png' | 'image/webp';
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<VideoFrame> {
    const {
      time = 1, // 默认第1秒
      quality = 0.5,
      format = 'image/jpeg',
      maxWidth = 320,
      maxHeight = 180,
    } = options;

    try {
      const metadata = await this.loadVideo(videoFile);
      this.setupCanvas(metadata, maxWidth, maxHeight);
      
      const actualTime = Math.min(time, metadata.duration - 0.1);
      const frame = await this.extractFrameAtTime(actualTime, quality, format);
      
      return frame;
    } finally {
      this.cleanup();
    }
  }

  /**
   * 批量提取多个时间点的帧
   */
  async extractFramesAtTimes(
    videoFile: File,
    times: number[],
    options: {
      quality?: number;
      format?: 'image/jpeg' | 'image/png' | 'image/webp';
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<VideoFrame[]> {
    const {
      quality = 0.8,
      format = 'image/jpeg',
      maxWidth = 320,
      maxHeight = 180,
    } = options;

    try {
      const metadata = await this.loadVideo(videoFile);
      this.setupCanvas(metadata, maxWidth, maxHeight);
      
      const frames: VideoFrame[] = [];
      
      for (const time of times) {
        if (time >= 0 && time < metadata.duration) {
          const frame = await this.extractFrameAtTime(time, quality, format);
          frames.push(frame);
        }
      }
      
      return frames;
    } finally {
      this.cleanup();
    }
  }

  /**
   * 加载视频并获取元数据
   */
  private loadVideo(videoFile: File): Promise<VideoMetadata> {
    return this.loadVideoOptimized(videoFile);
  }

  /**
   * 优化版本的视频加载方法
   */
  private loadVideoOptimized(videoFile: File, signal?: AbortSignal): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const videoUrl = URL.createObjectURL(videoFile);
      let isResolved = false;
      
      let cleanup = () => {
         URL.revokeObjectURL(videoUrl);
         this.video.removeEventListener('loadedmetadata', onLoadedMetadata);
         this.video.removeEventListener('error', onError);
         this.video.removeEventListener('loadeddata', onLoadedData);
       };
      
      const onLoadedMetadata = () => {
        if (isResolved) return;
        isResolved = true;
        
        const metadata: VideoMetadata = {
          duration: this.video.duration,
          width: this.video.videoWidth,
          height: this.video.videoHeight,
          aspectRatio: this.video.videoWidth / this.video.videoHeight,
        };
        
        cleanup();
        resolve(metadata);
      };
      
      const onLoadedData = () => {
        // 确保视频数据已加载
        if (!isResolved && this.video.readyState >= 2) {
          onLoadedMetadata();
        }
      };
      
      const onError = () => {
        if (isResolved) return;
        isResolved = true;
        
        cleanup();
        const error = this.video.error;
        reject(new Error(`Failed to load video: ${error?.message || 'Unknown error'}`));
      };
      
      // 处理取消信号
      const onAbort = () => {
        if (isResolved) return;
        isResolved = true;
        
        cleanup();
        reject(new Error('Video loading was cancelled'));
      };
      
      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }
      
      this.video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
      this.video.addEventListener('loadeddata', onLoadedData, { once: true });
      this.video.addEventListener('error', onError, { once: true });
      
      // 设置超时
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(new Error('Video loading timeout'));
        }
      }, 30000); // 30秒超时
      
      // 清理超时
      const originalCleanup = cleanup;
      cleanup = () => {
        clearTimeout(timeout);
        originalCleanup();
      };
      
      this.video.src = videoUrl;
    });
  }



  /**
   * 优化版本的时间跳转方法
   */
  private seekToTimeOptimized(time: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      // 检查时间是否有效
      if (time < 0 || time > this.video.duration) {
        reject(new Error(`Invalid seek time: ${time}`));
        return;
      }

      // 如果已经在目标时间附近，直接返回
      const tolerance = 0.1; // 100ms容差
      if (Math.abs(this.video.currentTime - time) < tolerance) {
        resolve();
        return;
      }

      let isResolved = false;
      
      let cleanup = () => {
         this.video.removeEventListener('seeked', onSeeked);
         this.video.removeEventListener('error', onError);
       };
      
      const onSeeked = () => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        resolve();
      };
      
      const onError = () => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        reject(new Error('Failed to seek to time'));
      };
      
      const onAbort = () => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        reject(new Error('Seek operation was cancelled'));
      };
      
      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }
      
      this.video.addEventListener('seeked', onSeeked, { once: true });
      this.video.addEventListener('error', onError, { once: true });
      
      // 设置超时
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(new Error('Seek operation timeout'));
        }
      }, 5000); // 5秒超时
      
      // 清理超时
      const originalCleanup = cleanup;
      cleanup = () => {
        clearTimeout(timeout);
        originalCleanup();
      };
      
      this.video.currentTime = time;
    });
  }

  /**
   * 设置canvas尺寸
   */
  private setupCanvas(metadata: VideoMetadata, maxWidth: number, maxHeight: number): void {
    const { width, height, aspectRatio } = metadata;
    
    let canvasWidth = width;
    let canvasHeight = height;
    
    // 按比例缩放到最大尺寸内
    if (canvasWidth > maxWidth) {
      canvasWidth = maxWidth;
      canvasHeight = maxWidth / aspectRatio;
    }
    
    if (canvasHeight > maxHeight) {
      canvasHeight = maxHeight;
      canvasWidth = maxHeight * aspectRatio;
    }
    
    this.canvas.width = Math.round(canvasWidth);
    this.canvas.height = Math.round(canvasHeight);
  }



  /**
   * 优化版本的Canvas转Blob方法
   */
  private canvasToBlobOptimized(
    canvas: HTMLCanvasElement,
    format: string,
    quality: number,
    signal?: AbortSignal
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // 检查是否被取消
      if (signal?.aborted) {
        reject(new Error('Canvas to blob conversion was cancelled'));
        return;
      }

      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error('Canvas to blob conversion timeout'));
      }, 10000); // 10秒超时

      canvas.toBlob(
        (blob) => {
          clearTimeout(timeout);
          
          if (signal?.aborted) {
            reject(new Error('Canvas to blob conversion was cancelled'));
            return;
          }
          
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        format,
        quality
      );
    });
  }

  /**
   * 主线程让步 - 避免长时间阻塞
   */
  private yieldToMainThread(): Promise<void> {
    return new Promise(resolve => {
      if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
        // 使用Scheduler API（如果可用）
        (window as any).scheduler.postTask(() => resolve(), { priority: 'user-blocking' });
      } else {
        // 回退到setTimeout
        setTimeout(resolve, 0);
      }
    });
  }

  /**
   * 等待视频准备就绪
   */
  private waitForVideoReady(signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.video.readyState >= 2) {
        resolve();
        return;
      }

      const onCanPlay = () => {
        this.video.removeEventListener('canplay', onCanPlay);
        resolve();
      };

      const onError = () => {
        this.video.removeEventListener('error', onError);
        reject(new Error('Video failed to become ready'));
      };

      const onAbort = () => {
        this.video.removeEventListener('canplay', onCanPlay);
        this.video.removeEventListener('error', onError);
        reject(new Error('Wait for video ready was cancelled'));
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }

      this.video.addEventListener('canplay', onCanPlay, { once: true });
      this.video.addEventListener('error', onError, { once: true });
    });
  }

  /**
   * 强制清理内存
   */
  private forceCleanup(): void {
    // 清理canvas
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.canvas.width = 1;
      this.canvas.height = 1;
    }

    // 清理canvas池中的部分canvas
    this.canvasPool.clear();

    // 强制垃圾回收（如果可用）
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
      } catch (error) {
        console.warn('Manual garbage collection failed:', error);
      }
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    // 取消正在进行的操作
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // 清理视频资源
    if (this.video.src) {
      URL.revokeObjectURL(this.video.src);
      this.video.src = '';
      this.video.load(); // 重置视频元素
    }

    // 清理canvas
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    
    // 清理内存检查定时器
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    
    // 执行最终清理
    this.cleanup();
    
    // 清理canvas池
    this.canvasPool.clear();
    
    // 移除事件监听器
    this.video.removeEventListener('error', () => {});
    this.video.removeEventListener('seeked', () => {});
    this.video.removeEventListener('canplay', () => {});
    
    // 移除DOM元素引用
    if (this.video.parentNode) {
      this.video.parentNode.removeChild(this.video);
    }
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

/**
 * 工具函数：快速提取视频缩略图
 */
export async function extractVideoThumbnail(
  videoFile: File,
  options: {
    time?: number;
    quality?: number;
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<VideoFrame> {
  const extractor = new VideoFrameExtractor();
  try {
    return await extractor.createThumbnail(videoFile, options);
  } finally {
    extractor.destroy();
  }
}

/**
 * 工具函数：快速提取多个视频帧
 */
export async function extractVideoFrames(
  videoFile: File,
  options: VideoFrameExtractionOptions = {}
): Promise<VideoFrame[]> {
  const extractor = new VideoFrameExtractor();
  try {
    return await extractor.extractFrames(videoFile, options);
  } finally {
    extractor.destroy();
  }
}

/**
 * 工具函数：获取视频元数据
 */
export async function getVideoMetadata(videoFile: File): Promise<VideoMetadata> {
  const extractor = new VideoFrameExtractor();
  try {
    return await extractor.getVideoMetadata(videoFile);
  } finally {
    extractor.destroy();
  }
}

/**
 * 工具函数：将VideoFrame转换为File对象
 */
export function videoFrameToFile(
  frame: VideoFrame,
  filename: string = `frame_${Date.now()}.jpg`
): File {
  return new File([frame.blob], filename, {
    type: frame.blob.type,
    lastModified: Date.now(),
  });
}

/**
 * 工具函数：格式化时间显示
 */
export function formatVideoTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 工具函数：验证视频文件
 */
export function isValidVideoFile(file: File): boolean {
  const validTypes = [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/quicktime',
    'video/flv',
    'video/webm',
    'video/mkv',
  ];
  
  return validTypes.includes(file.type);
}

/**
 * 工具函数：计算视频文件的最佳帧提取间隔
 */
export function calculateOptimalFrameInterval(
  duration: number,
  targetFrameCount: number = 8
): { interval: number; actualFrameCount: number } {
  const minInterval = 0.5; // 最小间隔0.5秒
  const maxFrameCount = Math.floor(duration / minInterval);
  
  const actualFrameCount = Math.min(targetFrameCount, maxFrameCount);
  const interval = duration / actualFrameCount;
  
  return {
    interval,
    actualFrameCount,
  };
}
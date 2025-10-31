/**
 * 分块上传管理器
 * 负责处理大文件的分块上传逻辑
 */

import { fileService } from '../../../services';
import { http } from '../../../utils/request';
import { delay, nextFrame, TimerManager } from '../../../utils/delay';

// 分块上传配置
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk
export const MAX_CONCURRENT_CHUNKS = 3; // 最大并发分块数
export const UPLOAD_TIMEOUT = 30000; // 30秒超时
export const MAX_RETRY_ATTEMPTS = 5; // 最大重试次数
export const RETRY_DELAY_BASE = 1000; // 基础重试延迟

// 分块上传状态
export interface ChunkUploadState {
  chunkIndex: number;
  uploaded: boolean;
  retryCount: number;
}

// 文件上传状态
export interface FileUploadState {
  uploadId?: string;
  chunks: ChunkUploadState[];
  uploadedBytes: number;
  totalBytes: number;
  isCompleted: boolean;
  isCancelled: boolean;
}

// 分块上传状态检查结果
export interface ChunkUploadStatusResult {
  uploadId: string;
  totalChunks: number;
  uploadedChunks: number;
  missingChunks: number[];
  isCompleted: boolean;
  canResume: boolean;
  sessionExpired: boolean;
  suggestions?: string[];
}

// 状态检查配置
export interface StatusCheckConfig {
  maxRetries: number;
  retryDelay: number;
  pollInterval: number;
  enableAutoRecovery: boolean;
}

/**
 * 分块上传管理器
 */
export class ChunkUploadManager {
  private chunkUploadControllers = new Map<string, AbortController>();
  private timerManager = new TimerManager();
  private statusCheckConfig: StatusCheckConfig = {
    maxRetries: 3,
    retryDelay: 2000,
    pollInterval: 5000,
    enableAutoRecovery: true
  };

  /**
   * 创建文件分块
   */
  private createFileChunks(file: File): Blob[] {
    const chunks: Blob[] = [];
    let start = 0;

    while (start < file.size) {
      const end = Math.min(start + CHUNK_SIZE, file.size);
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
    fileId: string,
    uploadUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const controllerId = `${fileId}-${chunkIndex}`;
    
    try {
      // 创建取消控制器
      const controller = new AbortController();
      this.chunkUploadControllers.set(controllerId, controller);

      // 创建FormData
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('uploadId', fileId);

      console.log(`📤 开始上传分块 ${chunkIndex + 1}:`, {
        chunkSize: chunk.size,
        fileId,
        uploadUrl
      });

      // 使用固定的分块上传API端点（相对路径，baseURL已配置）
      const response = await http.upload('/files/chunk/upload', formData, {
        timeout: UPLOAD_TIMEOUT * 3, // 增加超时时间
        headers: {
          'X-Upload-Type': 'chunk',
          'X-Chunk-Index': chunkIndex.toString(),
          'X-File-ID': fileId,
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
        signal: controller.signal
      });

      if (!response.success) {
        throw new Error(`Chunk upload failed: ${response.message || 'Unknown error'}`);
      }

      console.log(`✅ 分块 ${chunkIndex + 1} 上传成功`);

    } catch (error: any) {
      // 处理取消错误
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.log(`⏹️ 分块 ${chunkIndex + 1} 上传已取消`);
        throw new Error('Upload cancelled');
      }

      console.error(`❌ 分块 ${chunkIndex + 1} 上传失败:`, error);
      throw error;
    } finally {
      // 清理控制器
      this.chunkUploadControllers.delete(controllerId);
    }
  }

  /**
   * 取消分块上传
   */
  public cancelChunkUpload(fileId: string, chunkIndex?: number): void {
    if (chunkIndex !== undefined) {
      // 取消特定分块
      const controllerId = `${fileId}-${chunkIndex}`;
      const controller = this.chunkUploadControllers.get(controllerId);
      if (controller) {
        controller.abort();
        this.chunkUploadControllers.delete(controllerId);
      }
    } else {
      // 取消文件的所有分块
      const controllersToCancel = Array.from(this.chunkUploadControllers.entries())
        .filter(([id]) => id.startsWith(fileId));
      
      controllersToCancel.forEach(([id, controller]) => {
        controller.abort();
        this.chunkUploadControllers.delete(id);
      });
    }
  }

  /**
   * 取消所有上传
   */
  public cancelAllUploads(): void {
    this.chunkUploadControllers.forEach(controller => {
      controller.abort();
    });
    this.chunkUploadControllers.clear();
  }

  /**
   * 分块上传文件
   */
  public async uploadFileWithChunks(
    file: File,
    category: string,
    onProgress?: (progress: number) => void,
    onChunkProgress?: (chunkIndex: number, progress: number) => void
  ): Promise<any> {
    console.log('🚀 开始分块上传:', {
      filename: file.name,
      size: file.size,
      category
    });

    // 创建文件状态
    const chunks = this.createFileChunks(file);
    const fileState: FileUploadState = {
      chunks: chunks.map((_, index) => ({
        chunkIndex: index,
        uploaded: false,
        retryCount: 0
      })),
      uploadedBytes: 0,
      totalBytes: file.size,
      isCompleted: false,
      isCancelled: false
    };

    try {
      // 初始化分块上传
      const initResponse = await fileService.initChunkUpload({
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        category: category,
        totalChunks: fileState.chunks.length
      });
      
      if (!initResponse.data) {
        throw new Error('Failed to initialize chunk upload: no response data');
      }
      
      fileState.uploadId = initResponse.data.uploadId;
      
      // 串行上传分块，避免并发冲突
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkState = fileState.chunks[i];
        
        try {
          await this.uploadChunk(
            chunk,
            i,
            fileState.uploadId!,
            '', // uploadUrl不再使用
            (progress) => {
              if (onChunkProgress) {
                onChunkProgress(i, progress);
              }
              
              // 实时更新总进度（基于当前分片的进度）
              if (onProgress) {
                const currentChunkBytes = Math.round(chunk.size * progress / 100);
                const totalUploadedBytes = fileState.uploadedBytes + currentChunkBytes;
                const totalProgress = Math.round((totalUploadedBytes / fileState.totalBytes) * 100);
                
                // 确保进度值在合理范围内，避免跳跃
                const clampedProgress = Math.min(Math.max(totalProgress, 0), 100);
                onProgress(clampedProgress);
                
                // 添加调试日志
                if (progress === 100) {
                  console.log(`📊 分片 ${i + 1} 完成，当前总进度: ${clampedProgress}%`);
                }
              }
            }
          );
          
          chunkState.uploaded = true;
          fileState.uploadedBytes += chunk.size;
          
          // 立即更新总进度 - 确保分片完成后进度准确
          if (onProgress) {
            const totalProgress = Math.round((fileState.uploadedBytes / fileState.totalBytes) * 100);
            const finalProgress = Math.min(totalProgress, 100);
            
            // 使用 nextFrame 确保进度更新在下一个渲染帧中执行，避免UI阻塞
            nextFrame().then(() => {
              onProgress(finalProgress);
            });
            
            console.log(`📊 分片 ${i + 1}/${chunks.length} 完成，总进度: ${finalProgress}% (已上传: ${fileState.uploadedBytes}/${fileState.totalBytes} 字节)`);
          }
          
          console.log(`✅ 分块 ${i + 1}/${chunks.length} 上传完成`);
          
        } catch (error: any) {
          console.error(`❌ 分块 ${i + 1} 上传失败:`, error);
          
          // 如果是取消错误，直接抛出
          if (error.message?.includes('cancelled') || error.name === 'AbortError') {
            throw error;
          }
          
          // 其他错误也抛出，不再重试
          throw new Error(`分块 ${i + 1} 上传失败: ${error.message}`);
        }
      }
      

      
      // 完成分块上传
      const completeResponse = await fileService.completeChunkUpload({
        uploadId: fileState.uploadId!,
        fileId: fileState.uploadId!
      });
      
      if (!completeResponse.success) {
        throw new Error(`Failed to complete chunk upload: ${completeResponse.message}`);
      }
      
      fileState.isCompleted = true;
      
      console.log('✅ 分块上传完成:', {
        filename: file.name,
        uploadId: fileState.uploadId,
        totalChunks: chunks.length
      });
      
      return completeResponse.data;
      
    } catch (error: any) {
      console.error('❌ 分块上传失败:', error);
      
      // 取消所有相关的分块上传
      if (fileState.uploadId) {
        this.cancelChunkUpload(fileState.uploadId);
      }
      
      fileState.isCancelled = true;
      throw error;
    }
  }

  /**
   * 获取活跃的上传数量
   */
  public getActiveUploadsCount(): number {
    return this.chunkUploadControllers.size;
  }

  /**
   * 检查是否有活跃的上传
   */
  public hasActiveUploads(): boolean {
    return this.chunkUploadControllers.size > 0;
  }

  /**
   * 检查分块上传状态
   */
  public async checkChunkUploadStatus(uploadId: string): Promise<ChunkUploadStatusResult> {
    try {
      console.log(`🔍 检查分块上传状态: ${uploadId}`);
      
      const response = await fileService.checkChunkUploadStatus(uploadId);
      
      if (!response.success || !response.data) {
        throw new Error(`状态检查失败: ${response.message || '未知错误'}`);
      }

      const statusResult = response.data;
      
      console.log(`📊 分块上传状态:`, {
        uploadId: statusResult.uploadId,
        totalChunks: statusResult.totalChunks,
        uploadedChunks: statusResult.uploadedChunks,
        missingChunks: statusResult.missingChunks,
        isCompleted: statusResult.isCompleted,
        canResume: statusResult.canResume,
        sessionExpired: statusResult.sessionExpired
      });

      return statusResult;
      
    } catch (error: any) {
      console.error(`❌ 检查分块上传状态失败:`, error);
      throw new Error(`状态检查失败: ${error.message || '网络错误'}`);
    }
  }

  /**
   * 带重试机制的状态检查
   */
  public async checkChunkUploadStatusWithRetry(
    uploadId: string,
    maxRetries: number = this.statusCheckConfig.maxRetries
  ): Promise<ChunkUploadStatusResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.checkChunkUploadStatus(uploadId);
      } catch (error: any) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const retryDelay = this.statusCheckConfig.retryDelay * attempt;
          console.log(`⏳ 状态检查失败，${retryDelay}ms 后重试 (${attempt}/${maxRetries})`);
          await delay(retryDelay);
        }
      }
    }
    
    throw lastError || new Error('状态检查重试失败');
  }

  /**
   * 启动状态轮询
   */
  public startStatusPolling(
    uploadId: string,
    onStatusUpdate: (status: ChunkUploadStatusResult) => void,
    onError?: (error: Error) => void
  ): void {
    // 清除现有的轮询
    this.stopStatusPolling(uploadId);
    
    const poll = async () => {
      try {
        const status = await this.checkChunkUploadStatus(uploadId);
        onStatusUpdate(status);
        
        // 如果上传完成或会话过期，停止轮询
        if (status.isCompleted || status.sessionExpired) {
          this.stopStatusPolling(uploadId);
          return;
        }
        
        // 继续轮询
        this.timerManager.setTimeout(`poll-${uploadId}`, poll, this.statusCheckConfig.pollInterval);
        
      } catch (error: any) {
        console.error(`❌ 状态轮询失败:`, error);
        onError?.(error);
        
        // 发生错误时停止轮询
        this.stopStatusPolling(uploadId);
      }
    };
    
    // 立即执行第一次检查
    poll();
  }

  /**
   * 停止状态轮询
   */
  public stopStatusPolling(uploadId: string): void {
    const timerId = `poll-${uploadId}`;
    if (this.timerManager.hasTimer(timerId)) {
      this.timerManager.clearTimeout(timerId);
      console.log(`⏹️ 停止状态轮询: ${uploadId}`);
    }
  }

  /**
   * 停止所有状态轮询
   */
  public stopAllStatusPolling(): void {
    this.timerManager.clearAll();
    console.log(`⏹️ 停止所有状态轮询`);
  }

  /**
   * 自动恢复上传
   */
  public async autoRecoverUpload(
    uploadId: string,
    file: File,
    category: string,
    onProgress?: (progress: number) => void,
    onChunkProgress?: (chunkIndex: number, progress: number) => void
  ): Promise<any> {
    if (!this.statusCheckConfig.enableAutoRecovery) {
      throw new Error('自动恢复功能已禁用');
    }

    try {
      console.log(`🔄 开始自动恢复上传: ${uploadId}`);
      
      // 检查当前状态
      const status = await this.checkChunkUploadStatusWithRetry(uploadId);
      
      if (status.sessionExpired) {
        throw new Error('上传会话已过期，无法恢复');
      }
      
      if (status.isCompleted) {
        console.log(`✅ 上传已完成，无需恢复`);
        return { uploadId, completed: true };
      }
      
      if (!status.canResume) {
        throw new Error('上传无法恢复，请重新开始');
      }
      
      if (status.missingChunks.length === 0) {
        // 所有分块都已上传，尝试完成上传
        console.log(`🎯 所有分块已上传，尝试完成上传`);
        return await fileService.completeChunkUpload({
          uploadId,
          fileId: uploadId
        });
      }
      
      // 恢复上传缺失的分块
      console.log(`🔄 恢复上传 ${status.missingChunks.length} 个缺失分块`);
      
      const chunks = this.createFileChunks(file);
      let uploadedBytes = (status.uploadedChunks * CHUNK_SIZE);
      
      for (const chunkIndex of status.missingChunks) {
        if (chunkIndex >= chunks.length) {
          console.warn(`⚠️ 无效的分块索引: ${chunkIndex}`);
          continue;
        }
        
        const chunk = chunks[chunkIndex];
        
        try {
          await this.uploadChunk(
            chunk,
            chunkIndex,
            uploadId,
            '',
            (progress) => {
              if (onChunkProgress) {
                onChunkProgress(chunkIndex, progress);
              }
              
              if (onProgress) {
                const currentChunkBytes = Math.round(chunk.size * progress / 100);
                const totalUploadedBytes = uploadedBytes + currentChunkBytes;
                const totalProgress = Math.round((totalUploadedBytes / file.size) * 100);
                onProgress(Math.min(totalProgress, 100));
              }
            }
          );
          
          uploadedBytes += chunk.size;
          console.log(`✅ 恢复分块 ${chunkIndex + 1} 成功`);
          
        } catch (error: any) {
          console.error(`❌ 恢复分块 ${chunkIndex + 1} 失败:`, error);
          throw new Error(`恢复分块 ${chunkIndex + 1} 失败: ${error.message}`);
        }
      }
      
      // 完成上传
      const completeResponse = await fileService.completeChunkUpload({
        uploadId,
        fileId: uploadId
      });
      
      console.log(`✅ 自动恢复上传完成: ${uploadId}`);
      return completeResponse.data;
      
    } catch (error: any) {
      console.error(`❌ 自动恢复上传失败:`, error);
      throw error;
    }
  }

  /**
   * 更新状态检查配置
   */
  public updateStatusCheckConfig(config: Partial<StatusCheckConfig>): void {
    this.statusCheckConfig = { ...this.statusCheckConfig, ...config };
    console.log(`⚙️ 更新状态检查配置:`, this.statusCheckConfig);
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.cancelAllUploads();
    this.stopAllStatusPolling();
    this.timerManager.clearAll();
  }
}

// 导出单例实例
export const chunkUploadManager = new ChunkUploadManager();
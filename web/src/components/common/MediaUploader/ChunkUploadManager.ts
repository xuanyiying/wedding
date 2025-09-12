/**
 * 分块上传管理器
 * 负责处理大文件的分块上传逻辑
 */

import { fileService } from '../../../services';
import { http } from '../../../utils/request';

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

/**
 * 分块上传管理器
 */
export class ChunkUploadManager {
  private chunkUploadControllers = new Map<string, AbortController>();

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
            
            // 使用 setTimeout 确保进度更新在下一个事件循环中执行，避免UI阻塞
            setTimeout(() => {
              onProgress(finalProgress);
            }, 0);
            
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
}

// 导出单例实例
export const chunkUploadManager = new ChunkUploadManager();
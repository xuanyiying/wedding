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

      // 使用统一的request.ts进行上传
      const response = await http.upload(uploadUrl, formData, {
        timeout: UPLOAD_TIMEOUT * 2,
        retryConfig: {
          maxAttempts: 3,
          delay: 1000,
          backoff: true
        },
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
      const uploadUrl = initResponse.data.uploadUrl;
      
      // 创建分块并发上传
      const uploadPromises: Promise<void>[] = [];
      let concurrentUploads = 0;
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkState = fileState.chunks[i];
        
        // 控制并发数
        while (concurrentUploads >= MAX_CONCURRENT_CHUNKS) {
          await Promise.race(uploadPromises);
          concurrentUploads = uploadPromises.filter(p => p !== undefined).length;
        }
        
        const uploadPromise = this.uploadChunk(
          chunk,
          i,
          fileState.uploadId!,
          uploadUrl,
          (progress) => {
            if (onChunkProgress) {
              onChunkProgress(i, progress);
            }
          }
        ).then(() => {
          chunkState.uploaded = true;
          fileState.uploadedBytes += chunk.size;
          
          // 更新总进度
          if (onProgress) {
            const totalProgress = Math.round((fileState.uploadedBytes / fileState.totalBytes) * 100);
            onProgress(totalProgress);
          }
          
          concurrentUploads--;
        }).catch(error => {
          concurrentUploads--;
          throw error;
        });
        
        uploadPromises.push(uploadPromise);
        concurrentUploads++;
      }
      
      // 等待所有分块上传完成
      await Promise.all(uploadPromises);
      
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
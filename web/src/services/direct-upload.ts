import { DirectUploader, type DirectUploadResult, type DirectUploadProgress, type DirectUploadConfig } from '../utils/direct-upload';
import { FileType } from '../types';
import { fileService } from '.';

export class DirectUploadService {
  private progressCallback?: (progress: DirectUploadProgress) => void;
  private activeUploads = new Map<string, DirectUploader>();

  /**
   * 设置进度回调
   */
  setProgressCallback(callback: (progress: DirectUploadProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * 将FileType转换为DirectUploadConfig中的fileType
   */
  private mapFileType(fileType: FileType): 'video' | 'image' {
    switch (fileType) {
      case FileType.VIDEO:
        return 'video';
      case FileType.IMAGE:
        return 'image';
      default:
        return 'image';
    }
  }

  /**
   * 上传单个文件
   */
  async uploadFile(file: File, fileType: FileType, category?: 'avatar' | 'work' | 'event' | 'profile' | 'other'): Promise<DirectUploadResult> {
    const config: DirectUploadConfig = {
      fileType: this.mapFileType(fileType),
      category: category || 'other',
      onProgress: this.progressCallback
    };
    const uploader = new DirectUploader(file, config);
    return uploader.upload();
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(files: File[], fileType: FileType, category?: 'avatar' | 'work' | 'event' | 'profile' | 'other'): Promise<DirectUploadResult[]> {
    const results: DirectUploadResult[] = [];
    const maxConcurrent = 3; // 最大并发数
    const delay = 500; // 请求间隔（毫秒）
    
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (file) => {
        const config: DirectUploadConfig = {
          fileType: this.mapFileType(fileType),
          category: category || 'other',
          onProgress: this.progressCallback
        };
        const uploader = new DirectUploader(file, config);
        return uploader.upload();
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 如果不是最后一批，添加延迟
      if (i + maxConcurrent < files.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return results;
  }

  /**
   * 上传头像
   */
  async uploadAvatar(file: File): Promise<DirectUploadResult> {
    const config: DirectUploadConfig = {
      fileType: 'image',
      category: 'avatar',
      onProgress: this.progressCallback
    };
    const uploader = new DirectUploader(file, config);
    return uploader.upload();
  }

  /**
   * 上传作品图片
   */
  async uploadWorkImages(files: File[]): Promise<DirectUploadResult[]> {
    const results: DirectUploadResult[] = [];
    const maxConcurrent = 3; // 最大并发数
    const delay = 500; // 请求间隔（毫秒）
    
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (file) => {
        const config: DirectUploadConfig = {
          fileType: 'image',
          category: 'work',
          onProgress: this.progressCallback
        };
        const uploader = new DirectUploader(file, config);
        return uploader.upload();
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 如果不是最后一批，添加延迟
      if (i + maxConcurrent < files.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return results;
  }

  /**
   * 上传视频
   */
  async uploadVideo(file: File): Promise<DirectUploadResult> {
    const config: DirectUploadConfig = {
      fileType: 'video',
      category: 'work',
      onProgress: this.progressCallback
    };
    const uploader = new DirectUploader(file, config);
    return uploader.upload();
  }

  /**
   * 上传通用媒体文件
   */
  async uploadMedia(files: File[], category?: 'avatar' | 'work' | 'event' | 'profile' | 'cover' | 'other'): Promise<DirectUploadResult[]> {
    const results: DirectUploadResult[] = [];
    const maxConcurrent = 3; // 最大并发数
    const delay = 500; // 请求间隔（毫秒）
    
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (file) => {
        const configFileType = file.type.startsWith('video/') ? 'video' : 'image';
        const config: DirectUploadConfig = {
          fileType: configFileType,
          category: category || 'other',
          onProgress: this.progressCallback
        };
        const uploader = new DirectUploader(file, config);
        return uploader.upload();
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 如果不是最后一批，添加延迟
      if (i + maxConcurrent < files.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return results;
  }

  /**
   * 取消上传
   */
  async cancelUpload(uploadId: string): Promise<void> {
    const uploader = this.activeUploads.get(uploadId);
    if (uploader) {
      await uploader.cancel();
      this.activeUploads.delete(uploadId);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(id: string): Promise<boolean> {
    try {
      await fileService.deleteFile(id);
      return true;
    } catch (error) {
      console.error('文件删除失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export const directUploadService = new DirectUploadService();
export default directUploadService;
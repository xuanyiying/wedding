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
  async uploadFile(file: File, fileType: FileType): Promise<DirectUploadResult> {
    const config: DirectUploadConfig = {
      fileType: this.mapFileType(fileType),
      onProgress: this.progressCallback
    };
    const uploader = new DirectUploader(file, config);
    return uploader.upload();
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(files: File[], fileType: FileType): Promise<DirectUploadResult[]> {
    const results: DirectUploadResult[] = [];
    for (const file of files) {
      const config: DirectUploadConfig = {
        fileType: this.mapFileType(fileType),
        onProgress: this.progressCallback
      };
      const uploader = new DirectUploader(file, config);
      const result = await uploader.upload();
      results.push(result);
    }
    return results;
  }

  /**
   * 上传头像
   */
  async uploadAvatar(file: File): Promise<DirectUploadResult> {
    const config: DirectUploadConfig = {
      fileType: 'image',
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
    for (const file of files) {
      const config: DirectUploadConfig = {
        fileType: 'image',
        onProgress: this.progressCallback
      };
      const uploader = new DirectUploader(file, config);
      const result = await uploader.upload();
      results.push(result);
    }
    return results;
  }

  /**
   * 上传视频
   */
  async uploadVideo(file: File): Promise<DirectUploadResult> {
    const config: DirectUploadConfig = {
      fileType: 'video',
      onProgress: this.progressCallback
    };
    const uploader = new DirectUploader(file, config);
    return uploader.upload();
  }

  /**
   * 上传通用媒体文件
   */
  async uploadMedia(files: File[]): Promise<DirectUploadResult[]> {
    const results: DirectUploadResult[] = [];
    for (const file of files) {
      const configFileType = file.type.startsWith('video/') ? 'video' : 'image';
      const config: DirectUploadConfig = {
        fileType: configFileType,
        onProgress: this.progressCallback
      };
      const uploader = new DirectUploader(file, config);
      const result = await uploader.upload();
      results.push(result);
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
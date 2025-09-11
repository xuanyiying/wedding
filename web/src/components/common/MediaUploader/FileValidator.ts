/**
 * 文件验证器
 * 负责验证上传文件的类型、大小等
 */

import type { MediaUploadConfig, FileValidationResult } from './types';

// 支持的文件类型从环境变量获取
export const SUPPORTED_IMAGE_TYPES = import.meta.env.VITE_ALLOWED_IMAGE_TYPES
  ? import.meta.env.VITE_ALLOWED_IMAGE_TYPES.split(',').map((type: string) => type.trim())
  : ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const SUPPORTED_VIDEO_TYPES = import.meta.env.VITE_ALLOWED_VIDEO_TYPES
  ? import.meta.env.VITE_ALLOWED_VIDEO_TYPES.split(',').map((type: string) => type.trim())
  : ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv'];

export class FileValidator {
  private config: MediaUploadConfig;

  constructor(config: MediaUploadConfig) {
    this.config = config;
  }

  /**
   * 验证单个文件
   */
  validateFile(file: File): FileValidationResult {
    const { maxSize, imageMaxSize, videoMaxSize } = this.config;

    // 检查文件是否为空
    if (file.size === 0) {
      return {
        valid: false,
        error: '文件不能为空'
      };
    }

    // 检查文件类型
    const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
    const isVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return {
        valid: false,
        error: `不支持的文件类型: ${file.type}`
      };
    }

    // 检查文件大小
    const maxFileSize = isImage ? (imageMaxSize || maxSize!) : (videoMaxSize || maxSize!);
    if (file.size > maxFileSize) {
      const sizeMB = Math.round(maxFileSize / 1024 / 1024);
      return {
        valid: false,
        error: `文件大小超过限制 (${sizeMB}MB)`
      };
    }

    // 检查文件名
    if (!file.name || file.name.trim() === '') {
      return {
        valid: false,
        error: '文件名不能为空'
      };
    }

    // 检查文件名长度
    if (file.name.length > 255) {
      return {
        valid: false,
        error: '文件名过长'
      };
    }

    return { valid: true };
  }

  /**
   * 验证多个文件
   */
  validateFiles(files: File[]): {
    validFiles: File[];
    invalidFiles: Array<{ file: File; error: string }>;
  } {
    const validFiles: File[] = [];
    const invalidFiles: Array<{ file: File; error: string }> = [];

    // 检查文件数量
    if (this.config.maxCount && files.length > this.config.maxCount) {
      return {
        validFiles: [],
        invalidFiles: files.map(file => ({
          file,
          error: `文件数量超过限制 (最多${this.config.maxCount}个)`
        }))
      };
    }

    // 验证每个文件
    files.forEach(file => {
      const result = this.validateFile(file);
      if (result.valid) {
        validFiles.push(file);
      } else {
        invalidFiles.push({
          file,
          error: result.error || '文件验证失败'
        });
      }
    });

    return { validFiles, invalidFiles };
  }

  /**
   * 检查文件是否为图片
   */
  isImageFile(file: File): boolean {
    return SUPPORTED_IMAGE_TYPES.includes(file.type);
  }

  /**
   * 检查文件是否为视频
   */
  isVideoFile(file: File): boolean {
    return SUPPORTED_VIDEO_TYPES.includes(file.type);
  }

  /**
   * 获取文件类型
   */
  getFileType(file: File): 'image' | 'video' {
    return this.isVideoFile(file) ? 'video' : 'image';
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 检查文件扩展名
   */
  checkFileExtension(file: File): boolean {
    const fileName = file.name.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv'];

    const hasValidExtension = [...imageExtensions, ...videoExtensions].some(ext =>
      fileName.endsWith(ext)
    );

    return hasValidExtension;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MediaUploadConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
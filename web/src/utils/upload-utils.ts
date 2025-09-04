/**
 * 工具函数：格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 工具函数：格式化剩余时间
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}分钟`;
  } else {
    return `${Math.round(seconds / 3600)}小时`;
  }
}

/**
 * 工具函数：格式化上传速度
 */
export function formatUploadSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`;
}

// 添加缺失的导出函数
export { formatUploadSpeed as formatSpeed };
export { formatRemainingTime as formatTimeRemaining };

/**
 * 工具函数：验证文件类型
 */
export function validateFileType(file: File, fileType: 'video' | 'image' | 'audio' | 'document' | 'other'): boolean {
  const typeConfig = {
    video: [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/quicktime',
      'video/flv',
      'video/webm',
      'video/mkv'
    ],
    image: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff'
    ],
    audio: [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
      'audio/flac',
      'audio/m4a'
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ],
    other: [] // 允许所有类型
  };

  if (fileType === 'other') return true;
  return typeConfig[fileType].includes(file.type);
}

/**
 * 工具函数：验证文件大小
 */
export function validateFileSize(file: File, maxSize?: number): boolean {
  if (!maxSize) return true;
  return file.size <= maxSize;
}

/**
 * 创建文件验证器
 */
export function createFileValidator(fileType: 'video' | 'image' | 'audio' | 'document' | 'other', maxSize?: number) {
  return {
    validateType: (file: File) => validateFileType(file, fileType),
    validateSize: (file: File) => validateFileSize(file, maxSize),
    validate: (file: File) => {
      const typeValid = validateFileType(file, fileType);
      const sizeValid = validateFileSize(file, maxSize);

      return {
        valid: typeValid && sizeValid,
        errors: [
          ...(!typeValid ? ['不支持的文件类型'] : []),
          ...(!sizeValid ? [`文件大小超过限制 (${formatFileSize(maxSize || 0)})`] : [])
        ]
      };
    }
  };
}

/**
 * 生成唯一ID
 */
export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * 获取文件类型
 */
export function getFileType(file: File): 'video' | 'image' | 'audio' | 'document' | 'other' {
  const mimeType = file.type;

  if (mimeType.startsWith('video/')) {
    return 'video';
  } else if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('audio/')) {
    return 'audio';
  } else if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'text/plain' ||
    mimeType === 'text/csv'
  ) {
    return 'document';
  }

  return 'other';
}
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';
import { getOssService } from '../config/oss';
import { FileService } from './file.service';
import { FileType } from '../types';
import { generateId } from '@/utils/id.generator';

// 文件类型配置
const FILE_TYPE_CONFIG = {
  video: {
    maxSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv']
  },
  work: {
    maxSize: 200 * 1024 * 1024, // 200MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/webm']
  },
  image: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff']
  },
  profile: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  other: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['*'] // 允许所有类型
  }
};

// 上传会话接口
interface UploadSession {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  fileType: FileType;
  ossKey: string;
  presignedUrl: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  expiresAt: number;
  category?: string;
  generateCover?: boolean;
}

// 预签名URL请求参数
interface PresignedUrlParams {
  userId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  fileType: FileType;
  expires?: number;
  category?: string;
  generateCover?: boolean;
}

// 确认上传参数
interface ConfirmUploadParams {
  uploadSessionId: string;
  userId: string;
  actualFileSize?: number;
}

export class DirectUploadService {
  private static readonly SESSION_PREFIX = 'upload_session:';
  private static readonly DEFAULT_EXPIRES = 3600; // 1小时
  private static readonly SESSION_TTL = 3600; // Redis中会话过期时间（秒）
  private static readonly ossService = getOssService();
  /**
   * 生成预签名上传URL
   */
  static async generatePresignedUrl(params: PresignedUrlParams) {
    try {
      const { userId, fileName, fileSize, contentType, fileType, generateCover, category, expires = this.DEFAULT_EXPIRES } = params;

      // 验证文件类型和大小
      this.validateFile(fileName, fileSize, contentType, fileType);

      // 生成上传会话ID
      const uploadSessionId = generateId();
      
      // 生成OSS文件键
      const ossKey = this.generateOssKey(userId, fileName, fileType);
      
      // 生成预签名URL
      const presignedUrl = await this.ossService.getPresignedUploadUrl(ossKey, expires, contentType);
      
      // 创建上传会话
      const session: UploadSession = {
        id: uploadSessionId,
        userId,
        fileName,
        fileSize,
        contentType,
        fileType: fileType as FileType,
        ossKey,
        presignedUrl,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + expires * 1000,
        generateCover: generateCover || false,
        category: category || 'other'
      };
      
      // 存储会话到Redis
      await redisClient.set(
        `${this.SESSION_PREFIX}${uploadSessionId}`,
        JSON.stringify(session),
        'EX',
        this.SESSION_TTL
      );
      
      logger.info(`生成预签名URL成功: ${uploadSessionId}`, {
        userId,
        fileName,
        fileType,
        ossKey
      });
      
      return {
        uploadSessionId,
        presignedUrl,
        ossKey,
        expires
      };
    } catch (error) {
      logger.error('生成预签名URL失败:', error);
      throw error;
    }
  }

  /**
   * 确认上传完成
   */
  static async confirmUpload(params: ConfirmUploadParams) {
    try {
      const { uploadSessionId, userId, actualFileSize } = params;
      
      // 获取上传会话
      const session = await this.getUploadSession(uploadSessionId);
      
      if (!session) {
        throw new Error('上传会话不存在或已过期');
      }
      
      if (session.userId !== userId) {
        throw new Error('无权限操作此上传会话');
      }
      
      if (session.status === 'completed') {
        throw new Error('上传已完成，请勿重复确认');
      }
      
      if (session.status === 'cancelled') {
        throw new Error('上传已取消');
      }
      
      // 验证文件大小（如果提供）
      if (actualFileSize && Math.abs(actualFileSize - session.fileSize) > 1024) {
        logger.warn(`文件大小不匹配: 预期=${session.fileSize}, 实际=${actualFileSize}`);
      }
      
      // 检查文件是否真的存在于OSS
      const fileExists = await this.ossService.fileExists(session.ossKey);
      
      if (!fileExists) {
        throw new Error('文件上传未完成或上传失败');
      }
      
      // 创建文件记录
      const fileRecord = await FileService.createFileRecord({
        originalName: session.fileName,
        filename: session.ossKey,
        filePath: session.ossKey,
        fileSize: actualFileSize || session.fileSize,
        mimeType: session.contentType,
        fileType: session.fileType as FileType,
        userId,
        url: this.ossService.getFileUrl(session.ossKey)
      });
      
      // 更新会话状态
      session.status = 'completed';
      await redisClient.set(
        `${this.SESSION_PREFIX}${uploadSessionId}`,
        JSON.stringify(session),
        'EX',
        this.SESSION_TTL // 完成后保留5分钟用于查询
      );
      
      // 异步生成缩略图（如果是视频）
      if (session.fileType === 'video' && session.generateCover) {
        FileService.generateVideoCover(this.ossService.getFileUrl(session.ossKey)).catch(error => {
          logger.error('生成视频缩略图失败:', error);
        });
      }
      
      logger.info(`确认上传完成: ${uploadSessionId}`, {
        userId,
        fileName: session.fileName,
        fileId: fileRecord.id
      });
      
      return {
        fileId: fileRecord.id,
        filename: session.fileName,
        originalName: session.fileName,
        fileSize: actualFileSize || session.fileSize,
        url: this.ossService.getFileUrl(session.ossKey),
        fileType: session.fileType,
        uploadedAt: new Date().toISOString(),
        category: session.category || 'other'
      };
    } catch (error) {
      logger.error('确认上传失败:', error);
      throw error;
    }
  }

  /**
   * 取消上传
   */
  static async cancelUpload(uploadSessionId: string, userId: string) {
    try {
      // 获取上传会话
      const session = await this.getUploadSession(uploadSessionId);
      
      if (!session) {
        throw new Error('上传会话不存在或已过期');
      }
      
      if (session.userId !== userId) {
        throw new Error('无权限操作此上传会话');
      }
      
      if (session.status === 'completed') {
        throw new Error('上传已完成，无法取消');
      }
      
      // 更新会话状态
      session.status = 'cancelled';
      await redisClient.set(
        `${this.SESSION_PREFIX}${uploadSessionId}`,
        JSON.stringify(session),
        'EX',
        300 // 取消后保留5分钟
      );
      
      // 删除OSS中的文件（如果存在）
      try {
        const ossService = getOssService();
        const fileExists = await ossService.fileExists(session.ossKey);
        if (fileExists) {
          await ossService.deleteFile(session.ossKey);
        }
      } catch (error) {
        logger.warn('删除OSS文件失败:', error);
      }
      
      logger.info(`取消上传: ${uploadSessionId}`, {
        userId,
        fileName: session.fileName
      });
    } catch (error) {
      logger.error('取消上传失败:', error);
      throw error;
    }
  }

  /**
   * 查询上传进度
   */
  static async getUploadProgress(uploadSessionId: string, userId: string) {
    try {
      // 获取上传会话
      const session = await this.getUploadSession(uploadSessionId);
      
      if (!session) {
        throw new Error('上传会话不存在或已过期');
      }
      
      if (session.userId !== userId) {
        throw new Error('无权限查询此上传会话');
      }
      
      // 检查文件是否存在于OSS（用于判断上传进度）
      let progress = 0;
      let actualFileSize = 0;
      
      if (session.status === 'completed') {
        progress = 100;
        actualFileSize = session.fileSize;
      } else if (session.status === 'cancelled' || session.status === 'failed') {
        progress = 0;
      } else {
        // 尝试获取OSS中的文件信息
        try {
          const ossService = getOssService();
          const fileExists = await ossService.fileExists(session.ossKey);
          if (fileExists) {
            // 如果文件存在，假设上传完成
            progress = 100;
            session.status = 'uploading';
          } else {
            progress = 0;
          }
        } catch (error) {
          logger.warn('检查OSS文件状态失败:', error);
          progress = 0;
        }
      }
      
      return {
        uploadSessionId,
        status: session.status,
        progress,
        fileName: session.fileName,
        fileSize: session.fileSize,
        actualFileSize,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      };
    } catch (error) {
      logger.error('查询上传进度失败:', error);
      throw error;
    }
  }

  /**
   * 获取上传会话
   */
  private static async getUploadSession(uploadSessionId: string): Promise<UploadSession | null> {
    try {
      const session = await redisClient.get(
        `${this.SESSION_PREFIX}${uploadSessionId}`,
      );
      return session ? JSON.parse(session) : null;
    } catch (error) {
      logger.error('获取上传会话失败:', error);
      return null;
    }
  }

  /**
   * 验证文件
   */
  private static validateFile(fileName: string, fileSize: number, contentType: string, fileType: string) {
    // 检查文件类型配置
    const config = FILE_TYPE_CONFIG[fileType as keyof typeof FILE_TYPE_CONFIG];
    if (!config) {
      throw new Error(`不支持的文件类型: ${fileType}`);
    }
    
    // 检查文件大小
    if (fileSize > config.maxSize) {
      const maxSizeMB = Math.round(config.maxSize / 1024 / 1024);
      throw new Error(`文件大小超过限制，最大允许 ${maxSizeMB}MB`);
    }
    
    // 检查MIME类型
    if (!config.allowedTypes.includes('*') && !config.allowedTypes.includes(contentType)) {
      throw new Error(`不支持的文件格式: ${contentType}`);
    }
    
    // 检查文件名
    if (!fileName || fileName.trim().length === 0) {
      throw new Error('文件名不能为空');
    }
    
    // 检查文件名长度
    if (fileName.length > 255) {
      throw new Error('文件名过长');
    }
    
    // 检查文件名中的非法字符
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(fileName)) {
      throw new Error('文件名包含非法字符');
    }
  }

  /**
   * 生成OSS文件键
   */
  private static generateOssKey(userId: string, fileName: string, fileType: string, category?: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `media/${category}/${fileType}/${userId}/${timestamp}_${randomStr}_${sanitizedFileName}`;
  }

  /**
   * 清理过期会话（定时任务调用）
   */
  static async cleanupExpiredSessions() {
    try {
      // 这个方法可以由定时任务调用，清理过期的上传会话
      // 由于Redis会自动过期，这里主要是记录日志
      logger.info('开始清理过期上传会话');
      
      // 可以扩展为扫描特定模式的键并清理
      // const pattern = `${this.SESSION_PREFIX}*`;
      // await redisClient.delPattern(pattern);
      
      logger.info('清理过期上传会话完成');
    } catch (error) {
      logger.error('清理过期上传会话失败:', error);
    }
  }
}
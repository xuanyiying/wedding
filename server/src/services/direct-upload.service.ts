import { getOssService } from '../config/oss';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { FileService } from './file.service';
import { redisClient } from '../config/redis';
import { FileType } from '@/types';

// 直传上传会话接口
interface UploadSession {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  fileType: 'video' | 'image';
  category: string;
  ossKey: string;
  presignedUrl: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  expiresAt: Date;
}

// 预签名URL请求参数
interface PresignedUrlRequest {
  userId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  fileType: 'video' | 'image';
  category?: string;
  expires?: number;
}

// 确认上传请求参数
interface ConfirmUploadRequest {
  uploadSessionId: string;
  userId: string;
  actualFileSize?: number;
}

// 文件类型配置
const FILE_TYPE_CONFIG = {
  video: {
    maxSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/quicktime',
      'video/flv',
      'video/webm',
      'video/mkv'
    ]
  },
  image: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff'
    ]
  }
};

export class DirectUploadService {
  private static readonly SESSION_PREFIX = 'upload_session:';
  private static readonly SESSION_EXPIRE_TIME = 7200; // 2小时
  private static ossService = getOssService();

  /**
   * 生成预签名上传URL
   */
  static async generatePresignedUrl(request: PresignedUrlRequest) {
    const {
      userId,
      fileName,
      fileSize,
      contentType,
      fileType,
      category = 'other',
      expires = 3600
    } = request;

    // 验证文件类型和大小
    this.validateFile(fileName, fileSize, contentType, fileType);

    // 生成唯一的OSS key
    const ossKey = this.generateOssKey(userId, fileName, fileType, category);

    // 获取OSS服务实例

    // 生成预签名URL
    const presignedUrl = await this.ossService.getPresignedUploadUrl(
      ossKey,
      expires,
      contentType
    );

    // 创建上传会话
    const sessionId = uuidv4();
    const session: UploadSession = {
      id: sessionId,
      userId,
      fileName,
      fileSize,
      contentType,
      fileType,
      category,
      ossKey,
      presignedUrl,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expires * 1000)
    };

    // 保存会话到Redis
    await this.saveSession(session);

    logger.info(`生成预签名URL成功: ${sessionId}`, {
      userId,
      fileName,
      fileType,
      fileSize
    });

    return {
      presignedUrl,
      uploadSessionId: sessionId,
      ossKey,
      expires
    };
  }

  /**
   * 确认上传完成
   */
  static async confirmUpload(request: ConfirmUploadRequest) {
    const { uploadSessionId, userId, actualFileSize } = request;

    // 获取上传会话
    const session = await this.getSession(uploadSessionId);
    if (!session) {
      throw new Error('上传会话不存在或已过期');
    }

    // 验证用户权限
    if (session.userId !== userId) {
      throw new Error('无权限操作此上传会话');
    }

    // 验证会话状态
    if (session.status !== 'pending' && session.status !== 'uploading') {
      throw new Error(`上传会话状态异常: ${session.status}`);
    }

    // 验证文件大小（如果提供）
    if (actualFileSize && Math.abs(actualFileSize - session.fileSize) > 1024) {
      logger.warn(`文件大小不匹配: 预期=${session.fileSize}, 实际=${actualFileSize}`);
    }

    try {
      // 更新会话状态
      session.status = 'uploading';
      await this.saveSession(session);

      // 获取文件的公共访问URL而不是预签名URL
      const fileAccessUrl = this.ossService.getFileUrl(session.ossKey);

      // 创建文件记录
      const fileRecord = await FileService.createFileRecord({
        userId,
        filename: session.fileName,
        originalName: session.fileName,
        fileSize: actualFileSize || session.fileSize,
        fileType: session.fileType as FileType,
        category: session.category,
        url: fileAccessUrl,    // 使用文件的公共访问URL
        filePath: session.ossKey,      // OSS Key
        mimeType: session.contentType
      });

      // 更新会话状态为完成
      session.status = 'completed';
      await this.saveSession(session);

      logger.info(`确认上传完成: ${uploadSessionId}`, {
        userId,
        fileId: fileRecord.id,
        fileName: session.fileName
      });

      return {
        fileId: fileRecord.id,
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        fileSize: fileRecord.fileSize,
        url: fileRecord.fileUrl,
        fileType: fileRecord.fileType,
        uploadedAt: fileRecord.createdAt,
        category: session.category
      };

    } catch (error) {
      // 更新会话状态为失败
      session.status = 'failed';
      await this.saveSession(session);

      logger.error(`确认上传失败: ${uploadSessionId}`, error);
      throw error;
    }
  }

  /**
   * 取消上传
   */
  static async cancelUpload(userId: string, uploadSessionId: string) {
    const session = await this.getSession(uploadSessionId);
    if (!session) {
      throw new Error('上传会话不存在或已过期');
    }

    // 验证用户权限
    if (session.userId !== userId) {
      throw new Error('无权限操作此上传会话');
    }

    // 更新会话状态
    session.status = 'cancelled';
    await this.saveSession(session);

    logger.info(`取消上传: ${uploadSessionId}`, { userId });
  }

  /**
   * 查询上传进度
   */
  static async getUploadProgress(userId: string, uploadSessionId: string) {
    const session = await this.getSession(uploadSessionId);
    if (!session) {
      throw new Error('上传会话不存在或已过期');
    }

    // 验证用户权限
    if (session.userId !== userId) {
      throw new Error('无权限查询此上传会话');
    }

    return {
      uploadSessionId,
      status: session.status,
      fileName: session.fileName,
      fileSize: session.fileSize,
      fileType: session.fileType,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    };
  }

  /**
   * 验证文件
   */
  private static validateFile(
    fileName: string,
    fileSize: number,
    contentType: string,
    fileType: 'video' | 'image'
  ) {
    const config = FILE_TYPE_CONFIG[fileType];

    // 验证文件大小
    if (fileSize > config.maxSize) {
      throw new Error(`文件大小超过限制: ${Math.round(config.maxSize / 1024 / 1024)}MB`);
    }

    // 验证文件类型
    if (!config.allowedTypes.includes(contentType)) {
      throw new Error(`不支持的文件类型: ${contentType}`);
    }

    // 验证文件名
    if (!fileName || fileName.length > 255) {
      throw new Error('文件名无效');
    }

    // 验证文件扩展名
    const ext = fileName.toLowerCase().split('.').pop();
    const typeExtMap: Record<string, string[]> = {
      'video/mp4': ['mp4'],
      'video/avi': ['avi'],
      'video/mov': ['mov'],
      'video/quicktime': ['mov'],
      'video/wmv': ['wmv'],
      'video/flv': ['flv'],
      'video/webm': ['webm'],
      'video/mkv': ['mkv'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp'],
      'image/bmp': ['bmp'],
      'image/tiff': ['tiff', 'tif']
    };

    const allowedExts = typeExtMap[contentType];
    if (allowedExts && ext && !allowedExts.includes(ext)) {
      throw new Error(`文件扩展名与类型不匹配: ${ext} vs ${contentType}`);
    }
  }

  /**
   * 生成OSS key
   */
  private static generateOssKey(
    userId: string,
    fileName: string,
    fileType: 'video' | 'image',
    category: string
  ): string {
    const timestamp = Date.now();
    const randomId = uuidv4().substring(0, 8);
    const ext = fileName.split('.').pop();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    return `${fileType}s/${category}/${userId}/${timestamp}_${randomId}_${sanitizedName}_.${ext}`;
  }

  /**
   * 保存会话到Redis
   */
  private static async saveSession(session: UploadSession) {
    const key = this.SESSION_PREFIX + session.id;
    await redisClient.setex(key, this.SESSION_EXPIRE_TIME, JSON.stringify(session));
  }

  /**
   * 从Redis获取会话
   */
  private static async getSession(sessionId: string): Promise<UploadSession | null> {
    const key = this.SESSION_PREFIX + sessionId;
    const data = await redisClient.get(key);

    if (!data) {
      return null;
    }

    try {
      const session = JSON.parse(data) as UploadSession;
      // 转换日期字符串为Date对象
      session.createdAt = new Date(session.createdAt);
      session.expiresAt = new Date(session.expiresAt);
      return session;
    } catch (error) {
      logger.error('解析上传会话数据失败:', error);
      return null;
    }
  }

  /**
   * 清理过期会话
   */
  static async cleanupExpiredSessions() {
    try {
      const pattern = this.SESSION_PREFIX + '*';
      const keys = await redisClient.keys(pattern);

      let cleanedCount = 0;
      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          try {
            const session = JSON.parse(data) as UploadSession;
            if (new Date(session.expiresAt) < new Date()) {
              await redisClient.del(key);
              cleanedCount++;
            }
          } catch (error) {
            // 数据格式错误，直接删除
            await redisClient.del(key);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        logger.info(`清理过期上传会话: ${cleanedCount}个`);
      }
    } catch (error) {
      logger.error('清理过期上传会话失败:', error);
    }
  }
}
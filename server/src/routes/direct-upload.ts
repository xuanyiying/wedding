import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middlewares/auth';
import { FileService } from '../services/file.service';
import path from 'path';
import { generateId } from '../utils/id.generator';
import { getOssService } from '../config/oss';

// 创建路由实例
const router = Router();
const ossService = getOssService();
// 全局类型声明
declare global {
  var uploadSessions: Map<string, any> | undefined;
}

// 支持的文件类型配置
const ALLOWED_TYPES = {
  video: {
    mimeTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'],
    maxSize: 500 * 1024 * 1024, // 500MB
    folder: 'videos',
  },
  work: {
    mimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/mov',
      'video/webm',
    ],
    maxSize: 200 * 1024 * 1024, // 200MB
    folder: 'works',
  },
  image: {
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'],
    maxSize: 50 * 1024 * 1024, // 50MB
    folder: 'images',
  },
  avatar: {
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'avatars',
  },
};

/**
 * 生成预签名上传URL
 * POST /api/direct-upload/presigned-url
 */
router.post(
  '/presigned-url',
  authMiddleware,
  [
    body('fileName').notEmpty().withMessage('文件名不能为空'),
    body('fileSize').isInt({ min: 1 }).withMessage('文件大小必须大于0'),
    body('contentType').notEmpty().withMessage('文件类型不能为空'),
    body('fileType').isIn(['video', 'work', 'image', 'avatar']).withMessage('文件类型必须是video、work、image或avatar'),
    body('expires').optional().isInt({ min: 300, max: 7200 }).withMessage('过期时间必须在300-7200秒之间'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array(),
        });
      }

      const { fileName, fileSize, contentType, fileType, expires = 3600 } = req.body;
      const userId = (req as any).user.id;

      // 验证文件类型
      const typeConfig = ALLOWED_TYPES[fileType as keyof typeof ALLOWED_TYPES];
      if (!typeConfig.mimeTypes.includes(contentType)) {
        return res.status(400).json({
          success: false,
          message: `不支持的文件类型: ${contentType}`,
        });
      }

      // 验证文件大小
      if (fileSize > typeConfig.maxSize) {
        return res.status(400).json({
          success: false,
          message: `文件大小超过限制: ${typeConfig.maxSize / 1024 / 1024}MB`,
        });
      }

      // 生成唯一文件名
      const fileExtension = path.extname(fileName);
      const uniqueFileName = `${generateId()}${fileExtension}`;
      const key = `${typeConfig.folder}/${uniqueFileName}`;

      // 生成预签名上传URL
      const uploadUrl = await ossService.getPresignedUploadUrl(key, expires, contentType);

      // 生成上传会话ID，用于后续确认上传
      const uploadSessionId = generateId();

      // 临时存储上传会话信息（实际项目中可能需要使用Redis等缓存）
      // 这里简化处理，存储在内存中
      if (!global.uploadSessions) {
        global.uploadSessions = new Map();
      }
      global.uploadSessions.set(uploadSessionId, {
        userId,
        key,
        fileName,
        fileSize,
        contentType,
        fileType,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + expires * 1000),
      });

      return res.json({
        success: true,
        data: {
          uploadUrl,
          uploadSessionId,
          key,
          expires,
          maxFileSize: typeConfig.maxSize,
        },
      });
    } catch (error) {
      console.error('生成预签名URL失败:', error);
      return res.status(500).json({
        success: false,
        message: '生成预签名URL失败',
      });
    }
  },
);

/**
 * 确认上传完成
 * POST /api/direct-upload/confirm
 */
router.post(
  '/confirm',
  authMiddleware,
  [
    body('uploadSessionId').notEmpty().withMessage('上传会话ID不能为空'),
    body('actualFileSize').optional().isInt({ min: 1 }).withMessage('实际文件大小必须大于0'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array(),
        });
      }

      const { uploadSessionId, actualFileSize } = req.body;
      const userId = (req as any).user.id;

      // 获取上传会话信息
      if (!global.uploadSessions) {
        global.uploadSessions = new Map();
      }
      const session = global.uploadSessions.get(uploadSessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '上传会话不存在或已过期',
        });
      }

      if (session.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权限访问此上传会话',
        });
      }

      if (new Date() > session.expiresAt) {
        global.uploadSessions?.delete(uploadSessionId);
        return res.status(410).json({
          success: false,
          message: '上传会话已过期',
        });
      }

      // 验证文件是否真的上传到了OSS
      const fileExists = await ossService.fileExists(session.key);
      if (!fileExists) {
        return res.status(400).json({
          success: false,
          message: '文件上传未完成或失败',
        });
      }

      // 获取文件信息
      const fileInfo = await ossService.getFileInfo(session.key);
      const finalFileSize = actualFileSize || fileInfo.size;

      // 将字符串fileType转换为枚举值
      const fileTypeMap: { [key: string]: string } = {
        video: 'VIDEO',
        image: 'IMAGE',
        avatar: 'AVATAR',
      };

      const enumFileType = fileTypeMap[session.fileType] || session.fileType;

      // 创建文件记录
      const fileRecord = await FileService.createFileRecord({
        originalName: session.fileName,
        filename: session.fileName,
        filePath: session.key,
        fileSize: finalFileSize,
        mimeType: session.contentType,
        fileType: enumFileType as any,
        userId: session.userId,
        url: ossService.getFileUrl(session.key),
      });

      // 清理上传会话
      if (uploadSessionId) {
        global.uploadSessions?.delete(uploadSessionId);
      }

      return res.json({
        success: true,
        data: {
          fileId: fileRecord.id,
          filename: fileRecord.filename,
          originalName: fileRecord.originalName,
          fileSize: fileRecord.fileSize,
          url: ossService.getFileUrl(session.key),
          fileType: fileRecord.fileType,
          uploadedAt: fileRecord.createdAt,
        },
      });
    } catch (error) {
      console.error('确认上传失败:', error);
      return res.status(500).json({
        success: false,
        message: '确认上传失败',
      });
    }
  },
);

/**
 * 取消上传
 * DELETE /api/direct-upload/cancel/:uploadSessionId
 */
router.delete(
  '/cancel/:uploadSessionId',
  authMiddleware,
  [param('uploadSessionId').notEmpty().withMessage('上传会话ID不能为空')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array(),
        });
      }

      const { uploadSessionId } = req.params;
      const userId = (req as any).user.id;

      if (!uploadSessionId) {
        return res.status(400).json({
          success: false,
          message: '上传会话ID不能为空',
        });
      }

      // 获取上传会话信息
      if (!global.uploadSessions) {
        global.uploadSessions = new Map();
      }
      const session = global.uploadSessions.get(uploadSessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '上传会话不存在',
        });
      }

      if (session.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权限访问此上传会话',
        });
      }

      // 尝试删除已上传的文件（如果存在）
      try {
        const fileExists = await ossService.fileExists(session.key);
        if (fileExists) {
          await ossService.deleteFile(session.key);
        }
      } catch (error) {
        console.warn('删除未完成上传的文件失败:', error);
      }

      // 清理上传会话
      global.uploadSessions?.delete(uploadSessionId);

      return res.json({
        success: true,
        message: '上传已取消',
      });
    } catch (error) {
      console.error('取消上传失败:', error);
      return res.status(500).json({
        success: false,
        message: '取消上传失败',
      });
    }
  },
);

/**
 * 获取上传进度（可选功能）
 * GET /api/direct-upload/progress/:uploadSessionId
 */
router.get(
  '/progress/:uploadSessionId',
  authMiddleware,
  [param('uploadSessionId').notEmpty().withMessage('上传会话ID不能为空')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array(),
        });
      }

      const { uploadSessionId } = req.params;
      const userId = (req as any).user.id;

      if (!uploadSessionId) {
        return res.status(400).json({
          success: false,
          message: '上传会话ID不能为空',
        });
      }

      // 获取上传会话信息
      if (!global.uploadSessions) {
        global.uploadSessions = new Map();
      }
      const session = global.uploadSessions.get(uploadSessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '上传会话不存在',
        });
      }

      if (session.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权限访问此上传会话',
        });
      }

      // 检查文件是否已上传完成
      const fileExists = await ossService.fileExists(session.key);
      let progress = 0;
      let actualSize = 0;

      if (fileExists) {
        try {
          const fileInfo = await ossService.getFileInfo(session.key);
          actualSize = fileInfo.size;
          progress = Math.min(100, (actualSize / session.fileSize) * 100);
        } catch (error) {
          console.warn('获取文件信息失败:', error);
        }
      }

      return res.json({
        success: true,
        data: {
          uploadSessionId,
          progress: Math.round(progress),
          expectedSize: session.fileSize,
          actualSize,
          isCompleted: progress >= 100,
          expiresAt: session.expiresAt,
        },
      });
    } catch (error) {
      console.error('获取上传进度失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取上传进度失败',
      });
    }
  },
);

export default router;

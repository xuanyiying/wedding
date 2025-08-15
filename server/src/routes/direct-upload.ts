import { Router } from 'express';
import { body, param } from 'express-validator';
import { DirectUploadController } from '../controllers/direct-upload.controller';
import { authMiddleware } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';

const router = Router();

// 获取预签名上传URL
router.post(
  '/presigned-url',
  authMiddleware,
  [
    body('fileName').notEmpty().withMessage('文件名不能为空'),
    body('fileSize').isInt({ min: 1 }).withMessage('文件大小必须大于0'),
    body('contentType').notEmpty().withMessage('文件类型不能为空'),
    body('fileType').isIn(['video', 'work', 'image', 'profile', 'avatar', 'other']).withMessage('不支持的文件类型'),
    body('expires').optional().isInt({ min: 60, max: 86400 }).withMessage('过期时间必须在60秒到24小时之间')
  ],
  validateRequest,
  DirectUploadController.getPresignedUrl
);

// 确认上传完成
router.post(
  '/confirm',
  authMiddleware,
  [
    body('uploadSessionId').notEmpty().withMessage('上传会话ID不能为空'),
    body('actualFileSize').optional().isInt({ min: 1 }).withMessage('实际文件大小必须大于0')
  ],
  validateRequest,
  DirectUploadController.confirmUpload
);

// 取消上传
router.post(
  '/cancel',
  authMiddleware,
  [
    body('uploadSessionId').notEmpty().withMessage('上传会话ID不能为空')
  ],
  validateRequest,
  DirectUploadController.cancelUpload
);

// 查询上传进度
router.get(
  '/progress/:uploadSessionId',
  authMiddleware,
  [
    param('uploadSessionId').notEmpty().withMessage('上传会话ID不能为空')
  ],
  validateRequest,
  DirectUploadController.getUploadProgress
);

export default router;

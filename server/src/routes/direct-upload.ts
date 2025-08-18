import { Router } from 'express';
import { DirectUploadController } from '../controllers/direct-upload.controller';
import { authMiddleware } from '../middlewares/auth';
import { uploadRateLimit } from '../middlewares/security';

const router = Router();

// 获取预签名上传URL
router.post(
  '/presigned-url',
  uploadRateLimit, // 应用文件上传速率限制
  authMiddleware,
  DirectUploadController.getPresignedUrl
);

// 确认上传完成
router.post(
  '/confirm',
  uploadRateLimit, // 应用文件上传速率限制
  authMiddleware,
  DirectUploadController.confirmUpload
);

// 取消上传
router.post(
  '/cancel',
  authMiddleware,
  DirectUploadController.cancelUpload
);

// 查询上传进度
router.get(
  '/progress/:uploadSessionId',
  authMiddleware,
  DirectUploadController.getUploadProgress
);

export default router;

import { Router } from 'express';
import {
  uploadFile,
  batchUploadFiles,
  getFiles,
  getFileById,
  deleteFile,
  batchDeleteFiles,
  getUploadToken,
  updateFile,
  getFileStats,
  downloadFile,
  generateThumbnail,
  getUserMedia,
} from '../controllers/file.controller';
import { authMiddleware } from '../middlewares/auth';
import { uploadMiddleware, uploadWithTimeout, handleUploadError } from '../middlewares/upload';
import { validateRequest } from '../middlewares/validation';
import { fileValidators } from '../validators/file';

const router = Router();

// 单文件上传 - 优化中间件顺序和错误处理
router.post(
  '/upload',
  uploadWithTimeout(600000), // 10分钟超时
  authMiddleware, // 认证检查提前
  uploadMiddleware.single('file'),
  handleUploadError, // 错误处理
  validateRequest(fileValidators.uploadFile),
  uploadFile,
);

// 批量文件上传 - 优化中间件顺序和错误处理
router.post(
  '/upload/batch',
  uploadWithTimeout(900000), // 15分钟超时
  authMiddleware, // 认证检查提前
  uploadMiddleware.array('files', 10), // 最多10个文件
  handleUploadError, // 错误处理
  validateRequest(fileValidators.uploadFiles),
  batchUploadFiles,
);

// 获取文件列表
router.get('/', validateRequest(fileValidators.getFiles), getFiles);

// 获取文件详情
router.get('/:id', validateRequest(fileValidators.getFileById), getFileById);

// 删除文件
router.delete('/:id', authMiddleware, validateRequest(fileValidators.deleteFile), deleteFile);

// 批量删除文件
router.delete('/batch', authMiddleware, validateRequest(fileValidators.deleteFiles), batchDeleteFiles);

// 获取上传令牌
router.post('/upload-token', authMiddleware, validateRequest(fileValidators.getUploadToken), getUploadToken);

// 更新文件信息
router.put('/:id', authMiddleware, validateRequest(fileValidators.updateFile), updateFile);

// 获取文件统计
router.get('/stats/overview', getFileStats);

// 下载文件
router.get('/:id/download', validateRequest(fileValidators.downloadFile), downloadFile);

// 生成缩略图
router.post('/:id/thumbnail', authMiddleware, validateRequest(fileValidators.generateThumbnail), generateThumbnail);

// 获取用户媒体文件
router.get('/user/:userId/:type', getUserMedia);

export default router;

import { Router } from 'express';
import { EnhancedUploadController, createUploadMiddleware, createChunkUploadMiddleware } from '../controllers/enhanced-upload.controller';

const router = Router();

// TODO: 添加认证中间件
// router.use(authMiddleware);

// TODO: 添加速率限制中间件
// router.use(rateLimitMiddleware({
//   windowMs: 15 * 60 * 1000, // 15分钟
//   max: uploadConfig.security.rateLimitPerUser, // 每用户限制
//   message: '上传请求过于频繁，请稍后再试'
// }));

/**
 * 上传会话管理路由
 */

// 初始化上传会话
router.post('/initialize', EnhancedUploadController.initializeUpload);

// 确认上传完成
router.post('/confirm', EnhancedUploadController.confirmUpload);

// 重试上传
router.post('/retry', EnhancedUploadController.retryUpload);

// 恢复上传（断点续传）
router.post('/resume', EnhancedUploadController.resumeUpload);

// 取消上传
router.post('/cancel', EnhancedUploadController.cancelUpload);

/**
 * 文件上传路由
 */

// 服务端文件上传（完整文件）
router.post('/server',
  createUploadMiddleware(),
  EnhancedUploadController.uploadToServer
);

// 服务端分片上传
router.post('/server/chunk',
  createChunkUploadMiddleware(),
  EnhancedUploadController.uploadToServer
);

/**
 * 进度和状态查询路由
 */

// 获取上传进度
router.get('/progress/:uploadSessionId', EnhancedUploadController.getUploadProgress);

// 获取上传进度详情
router.get('/progress-detail/:uploadSessionId', EnhancedUploadController.getUploadProgressDetail);

// 批量查询上传状态
router.post('/batch-status', EnhancedUploadController.getBatchUploadStatus);

/**
 * 配置和管理路由
 */

// 获取上传配置
router.get('/config', EnhancedUploadController.getUploadConfig);

// 获取上传统计信息
router.get('/stats', EnhancedUploadController.getUploadStats);

// 验证上传参数
router.post('/validate', EnhancedUploadController.validateUploadParams);

// 健康检查
router.get('/health', EnhancedUploadController.healthCheck);

/**
 * 重试和熔断器管理路由
 */

// 获取重试统计信息
router.get('/retry-stats/:operationName', EnhancedUploadController.getRetryStats);

// 重置熔断器（管理员功能）
router.post('/reset-circuit-breaker', EnhancedUploadController.resetCircuitBreaker);

/**
 * 管理员路由
 */

// 清理过期会话
router.post('/admin/cleanup', EnhancedUploadController.cleanupExpiredSessions);

export { router as enhancedUploadRoutes };
import { Request, Response } from 'express';
import { EnhancedUploadService, UploadMode } from '../services/enhanced-upload.service';
import { uploadConfig } from '../config/upload.config';
import { RetryUtil, RetryConfigs, RetryConfig } from '../utils/retry.util';
import { logger } from '../utils/logger';
import { Resp } from '@/utils/response';
import multer from 'multer';

/**
 * 增强的上传控制器
 */
export class EnhancedUploadController {

  /**
   * 初始化上传会话
   */
  static async initializeUpload(req: Request, res: Response): Promise<void> {
    try {
      const {
        fileName,
        fileSize,
        contentType,
        fileType,
        category,
        uploadMode,
        enableChunking,
        expires,
        // 新增自定义配置参数
        customTimeout,
        customRetryAttempts,
        customRetryDelay
      } = req.body;

      const userId = req.user?.id;

      // 参数校验
      if (!fileName || !fileSize || !contentType || !fileType || !userId) {
        Resp.badRequest(res, '缺少必要参数');
        return;
      }

      // 验证上传模式
      const validModes = Object.values(UploadMode);
      if (uploadMode && !validModes.includes(uploadMode)) {
        Resp.badRequest(res, `无效的上传模式: ${uploadMode}`);
        return;
      }

      // 创建自定义重试配置
      let retryConfig = RetryConfigs.fast;
      if (uploadConfig.retry.customizable && (customTimeout || customRetryAttempts || customRetryDelay)) {
        const customOverrides: Partial<RetryConfig> = {};

        if (customTimeout && uploadConfig.timeout.customizable) {
          const timeout = Math.max(uploadConfig.timeout.minTimeout,
            Math.min(customTimeout, uploadConfig.timeout.maxTimeout));
          customOverrides.timeout = timeout;
        }

        if (customRetryAttempts) {
          const attempts = Math.max(uploadConfig.retry.minAttempts,
            Math.min(customRetryAttempts, uploadConfig.retry.maxAttempts));
          customOverrides.attempts = attempts;
        }

        if (customRetryDelay) {
          const delay = Math.max(uploadConfig.retry.minDelay,
            Math.min(customRetryDelay, uploadConfig.retry.maxDelay));
          customOverrides.delay = delay;
        }

        retryConfig = RetryUtil.createCustomConfig(RetryConfigs.fast, customOverrides) as any;
      }

      // 使用重试机制初始化上传
      const result = await RetryUtil.executeWithRetry(
        () => EnhancedUploadService.initializeUpload({
          userId,
          fileName,
          fileSize,
          contentType,
          fileType,
          category,
          uploadMode: uploadMode || UploadMode.AUTO,
          enableChunking: enableChunking !== false, // 默认启用分片
          expires: expires || 3600
        }),
        retryConfig,
        'initialize-upload'
      );

      Resp.success(res, {
        message: '上传会话初始化成功',
        data: result
      });

    } catch (error) {
      logger.error('初始化上传会话失败:', error);
      Resp.internalError(res, error instanceof Error ? error.message : '初始化上传会话失败');
    }
  }

  /**
   * 服务端文件上传
   */
  static async uploadToServer(req: Request, res: Response): Promise<void> {
    try {
      const {
        uploadSessionId,
        chunkIndex,
        totalChunks,
        customTimeout,
        customRetryAttempts
      } = req.body;
      const userId = req.user?.id;

      // 参数校验
      if (!uploadSessionId || !userId) {
        Resp.badRequest(res, '缺少必要参数');
        return;
      }

      // 检查是否有文件上传
      if (!req.file) {
        Resp.badRequest(res, '未检测到上传文件');
        return;
      }

      // 验证文件大小
      if (req.file.size > uploadConfig.maxFileSize) {
        Resp.badRequest(res, `文件大小超过限制: ${Math.round(uploadConfig.maxFileSize / 1024 / 1024)}MB`);
        return;
      }

      // 创建自定义重试配置
      let retryConfig = RetryConfigs.upload;
      if (uploadConfig.retry.customizable && (customTimeout || customRetryAttempts)) {
        const customOverrides: Partial<RetryConfig> = {};

        if (customTimeout && uploadConfig.timeout.customizable) {
          const timeout = Math.max(uploadConfig.timeout.minTimeout,
            Math.min(customTimeout, uploadConfig.timeout.maxTimeout));
          customOverrides.timeout = timeout;
        }

        if (customRetryAttempts) {
          const attempts = Math.max(uploadConfig.retry.minAttempts,
            Math.min(customRetryAttempts, uploadConfig.retry.maxAttempts));
          customOverrides.attempts = attempts;
        }

        retryConfig = RetryUtil.createCustomConfig(RetryConfigs.upload, customOverrides) as any;
      }

      // 使用重试机制上传文件
      const result = await RetryUtil.executeWithRetry(
        () => EnhancedUploadService.uploadFileToServer({
          uploadSessionId,
          userId,
          fileBuffer: req.file!.buffer,
          chunkIndex: chunkIndex !== undefined ? parseInt(chunkIndex) : undefined,
          totalChunks: totalChunks !== undefined ? parseInt(totalChunks) : undefined
        }),
        retryConfig,
        'server-upload'
      );

      Resp.success(res, {
        message: '文件上传成功',
        data: result
      });

    } catch (error) {
      logger.error('服务端文件上传失败:', error);
      Resp.internalError(res, error instanceof Error ? error.message : '服务端文件上传失败');
    }
  }

  /**
   * 确认上传完成
   */
  static async confirmUpload(req: Request, res: Response): Promise<void> {
    try {
      const { uploadSessionId, actualFileSize } = req.body;
      const userId = req.user?.id;

      // 参数校验
      if (!uploadSessionId || !userId) {
        Resp.badRequest(res, '缺少必要参数');
        return;
      }

      // 使用重试机制确认上传
      const result = await RetryUtil.executeWithRetry(
        () => EnhancedUploadService.confirmUpload(uploadSessionId, userId, actualFileSize),
        RetryConfigs.standard,
        'confirm-upload'
      );

      Resp.success(res, {
        message: '上传确认成功',
        data: result
      });

    } catch (error) {
      logger.error('确认上传失败:', error);
      Resp.internalError(res, error instanceof Error ? error.message : '确认上传失败');
    }
  }

  /**
   * 重试上传
   */
  static async retryUpload(req: Request, res: Response): Promise<void> {
    try {
      const { uploadSessionId } = req.body;
      const userId = req.user?.id;

      // 参数校验
      if (!uploadSessionId || !userId) {
        Resp.badRequest(res, '缺少必要参数');
        return;
      }

      const result = await EnhancedUploadService.retryUpload(uploadSessionId, userId);

      Resp.success(res, {
        message: '重试上传成功',
        data: result
      });

    } catch (error) {
      logger.error('重试上传失败:', error);
      Resp.internalError(res, error instanceof Error ? error.message : '重试上传失败');
    }
  }

  /**
   * 取消上传
   */
  static async cancelUpload(req: Request, res: Response): Promise<void> {
    try {
      const { uploadSessionId } = req.body;
      const userId = req.user?.id;

      // 参数校验
      if (!uploadSessionId || !userId) {
        Resp.badRequest(res, '缺少必要参数');
        return;
      }

      await EnhancedUploadService.cancelUpload(userId, uploadSessionId);

      Resp.success(res, {
        message: '取消上传成功'
      });

    } catch (error) {
      logger.error('取消上传失败:', error);
      Resp.internalError(res, error instanceof Error ? error.message : '取消上传失败');
    }
  }

  /**
   * 获取上传进度
   */
  static async getUploadProgress(req: Request, res: Response): Promise<void> {
    try {
      const { uploadSessionId } = req.params;
      const userId = req.user?.id;

      // 参数校验
      if (!uploadSessionId || !userId) {
        Resp.badRequest(res, '缺少必要参数');
        return;
      }

      const result = await EnhancedUploadService.getUploadProgress(userId, uploadSessionId);

      Resp.success(res, {
        message: '获取上传进度成功',
        data: result
      });

    } catch (error) {
      logger.error('获取上传进度失败:', error);
      Resp.internalError(res, error instanceof Error ? error.message : '获取上传进度失败');
    }
  }

  /**
   * 获取上传进度详情
   */
  static async getUploadProgressDetail(req: Request, res: Response): Promise<void> {
    try {
      const { uploadSessionId } = req.params;
      const userId = req.user?.id;

      // 参数校验
      if (!uploadSessionId || !userId) {
        Resp.badRequest(res, '缺少必要参数');
        return;
      }

      const result = await EnhancedUploadService.getUploadProgressDetail(userId, uploadSessionId);

      Resp.success(res, {
        message: '获取上传进度详情成功',
        data: result
      });

    } catch (error) {
      logger.error('获取上传进度详情失败:', error);
      Resp.internalError(res, error instanceof Error ? error.message : '获取上传进度详情失败');
    }
  }

  /**
   * 恢复上传（断点续传）
   */
  static async resumeUpload(req: Request, res: Response): Promise<void> {
    try {
      const { uploadSessionId } = req.body;
      const userId = req.user?.id;

      // 参数校验
      if (!uploadSessionId || !userId) {
        Resp.badRequest(res, '缺少必要参数');
        return;
      }

      const result = await EnhancedUploadService.resumeUpload(userId, uploadSessionId);

      Resp.success(res, {
        message: '恢复上传成功',
        data: result
      });

    } catch (error) {
      logger.error('恢复上传失败:', error);
      Resp.internalError(res, error instanceof Error ? error.message : '恢复上传失败');
    }
  }

  /**
   * 获取上传配置
   */
  static async getUploadConfig(_req: Request, res: Response): Promise<void> {
    try {
      const config = {
        maxFileSize: uploadConfig.maxFileSize,
        allowedImageTypes: uploadConfig.allowedImageTypes,
        allowedVideoTypes: uploadConfig.allowedVideoTypes,
        allowedAudioTypes: uploadConfig.allowedAudioTypes,
        timeout: {
          upload: uploadConfig.timeout.upload,
          presignedUrl: uploadConfig.timeout.presignedUrl,
          confirmation: uploadConfig.timeout.confirmation,
          chunkUpload: uploadConfig.timeout.chunkUpload,
          fileValidation: uploadConfig.timeout.fileValidation,
          ossOperation: uploadConfig.timeout.ossOperation,
          customizable: uploadConfig.timeout.customizable,
          minTimeout: uploadConfig.timeout.minTimeout,
          maxTimeout: uploadConfig.timeout.maxTimeout
        },
        retry: {
          attempts: uploadConfig.retry.attempts,
          delay: uploadConfig.retry.delay,
          backoff: uploadConfig.retry.backoff,
          maxDelay: uploadConfig.retry.maxDelay,
          customizable: uploadConfig.retry.customizable,
          minAttempts: uploadConfig.retry.minAttempts,
          maxAttempts: uploadConfig.retry.maxAttempts,
          minDelay: uploadConfig.retry.minDelay,
          enableCircuitBreaker: uploadConfig.retry.enableCircuitBreaker,
          circuitBreakerThreshold: uploadConfig.retry.circuitBreakerThreshold,
          circuitBreakerTimeout: uploadConfig.retry.circuitBreakerTimeout
        },
        mode: {
          enableDirectUpload: uploadConfig.mode.enableDirectUpload,
          forceServerUpload: uploadConfig.mode.forceServerUpload,
          chunkSize: uploadConfig.mode.chunkSize,
          enableChunkUpload: uploadConfig.mode.enableChunkUpload,
          maxConcurrentChunks: uploadConfig.mode.maxConcurrentChunks,
          autoModeThreshold: uploadConfig.mode.autoModeThreshold,
          enableResumeUpload: uploadConfig.mode.enableResumeUpload,
          resumeChunkSize: uploadConfig.mode.resumeChunkSize,
          directUploadSizeLimit: uploadConfig.mode.directUploadSizeLimit,
          serverUploadSizeLimit: uploadConfig.mode.serverUploadSizeLimit
        },
        security: {
          maxConcurrentUploads: uploadConfig.security.maxConcurrentUploads,
          rateLimitPerUser: uploadConfig.security.rateLimitPerUser,
          enableVirusScan: uploadConfig.security.enableVirusScan
        }
      };

      Resp.success(res, {
        message: '获取上传配置成功',
        data: config
      });

    } catch (error) {
      logger.error('获取上传配置失败:', error);
      Resp.internalError(res, '获取上传配置失败');
    }
  }

  /**
   * 获取上传统计信息
   */
  static async getUploadStats(_req: Request, res: Response): Promise<void> {
    try {
      // 这里应该从数据库或缓存中获取实际的上传统计信息
      // 目前返回模拟数据
      const stats = {
        totalUploads: 0,
        successfulUploads: 0,
        failedUploads: 0,
        pendingUploads: 0,
        totalFileSize: 0,
        averageFileSize: 0,
        mostPopularFileType: 'image',
        uploadsToday: 0,
        uploadsThisWeek: 0,
        uploadsThisMonth: 0,
        activeUploads: 0,
        retryStats: {
          totalRetries: 0,
          successfulRetries: 0,
          failedRetries: 0,
          averageRetryCount: 0
        }
      };

      Resp.success(res, {
        message: '获取上传统计成功',
        data: stats
      });

    } catch (error) {
      logger.error('获取上传统计失败:', error);
      Resp.internalError(res, '获取上传统计失败');
    }
  }

  /**
   * 获取重试统计信息
   */
  static async getRetryStats(req: Request, res: Response): Promise<void> {
    try {
      const { operationName } = req.params;

      if (!operationName) {
        Resp.badRequest(res, '缺少操作名称参数');
        return;
      }

      const circuitBreakerStatus = RetryUtil.getCircuitBreakerStatus(operationName);

      Resp.success(res, {
        message: '获取重试统计成功',
        data: {
          operationName,
          circuitBreaker: circuitBreakerStatus || {
            state: 'not_initialized',
            message: '熔断器未初始化'
          }
        }
      });

    } catch (error) {
      logger.error('获取重试统计失败:', error);
      Resp.internalError(res, '获取重试统计失败');
    }
  }

  /**
   * 重置熔断器
   */
  static async resetCircuitBreaker(req: Request, res: Response): Promise<void> {
    try {
      const { operationName } = req.body;

      if (!operationName) {
        Resp.badRequest(res, '缺少操作名称参数');
        return;
      }

      // 这里可以添加管理员权限检查
      // if (!req.user?.isAdmin) {
      //   Resp.forbidden(res, '需要管理员权限');
      //   return;
      // }

      RetryUtil.resetCircuitBreaker(operationName);

      Resp.success(res, {
        message: `熔断器重置成功: ${operationName}`
      });

    } catch (error) {
      logger.error('重置熔断器失败:', error);
      Resp.internalError(res, '重置熔断器失败');
    }
  }

  /**
   * 验证上传参数
   */
  static async validateUploadParams(req: Request, res: Response): Promise<void> {
    try {
      const {
        fileName,
        fileSize,
        contentType,
        fileType,
        uploadMode,
        customTimeout,
        customRetryAttempts,
        customRetryDelay
      } = req.body;

      const validation = {
        valid: true,
        errors: [] as string[],
        warnings: [] as string[],
        recommendations: [] as string[]
      };

      // 验证基础参数
      if (!fileName) validation.errors.push('文件名不能为空');
      if (!fileSize || fileSize <= 0) validation.errors.push('文件大小必须大于0');
      if (!contentType) validation.errors.push('内容类型不能为空');
      if (!fileType) validation.errors.push('文件类型不能为空');

      // 验证文件大小
      if (fileSize > uploadConfig.maxFileSize) {
        validation.errors.push(`文件大小超过限制: ${Math.round(uploadConfig.maxFileSize / 1024 / 1024)}MB`);
      }

      // 验证上传模式
      if (uploadMode) {
        const validModes = Object.values(UploadMode);
        if (!validModes.includes(uploadMode)) {
          validation.errors.push(`无效的上传模式: ${uploadMode}`);
        }

        // 检查模式限制
        if (uploadMode === UploadMode.DIRECT && fileSize > uploadConfig.mode.directUploadSizeLimit) {
          validation.warnings.push(`文件大小超过直传限制，建议使用服务端上传`);
        }

        if (uploadMode === UploadMode.SERVER && fileSize > uploadConfig.mode.serverUploadSizeLimit) {
          validation.errors.push(`文件大小超过服务端上传限制`);
        }
      }

      // 验证自定义超时配置
      if (customTimeout) {
        if (!uploadConfig.timeout.customizable) {
          validation.warnings.push('系统不允许自定义超时时间');
        } else if (customTimeout < uploadConfig.timeout.minTimeout || customTimeout > uploadConfig.timeout.maxTimeout) {
          validation.errors.push(`自定义超时时间必须在 ${uploadConfig.timeout.minTimeout}-${uploadConfig.timeout.maxTimeout}ms 之间`);
        }
      }

      // 验证自定义重试配置
      if (customRetryAttempts) {
        if (!uploadConfig.retry.customizable) {
          validation.warnings.push('系统不允许自定义重试次数');
        } else if (customRetryAttempts < uploadConfig.retry.minAttempts || customRetryAttempts > uploadConfig.retry.maxAttempts) {
          validation.errors.push(`自定义重试次数必须在 ${uploadConfig.retry.minAttempts}-${uploadConfig.retry.maxAttempts} 之间`);
        }
      }

      if (customRetryDelay) {
        if (!uploadConfig.retry.customizable) {
          validation.warnings.push('系统不允许自定义重试延迟');
        } else if (customRetryDelay < uploadConfig.retry.minDelay || customRetryDelay > uploadConfig.retry.maxDelay) {
          validation.errors.push(`自定义重试延迟必须在 ${uploadConfig.retry.minDelay}-${uploadConfig.retry.maxDelay}ms 之间`);
        }
      }

      // 生成建议
      if (fileSize > uploadConfig.mode.autoModeThreshold) {
        validation.recommendations.push('建议启用分片上传以提高上传成功率');
      }

      if (fileSize > uploadConfig.mode.chunkSize * 10) {
        validation.recommendations.push('建议使用服务端上传模式处理大文件');
      }

      validation.valid = validation.errors.length === 0;

      Resp.success(res, {
        message: '参数验证完成',
        data: validation
      });

    } catch (error) {
      logger.error('验证上传参数失败:', error);
      Resp.internalError(res, '验证上传参数失败');
    }
  }

  /**
   * 健康检查
   */
  static async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        config: {
          enableDirectUpload: uploadConfig.mode.enableDirectUpload,
          forceServerUpload: uploadConfig.mode.forceServerUpload,
          enableChunkUpload: uploadConfig.mode.enableChunkUpload,
          maxFileSize: uploadConfig.maxFileSize,
          retryAttempts: uploadConfig.retry.attempts
        },
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      };

      Resp.success(res, {
        message: '服务健康',
        data: health
      });

    } catch (error) {
      logger.error('健康检查失败:', error);
      Resp.internalError(res, '健康检查失败');
    }
  }

  /**
   * 批量上传状态查询
   */
  static async getBatchUploadStatus(req: Request, res: Response): Promise<void> {
    try {
      const { uploadSessionIds } = req.body;
      const userId = req.user?.id;

      // 参数校验
      if (!uploadSessionIds || !Array.isArray(uploadSessionIds) || !userId) {
        Resp.badRequest(res, '缺少必要参数或参数格式错误');
        return;
      }

      // 限制批量查询数量
      if (uploadSessionIds.length > 50) {
        Resp.badRequest(res, '批量查询数量不能超过50个');
        return;
      }

      const results = await Promise.allSettled(
        uploadSessionIds.map(sessionId =>
          EnhancedUploadService.getUploadProgress(userId, sessionId)
        )
      );

      const successResults: any[] = [];
      const failedResults: any[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successResults.push({
            ...result.value,
            uploadSessionId: uploadSessionIds[index]
          });
        } else {
          failedResults.push({
            uploadSessionId: uploadSessionIds[index],
            error: result.reason?.message || '查询失败'
          });
        }
      });

      Resp.success(res, {
        message: '批量查询上传状态完成',
        data: {
          success: successResults,
          failed: failedResults,
          total: uploadSessionIds.length,
          successCount: successResults.length,
          failedCount: failedResults.length
        }
      });

    } catch (error) {
      logger.error('批量查询上传状态失败:', error);
      Resp.internalError(res, '批量查询上传状态失败');
    }
  }

  /**
   * 清理过期会话（管理员接口）
   */
  static async cleanupExpiredSessions(_req: Request, res: Response): Promise<void> {
    try {
      // 这里可以添加管理员权限检查
      // if (!req.user?.isAdmin) {
      //   Resp.forbidden(res, '需要管理员权限');
      //   return;
      // }

      await Promise.all([
        EnhancedUploadService.cleanupExpiredSessions(),
        EnhancedUploadService.cleanupTempDirectory()
      ]);

      Resp.success(res, {
        message: '清理过期会话成功'
      });

    } catch (error) {
      logger.error('清理过期会话失败:', error);
      Resp.internalError(res, '清理过期会话失败');
    }
  }
}

/**
 * Multer 配置用于服务端上传
 */
export const createUploadMiddleware = () => {
  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: {
      fileSize: uploadConfig.maxFileSize,
      files: 1 // 单次只允许上传一个文件
    },
    fileFilter: (_req, file, cb) => {
      // 验证文件类型
      const allowedTypes = [
        ...uploadConfig.allowedImageTypes,
        ...uploadConfig.allowedVideoTypes,
        ...uploadConfig.allowedAudioTypes
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`不支持的文件类型: ${file.mimetype}`));
      }
    }
  }).single('file');
};

/**
 * 分片上传中间件
 */
export const createChunkUploadMiddleware = () => {
  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: {
      fileSize: uploadConfig.mode.chunkSize * 2, // 允许稍大于配置的分片大小
      files: 1
    }
  }).single('chunk');
};
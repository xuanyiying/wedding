import multer from 'multer';
import { config } from '../config/config';

// 文件大小限制 - 从配置文件读取
const limits = {
  fileSize: config.upload.maxFileSize, // 从配置读取
  files: config.upload.maxFiles, // 最多10个文件
};

// 创建multer实例
export const uploadMiddleware = multer({
  storage:multer.memoryStorage(),
  limits,
});

// 带超时的上传中间件
export const uploadWithTimeout = (timeoutMs: number = config.upload.timeout) => {
  return (req: any, res: any, next: any) => {
    console.log(`📥 开始文件上传请求: ${req.method} ${req.url}`);
    console.log(`👤 用户ID: ${req.user?.id}`);
    console.log(`📁 文件大小限制: ${config.upload.maxFileSize} bytes`);

    // 设置请求超时
    const timeout = setTimeout(() => {
      console.error(`⏰ 文件上传超时: ${req.url}, 超时时间: ${timeoutMs}ms`);
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: '文件上传超时，请稍后重试',
          code: 'UPLOAD_TIMEOUT',
        });
      }
    }, timeoutMs);

    // 清理超时定时器
    const cleanup = () => {
      console.log(`✅ 文件上传请求完成: ${req.url}`);
      clearTimeout(timeout);
    };

    // 监听响应完成
    res.on('finish', cleanup);
    res.on('close', cleanup);
    res.on('error', (err: Error) => {
      console.error(`💥 文件上传响应错误: ${req.url}`, err);
      cleanup();
    });

    next();
  };
};

// 重试机制辅助函数
export const createRetryHandler = (
  maxAttempts: number = config.upload.retryAttempts,
  delay: number = config.upload.retryDelay,
) => {
  return async (operation: () => Promise<any>, context: string = 'operation'): Promise<any> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`${context} 第 ${attempt} 次尝试失败:`, error);

        if (attempt < maxAttempts) {
          console.log(`等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay * attempt)); // 指数退避
        }
      }
    }

    console.error(`${context} 在 ${maxAttempts} 次尝试后仍然失败`);
    throw lastError!;
  };
};

// 错误处理中间件
export const handleUploadError = (error: any, _: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: `文件大小超出限制（最大${Math.round(config.upload.maxFileSize / 1024 / 1024)}MB）`,
          code: 'FILE_TOO_LARGE',
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: '文件数量超出限制（最多10个）',
          code: 'TOO_MANY_FILES',
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: '意外的文件字段',
          code: 'UNEXPECTED_FILE',
        });
      default:
        return res.status(400).json({
          success: false,
          message: `文件上传错误: ${error.message}`,
          code: 'UPLOAD_ERROR',
        });
    }
  }

  if (error.message.includes('不支持的文件类型')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'UNSUPPORTED_FILE_TYPE',
    });
  }

  next(error);
};
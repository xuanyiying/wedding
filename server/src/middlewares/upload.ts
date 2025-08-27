import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { config } from '../config/config';

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 根据文件类型创建子目录
const createTypeDirectory = (type: string) => {
  const typeDir = path.join(uploadDir, type);
  if (!fs.existsSync(typeDir)) {
    fs.mkdirSync(typeDir, { recursive: true });
  }
  return typeDir;
};

// 存储配置
const storage = multer.diskStorage({
  destination: (_, file, cb) => {
    // 根据文件MIME类型确定存储目录
    let type = 'other';

    if (file.mimetype.startsWith('image/')) {
      type = 'images';
    } else if (file.mimetype.startsWith('video/')) {
      type = 'videos';
    } else if (file.mimetype.includes('pdf') || file.mimetype.includes('document')) {
      type = 'documents';
    }

    const typeDir = createTypeDirectory(type);
    cb(null, typeDir);
  },
  filename: (_, file, cb) => {
    // 生成唯一文件名
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}_${randomString}${ext}`;
    cb(null, filename);
  },
});

// 文件过滤器
const fileFilter = (_: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 允许的文件类型
  const allowedMimeTypes = [
    // 图片
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // 视频
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/quicktime',
    // 文档
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // 其他
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`));
  }
};

// 文件大小限制 - 从配置文件读取
const limits = {
  fileSize: config.upload.maxFileSize, // 从配置读取
  files: 10, // 最多10个文件
};

// 创建multer实例
export const uploadMiddleware = multer({
  storage,
  fileFilter,
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
          message: '文件大小超出限制（最大100MB）',
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

// 清理临时文件
export const cleanupTempFiles = (files: Express.Multer.File[]) => {
  files.forEach(file => {
    fs.unlink(file.path, err => {
      if (err) {
        console.error(`清理临时文件失败: ${file.path}`, err);
      }
    });
  });
};

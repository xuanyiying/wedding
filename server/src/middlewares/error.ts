import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { Resp } from '../utils/response';

// 错误处理配置
interface ErrorConfig {
  logLevel: 'error' | 'warn' | 'info';
  includeStack: boolean;
  includeDetails: boolean;
  sanitizeDetails: boolean;
}

const getErrorConfig = (): ErrorConfig => ({
  logLevel: process.env.NODE_ENV === 'prod' ? 'error' : 'warn',
  includeStack: process.env.NODE_ENV === 'dev',
  includeDetails: process.env.NODE_ENV === 'dev',
  sanitizeDetails: process.env.NODE_ENV === 'prod',
});

// 敏感信息过滤
function sanitizeErrorDetails(details: unknown): unknown {
  if (!details || typeof details !== 'object') {
    return details;
  }

  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...(details as Record<string, unknown>) };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

// 自定义错误类
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
  }
}

// 业务错误类
export class BusinessError extends AppError {
  constructor(message: string, code = 'BUSINESS_ERROR', details?: unknown) {
    super(message, 400, code, true, details);
  }
}

// 验证错误类
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', true, details);
  }
}

// 认证错误类
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }
}

// 授权错误类
export class AuthorizationError extends AppError {
  constructor(message = 'Authorization failed') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }
}

// 资源未找到错误类
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND', true);
  }
}

// 冲突错误类
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

// 速率限制错误类
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
  }
}

// 外部服务错误类
export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(message || `${service} service unavailable`, 503, 'EXTERNAL_SERVICE_ERROR', true);
  }
}

// 错误类型检查辅助函数
function isSequelizeError(error: any): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  // 检查 Sequelize 错误名称
  const sequelizeErrorNames = [
    'SequelizeValidationError',
    'SequelizeUniqueConstraintError',
    'SequelizeForeignKeyConstraintError',
    'SequelizeConnectionError',
    'SequelizeDatabaseError',
    'SequelizeTimeoutError',
  ];

  if (error.name && sequelizeErrorNames.includes(error.name)) {
    return true;
  }

  // 检查构造函数名称（安全检查）
  if (
    error.constructor &&
    typeof error.constructor.name === 'string' &&
    error.constructor.name.startsWith('Sequelize')
  ) {
    return true;
  }

  return false;
}

function isJWTError(error: any): boolean {
  if (!error || typeof error !== 'object' || !error.name) {
    return false;
  }

  const jwtErrorNames = ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'];
  return jwtErrorNames.includes(error.name);
}

function isMulterError(error: any): boolean {
  if (!error || typeof error !== 'object' || !error.code) {
    return false;
  }

  return typeof error.code === 'string' && error.code.startsWith('LIMIT_');
}

// 数据库错误处理
function handleSequelizeError(error: any): AppError {
  switch (error.name) {
    case 'SequelizeValidationError': {
      const validationErrors = error.errors?.map((err: any) => `${err.path}: ${err.message}`).join(', ');
      return new ValidationError(`Validation failed: ${validationErrors || error.message}`, error.errors);
    }
    case 'SequelizeUniqueConstraintError': {
      const fields = error.fields ? Object.keys(error.fields).join(', ') : 'unknown field';
      return new ConflictError(`Duplicate field value: ${fields}`, error.fields);
    }
    case 'SequelizeForeignKeyConstraintError':
      return new BusinessError('Foreign key constraint failed', 'FK_CONSTRAINT_ERROR', {
        table: error.table,
        fields: error.fields,
      });
    case 'SequelizeConnectionError':
      return new ExternalServiceError('Database', 'Database connection failed');
    case 'SequelizeTimeoutError':
      return new AppError('Database operation timeout', 408, 'DB_TIMEOUT', true);
    case 'SequelizeDatabaseError': {
      // 处理特定的数据库错误代码
      if (error.parent?.code) {
        switch (error.parent.code) {
          case 'ER_NO_SUCH_TABLE':
          case 'ER_BAD_TABLE_ERROR':
            return new AppError('Table does not exist', 500, 'TABLE_NOT_FOUND', false, error);
          case 'ER_DUP_ENTRY':
            return new ConflictError('Duplicate entry', error.parent.sqlMessage);
          case 'ER_NO_REFERENCED_ROW_2':
            return new BusinessError('Referenced record does not exist', 'REFERENCE_ERROR');
          default:
            return new AppError('Database error', 500, 'DB_ERROR', false, error);
        }
      }
      return new AppError('Database error', 500, 'DB_ERROR', false, error);
    }
    default:
      return new AppError('Database error', 500, 'DB_ERROR', false, error);
  }
}

// JWT 错误处理
function handleJWTError(error: any): AppError {
  switch (error.name) {
    case 'JsonWebTokenError':
      return new AuthenticationError('Invalid token');
    case 'TokenExpiredError':
      return new AuthenticationError('Token expired');
    case 'NotBeforeError':
      return new AuthenticationError('Token not active');
    default:
      return new AuthenticationError('Token validation failed');
  }
}

// Multer 错误处理
function handleMulterError(error: any): AppError {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new BusinessError('File size too large');
    case 'LIMIT_FILE_COUNT':
      return new BusinessError('Too many files');
    case 'LIMIT_UNEXPECTED_FILE':
      return new BusinessError('Unexpected file field');
    case 'LIMIT_PART_COUNT':
      return new BusinessError('Too many parts');
    case 'LIMIT_FIELD_KEY':
      return new BusinessError('Field name too long');
    case 'LIMIT_FIELD_VALUE':
      return new BusinessError('Field value too long');
    case 'LIMIT_FIELD_COUNT':
      return new BusinessError('Too many fields');
    default:
      return new BusinessError('File upload error');
  }
}

// 错误处理器映射
type ErrorHandler = {
  check: (error: any) => boolean;
  handle: (error: any) => AppError;
};

const errorHandlers: ErrorHandler[] = [
  {
    check: error => error instanceof AppError,
    handle: error => error as AppError,
  },
  {
    check: isSequelizeError,
    handle: handleSequelizeError,
  },
  {
    check: isJWTError,
    handle: handleJWTError,
  },
  {
    check: isMulterError,
    handle: handleMulterError,
  },
];

// 转换未知错误为AppError
function convertToAppError(error: unknown): AppError {
  // 记录原始错误（但不在这里记录，避免重复日志）

  // 处理 null 或 undefined 错误
  if (!error) {
    return new AppError('Unknown error occurred', 500, 'INTERNAL_ERROR', false, error);
  }

  // 尝试使用注册的错误处理器
  for (const handler of errorHandlers) {
    try {
      if (handler.check(error)) {
        return handler.handle(error);
      }
    } catch (checkError) {
      // 如果错误检查本身出错，继续下一个处理器
      logger.warn('Error in error handler check:', checkError);
      continue;
    }
  }

  // 处理未知错误
  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  return new AppError(message, 500, 'INTERNAL_ERROR', false, error);
}

// 记录错误日志
function logError(appError: AppError, req: Request, res: Response): void {
  const config = getErrorConfig();

  const errorLog: Record<string, unknown> = {
    message: appError.message,
    statusCode: appError.statusCode,
    code: appError.code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: res.locals.user?.id,
    requestId: res.locals.requestId,
    timestamp: new Date().toISOString(),
  };

  if (config.includeStack && appError.stack) {
    errorLog.stack = appError.stack;
  }

  if (config.includeDetails && appError.details) {
    errorLog.details = config.sanitizeDetails ? sanitizeErrorDetails(appError.details) : appError.details;
  }

  // 根据错误状态码和配置决定日志级别
  if (appError.statusCode >= 500) {
    logger.error('Server Error:', errorLog);
  } else if (appError.statusCode >= 400) {
    logger.warn('Client Error:', errorLog);
  } else {
    logger.info('Error Info:', errorLog);
  }
}

// 构建错误响应
function buildErrorResponse(appError: AppError): {
  message: string;
  details?: unknown;
  stack?: string;
} {
  const config = getErrorConfig();

  // 优化错误消息，提供更友好的提示
  let responseMessage = appError.isOperational ? appError.message : 'Internal server error';

  // 针对常见错误提供更友好的消息
  if (responseMessage.includes('无权限操作此作品')) {
    responseMessage = '您没有权限操作此作品，请确认您是作品的创建者或拥有相应权限';
  } else if (responseMessage.includes('不支持的文件类型')) {
    responseMessage = responseMessage + '。支持的视频格式包括：MP4、AVI、MOV、WMV、QuickTime等';
  } else if (responseMessage.includes('文件大小超出限制')) {
    responseMessage = responseMessage + '。请压缩文件后重试，或联系管理员提升限制';
  }

  const response: { message: string; details?: unknown; stack?: string } = {
    message: responseMessage,
  };

  if (config.includeDetails && appError.details) {
    response.details = config.sanitizeDetails ? sanitizeErrorDetails(appError.details) : appError.details;
  }

  if (config.includeStack && appError.stack) {
    response.stack = appError.stack;
  }

  return response;
}

// 错误创建辅助函数
export const createError = {
  validation: (message: string, details?: unknown) => new ValidationError(message, details),
  authentication: (message?: string) => new AuthenticationError(message),
  authorization: (message?: string) => new AuthorizationError(message),
  notFound: (resource?: string) => new NotFoundError(resource),
  conflict: (message: string, details?: unknown) => new ConflictError(message, details),
  business: (message: string, code?: string, details?: unknown) => new BusinessError(message, code, details),
  rateLimit: (message?: string) => new RateLimitError(message),
  externalService: (service: string, message?: string) => new ExternalServiceError(service, message),
  internal: (message: string, details?: unknown) => new AppError(message, 500, 'INTERNAL_ERROR', false, details),
};

// 错误检查辅助函数
export const isError = {
  app: (error: unknown): error is AppError => error instanceof AppError,
  validation: (error: unknown): error is ValidationError => error instanceof ValidationError,
  authentication: (error: unknown): error is AuthenticationError => error instanceof AuthenticationError,
  authorization: (error: unknown): error is AuthorizationError => error instanceof AuthorizationError,
  notFound: (error: unknown): error is NotFoundError => error instanceof NotFoundError,
  conflict: (error: unknown): error is ConflictError => error instanceof ConflictError,
  business: (error: unknown): error is BusinessError => error instanceof BusinessError,
  operational: (error: unknown): boolean => error instanceof AppError && error.isOperational,
};

/**
 * 全局错误处理中间件
 *
 * 功能:
 * 1. 将各种类型的错误转换为标准化的AppError
 * 2. 记录错误日志（根据环境配置）
 * 3. 构建安全的错误响应（过滤敏感信息）
 * 4. 返回统一格式的错误响应
 *
 * @param error - 捕获的错误对象
 * @param req - Express请求对象
 * @param res - Express响应对象
 * @param _ - Express下一个中间件函数（未使用）
 * @returns 错误响应或void
 */
export const errorHandler = (error: unknown, req: Request, res: Response, _: NextFunction): Response | void => {
  try {
    // 转换为标准化的AppError
    const appError = convertToAppError(error);

    // 记录错误日志
    logError(appError, req, res);

    // 构建并返回错误响应
    const errorResponse = buildErrorResponse(appError);

    // 构建响应数据
    const responseData = {
      ...(errorResponse.details && typeof errorResponse.details === 'object' ? (errorResponse.details as object) : {}),
      ...(errorResponse.stack && { stack: errorResponse.stack }),
    };

    return Resp.error(
      res,
      errorResponse.message,
      appError.statusCode,
      appError.code,
      Object.keys(responseData).length > 0 ? responseData : undefined,
    );
  } catch (handlerError) {
    // 错误处理器本身出错时的兜底处理
    logger.error('Error in error handler:', handlerError);

    return Resp.error(res, 'Internal server error', 500, 'HANDLER_ERROR');
  }
};

// 异步错误处理包装器
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 错误处理中间件
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

export default errorHandler;

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
    public errorType: string; // 添加类型标识符

    constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true, details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;
        this.errorType = 'AppError'; // 设置类型标识符
        
        // 确保原型链正确设置
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

// 业务错误类 - 确保这些是操作性错误
export class BusinessError extends AppError {
    constructor(message: string, code = 'BUSINESS_ERROR', details?: unknown) {
        super(message, 400, code, true, details);
        this.errorType = 'BusinessError'; // 设置类型标识符
    }
}

// 验证错误类
export class ValidationError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 422, 'VALIDATION_ERROR', true, details);
        this.errorType = 'ValidationError'; // 设置类型标识符
    }
}

// 认证错误类
export class AuthenticationError extends AppError {
    constructor(message = '认证失败') {
        super(message, 401, 'AUTHENTICATION_ERROR', true);
        this.errorType = 'AuthenticationError'; // 设置类型标识符
    }
}

// 授权错误类
export class AuthorizationError extends AppError {
    constructor(message = '授权失败') {
        super(message, 403, 'AUTHORIZATION_ERROR', true);
        this.errorType = 'AuthorizationError'; // 设置类型标识符
    }
}

// 资源未找到错误类
export class NotFoundError extends AppError {
    constructor(resource = '资源') {
        super(`${resource}未找到`, 404, 'NOT_FOUND', true);
        this.errorType = 'NotFoundError'; // 设置类型标识符
    }
}

// 速率限制错误类
export class RateLimitError extends AppError {
    constructor(message = '请求过于频繁') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
        this.errorType = 'RateLimitError'; // 设置类型标识符
    }
}

// 外部服务错误类
export class ExternalServiceError extends AppError {
    constructor(service: string, message?: string) {
        super(message || `${service}服务不可用`, 503, 'EXTERNAL_SERVICE_ERROR', true);
        this.errorType = 'ExternalServiceError'; // 设置类型标识符
    }
}

// 冲突错误类
export class ConflictError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 409, 'CONFLICT', true, details);
        this.errorType = 'ConflictError'; // 设置类型标识符
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
            return new ValidationError(`验证失败: ${validationErrors || error.message}`, error.errors);
        }
        case 'SequelizeUniqueConstraintError': {
            const fields = error.fields ? Object.keys(error.fields).join(', ') : '未知字段';
            return new ConflictError(`字段值重复: ${fields}`, error.fields);
        }
        case 'SequelizeForeignKeyConstraintError':
            return new BusinessError('外键约束失败', 'FK_CONSTRAINT_ERROR', {
                table: error.table,
                fields: error.fields,
            });
        case 'SequelizeConnectionError':
            return new ExternalServiceError('数据库', '数据库连接失败');
        case 'SequelizeTimeoutError':
            return new AppError('数据库操作超时', 408, 'DB_TIMEOUT', true);
        case 'SequelizeDatabaseError': {
            // 处理特定的数据库错误代码
            if (error.parent?.code) {
                switch (error.parent.code) {
                    case 'ER_NO_SUCH_TABLE':
                    case 'ER_BAD_TABLE_ERROR':
                        return new AppError('数据表不存在', 500, 'TABLE_NOT_FOUND', false, error);
                    case 'ER_DUP_ENTRY':
                        return new ConflictError('重复的记录', error.parent.sqlMessage);
                    case 'ER_NO_REFERENCED_ROW_2':
                        return new BusinessError('引用的记录不存在', 'REFERENCE_ERROR');
                    default:
                        return new AppError('数据库错误', 500, 'DB_ERROR', false, error);
                }
            }
            return new AppError('数据库错误', 500, 'DB_ERROR', false, error);
        }
        default:
            return new AppError('数据库错误', 500, 'DB_ERROR', false, error);
    }
}

// JWT 错误处理
function handleJWTError(error: any): AppError {
    switch (error.name) {
        case 'JsonWebTokenError':
            return new AuthenticationError('无效的令牌');
        case 'TokenExpiredError':
            return new AuthenticationError('令牌已过期');
        case 'NotBeforeError':
            return new AuthenticationError('令牌尚未生效');
        default:
            return new AuthenticationError('令牌验证失败');
    }
}

// Multer 错误处理
function handleMulterError(error: any): AppError {
    switch (error.code) {
        case 'LIMIT_FILE_SIZE':
            return new BusinessError('文件大小超出限制');
        case 'LIMIT_FILE_COUNT':
            return new BusinessError('文件数量超出限制');
        case 'LIMIT_UNEXPECTED_FILE':
            return new BusinessError('意外的文件字段');
        case 'LIMIT_PART_COUNT':
            return new BusinessError('表单部分数量超出限制');
        case 'LIMIT_FIELD_KEY':
            return new BusinessError('字段名称过长');
        case 'LIMIT_FIELD_VALUE':
            return new BusinessError('字段值过长');
        case 'LIMIT_FIELD_COUNT':
            return new BusinessError('字段数量超出限制');
        default:
            return new BusinessError('文件上传错误');
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
    // 如果已经是 AppError，直接返回（避免重复包装）
    logger.debug('Converting error to AppError:', JSON.stringify(error));
    
    // 使用更可靠的类型检查方法
    if (error && typeof error === 'object') {
        // 检查是否是 AppError 或其子类的实例
        if (error instanceof AppError) {
            return error;
        }
        
        // 检查是否有 AppError 的特征属性（用于处理跨上下文或序列化后的错误）
        if ('statusCode' in error && 'code' in error && 'isOperational' in error) {
            // 使用类型标识符确定具体类型
            const errorType = (error as any).errorType;
            
            // 根据类型标识符创建对应的错误实例
            switch (errorType) {
                case 'ConflictError':
                    return new ConflictError((error as any).message, (error as any).details);
                case 'ValidationError':
                    return new ValidationError((error as any).message, (error as any).details);
                case 'AuthenticationError':
                    return new AuthenticationError((error as any).message);
                case 'AuthorizationError':
                    return new AuthorizationError((error as any).message);
                case 'NotFoundError':
                    return new NotFoundError((error as any).message);
                case 'BusinessError':
                    return new BusinessError((error as any).message, (error as any).code, (error as any).details);
                case 'RateLimitError':
                    return new RateLimitError((error as any).message);
                case 'ExternalServiceError':
                    return new ExternalServiceError((error as any).service, (error as any).message);
                default:
                    // 如果没有类型标识符或无法识别，根据状态码和错误码进行判断
                    if (error.statusCode === 409 && error.code === 'CONFLICT') {
                        return new ConflictError((error as any).message, (error as any).details);
                    }
                    // 默认返回 AppError
                    return new AppError(
                        (error as any).message || '未知错误',
                        (error as any).statusCode,
                        (error as any).code,
                        (error as any).isOperational,
                        (error as any).details
                    );
            }
        }
    }

    // 尝试使用注册的错误处理器
    for (const handler of errorHandlers) {
        try {
            if (handler.check(error)) {
                const handledError = handler.handle(error);
                return handledError;
            }
        } catch (checkError) {
            // 如果错误检查本身出错，继续下一个处理器
            logger.warn('Error in error handler check:', checkError);
            continue;
        }
    }

    // 处理未知错误 - 这些才是真正的内部错误
    const message = error instanceof Error ? error.message : '发生未知错误';
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
        userAgent: req.get('Authorization'),
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
    let responseMessage = appError.isOperational ? appError.message : '内部服务器错误';

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
    app: (error: unknown): error is AppError => {
        // 首先检查是否是 AppError 实例
        if (error instanceof AppError) {
            return true;
        }
        
        // 如果不是实例，检查是否有 AppError 的特征属性（用于处理跨上下文或序列化后的错误）
        if (error && typeof error === 'object' && 
            'statusCode' in error && 'code' in error && 'isOperational' in error) {
            return true;
        }
        
        return false;
    },
    validation: (error: unknown): error is ValidationError => {
        // 首先检查是否是 ValidationError 实例
        if (error instanceof ValidationError) {
            return true;
        }
        
        // 如果不是实例，检查是否有 ValidationError 的特征属性
        if (error && typeof error === 'object' && 
            'errorType' in error && (error as any).errorType === 'ValidationError') {
            return true;
        }
        
        return false;
    },
    authentication: (error: unknown): error is AuthenticationError => {
        // 首先检查是否是 AuthenticationError 实例
        if (error instanceof AuthenticationError) {
            return true;
        }
        
        // 如果不是实例，检查是否有 AuthenticationError 的特征属性
        if (error && typeof error === 'object' && 
            'errorType' in error && (error as any).errorType === 'AuthenticationError') {
            return true;
        }
        
        return false;
    },
    authorization: (error: unknown): error is AuthorizationError => {
        // 首先检查是否是 AuthorizationError 实例
        if (error instanceof AuthorizationError) {
            return true;
        }
        
        // 如果不是实例，检查是否有 AuthorizationError 的特征属性
        if (error && typeof error === 'object' && 
            'errorType' in error && (error as any).errorType === 'AuthorizationError') {
            return true;
        }
        
        return false;
    },
    notFound: (error: unknown): error is NotFoundError => {
        // 首先检查是否是 NotFoundError 实例
        if (error instanceof NotFoundError) {
            return true;
        }
        
        // 如果不是实例，检查是否有 NotFoundError 的特征属性
        if (error && typeof error === 'object' && 
            'errorType' in error && (error as any).errorType === 'NotFoundError') {
            return true;
        }
        
        return false;
    },
    conflict: (error: unknown): error is ConflictError => {
        // 首先检查是否是 ConflictError 实例
        if (error instanceof ConflictError) {
            return true;
        }
        
        // 如果不是实例，检查是否有 ConflictError 的特征属性
        if (error && typeof error === 'object' && 
            'errorType' in error && (error as any).errorType === 'ConflictError') {
            return true;
        }
        
        return false;
    },
    business: (error: unknown): error is BusinessError => {
        // 首先检查是否是 BusinessError 实例
        if (error instanceof BusinessError) {
            return true;
        }
        
        // 如果不是实例，检查是否有 BusinessError 的特征属性
        if (error && typeof error === 'object' && 
            'errorType' in error && (error as any).errorType === 'BusinessError') {
            return true;
        }
        
        return false;
    },
    rateLimit: (error: unknown): error is RateLimitError => {
        // 首先检查是否是 RateLimitError 实例
        if (error instanceof RateLimitError) {
            return true;
        }
        
        // 如果不是实例，检查是否有 RateLimitError 的特征属性
        if (error && typeof error === 'object' && 
            'errorType' in error && (error as any).errorType === 'RateLimitError') {
            return true;
        }
        
        return false;
    },
    externalService: (error: unknown): error is ExternalServiceError => {
        // 首先检查是否是 ExternalServiceError 实例
        if (error instanceof ExternalServiceError) {
            return true;
        }
        
        // 如果不是实例，检查是否有 ExternalServiceError 的特征属性
        if (error && typeof error === 'object' && 
            'errorType' in error && (error as any).errorType === 'ExternalServiceError') {
            return true;
        }
        
        return false;
    },
    operational: (error: unknown): boolean => {
        // 首先检查是否是 AppError 实例
        if (error instanceof AppError) {
            return error.isOperational;
        }
        
        // 如果不是实例，检查是否有 AppError 的特征属性
        if (error && typeof error === 'object' && 
            'isOperational' in error && typeof (error as any).isOperational === 'boolean') {
            return (error as any).isOperational;
        }
        
        return false;
    },
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
        logger.debug('进入全局错误处理中间件, 错误类型:', error instanceof AppError ? error.name : JSON.stringify(error));
        // 转换为标准化的AppError - 关键修复：避免重复包装
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

        return Resp.error(res, '内部服务器错误', 500, 'HANDLER_ERROR');
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
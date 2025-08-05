import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

// 状态码枚举
export enum StatusCode {
  SUCCESS = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  VALIDATION_ERROR = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

// 业务错误码枚举
export enum BusinessErrorCode {
  // 用户相关
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',

  // 认证相关
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // 档期相关
  SCHEDULE_NOT_FOUND = 'SCHEDULE_NOT_FOUND',
  SCHEDULE_CONFLICT = 'SCHEDULE_CONFLICT',
  SCHEDULE_STATUS_INVALID = 'SCHEDULE_STATUS_INVALID',

  // 作品相关
  WORK_NOT_FOUND = 'WORK_NOT_FOUND',
  WORK_ALREADY_PUBLISHED = 'WORK_ALREADY_PUBLISHED',
  WORK_NOT_PUBLISHED = 'WORK_NOT_PUBLISHED',
  WORK_ALREADY_LIKED = 'WORK_ALREADY_LIKED',
  WORK_NOT_LIKED = 'WORK_NOT_LIKED',

  // 文件相关
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',

  // 通用
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  OPERATION_FAILED = 'OPERATION_FAILED',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
}

// API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T | undefined;
  timestamp: string;
  requestId: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 错误响应接口
export interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: {
    code: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}

// API响应工具类
export class Resp {
  /**
   * 成功响应
   */
  static success<T>(
    res: Response,
    data?: T,
    message = '操作成功',
    statusCode = StatusCode.SUCCESS,
    pagination?: ApiResponse['pagination'],
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
    };

    if (pagination) {
      response.pagination = pagination;
    }
    logger.info('响应数据:', response);
    return res.status(statusCode).json(response);
  }

  /**
   * 创建成功响应
   */
  static created<T>(res: Response, data?: T, message = '创建成功'): Response {
    return this.success(res, data, message, StatusCode.CREATED);
  }

  /**
   * 无内容响应
   */
  static noContent(res: Response, message = '操作成功'): Response {
    return res.status(StatusCode.NO_CONTENT).json({
      success: true,
      statusCode: StatusCode.NO_CONTENT,
      message,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
    });
  }

  /**
   * 错误响应
   */
  static error(
    res: Response,
    message: string,
    statusCode = StatusCode.INTERNAL_SERVER_ERROR,
    errorCode?: BusinessErrorCode | string,
    details?: any,
  ): Response {
    const response: ErrorResponse = {
      success: false,
      statusCode,
      message,
      error: {
        code: errorCode || 'UNKNOWN_ERROR',
        details,
      },
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * 验证错误响应
   */
  static validationError(res: Response, message = '验证失败', details?: any): Response {
    return this.error(res, message, StatusCode.VALIDATION_ERROR, BusinessErrorCode.VALIDATION_FAILED, details);
  }

  /**
   * 未授权响应
   */
  static unauthorized(res: Response, message = '未授权访问', errorCode = BusinessErrorCode.TOKEN_INVALID): Response {
    return this.error(res, message, StatusCode.UNAUTHORIZED, errorCode);
  }

  /**
   * 禁止访问响应
   */
  static forbidden(
    res: Response,
    message = '权限不足',
    errorCode = BusinessErrorCode.INSUFFICIENT_PERMISSIONS,
  ): Response {
    return this.error(res, message, StatusCode.FORBIDDEN, errorCode);
  }

  /**
   * 资源不存在响应
   */
  static notFound(res: Response, message = '资源不存在', errorCode = BusinessErrorCode.RESOURCE_NOT_FOUND): Response {
    return this.error(res, message, StatusCode.NOT_FOUND, errorCode);
  }

  /**
   * 冲突响应
   */
  static conflict(res: Response, message = '资源冲突', errorCode = BusinessErrorCode.DUPLICATE_RESOURCE): Response {
    return this.error(res, message, StatusCode.CONFLICT, errorCode);
  }

  /**
   * 请求错误响应
   */
  static badRequest(
    res: Response,
    message = '请求参数错误',
    errorCode = BusinessErrorCode.VALIDATION_FAILED,
    details?: any,
  ): Response {
    return this.error(res, message, StatusCode.BAD_REQUEST, errorCode, details);
  }

  /**
   * 无法处理的实体响应 (422)
   */
  static unprocessableEntity(res: Response, message = '无法处理的实体', details?: any): Response {
    return this.error(res, message, StatusCode.VALIDATION_ERROR, BusinessErrorCode.VALIDATION_FAILED, details);
  }

  /**
   * 服务器错误响应
   */
  static internalError(res: Response, message = '服务器内部错误', details?: any): Response {
    return this.error(res, message, StatusCode.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', details);
  }

  /**
   * 分页响应
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    },
    message = '获取成功',
  ): Response {
    return this.success(res, data, message, StatusCode.SUCCESS, pagination);
  }

  /**
   * 处理异步操作的包装器
   */
  static async handleAsync<T>(
    res: Response,
    operation: () => Promise<T>,
    successMessage = '操作成功',
    errorMessage = '操作失败',
  ): Promise<Response> {
    try {
      const result = await operation();
      return this.success(res, result, successMessage);
    } catch (error) {
      console.error('API操作失败:', error);

      if (error instanceof Error) {
        // 根据错误消息判断错误类型
        if (error.message.includes('不存在')) {
          return this.notFound(res, error.message);
        }
        if (error.message.includes('权限')) {
          return this.forbidden(res, error.message);
        }
        if (error.message.includes('验证') || error.message.includes('格式')) {
          return this.validationError(res, error.message);
        }
        if (error.message.includes('冲突')) {
          return this.conflict(res, error.message);
        }

        return this.error(res, error.message, StatusCode.BAD_REQUEST);
      }

      return this.internalError(res, errorMessage);
    }
  }

  /**
   * 生成请求ID
   */
  static generateRequestId(): string {
    return uuidv4();
  }

  /**
   * 格式化错误消息
   */
  static formatErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (error && typeof error === 'object' && error.message) {
      return error.message;
    }

    return '未知错误';
  }

  /**
   * 检查是否为业务错误
   */
  static isBusinessError(error: any): boolean {
    return error && typeof error === 'object' && error.code && Object.values(BusinessErrorCode).includes(error.code);
  }
}

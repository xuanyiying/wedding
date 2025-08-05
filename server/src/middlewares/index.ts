// 导出所有中间件
export * from './auth';
export * from './error';
export * from './security';
export * from './validation';

// 默认导出
export { default as authMiddleware } from './auth';
export { default as securityMiddlewares } from './security';
export { default as validationMiddlewares } from './validation';

// 中间件组合
import { authMiddleware, requireAdmin, requireSuperAdmin } from './auth';
import { securityMiddlewares } from './security';
import { validationMiddlewares } from './validation';
import { errorHandler, notFoundHandler, asyncHandler } from './error';

// 常用中间件组合
export const commonMiddlewares = {
  // 基础安全中间件
  security: securityMiddlewares.basic,

  // 认证相关
  auth: {
    required: authMiddleware,
    admin: [authMiddleware, requireAdmin],
    superAdmin: [authMiddleware, requireSuperAdmin],
    user: [authMiddleware],
  },

  // 速率限制
  rateLimit: securityMiddlewares.rateLimiting,

  // 验证
  validation: validationMiddlewares,

  // 错误处理
  errorHandling: [notFoundHandler, errorHandler],

  // 工具函数
  utils: {
    asyncHandler,
  },
};

export default commonMiddlewares;

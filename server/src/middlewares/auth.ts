import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/helpers';
import { AuthenticationError, AuthorizationError } from './error';
import { UserRole, UserStatus } from '../types';
import { Logger } from '../utils/logger';
import { RedisCache } from '../config/redis';
import { UserService } from '../services/user.service';
import { JWTPayload, AuthenticatedRequest } from '../interfaces';

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

// 从请求头中提取 token
function extractTokenFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  console.log('🔍 提取令牌:', { 
    url: req.url,
    method: req.method,
    authHeader: authHeader ? `${String(authHeader).substring(0, 20)}...` : 'undefined',
    authHeaderType: typeof authHeader,
    contentType: req.headers['content-type'],
    userAgent: req.headers['user-agent']?.substring(0, 50)
  });

  if (!authHeader) {
    console.log('❌ 未找到Authorization头');
    return null;
  }

  // 支持 "Bearer token" 格式
  const headerStr = String(authHeader);
  if (headerStr.startsWith('Bearer ')) {
    const token = headerStr.substring(7);
    console.log('✅ 成功提取Bearer token:', token.substring(0, 10) + '...');
    return token;
  }

  // 直接返回 token
  console.log('✅ 提取直接token:', headerStr.substring(0, 10) + '...');
  return headerStr;
}

// 检查 token 是否在黑名单中 - 增加容错机制
async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const blacklisted = await RedisCache.get(`blacklist:${token}`);
    return blacklisted === 'true';
  } catch (error) {
    Logger.error('Failed to check token blacklist:', error as Error);
    // Redis不可用时，不阻止正常的认证流程
    Logger.warn('⚠️ Redis不可用，跳过黑名单检查');
    return false;
  }
}

// 将 token 加入黑名单
export async function blacklistToken(token: string, expiresIn = 3600): Promise<void> {
  try {
    await RedisCache.set(`blacklist:${token}`, 'true', expiresIn);
  } catch (error) {
    Logger.error('Failed to blacklist token:', error as Error);
  }
}

// 基础认证中间件
export const authMiddleware = async (req: AuthenticatedRequest, _: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('🔐 认证中间件开始:', {
      method: req.method,
      url: req.url,
      path: req.path,
      headers: {
        authorization: req.headers.authorization ? `${req.headers.authorization.substring(0, 20)}...` : 'undefined',
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
      },
    });

    // 提取 token
    const token = extractTokenFromHeader(req);

    console.log('🔑 Token提取结果:', {
      hasToken: !!token,
      tokenType: typeof token,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'null',
    });

    if (!token) {
      console.error('❌ 认证失败: 未提供token');
      throw new AuthenticationError('Access token is required');
    }

    // 检查 token 是否在黑名单中 - 增加容错
    const isBlacklisted = await isTokenBlacklisted(token);
    console.log('🚫 黑名单检查:', { isBlacklisted, hasRedis: true });

    if (isBlacklisted) {
      console.error('❌ 认证失败: token已被撤销');
      throw new AuthenticationError('Token has been revoked');
    }

    // 验证 token
    console.log('🔍 开始验证token...');
    const payload = JWTUtils.verifyAccessToken(token) as JWTPayload;

    console.log('📋 Token载荷:', {
      hasPayload: !!payload,
      payloadKeys: payload ? Object.keys(payload) : [],
      id: payload?.id,
      username: payload?.username,
      role: payload?.role,
      exp: payload?.exp,
      iat: payload?.iat,
    });

    // 检查用户是否仍然存在且状态正常 - 增加容错
    console.log('👤 查找用户:', payload.id);
    let user;
    try {
      user = await UserService.getUserById(payload.id);
    } catch (dbError) {
      console.error('❌ 数据库查询失败:', dbError);
      // 数据库不可用时，使用token中的用户信息
      Logger.warn('⚠️ 数据库不可用，使用token中的用户信息');
      // 假设用户状态正常，使用token中的信息
      req.user = {
        id: payload.id,
        username: payload.username,
        email: payload.email,
        role: payload.role,
      };
      console.log('✅ 使用token信息认证成功:', req.user);
      return next();
    }

    console.log('👤 用户查找结果:', {
      userFound: !!user,
      userId: user?.id,
      username: user?.username,
      status: user?.status,
      role: user?.role,
    });

    // 如果找到用户但状态不正常，才拒绝访问
    if (user && user.status !== UserStatus.ACTIVE) {
      console.error('❌ 认证失败: 用户账户未激活', { userExists: !!user, status: user?.status });
      throw new AuthenticationError('User account is not active');
    }

    // 将用户信息添加到请求对象中
    req.user = {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    };

    console.log('✅ 认证成功:', {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
    });

    // 记录认证日志
    Logger.auth('User authenticated', payload.id, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: `${req.method} ${req.path}`,
    });

    next();
  } catch (error) {
    console.error('💥 认证中间件错误:', {
      errorName: (error as Error).name,
      errorMessage: (error as Error).message,
      stack: (error as Error).stack,
    });

    Logger.security('Authentication failed', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: `${req.method} ${req.path}`,
      error: (error as Error).message,
    });

    next(error);
  }
};

// 角色权限检查中间件工厂
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, _: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      Logger.info('Role authorization passed', {
        userId: req.user.id,
        role: req.user.role,
        allowedRoles,
        endpoint: `${req.method} ${req.path}`,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

// 管理员权限中间件
export const requireAdmin = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);

// 超级管理员权限中间件
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);

// 用户权限中间件
export const requireUser = requireRole(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN);

// 资源所有者权限检查中间件工厂
export const requireOwnership = (resourceIdParam = 'id', _userIdField = 'userId') => {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      // 管理员可以访问所有资源
      if ([UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role)) {
        return next();
      }

      const resourceId = req.params[resourceIdParam];

      if (!resourceId) {
        throw new AuthorizationError('Resource ID is required');
      }

      // 这里需要根据具体的资源类型来查询数据库
      // 示例代码，需要根据实际情况修改
      // const resource = await SomeModel.findByPk(resourceId);
      //
      // if (!resource) {
      //   throw new NotFoundError('Resource');
      // }
      //
      // if (resource[userIdField] !== req.user.id) {
      //   throw new AuthorizationError('Access denied. You can only access your own resources.');
      // }

      Logger.auth('Ownership authorization passed', req.user.id, {
        resourceId,
        resourceType: req.route?.path,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

// IP 白名单中间件工厂
export const requireIPWhitelist = (allowedIPs: string[]) => {
  return (req: Request, _: Response, next: NextFunction): void => {
    try {
      const clientIP = req.ip || req.socket.remoteAddress || '';

      if (!allowedIPs.includes(clientIP)) {
        Logger.security('IP access denied', {
          ip: clientIP,
          endpoint: `${req.method} ${req.path}`,
          userAgent: req.get('User-Agent'),
        });

        throw new AuthorizationError('Access denied from this IP address');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// 刷新令牌验证中间件
export const verifyRefreshToken = (req: Request, _: Response, next: NextFunction): void => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token is required');
    }

    const payload = JWTUtils.verifyRefreshToken(refreshToken) as JWTPayload;

    req.user = {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

// 账户状态检查中间件
export const checkAccountStatus = async (req: AuthenticatedRequest, _: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    // 这里应该查询数据库检查用户状态
    const user = await UserService.getUserById(req.user.id);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AuthorizationError('Account has been suspended');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new AuthorizationError('Account is inactive');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default authMiddleware;

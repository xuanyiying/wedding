import { Request, Response, NextFunction } from 'express';

import { AuthService, LoginCredentials, RegisterData } from '../services/auth.service';
import { Resp } from '../utils/response';
import { User } from '../models';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../interfaces';

// 用户登录
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const credentials: LoginCredentials = req.body;
    const result = await AuthService.login(credentials);

    // 记录登录IP
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    logger.info('User login attempt', {
      username: credentials.identifier,
      ip: clientIp,
      userAgent: req.get('User-Agent'),
    });

    Resp.success(res, result, '登录成功');
  } catch (error) {
    next(error);
  }
};

// 用户注册
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userData: RegisterData = req.body;
    const result = await AuthService.register(userData);

    logger.info('User registration attempt', {
      username: userData.username,
      email: userData.email,
      ip: req.ip || req.socket.remoteAddress,
    });

    Resp.created(res, result, '注册成功');
  } catch (error) {
    logger.error('注册失败:', error);
    next(error);
  }
};

// 刷新令牌
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      Resp.unauthorized(res, '缺少刷新令牌');
      return;
    }

    const result = await AuthService.refreshToken(refreshToken);
    Resp.success(res, result, '刷新令牌成功');
  } catch (error) {
    logger.error('刷新令牌失败:', error);
    next(error);
  }
};

// 用户登出
export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '') || '';
    const { refreshToken } = req.body;

    await AuthService.logout(accessToken, refreshToken);

    logger.info('User logout', {
      userId: req.user?.id,
      ip: req.ip || req.connection.remoteAddress,
    });

    Resp.success(res, null, '登出成功');
  } catch (error) {
    next(error);
  }
};

// 获取用户信息
export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || 1; // 默认使用用户ID 1

    const user = await User.findByPk(userId, {
      attributes: {
        exclude: ['passwordHash', 'salt'],
      },
    });

    if (!user) {
      Resp.notFound(res, '用户不存在');
      return;
    }

    Resp.success(res, user, '获取用户信息成功');
  } catch (error) {
    next(error);
  }
};

// 更新用户信息
export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      Resp.unauthorized(res, '用户未认证');
      return;
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      Resp.notFound(res, '用户不存在');
      return;
    }

    const updateData = req.body;

    // 过滤掉不允许更新的字段
    const allowedFields = [
      'realName',
      'nickname',
      'bio',
      'phone',
      'specialties',
      'experienceYears',
      'location',
      'contactInfo',
      'socialLinks',
    ];

    const filteredData: any = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    await user.update(filteredData);

    // 返回更新后的用户信息（不包含敏感信息）
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: {
        exclude: ['passwordHash', 'salt'],
      },
    });

    logger.info('User profile updated', {
      userId: req.user.id,
      updatedFields: Object.keys(filteredData),
    });

    Resp.success(res, updatedUser, '用户信息更新成功');
  } catch (error) {
    next(error);
  }
};

// 修改密码
export const changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      Resp.unauthorized(res, '用户未认证');
      return;
    }

    const { oldPassword, newPassword } = req.body;

    await AuthService.changePassword(req.user.id, oldPassword, newPassword);

    logger.info('User password changed', {
      userId: req.user.id,
      ip: req.ip || req.connection.remoteAddress,
    });

    Resp.success(res, null, '密码修改成功');
  } catch (error) {
    next(error);
  }
};

// 获取当前用户的详细信息（包含关联数据）
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || 1; // 默认使用用户ID 1

    const user = await User.findByPk(userId, {
      attributes: {
        exclude: ['passwordHash', 'salt'],
      },
      // 这里可以添加关联查询，比如用户的作品、档期等
      // include: [{
      //   model: Work,
      //   as: 'works',
      //   limit: 5,
      //   order: [['createdAt', 'DESC']]
      // }]
    });

    if (!user) {
      Resp.notFound(res, '用户不存在');
      return;
    }

    Resp.success(res, user, '获取用户详细信息成功');
  } catch (error) {
    next(error);
  }
};

// 验证用户名是否可用
export const checkUsername = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username } = req.params;

    const existingUser = await User.findOne({
      where: { username },
      attributes: ['id'],
    });

    const isAvailable = !existingUser;

    Resp.success(
      res,
      {
        username,
        available: isAvailable,
      },
      isAvailable ? '用户名可用' : '用户名已被使用',
    );
  } catch (error) {
    next(error);
  }
};

// 验证邮箱是否可用
export const checkEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.params;

    const existingUser = await User.findOne({
      where: { email },
      attributes: ['id'],
    });

    const isAvailable = !existingUser;

    Resp.success(
      res,
      {
        email,
        available: isAvailable,
      },
      isAvailable ? '邮箱可用' : '邮箱已被使用',
    );
  } catch (error) {
    next(error);
  }
};

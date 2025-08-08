import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { Resp } from '../utils/response';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../interfaces';
import { UserRole, UserStatus } from '../types';

/**
 * 获取用户列表
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;

    const result = await UserService.getUsers({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      role: role as UserRole,
      status: status as UserStatus,
    });

    Resp.success(res, result, '获取用户列表成功');
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    next(error);
  }
};

/**
 * 获取用户详情
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = id;

    if (!userId) {
      const error = new Error('无效的用户ID');
      return next(error);
    }

    const user = await UserService.getUserById(userId);
    Resp.success(res, user, '获取用户详情成功');
  } catch (error) {
    logger.error('获取用户详情失败:', error);
    next(error);
  }
};

/**
 * 创建用户
 */
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userData = req.body;
    const user = await UserService.createUser(userData);
    Resp.created(res, user, '创建用户成功');
  } catch (error) {
    logger.error('创建用户失败:', error);
    next(error);
  }
};

/**
 * 更新用户信息
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = id;
    const updateData = req.body;

    if (!userId) {
      const error = new Error('无效的用户ID');
      return next(error);
    }

    const user = await UserService.updateUser(userId, updateData);
    Resp.success(res, user, '更新用户成功');
  } catch (error) {
    logger.error('更新用户失败:', error);
    next(error);
  }
};

/**
 * 删除用户
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = id;

    if (!userId) {
      const error = new Error('无效的用户ID');
      return next(error);
    }

    await UserService.deleteUser(userId);
    Resp.success(res, null, '删除用户成功');
  } catch (error) {
    logger.error('删除用户失败:', error);
    next(error);
  }
};

/**
 * 批量删除用户
 */
export const batchDeleteUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      const error = new Error('请提供有效的用户ID列表');
      return next(error);
    }

    const deletedCount = await UserService.batchDeleteUsers(ids);
    Resp.success(res, { deletedCount }, '批量删除用户成功');
  } catch (error) {
    logger.error('批量删除用户失败:', error);
    next(error);
  }
};

/**
 * 重置用户密码
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const userId = id;

    if (!userId) {
      const error = new Error('无效的用户ID');
      return next(error);
    }

    if (!newPassword || newPassword.length < 6) {
      const error = new Error('新密码长度至少为6位');
      return next(error);
    }

    await UserService.resetPassword(userId, newPassword);
    Resp.success(res, null, '重置密码成功');
  } catch (error) {
    logger.error('重置密码失败:', error);
    next(error);
  }
};

/**
 * 更新用户状态
 */
export const updateUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = id;

    if (!userId) {
      const error = new Error('无效的用户ID');
      return next(error);
    }

    if (!Object.values(UserStatus).includes(status)) {
      const error = new Error('无效的用户状态');
      return next(error);
    }

    await UserService.updateUserStatus(userId, status);
    Resp.success(res, null, '更新用户状态成功');
  } catch (error) {
    logger.error('更新用户状态失败:', error);
    next(error);
  }
};

/**
 * 获取用户统计信息
 */
export const getUserStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, startDate, endDate } = req.query;
    if (!role || !startDate || !endDate) {
      const error = new Error('请提供角色、开始日期和结束日期');
      return next(error);
    }
    const stats = await UserService.getUserStats(role as UserRole, startDate as string, endDate as string);
    Resp.success(res, stats, '获取用户统计成功');
  } catch (error) {
    logger.error('获取用户统计失败:', error);
    next(error);
  }
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const error = new Error('无效的用户ID');
      return next(error);
    }
    const user = await UserService.getUserById(userId);
    Resp.success(res, user, '获取当前用户信息成功');
  } catch (error) {
    logger.error('获取当前用户信息失败:', error);
    next(error);
  }
};

/**
 * 更新当前用户资料
 */
export const updateCurrentUserProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const error = new Error('无效的用户ID');
      return next(error);
    }

    const updateData = req.body;
    // 过滤掉不允许用户自己修改的字段
    const allowedFields = ['realName', 'nickname', 'bio', 'specialties', 'experienceYears', 'location', 'contactInfo', 'socialLinks', 'avatarUrl'];
    const filteredData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});

    const user = await UserService.updateUser(userId, filteredData);
    Resp.success(res, user, '更新个人资料成功');
  } catch (error) {
    logger.error('更新个人资料失败:', error);
    next(error);
  }
};

/**
 * 发布/取消发布当前用户资料
 */
export const toggleCurrentUserProfilePublish = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const error = new Error('无效的用户ID');
      return next(error);
    }

    const { isPublished } = req.body;
    if (typeof isPublished !== 'boolean') {
      const error = new Error('请提供有效的发布状态');
      return next(error);
    }

    const user = await UserService.updateUser(userId, { isPublished });
    Resp.success(res, user, isPublished ? '发布个人资料成功' : '取消发布个人资料成功');
  } catch (error) {
    logger.error('更新个人资料发布状态失败:', error);
    next(error);
  }
};

import { Request, Response, NextFunction } from 'express';
import { WorkService } from '../services/work.service';
import { Resp } from '../utils/response';
import { logger } from '../utils/logger';
import {  WorkCategory, WorkStatus, WorkType } from '../types';
import { AuthenticatedRequest } from '../interfaces';

/**
 * 获取作品列表
 */
export const getWorks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, pageSize = 10, userId, teamId, type, category, status, isFeatured, tags, dateFrom, dateTo } = req.query;

    const getWorksParams: any = {
      page: Number(page),
      pageSize: Number(pageSize),
      type: type as WorkType,
      category: category as WorkCategory,
      status: status as WorkStatus,
      isFeatured: isFeatured === 'true',
    };

    if (userId) {
      getWorksParams.userId = userId as string;
    }

    if (teamId) {
      getWorksParams.teamId = teamId as string;
    }

    if (dateFrom) {
      getWorksParams.dateFrom = dateFrom as string;
    }

    if (dateTo) {
      getWorksParams.dateTo = dateTo as string;
    }

    if (tags) {
      getWorksParams.tags = (tags as string).split(',');
    }

    const result = await WorkService.getWorks(getWorksParams);
    logger.info('获取作品列表成功:', result);
    Resp.success(res, result, '获取作品列表成功');
  } catch (error) {
    logger.error('获取作品列表失败:', error);
    next(error);
  }
};

/**
 * 获取作品详情
 */
export const getWorkById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const workId = id;

    if (!workId) {
      const error = new Error('无效的作品ID');
      return next(error);
    }

    const work = await WorkService.getWorkById(workId);
    Resp.success(res, work, '获取作品详情成功');
  } catch (error) {
    logger.error('获取作品详情失败:', error);
    next(error);
  }
};

/**
 * 创建作品
 */
export const createWork = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workData = {
      ...req.body,
      userId: req.user!.id,
    };

    const work = await WorkService.createWork(workData);
    Resp.created(res, work, '创建作品成功');
  } catch (error) {
    logger.error('创建作品失败:', error);
    next(error);
  }
};

/**
 * 更新作品
 */
export const updateWork = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const workId = id;
    const updateData = req.body;
    const currentUserId = req.user!.id;

    if (!workId) {
      const error = new Error('无效的作品ID');
      return next(error);
    }

    const work = await WorkService.updateWork(workId, updateData, currentUserId);
    Resp.success(res, work, '更新作品成功');
  } catch (error) {
    logger.error('更新作品失败:', error);
    next(error);
  }
};

/**
 * 删除作品
 */
export const deleteWork = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const workId = id;
    const currentUserId = req.user!.id;

    if (!workId) {
      const error = new Error('无效的作品ID');
      return next(error);
    }

    await WorkService.deleteWork(workId, currentUserId);
    Resp.success(res, null, '删除作品成功');
  } catch (error) {
    logger.error('删除作品失败:', error);
    next(error);
  }
};

/**
 * 发布作品
 */
export const publishWork = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const workId = id;
    const currentUserId = req.user!.id;

    if (!workId) {
      const error = new Error('无效的作品ID');
      return next(error);
    }

    const work = await WorkService.publishWork(workId, currentUserId);
    Resp.success(res, work, '发布作品成功');
  } catch (error) {
    logger.error('发布作品失败:', error);
    next(error);
  }
};

/**
 * 取消发布作品
 */
export const unpublishWork = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const workId = id;
    const currentUserId = req.user!.id;

    if (!workId) {
      const error = new Error('无效的作品ID');
      return next(error);
    }

    const work = await WorkService.unpublishWork(workId, currentUserId);
    Resp.success(res, work, '取消发布作品成功');
  } catch (error) {
    logger.error('取消发布作品失败:', error);
    next(error);
  }
};

/**
 * 作品点赞
 */
export const likeWork = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const workId = id;
    const userId = req.user!.id;

    if (!workId) {
      const error = new Error('无效的作品ID');
      return next(error);
    }

    const result = await WorkService.likeWork(workId, userId);
    Resp.success(res, result, '点赞成功');
  } catch (error) {
    logger.error('点赞失败:', error);
    next(error);
  }
};

/**
 * 取消点赞
 */
export const unlikeWork = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const workId = id;
    const userId = req.user!.id;

    if (!workId) {
      const error = new Error('无效的作品ID');
      return next(error);
    }

    const result = await WorkService.unlikeWork(workId, userId);
    Resp.success(res, result, '取消点赞成功');
  } catch (error) {
    logger.error('取消点赞失败:', error);
    next(error);
  }
};

/**
 * 增加浏览量
 */
export const incrementViewCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const workId = id;

    if (!workId) {
      const error = new Error('无效的作品ID');
      return next(error);
    }

    const result = await WorkService.incrementViewCount(workId);
    Resp.success(res, result, '浏览量增加成功');
  } catch (error) {
    logger.error('增加浏览量失败:', error);
    next(error);
  }
};

/**
 * 获取精选作品
 */
export const getFeaturedWorks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { pageSize = 10, category: _category } = req.query;

    const result = await WorkService.getFeaturedWorks(Number(pageSize) || 10);

    Resp.success(res, result, '获取精选作品成功');
  } catch (error) {
    logger.error('获取精选作品失败:', error);
    next(error);
  }
};

/**
 * 设置作品为精选
 */
export const setWorkFeatured = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFeatured } = req.body;
    const workId = id;

    if (!workId) {
      const error = new Error('无效的作品ID');
      return next(error);
    }

    const work = await WorkService.setWorkFeatured(workId, isFeatured, req.user!.id);
    Resp.success(res, work, `${isFeatured ? '设置' : '取消'}精选成功`);
  } catch (error) {
    logger.error('设置精选失败:', error);
    next(error);
  }
};

/**
 * 获取用户作品统计
 */
export const getUserWorkStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id || '1'; // 默认使用用户ID 1
    if (!userId) {
      const error = new Error('无效的用户ID');
      return next(error);
    }
    // 移除权限检查，允许查看任何用户的作品统计
    const targetUserId = userId || currentUserId;

    const stats = await WorkService.getUserWorkStats(targetUserId);
    Resp.success(res, stats, '获取用户作品统计成功');
  } catch (error) {
    logger.error('获取用户作品统计失败:', error);
    next(error);
  }
};

/**
 * 获取公开作品列表
 */
export const getPublicWorks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, pageSize = 10, category, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const result = await WorkService.getWorks({
      page: Number(page),
      pageSize: Number(pageSize),
      category: category as WorkCategory,
      sortBy: sortBy as 'createdAt' | 'viewCount' | 'likeCount' | 'shareCount',
      sortOrder: typeof sortOrder === 'string' ? (sortOrder.toUpperCase() as 'ASC' | 'DESC') : 'DESC',
    });

    Resp.success(res, result, '获取公开作品列表成功');
  } catch (error) {
    logger.error('获取公开作品列表失败:', error);
    next(error);
  }
};

/**
 * 获取热门作品
 */
export const getPopularWorks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, pageSize = 10, category } = req.query;

    const result = await WorkService.getWorks({
      page: Number(page),
      pageSize: Number(pageSize),
      category: category as WorkCategory,
      sortBy: 'viewCount',
      sortOrder: 'DESC',
      // isPublic: true // 移除不存在的属性
    });

    Resp.success(res, result, '获取热门作品成功');
  } catch (error) {
    logger.error('获取热门作品失败:', error);
    next(error);
  }
};

/**
 * 获取相关作品
 */
export const getRelatedWorks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const workId = id;
    const { limit = 5 } = req.query;

    if (!workId) {
      const error = new Error('无效的作品ID');
      return next(error);
    }

    // 获取当前作品信息
    const currentWork = await WorkService.getWorkById(workId);
    if (!currentWork) {
      const error = new Error('作品不存在');
      return next(error);
    }

    // 获取相同分类的其他作品
    const result = await WorkService.getWorks({
      page: 1,
      pageSize: Number(limit),
      category: currentWork.category,
      // excludeWorkId: workId, // 移除不存在的属性
      // isPublic: true, // 移除不存在的属性
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });

    Resp.success(res, result.works, '获取相关作品成功');
  } catch (error) {
    logger.error('获取相关作品失败:', error);
    next(error);
  }
};

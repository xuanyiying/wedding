import { Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { Resp } from '../utils/response';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '@/interfaces';

export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.id || undefined; // 默认使用用户ID 1

    const stats = await DashboardService.getDashboardStats({
      startDate: startDate as string,
      endDate: endDate as string,
      userId,
    });

    Resp.success(res, stats, '获取仪表盘统计成功');
  } catch (error) {
    logger.error('获取仪表盘统计失败:', error);
    next(error);
  }
};

export const getRecentActivities = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.id || undefined; // 默认使用用户ID 1

    const activities = await DashboardService.getRecentActivities({
      userId,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    Resp.success(res, activities, '获取最近活动成功');
  } catch (error) {
    logger.error('获取最近活动失败:', error);
    next(error);
  }
};

export const getRevenueStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { period = 'month', year, month } = req.query;
    const userId = req.user?.id || undefined; // 默认使用用户ID 1

    const revenueStats = await DashboardService.getRevenueStats({
      period: period as 'week' | 'month' | 'quarter' | 'year',
      year: year ? parseInt(year as string) : new Date().getFullYear(),
      month: month ? parseInt(month as string) : new Date().getMonth() + 1,
      userId,
    });

    Resp.success(res, revenueStats, '获取收入统计成功');
  } catch (error) {
    logger.error('获取收入统计失败:', error);
    next(error);
  }
};

export const getBookingTrends = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    const userId = req.user?.id || undefined; // 默认使用用户ID 1

    const trends = await DashboardService.getBookingTrends({
      period: period as any,
      days: days ? parseInt(days as string) : 30,
      userId,
    });

    Resp.success(res, trends, '获取预订趋势成功');
  } catch (error) {
    logger.error('获取预订趋势失败:', error);
    next(error);
  }
};

export const getEventTypeDistribution = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.id || undefined; // 默认使用用户ID 1

    const distribution = await DashboardService.getEventTypeDistribution({
      startDate: startDate as string,
      endDate: endDate as string,
      userId,
    });

    Resp.success(res, distribution, '获取事件类型分布成功');
  } catch (error) {
    logger.error('获取事件类型分布失败:', error);
    next(error);
  }
};

export const getPopularTimeSlots = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.id || undefined; // 默认使用用户ID 1

    const timeSlots = await DashboardService.getPopularTimeSlots({
      startDate: startDate as string,
      endDate: endDate as string,
      userId,
    });

    Resp.success(res, timeSlots, '获取热门时段成功');
  } catch (error) {
    logger.error('获取热门时段失败:', error);
    next(error);
  }
};

export const getCustomerStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.id || undefined; // 默认使用用户ID 1

    const customerStats = await DashboardService.getCustomerStats({
      startDate: startDate as string,
      endDate: endDate as string,
      userId,
    });

    Resp.success(res, customerStats, '获取客户统计成功');
  } catch (error) {
    logger.error('获取客户统计失败:', error);
    next(error);
  }
};

export const getPerformanceMetrics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.id || undefined; // 默认使用用户ID 1

    const metrics = await DashboardService.getPerformanceMetrics({
      startDate: startDate as string,
      endDate: endDate as string,
      userId,
    });

    Resp.success(res, metrics, '获取性能指标成功');
  } catch (error) {
    logger.error('获取性能指标失败:', error);
    next(error);
  }
};

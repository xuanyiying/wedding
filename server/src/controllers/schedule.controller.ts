import { Request, Response, NextFunction } from 'express';
import { ScheduleService } from '../services/schedule.service';
import { logger } from '../utils/logger';
import { ScheduleStatus, UserRole, WeddingTime } from '../types';
import { AuthenticatedRequest } from '../interfaces';
import { Resp } from '../utils/response';

/**
 * 获取档期列表
 */
export const getSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, pageSize = 10, userId, status, date, startDate, endDate, isPublic } = req.query;

    const getSchedulesParams: any = {
      page: Number(page),
      pageSize: Number(pageSize),
      status: status as ScheduleStatus,
      startDate: startDate as string,
      endDate: endDate as string,
      isPublic: isPublic === 'true',
      date: date,
    };

    if (userId) {
      getSchedulesParams.userId = userId as string;
    }

    const result = await ScheduleService.getSchedules(getSchedulesParams);

    Resp.success(res, result, '获取档期列表成功');
  } catch (error) {
    logger.error('获取档期列表失败:', error);
    next(error);
  }
};

/**
 * 获取档期详情
 */
export const getScheduleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const scheduleId = id;

    if (!scheduleId) {
      Resp.badRequest(res, '无效的档期ID');
      return;
    }

    const schedule = await ScheduleService.getScheduleById(scheduleId);
    Resp.success(res, schedule, '获取档期详情成功');
  } catch (error) {
    logger.error('获取档期详情失败:', error);
    next(error);
  }
};

/**
 * 创建档期
 */
export const createSchedule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const scheduleData = {
      ...req.body,
      userId: req.user!.id,
    };

    const schedule = await ScheduleService.createSchedule(scheduleData);
    Resp.created(res, schedule, '创建档期成功');
  } catch (error) {
    logger.error('创建档期失败:', error);
    next(error);
  }
};

/**
 * 更新档期
 */
export const updateSchedule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const scheduleId = id;
    const updateData = req.body;
    const currentUserId = req.user!.id;

    if (!scheduleId) {
      res.status(400).json({ error: '无效的档期ID' });
      return;
    }

    const schedule = await ScheduleService.updateSchedule(scheduleId, updateData, currentUserId);
    Resp.success(res, schedule, '更新档期成功');
  } catch (error) {
    logger.error('更新档期失败:', error);
    next(error);
  }
};

/**
 * 删除档期
 */
export const deleteSchedule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const scheduleId = id;
    const currentUserId = req.user!.id;

    if (!scheduleId) {
      res.status(400).json({ error: '无效的档期ID' });
      return;
    }

    await ScheduleService.deleteSchedule(scheduleId, currentUserId);
    Resp.success(res, null, '删除档期成功');
  } catch (error) {
    logger.error('删除档期失败:', error);
    next(error);
  }
};

/**
 * 检查档期冲突
 */
export const checkScheduleConflict = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let { userId, weddingDate, weddingTime, excludeId } = req.body;
    // 非管理员用户只能检查自己的档期冲突
    if (req.user?.role !== UserRole.USER && !userId) {
       userId = req.user!.id;
    }
    // 如果缺少必要参数，直接返回无冲突
    if (!userId || !weddingDate || !weddingTime) {
      Resp.success(res, { hasConflict: false,userId }, '检查档期冲突成功');
      return;
    }

    // 确保日期只包含日期部分，不包含时间部分
    const dateOnly = new Date(weddingDate as string);
    dateOnly.setHours(0, 0, 0, 0);

    const hasConflict = await ScheduleService.checkScheduleConflict(
      userId as string,
      dateOnly,
      weddingTime as WeddingTime,
      excludeId as string,
    );

    Resp.success(res, { hasConflict, userId }, '检查档期冲突成功');
  } catch (error) {
    logger.error('检查档期冲突失败:', error);
    next(error);
  }
};

/**
 * 获取用户档期日历
 */
export const getUserScheduleCalendar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, year, month } = req.params;

    if (!year || !month) {
      Resp.badRequest(res, '缺少年份或月份参数');
      return;
    }

    const calendar = await ScheduleService.getUserScheduleCalendar(userId as string, Number(year), Number(month));

    Resp.success(res, calendar, '获取档期日历成功');
  } catch (error) {
    logger.error('获取档期日历失败:', error);
    next(error);
  }
};

/**
 * 获取客户端专用档期查询接口
 * 根据日期分组，显示每日档期状态
 */
export const getClientScheduleAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      Resp.badRequest(res, '请提供开始日期和结束日期');
      return;
    }

    const result = await ScheduleService.getClientScheduleAvailability({
      startDate: startDate as string,
      endDate: endDate as string,
    });

    Resp.success(res, result, '获取档期可用性成功');
  } catch (error) {
    logger.error('获取档期可用性失败:', error);
    next(error);
  }
};

/**
 * 获取公开档期
 */
export const getPublicSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, pageSize = 10, startDate, endDate } = req.query;

    const result = await ScheduleService.getPublicSchedules({
      page: Number(page),
      pageSize: Number(pageSize),
      startDate: startDate as string,
      endDate: endDate as string,
    });

    Resp.success(res, result, '获取公开档期成功');
  } catch (error) {
    logger.error('获取公开档期失败:', error);
    next(error);
  }
};

/**
 * 根据时间查询可预订的主持人
 */
export const getAvailableHosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { teamId, weddingDate, weddingTime } = req.query;

    if (!weddingDate || !weddingTime) {
      Resp.badRequest(res, '请选择婚礼日期和婚礼时间');
      return;
    }

    const result = await ScheduleService.getAvailableHosts({
      teamId: teamId as string,
      weddingDate: new Date(weddingDate as string),
      weddingTime: weddingTime as WeddingTime,
    });

    Resp.success(res, result, '获取可预订主持人成功');
  } catch (error) {
    logger.error('获取可预订主持人失败:', error);
    next(error);
  }
};

export const getPersonalSchedulesStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      // 统计本月档期统计数据
      const monthRange = getCurrentMonthRange();
      startDate = monthRange.start;
      endDate = monthRange.end;
    }
    const userId = req.user!.id;
    if (!userId) {
      Resp.badRequest(res, '请提供用户ID');
      return;
    }
    const stats = await ScheduleService.getPersonalSchedulesStats(userId, startDate as string, endDate as string);

    Resp.success(res, stats, '获取个人档期统计数据成功');
  } catch (error) {
    logger.error('获取个人档期统计数据失败:', error);
    next(error);
  }
};

// 获取本月范围 YYYY-MM-DD 00:00:00 到 YYYY-MM-DD 23:59:59
function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString().split('T')[0] + ' 00:00:00';
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString().split('T')[0] + ' 23:59:59';
  return { start, end };
}

/**
 * 获取团队档期统计数据
 */
export const getTeamScheduleStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let { teamId, startDate, endDate } = req.query;
    if (!teamId) {
      Resp.badRequest(res, '请选择团队');
      return;
    }
    teamId = teamId as string;
    if (!startDate || !endDate) {
      // 统计本月档期统计数据
      const monthRange = getCurrentMonthRange();
      startDate = monthRange.start;
      endDate = monthRange.end;
    }
    const stats = await ScheduleService.getTeamScheduleStats(
      teamId,
      startDate as string,
      endDate as string,
    );

    Resp.success(res, stats, '获取团队档期统计数据成功');
  } catch (error) {
    logger.error('获取团队档期统计数据失败:', error);
    next(error);
  }
};

// 获取所有团队的档期统计数据
export const getAllTeamsScheduleStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      // 统计本月档期统计数据
      const monthRange = getCurrentMonthRange();
      startDate = monthRange.start;
      endDate = monthRange.end;
    }
    const stats = await ScheduleService.getAllTeamsScheduleStats(
      startDate as string,
      endDate as string,
    );

    Resp.success(res, stats, '获取所有团队的档期统计数据成功');
  } catch (error) {
    logger.error('获取所有团队的档期统计数据失败:', error);
    next(error);
  }


};

import { Request, Response, NextFunction } from 'express';
import { TeamService } from '../services/team.service';
import { Resp } from '../utils/response';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../interfaces';

/**
 * 创建团队
 */
export const createTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamData = req.body;
    const ownerId = req.user?.id || '1'; // 默认管理员ID

    const team = await TeamService.createTeam({
      ...teamData,
      ownerId,
    });

    Resp.success(res, team, '创建团队成功');
  } catch (error) {
    logger.error('创建团队失败:', error);
    next(error);
  }
};

/**
 * 获取团队列表
 */
export const getTeams = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const result = await TeamService.getTeams({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      status: status as any,
    });

    Resp.success(res, result);
  } catch (error) {
    logger.error('获取团队列表失败:', error);
    next(error);
  }
};

/**
 * 获取团队详情
 */
export const getTeamById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      Resp.badRequest(res, '请提供团队ID');
      return;
    }
    const team = await TeamService.getTeamById(id);
    if (!team) {
      Resp.notFound(res, '团队不存在');
      return;
    }
    Resp.success(res, team);
  } catch (error) {
    logger.error('获取团队详情失败:', error);
    Resp.error(res, '获取团队详情失败');
  }
};

/**
 * 更新团队信息
 */
export const updateTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      Resp.badRequest(res, '请提供团队ID');
      return;
    }
    const teamData = req.body;
    const team = await TeamService.updateTeam(id, teamData);
    if (!team) {
      Resp.notFound(res, '团队不存在');
      return;
    }
    Resp.success(res, team, '更新团队信息成功');
  } catch (error) {
    logger.error('更新团队信息失败:', error);
    Resp.error(res, '更新团队信息失败');
  }
};

/**
 * 删除团队
 */
export const deleteTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      Resp.badRequest(res, '请提供团队ID');
      return;
    }
    const success = await TeamService.deleteTeam(id);

    if (!success) {
      Resp.notFound(res, '团队不存在');
      return;
    }

    Resp.success(res, null, '删除团队成功');
  } catch (error) {
    logger.error('删除团队失败:', error);
    Resp.error(res, '删除团队失败');
  }
};

export const getTeamMembers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 10, search, role, status, teamId } = req.query;
    const result = await TeamService.getTeamMembers({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      role: role as any,
      status: status as any,
      teamId: teamId as string,
    });

    Resp.success(res, result);
  } catch (error) {
    logger.error('获取团队成员列表失败:', error);
    next(error);
  }
};

/**
 * 获取团队成员详情
 */
export const getTeamMemberById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      Resp.badRequest(res, '请提供团队成员ID');
      return;
    }
    const member = await TeamService.getTeamMemberById(id);
    if (!member) {
      Resp.notFound(res, '团队成员不存在');
      return;
    }
    Resp.success(res, member);
  } catch (error) {
    logger.error('获取团队成员详情失败:', error);
    Resp.error(res, '获取团队成员详情失败');
  }
};

/**
 * 获取可邀请的用户列表
 */
export const getAvailableUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { teamId } = req.params;
    const { page = 1, limit = 10, search } = req.query;

    if (!teamId) {
      Resp.badRequest(res, '请提供团队ID');
      return;
    }

    const result = await TeamService.getAvailableUsers({
      teamId,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
    });

    Resp.success(res, result);
  } catch (error) {
    logger.error('获取可邀请用户列表失败:', error);
    next(error);
  }
};

/**
 * 邀请团队成员（支持批量邀请）
 */
export const inviteTeamMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userIds, teamId, role } = req.body;
    const inviterId = req.user?.id;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      Resp.badRequest(res, '请提供要邀请的用户ID列表');
      return;
    }

    if (!teamId) {
      Resp.badRequest(res, '请提供团队ID');
      return;
    }

    const members = await TeamService.inviteTeamMember({
      userIds,
      teamId,
      role,
      inviterId: inviterId!,
    });

    Resp.success(res, members, '邀请团队成员成功');
  } catch (error) {
    logger.error('邀请团队成员失败:', error);
    Resp.error(res, error instanceof Error ? error.message : '邀请团队成员失败');
  }
};

/**
 * 删除团队成员
 */
export const deleteTeamMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      Resp.badRequest(res, '请提供团队成员ID');
      return;
    }
    const success = await TeamService.deleteTeamMember(id);

    if (!success) {
      Resp.notFound(res, '团队成员不存在');
      return;
    }

    Resp.success(res, null, '删除团队成员成功');
  } catch (error) {
    logger.error('删除团队成员失败:', error);
    Resp.error(res, '删除团队成员失败');
  }
};

/**
 * 批量删除团队成员
 */
export const batchDeleteTeamMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      Resp.badRequest(res, '请提供要删除的成员ID列表');
      return;
    }

    const deletedCount = await TeamService.batchDeleteTeamMembers(ids);

    Resp.success(res, { deletedCount }, '批量删除团队成员成功');
  } catch (error) {
    logger.error('批量删除团队成员失败:', error);
    Resp.error(res, '批量删除团队成员失败');
  }
};

/**
 * 更新团队成员状态
 */
export const updateTeamMemberStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      Resp.badRequest(res, '请提供团队成员ID');
      return;
    }
    const { status, terminationDate } = req.body;

    const member = await TeamService.updateTeamMemberStatus(id, status, terminationDate);

    if (!member) {
      Resp.notFound(res, '团队成员不存在');
      return;
    }

    Resp.success(res, member, '更新团队成员状态成功');
  } catch (error) {
    logger.error('更新团队成员状态失败:', error);
    Resp.error(res, '更新团队成员状态失败');
  }
};

/**
 * 获取团队统计信息
 */
export const getTeamStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    // 设置默认日期范围（最近30天）
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const validStartDate = startDate ? new Date(startDate as string) : defaultStartDate;
    const validEndDate = endDate ? new Date(endDate as string) : defaultEndDate;

    // 验证日期有效性
    if (isNaN(validStartDate.getTime()) || isNaN(validEndDate.getTime())) {
      Resp.badRequest(res, '日期格式无效');
      return;
    }

    const stats = await TeamService.getTeamStats(validStartDate.toISOString(), validEndDate.toISOString());

    Resp.success(res, stats, '获取团队统计信息成功');
  } catch (error) {
    logger.error('获取团队统计信息失败:', error);
    next(error);
  }
};

/**
 * 更新团队成员
 */
export const updateTeamMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      Resp.badRequest(res, '请提供团队成员ID');
      return;
    }
    const memberData = req.body;
    const member = await TeamService.updateTeamMember(id, memberData);
    if (!member) {
      Resp.notFound(res, '团队成员不存在');
      return;
    }
    Resp.success(res, member, '更新团队成员成功');
  } catch (error) {
    logger.error('更新团队成员失败:', error);
    Resp.error(res, '更新团队成员失败');
  }
};

// 根据userId 查询 teams /:userId/teams
export const getTeamsByUserId = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      Resp.badRequest(res, '缺少参数');
      return;
    }
    logger.info(`查询用户${userId}的团队`);
    const teams = await TeamService.getTeamsByUserId(userId);
    Resp.success(res, teams, '查询团队成功');
  } catch (error) {
    logger.error('查询团队失败:', error);
    Resp.error(res, '查询团队失败');
  }
};

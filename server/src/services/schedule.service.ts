import { Op, WhereOptions } from 'sequelize';
import { Schedule, ScheduleAttributes, ScheduleCreationAttributes, Team, TeamMember, User } from '../models';
import { logger } from '../utils/logger';
import { ScheduleStatus, WeddingTime, UserRole, UserStatus, TeamMemberStatus, TeamStatus } from '../types';
import { TeamService } from '@/services/team.service';
import { DashboardScheduleStats, PersonalScheduleStats, TeamScheduleStats } from '@/interfaces';
interface GetSchedulesParams {
  page: number;
  pageSize: number;
  userId?: string;
  status?: ScheduleStatus;
  teamId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

interface GetPublicSchedulesParams {
  page: number;
  pageSize: number;
  startDate?: string;
  endDate?: string;
}


export class ScheduleService {
  /**
   * 获取档期列表
   */
  static async getSchedules(params: GetSchedulesParams & { date?: string }) {
    const { page, pageSize, userId, status, startDate, endDate, date, teamId } = params;
    const offset = (page - 1) * pageSize;

    const where: WhereOptions = {};

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }
    if (date) {
      where.weddingDate = new Date(date);
    }
    if (teamId) {
      where.teamId = teamId;
    }
    if (startDate && endDate) {
      where.weddingDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      where.weddingDate = {
        [Op.gte]: new Date(startDate),
      };
    } else if (endDate) {
      where.weddingDate = {
        [Op.lte]: new Date(endDate),
      };
    }

    const { count, rows } = await Schedule.findAndCountAll({
      where,
      order: [['weddingDate', 'ASC']],
      limit: pageSize,
      offset,
    });
    for (const schedule of rows) {
      schedule.user = await User.findByPk(schedule.userId);
    }
    return {
      schedules: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  }

  /**
   * 获取档期详情
   */
  static async getScheduleById(id: string) {
    const schedule = await Schedule.findOne({
      where: { id },
    });

    if (!schedule) {
      throw new Error('档期不存在');
    }
    schedule.user = await User.findByPk(schedule.userId);

    return schedule;
  }

  /**
   * 创建档期
   */
  static async createSchedule(data: ScheduleCreationAttributes) {
    // 检查时间冲突
    logger.info(`检查时间冲突: ${JSON.stringify(data)}`);
    const hasConflict = await Schedule.hasConflict(data.userId, new Date(data.weddingDate), data.weddingTime);

    if (hasConflict) {
      throw new Error('时间冲突：该时间段已有其他档期安排');
    }

    const schedule = await Schedule.create(data);

    // 返回包含关联数据的档期
    return this.getScheduleById(schedule.id);
  }

  /**
   * 更新档期
   */
  static async updateSchedule(id: string, data: Partial<ScheduleAttributes>, currentUserId: string) {
    const schedule = await Schedule.findOne({
      where: { id },
    });

    if (!schedule) {
      throw new Error('档期不存在');
    }

    // 检查权限（只有档期所有者或管理员可以修改）
    if (schedule.userId !== currentUserId) {
      // 这里可以添加管理员权限检查
      throw new Error('无权限操作此档期');
    }

    // 如果更新时间，检查冲突
    if (data.weddingDate && data.weddingTime) {
      const weddingDate = data.weddingDate ? new Date(data.weddingDate) : schedule.weddingDate;
      const hasConflict = await Schedule.hasConflict(schedule.userId, weddingDate, data.weddingTime, id);

      if (hasConflict) {
        throw new Error('时间冲突：该时间段已有其他档期安排');
      }
    }

    await schedule.update(data);
    return this.getScheduleById(id);
  }

  /**
   * 删除档期
   */
  static async deleteSchedule(id: string, currentUserId: string) {
    const schedule = await Schedule.findOne({
      where: { id },
    });

    if (!schedule) {
      throw new Error('档期不存在');
    }

    // 检查权限
    if (schedule.userId !== currentUserId) {
      throw new Error('无权限操作此档期');
    }

    // 软删除
    await schedule.update({ deletedAt: new Date() });

    logger.info(`档期已删除: ${id}, 操作用户: ${currentUserId}`);
  }

  /**
   * 检查档期冲突
   */
  static async checkScheduleConflict(userId: string, weddingDate: Date, weddingTime: WeddingTime, excludeId?: string) {
    return Schedule.hasConflict(userId, weddingDate, weddingTime, excludeId);
  }

  /**
   * 获取用户档期日历
   */
  static async getUserScheduleCalendar(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const schedules = await Schedule.findAll({
      where: {
        userId,
        weddingDate: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: ['id', 'title', 'weddingDate', 'weddingTime', 'status'],
      order: [
        ['weddingDate', 'ASC'],
        ['weddingTime', 'ASC'],
      ],
    });

    // 按日期分组
    const calendar: { [key: string]: any[] } = {};

    schedules.forEach(schedule => {
      // 确保 startTime 和 endTime 是 Date 对象
      const weddingDate = schedule.weddingDate instanceof Date ? schedule.weddingDate : new Date(schedule.weddingDate);

      const date = weddingDate.getFullYear() + '-' + (weddingDate.getMonth() + 1) + '-' + weddingDate.getDate();
      if (date && !calendar[date]) {
        calendar[date] = [];
      }
      if (date && calendar[date]) {
        calendar[date].push({
          id: schedule.id,
          title: schedule.title,
          status: schedule.status,
          weddingDate: weddingDate.getFullYear() + '-' + (weddingDate.getMonth() + 1) + '-' + weddingDate.getDate(),
          weddingTime: schedule.weddingTime,
        });
      }
    });

    // 转换为前端期望的数组格式
    const result = Object.keys(calendar).map(date => ({
      date,
      schedules: calendar[date],
    }));

    return result;
  }

  /**
   * 获取公开档期
   */
  static async getPublicSchedules(params: GetPublicSchedulesParams) {
    const { page, pageSize, startDate, endDate } = params;
    const offset = (page - 1) * pageSize;

    const where: WhereOptions = {
      isPublic: true,
      status: {
        [Op.in]: [ScheduleStatus.RESERVE, ScheduleStatus.BOOKED],
      },
    };

    if (startDate && endDate) {
      where.startTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      where.startTime = {
        [Op.gte]: new Date(startDate),
      };
    }

    const { count, rows } = await Schedule.findAndCountAll({
      where,
      order: [['startTime', 'ASC']],
      limit: pageSize,
      offset,
    });
    for (const schedule of rows) {
      schedule.user = await User.findByPk(schedule.userId);
    }
    return {
      schedules: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  }

  /**
   * 获取档期统计
   */
  static async getScheduleStats(userId?: string) {
    const where: WhereOptions = {};

    if (userId) {
      where.userId = userId;
    }

    const [total, booked, reserved, completed] = await Promise.all([
      Schedule.count({ where }),
      Schedule.count({ where: { ...where, status: ScheduleStatus.BOOKED } }),
      Schedule.count({ where: { ...where, status: ScheduleStatus.RESERVE } }),
      Schedule.count({ where: { ...where, status: ScheduleStatus.COMPLETED } }),
    ]);

    return {
      total,
      booked,
      reserved,
      completed,
    };
  }

  /**
   * 获取即将到来的档期
   */
  static async getUpcomingSchedules(userId: string, limit = 5) {
    const now = new Date();

    const schedules = await Schedule.findAll({
      where: {
        userId,
        weddingDate: {
          [Op.gte]: now,
        },
        status: {
          [Op.in]: [ScheduleStatus.BOOKED, ScheduleStatus.RESERVE],
        },
      },
      order: [
        ['weddingDate', 'ASC'],
        ['weddingTime', 'ASC'],
      ],
      limit,
      attributes: ['id', 'title', 'weddingDate', 'weddingTime', 'status', 'location'],
    });

    return schedules;
  }

  /**
   * 根据时间查询可预订的主持人
   */
  /**
   * 获取客户端档期可用性
   * 根据日期分组显示档期状态
   */
  static async getClientScheduleAvailability(params: { startDate: string; endDate: string }) {
    const { startDate, endDate } = params;

    // 获取指定日期范围内的所有档期
    const schedules = await Schedule.findAll({
      where: {
        weddingDate: {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        },
        status: {
          [Op.in]: [ScheduleStatus.RESERVE, ScheduleStatus.BOOKED],
        },
      },
      order: [['weddingDate', 'ASC']],
    });
    for (const schedule of schedules) {
      schedule.user = await User.findByPk(schedule.userId);
    }

    // 获取所有可用的主持人
    const allHosts = await User.findAll({
      where: {
        role: UserRole.USER, // 假设团队成员使用USER角色
        status: UserStatus.ACTIVE,
      },
      attributes: ['id', 'username', 'realName'],
    });

    // 按日期分组处理档期数据
    const dateMap = new Map<string, any>();

    // 初始化日期范围
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (dateStr)
        dateMap.set(dateStr, {
          date: dateStr,
          lunch: null,
          dinner: null,
          availableHosts: allHosts.length,
          status: 'available', // available, partial, unavailable
          message: '充足',
        });
    }

    // 填充已有档期数据
    schedules.forEach(schedule => {
      const dateStr = schedule.weddingDate.toISOString().split('T')[0];
      const dayData = dateStr ? dateMap.get(dateStr) : undefined;

      if (dayData) {
        if (schedule.weddingTime === 'lunch') {
          dayData.lunch = schedule;
        } else if (schedule.weddingTime === 'dinner') {
          dayData.dinner = schedule;
        }

        // 更新状态和消息
        if (dayData.lunch && dayData.dinner) {
          dayData.status = 'unavailable';
          dayData.message = '不可用';
          dayData.availableHosts = 0;
        } else if (dayData.lunch || dayData.dinner) {
          dayData.status = 'partial';
          const availableTime = dayData.lunch ? '晚宴' : '午宴';
          dayData.message = `${availableTime}可预约`;
          dayData.availableHosts = Math.max(0, allHosts.length - 1);
        }
      }
    });

    return {
      dateRange: {
        startDate,
        endDate,
      },
      availability: Array.from(dateMap.values()),
      totalHosts: allHosts.length,
    };
  }

  /**
   * 获取指定时间段内有冲突的主持人ID列表
   */
  private static async getConflictingUserIds(weddingDate: Date, weddingTime: WeddingTime): Promise<string[]> {
    const conflictingSchedules = await Schedule.findAll({
      where: {
        weddingDate: { [Op.eq]: weddingDate },
        weddingTime: { [Op.eq]: weddingTime },
      },
      attributes: ['userId'],
    });

    return conflictingSchedules.map(schedule => schedule.userId);
  }

  /**
   * 查询可用主持人
   */
  static async getAvailableHosts(params: { teamId?: string; weddingDate: Date; weddingTime: WeddingTime }) {
    const { teamId, weddingDate, weddingTime } = params;

    // 获取冲突的主持人ID列表
    const conflictingUserIds = await this.getConflictingUserIds(weddingDate, weddingTime);
    logger.info('conflictingUserIds:', conflictingUserIds);
    // 处理团队过滤
    let teamIds: string[] = [];
    if (teamId) {
      if (teamId === 'all') {
        const teams = await Team.findAll({ where: { status: TeamStatus.ACTIVE } });
        teamIds = teams.map((team: Team) => team.id);
      } else {
        teamIds = [teamId];
      }
    }
    logger.info('teamIds:', teamIds);
    const availableHosts = await TeamMember.findAll({
      where: {
        userId: {
          [Op.notIn]: conflictingUserIds,
        },
        teamId: {
          [Op.in]: teamIds,
        },
        status: TeamMemberStatus.ACTIVE,
      },
    });
    for (const host of availableHosts) {
     host.user = await host.getUser();
    }
    logger.info('availableHosts:', availableHosts);
    return {
      hosts: availableHosts,
      total: availableHosts.length,
    };
  }


  /**
   * 获取单个团队的档期统计数据
   */
  private static async getSingleTeamStats(
    teamId: string,
    startDate: string,
    endDate: string,
  ): Promise<TeamScheduleStats> {
    // 获取团队成员
    const teamMembers = await TeamService.getTeamMembersByTeamId(teamId);

    // 统计每个成员的档期数量和收入
    const memberStats = (await Promise.all(
      teamMembers.map(async teamMember => {
        // 修复：正确访问关联的用户对象
        const user = teamMember.get('user') as User | undefined;
        if (!user) {
          return null;
        }
        return this.getPersonalSchedulesStats(user.id, startDate, endDate);
      }),
    ).then(results => results.filter(stat => stat !== null))) as any[];

    // 团队总计
    const totalSchedules = memberStats.reduce((sum, stat) => sum + stat.scheduleCount, 0);
    const totalRevenue = memberStats.reduce((sum, stat) => sum + stat.revenue, 0);

    // 获取团队名称
    const team = await Team.findOne({
      where: {
        id: teamId,
        status: TeamStatus.ACTIVE,
      },
      attributes: ['name'],
    });
    const teamName = team?.name || '未命名团队';

    return {
      teamId,
      teamName,
      totalCount: totalSchedules,
      totalRevenue,
      completedCount: memberStats.reduce((sum, stat) => sum + stat.completedCount, 0),
      memberStats,
      memberCount: teamMembers.length,
    };
  }
  /**
   * 获取团队档期统计数据
   * 如果teamId为空或undefined，统计所有团队数据，否则统计指定团队数据
   */
  static async getTeamScheduleStats(teamId: string, startDate: string, endDate: string): Promise<any> {
    // 获取指定团队的档期统计数据
    return this.getSingleTeamStats(teamId, startDate, endDate);
  }

  static async getAllTeamsScheduleStats(startDate: string, endDate: string) : Promise<DashboardScheduleStats> {
    // 获取所有活跃团队
    const teams = await Team.findAll({
      where: {
        status: TeamStatus.ACTIVE,
      },
    });
    const results = await Promise.all(
      teams.map(async team => {
        return this.getSingleTeamStats(team.id, startDate, endDate);
      }),
    );
    const totalReserveCount = 0; // 在当前实现中没有直接计算预定数量
    
    return {
      teamStats: results,
      totalCount: results.reduce((sum, stat) => sum + stat.totalCount, 0),
      completedCount: results.reduce((sum, stat) => sum + stat.completedCount, 0),
      reserveCount: totalReserveCount,
      totalRevenue: results.reduce((sum, stat) => sum + stat.totalRevenue, 0),
      teamCount: results.length
    };
  }
// 获取个人档期统计数据
  static async getPersonalSchedulesStats(userId: string, startDate: string, endDate: string): Promise<PersonalScheduleStats> {
    // 获取用户的所有已完成档期
    const schedules = await Schedule.findAll({
      where: {
        userId,
        weddingDate: {
          [Op.between]: [startDate, endDate],
        },
      },
    });
    const completedSchedules = schedules.filter(schedule => schedule.status === ScheduleStatus.COMPLETED);

    const reserveSchedules = schedules.filter(schedule => schedule.status === ScheduleStatus.RESERVE);

    const scheduleCount = schedules.length;
    const totalRevenue = completedSchedules.reduce((sum, schedule) => sum + (schedule.price || 0), 0);
    // 获取用户信息
    const user = await User.findOne({
      where: {
        id: userId,
      },
      attributes: ['id', 'realName', 'username', 'avatarUrl'],
    });
    if (!user) {
      throw new Error('用户不存在');
    }
    return {
      userId: userId,
      realName: user.realName || user.username,
      avatarUrl: user.avatarUrl || '',
      scheduleCount: scheduleCount,
      revenue: totalRevenue,
      completedCount: completedSchedules.length,
      reserveCount: reserveSchedules.length,
    };
  }
}





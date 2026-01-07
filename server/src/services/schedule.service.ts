import { Op, WhereOptions } from 'sequelize';
import { Schedule, ScheduleAttributes, ScheduleCreationAttributes, Team, TeamMember, User } from '../models';
import { logger } from '../utils/logger';
import { ScheduleStatus, WeddingTime, UserRole, UserStatus, TeamMemberStatus, TeamStatus } from '../types';
import { TeamService } from '@/services/team.service';
import { DashboardScheduleStats, PersonalScheduleStats, TeamScheduleStats } from '@/interfaces';
import { createError } from '@/middlewares//error';

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

interface GetMySchedulesParams {
  page: number;
  pageSize: number;
  currentUserId: string;
  currentUserRole: UserRole;
  userId?: string;
  teamId?: string;
  status?: ScheduleStatus;
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
   * 获取超级管理员ID列表
   */
  private static async getSuperAdminIds(): Promise<string[]> {
    const superAdmins = await User.findAll({
      where: { role: UserRole.SUPER_ADMIN },
      attributes: ['id'],
    });
    return superAdmins.map(admin => admin.id);
  }

  /**
   * 获取档期列表
   */
  static async getSchedules(params: GetSchedulesParams & { date?: string }) {
    const { page, pageSize, userId, status, startDate, endDate, date, teamId } = params;
    const offset = (page - 1) * pageSize;

    const where: WhereOptions = {};

    if (userId) {
      where.userId = userId;
    } else {
      // 超级管理员隔离：如果不指定用户，默认排除超级管理员的档期
      const superAdminIds = await this.getSuperAdminIds();
      if (superAdminIds.length > 0) {
        where.userId = { [Op.notIn]: superAdminIds };
      }
    }

    if (status) {
      where.status = status;
    }
    if (date) {
      where.date = new Date(date);
    }
    if (teamId) {
      where.teamId = teamId;
    }
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      where.date = {
        [Op.gte]: new Date(startDate),
      };
    } else if (endDate) {
      where.date = {
        [Op.lte]: new Date(endDate),
      };
    }

    const { count, rows } = await Schedule.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatarUrl'],
        },
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'username', 'realName'],
          required: false,
        },
      ],
      order: [['date', 'ASC']],
      limit: pageSize,
      offset,
    });

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
   * 获取我的档期列表（带权限控制）
   * 普通用户只能看到自己的档期
   * 管理员可以查看团队成员的档期
   */
  static async getMySchedules(params: GetMySchedulesParams) {
    const { page, pageSize, currentUserId, currentUserRole, userId, teamId, status, startDate, endDate } = params;
    const offset = (page - 1) * pageSize;

    const where: WhereOptions = {};

    // 权限控制
    const isAdmin = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.SUPER_ADMIN;
    
    if (isAdmin) {
      // 管理员可以查看指定用户或团队的档期
      if (userId) {
        where.userId = userId;
      } else if (teamId) {
        // 获取团队成员ID列表
        const teamMembers = await TeamMember.findAll({
          where: {
            teamId,
            status: TeamMemberStatus.ACTIVE,
          },
          attributes: ['userId'],
        });
        const userIds = teamMembers.map(member => member.userId);
        if (userIds.length > 0) {
          where.userId = { [Op.in]: userIds };
        } else {
          // 团队没有成员，返回空结果
          return {
            schedules: [],
            pagination: {
              page,
              pageSize,
              total: 0,
              totalPages: 0,
            },
          };
        }
      } else {
        // 如果没有指定userId或teamId，默认显示当前用户的档期
        where.userId = currentUserId;
      }
    } else {
      // 普通用户只能查看自己的档期
      where.userId = currentUserId;
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 日期范围筛选
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      where.date = {
        [Op.gte]: new Date(startDate),
      };
    } else if (endDate) {
      where.date = {
        [Op.lte]: new Date(endDate),
      };
    }

    const { count, rows } = await Schedule.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatarUrl'],
        },
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'username', 'realName'],
          required: false,
        },
      ],
      order: [['date', 'ASC']],
      limit: pageSize,
      offset,
    });

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
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatarUrl', 'phone', 'email'],
        },
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'username', 'realName', 'phone', 'email'],
          required: false,
        },
      ],
    });

    if (!schedule) {
      throw new Error('档期不存在');
    }

    return schedule;
  }

  /**
   * 创建档期
   */
  static async createSchedule(data: ScheduleCreationAttributes) {
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
      throw createError.notFound('档期不存在');
    }

    // 检查权限（只有档期所有者或管理员可以修改）
    if (schedule.userId !== currentUserId) {
      // 这里可以添加管理员权限检查
      throw createError.authorization('无权限操作此档期');
    }
    await schedule.update(data);
    return this.getScheduleById(id);
  }

  /**
   * 删除档期
   */
  static async deleteSchedule(id: string, currentUserId: string) {
    const schedule = await Schedule.findOne({
      where: { id ,userId: currentUserId},
    });

    if (!schedule) {
      throw createError.notFound('档期不存在'); // 使用 createError.notFound 而不是 new Error
    }

    // 检查权限
    if (schedule.userId !== currentUserId) {
      throw createError.authorization('无权限操作此档期'); // 使用 createError.authorization 而不是 new Error
    }

    // 软删除
    await schedule.update({ deletedAt: new Date(), status: ScheduleStatus.CANCELLED });

    logger.info(`档期已删除: ${id}, 操作用户: ${currentUserId}`);
  }

  /**
   * 检查档期冲突
   */
  static async checkScheduleConflict(
    userId: string,
    date: Date,
    timeSlot: WeddingTime,
    excludeScheduleId?: string,
  ) {
    // 确保日期只包含日期部分，不包含时间部分
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const schedule = await Schedule.hasConflict(userId, dateOnly, timeSlot, excludeScheduleId);
    return {
      hasConflict: schedule !== null,
      customerName: schedule ? schedule.customerName : null,
      hostName: schedule ? schedule.user?.realName : null,
    };
  }

  /**
   * 获取用户档期日历
   */
  static async getUserScheduleCalendar(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const schedules = await Schedule.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: ['id', 'title', 'customerName', 'date', 'timeSlot', 'status'],
      order: [
        ['date', 'ASC'],
        ['timeSlot', 'ASC'],
      ],
    });

    // 按日期分组
    const calendar: { [key: string]: any[] } = {};

    schedules.forEach(schedule => {
      // 确保 date 是 Date 对象
      const dateObj = schedule.date instanceof Date ? schedule.date : new Date(schedule.date);

      const dateStr = dateObj.getFullYear() + '-' + (dateObj.getMonth() + 1) + '-' + dateObj.getDate();
      if (dateStr && !calendar[dateStr]) {
        calendar[dateStr] = [];
      }
      if (dateStr && calendar[dateStr]) {
        calendar[dateStr].push({
          id: schedule.id,
          title: schedule.title,
          status: schedule.status,
          date: dateStr,
          timeSlot: schedule.timeSlot,
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

    // 超级管理员隔离：排除超级管理员的档期
    const superAdminIds = await this.getSuperAdminIds();

    const where: WhereOptions = {
      isPublic: true,
      status: {
        [Op.in]: [ScheduleStatus.RESERVE, ScheduleStatus.BOOKED],
      },
    };

    if (superAdminIds.length > 0) {
      where.userId = { [Op.notIn]: superAdminIds };
    }

    if (startDate && endDate) {
      where.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      where.date = {
        [Op.gte]: new Date(startDate),
      };
    }

    const { count, rows } = await Schedule.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatarUrl'],
          where: { status: 'active' },
        },
      ],
      order: [['date', 'ASC']],
      limit: pageSize,
      offset,
    });

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
    } else {
      // 超级管理员隔离：统计时不包含超级管理员的数据
      const superAdminIds = await this.getSuperAdminIds();
      if (superAdminIds.length > 0) {
        where.userId = { [Op.notIn]: superAdminIds };
      }
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
        date: {
          [Op.gte]: now,
        },
        status: {
          [Op.in]: [ScheduleStatus.BOOKED, ScheduleStatus.RESERVE],
        },
      },
      order: [
        ['date', 'ASC'],
        ['timeSlot', 'ASC'],
      ],
      limit,
      attributes: ['id', 'title', 'date', 'timeSlot', 'status', 'location'],
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

    // 超级管理员隔离
    const superAdminIds = await this.getSuperAdminIds();

    // 获取指定日期范围内的所有档期
    const schedules = await Schedule.findAll({
      where: {
        date: {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        },
        status: {
          [Op.in]: [ScheduleStatus.RESERVE, ScheduleStatus.BOOKED],
        },
        ...(superAdminIds.length > 0 ? { userId: { [Op.notIn]: superAdminIds } } : {}),
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName'],
        },
      ],
      order: [['date', 'ASC']],
    });

    // 获取所有可用的主持人
    const allHosts = await User.findAll({
      where: {
        role: UserRole.USER, // 假设团队成员使用USER角色
        status: UserStatus.ACTIVE,
        ...(superAdminIds.length > 0 ? { id: { [Op.notIn]: superAdminIds } } : {}),
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
      const dateStr = schedule.date.toISOString().split('T')[0];
      const dayData = dateStr ? dateMap.get(dateStr) : undefined;

      if (dayData) {
        if (schedule.timeSlot === WeddingTime.LUNCH) {
          dayData.lunch = schedule;
        } else if (schedule.timeSlot === WeddingTime.DINNER) {
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
    const superAdminIds = await this.getSuperAdminIds();

    const conflictingSchedules = await Schedule.findAll({
      where: {
        date: { [Op.eq]: weddingDate },
        timeSlot: { [Op.eq]: weddingTime },
        ...(superAdminIds.length > 0 ? { userId: { [Op.notIn]: superAdminIds } } : {}),
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
    const superAdminIds = await this.getSuperAdminIds();
    
    // 合并需要排除的ID
    const excludeIds = [...new Set([...conflictingUserIds, ...superAdminIds])];
    
    logger.info('需要排除的主持人ID列表:', excludeIds);
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
          [Op.notIn]: excludeIds,
        },
        teamId: {
          [Op.in]: teamIds,
        },
        status: TeamMemberStatus.ACTIVE,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'realName', 'nickname', 'avatarUrl', 'phone', 'bio'],
        },
      ],
    });
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

  static async getAllTeamsScheduleStats(startDate: string, endDate: string): Promise<DashboardScheduleStats> {
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
      teamCount: results.length,
    };
  }
  // 获取个人档期统计数据
  static async getPersonalSchedulesStats(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<PersonalScheduleStats> {
    // 获取用户的所有已完成档期
    const schedules = await Schedule.findAll({
      where: {
        userId,
        date: {
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

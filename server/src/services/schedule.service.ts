import { Op, WhereOptions } from 'sequelize';
import { Schedule, ScheduleAttributes, ScheduleCreationAttributes, User } from '../models';
import { logger } from '../utils/logger';
import { ScheduleStatus, EventType, WeddingTime, UserRole, UserStatus } from '../types';
interface GetSchedulesParams {
  page: number;
  pageSize: number;
  userId?: string;
  status?: ScheduleStatus;
  eventType?: EventType;
  startDate?: string;
  endDate?: string;
}

interface GetPublicSchedulesParams {
  page: number;
  pageSize: number;
  eventType?: EventType;
  startDate?: string;
  endDate?: string;
}

export class ScheduleService {
  /**
   * 获取档期列表
   */
  static async getSchedules(params: GetSchedulesParams) {
    const { page, pageSize, userId, status, startDate, endDate } = params;
    const offset = (page - 1) * pageSize;

    const where: WhereOptions = {};

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
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
      order: [['weddingDate', 'ASC']],
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

    // 检查时间冲突
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
   * 确认档期
   */
  static async confirmSchedule(id: string, currentUserId: string, notes?: string) {
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

    // 检查状态
    if (schedule.status !== ScheduleStatus.BOOKED) {
      throw new Error('状态不允许：只有已预定的档期才能确认');
    }

    const updateData: Partial<ScheduleAttributes> = {
      status: ScheduleStatus.CONFIRMED,
    };

    if (notes) {
      updateData.notes = notes;
    }

    await schedule.update(updateData);
    return this.getScheduleById(id);
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
      attributes: ['id', 'title', 'weddingDate', 'weddingTime', 'status', 'eventType'],
      order: [['weddingDate', 'ASC'], ['weddingTime', 'ASC']],
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
          eventType: schedule.eventType,
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
    const { page, pageSize, eventType, startDate, endDate } = params;
    const offset = (page - 1) * pageSize;

    const where: WhereOptions = {
      isPublic: true,
      status: {
        [Op.in]: [ScheduleStatus.AVAILABLE, ScheduleStatus.BOOKED],
      },
    };

    if (eventType) {
      where.eventType = eventType;
    }

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
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatarUrl'],
          where: { status: 'active' },
        },
      ],
      order: [['startTime', 'ASC']],
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
    }

    const [total, available, booked, confirmed, completed] = await Promise.all([
      Schedule.count({ where }),
      Schedule.count({ where: { ...where, status: ScheduleStatus.AVAILABLE } }),
      Schedule.count({ where: { ...where, status: ScheduleStatus.BOOKED } }),
      Schedule.count({ where: { ...where, status: ScheduleStatus.CONFIRMED } }),
      Schedule.count({ where: { ...where, status: ScheduleStatus.COMPLETED } }),
    ]);

    return {
      total,
      available,
      booked,
      confirmed,
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
          [Op.in]: [ScheduleStatus.BOOKED, ScheduleStatus.CONFIRMED],
        },
      },
      order: [['weddingDate', 'ASC'], ['weddingTime', 'ASC']],
      limit,
      attributes: ['id', 'title', 'weddingDate', 'weddingTime', 'status', 'eventType', 'location'],
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
  static async getClientScheduleAvailability(params: {
    startDate: string;
    endDate: string;
  }) {
    const { startDate, endDate } = params;
    
    // 获取指定日期范围内的所有档期
    const schedules = await Schedule.findAll({
      where: {
        weddingDate: {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        },
        status: {
           [Op.in]: [ScheduleStatus.CONFIRMED, ScheduleStatus.BOOKED],
         },
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName'],
        },
      ],
      order: [['weddingDate', 'ASC']],
    });

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
      if (dateStr) dateMap.set(dateStr, {
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

  static async getAvailableHosts(params: {
    weddingDate: Date;
    weddingTime: WeddingTime;
    eventType?: EventType;
  }) {
    const { weddingDate, weddingTime, eventType } = params;

    // 获取所有活跃的用户（可以是主持人的用户）
     const allHosts = await User.findAll({
       where: {
         status: 'active',
         // 可以根据实际业务需求过滤特定角色的用户
         // 这里暂时获取所有活跃用户
       },
       attributes: ['id', 'username', 'realName', 'avatarUrl', 'phone', 'email'],
     });

    // 查找在指定时间段内有冲突的主持人
    const conflictingSchedules = await Schedule.findAll({
      where: {
        [Op.and]: [
          {
            [Op.and]: [
              {
                weddingDate: {
                  [Op.lte]: weddingDate,
                },
              },
              {
                weddingTime: {
                  [Op.eq]: weddingTime, // 婚礼时间不能早于当前时间
                },
              },
            ],
          },
          {
            status: {
              [Op.in]: [ScheduleStatus.BOOKED, ScheduleStatus.CONFIRMED],
            },
          },
        ],
      },
      attributes: ['userId'],
    });

    // 获取有冲突的主持人ID列表
    const conflictingUserIds = conflictingSchedules.map(schedule => schedule.userId);

    // 过滤出可用的主持人
    const availableHosts = allHosts.filter(host => !conflictingUserIds.includes(host.id));

    // 如果指定了活动类型，可以进一步过滤（这里可以根据业务需求扩展）
    let filteredHosts = availableHosts;
    if (eventType) {
      // 可以根据主持人的专长或经验过滤
      // 这里暂时返回所有可用主持人
      filteredHosts = availableHosts;
    }

    return {
      hosts: filteredHosts,
      total: filteredHosts.length,
      searchParams: {
        weddingDate: weddingDate.toISOString(),
        weddingTime,
        eventType,
      },
    };
  }
}

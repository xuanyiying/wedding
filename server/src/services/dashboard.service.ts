import { Op, QueryTypes, WhereOptions } from 'sequelize';
import { Schedule, Team, TeamMember, User } from '@/models/index';
import { logger } from '@/utils/logger';
import { ScheduleStatus, TeamMemberStatus, TeamStatus } from '@/types';
import sequelize from '@/config/database';

interface DashboardStatsParams {
  startDate?: string;
  endDate?: string;
  userId?: string | undefined;
}

interface RevenueStatsParams {
  period: 'week' | 'month' | 'quarter' | 'year';
  year?: number;
  month?: number;
  userId?: string | undefined;
}

interface BookingTrendsParams {
  period: 'daily' | 'weekly' | 'monthly';
  days?: number;
  userId?: string | undefined;
}

export class DashboardService {
  /**
   * 获取仪表盘概览统计
   */
  static async getDashboardStats(params: DashboardStatsParams = {}) {
    try {
      const { startDate, endDate, userId } = params;
      logger.info('getDashboardStats', params);

      // 构建基础查询条件
      let baseConditions = "";
      const replacements: Record<string, any> = {};
      
      if (userId) {
        baseConditions += " AND user_id = :userId";
        replacements.userId = userId;
      }
      
      if (startDate && endDate) {
        baseConditions += " AND created_at BETWEEN :startDate AND :endDate";
        replacements.startDate = new Date(startDate);
        replacements.endDate = new Date(endDate);
      }
      
      baseConditions += " AND status IN (:statuses)";
      replacements.statuses = [ScheduleStatus.BOOKED, ScheduleStatus.RESERVE, ScheduleStatus.COMPLETED];

      // 总数查询
      const totalQuery = `
        SELECT COUNT(*) as total 
        FROM schedules 
        WHERE 1=1 ${baseConditions}
      `;
      
      // 各状态统计查询
      const statusQuery = `
        SELECT 
          SUM(CASE WHEN status = :bookedStatus THEN 1 ELSE 0 END) as booked,
          SUM(CASE WHEN status = :reserveStatus THEN 1 ELSE 0 END) as reserve,
          SUM(CASE WHEN status = :completedStatus THEN 1 ELSE 0 END) as completed
        FROM schedules 
        WHERE 1=1 ${baseConditions}
      `;
      replacements.bookedStatus = ScheduleStatus.BOOKED;
      replacements.reserveStatus = ScheduleStatus.RESERVE;
      replacements.completedStatus = ScheduleStatus.COMPLETED;

      // 收入统计
      const revenueQuery = `
        SELECT 
          SUM(CASE WHEN status = :completedStatus THEN price ELSE 0 END) as total,
          AVG(CASE WHEN status = :completedStatus THEN price ELSE NULL END) as avg,
          COUNT(CASE WHEN status = :completedStatus THEN id ELSE NULL END) as booked
        FROM schedules 
        WHERE 1=1 ${baseConditions}
      `;

      logger.info('baseConditions', baseConditions);
      
      const [totalResult, statusResult, revenueResult] = await Promise.all([
        sequelize.query(totalQuery, { 
          replacements, 
          type: QueryTypes.SELECT 
        }),
        sequelize.query(statusQuery, { 
          replacements, 
          type: QueryTypes.SELECT 
        }),
        sequelize.query(revenueQuery, { 
          replacements: { ...replacements, completedStatus: ScheduleStatus.COMPLETED },
          type: QueryTypes.SELECT 
        })
      ]);

      const total = parseInt((totalResult[0] as any).total || '0');
      const booked = parseInt((statusResult[0] as any).booked || '0');
      const reserve = parseInt((statusResult[0] as any).reserve || '0');
      const completed = parseInt((statusResult[0] as any).completed || '0');
      const revenue = revenueResult[0] as any;

      // 用户统计（如果不是特定主持人）
      let userStats = null;
      if (!userId) {
        const [totalUsersResult, activeUsersResult] = await Promise.all([
          sequelize.query('SELECT COUNT(*) as count FROM users', { type: QueryTypes.SELECT }),
          sequelize.query(
            'SELECT COUNT(*) as count FROM users WHERE last_login_at >= :lastLoginCutoff',
            { 
              replacements: { lastLoginCutoff: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              type: QueryTypes.SELECT 
            }
          ),
        ]);

        userStats = {
          total: (totalUsersResult[0] as any).count,
          active: (activeUsersResult[0] as any).count,
        };
      }

      // 作品统计
      let totalWorksResult, publishedWorksResult;
      if (userId) {
        [totalWorksResult, publishedWorksResult] = await Promise.all([
          sequelize.query('SELECT COUNT(*) as count FROM works WHERE user_id = :userId', { 
            replacements: { userId },
            type: QueryTypes.SELECT 
          }),
          sequelize.query('SELECT COUNT(*) as count FROM works WHERE user_id = :userId AND status = :status', { 
            replacements: { userId, status: 'published' },
            type: QueryTypes.SELECT 
          }),
        ]);
      } else {
        [totalWorksResult, publishedWorksResult] = await Promise.all([
          sequelize.query('SELECT COUNT(*) as count FROM works', { 
            type: QueryTypes.SELECT 
          }),
          sequelize.query('SELECT COUNT(*) as count FROM works WHERE status = :status', { 
            replacements: { status: 'published' },
            type: QueryTypes.SELECT 
          }),
        ]);
      }

      const totalWorks = (totalWorksResult[0] as any).count;
      const publishedWorks = (publishedWorksResult[0] as any).count;

      // 今日统计
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayConditions = `${baseConditions} AND created_at >= :todayStart AND created_at < :todayEnd`;
      const todayReplacements = {
        ...replacements,
        todayStart: today,
        todayEnd: tomorrow
      };

      const [todayBookingsResult, todayRevenueResult] = await Promise.all([
        sequelize.query(
          `SELECT COUNT(*) as count FROM schedules WHERE 1=1 ${todayConditions}`,
          { replacements: todayReplacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
          `SELECT SUM(price) as revenue FROM schedules WHERE 1=1 ${todayConditions} AND status = :completedStatus`,
          { replacements: {...todayReplacements, completedStatus: ScheduleStatus.COMPLETED}, type: QueryTypes.SELECT }
        )
      ]);

      const todayBookingsCount = parseInt(((todayBookingsResult[0] as any).count || '0'));
      const todayRevenue = parseFloat(((todayRevenueResult[0] as any).revenue || '0'));

      // 计算趋势数据（与上个月对比）
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);

      const lastMonthConditions = `${baseConditions} AND created_at >= :lastMonthStart AND created_at <= :lastMonthEnd`;
      const lastMonthReplacements = {
        ...replacements,
        lastMonthStart,
        lastMonthEnd
      };

      const [lastMonthBookingsResult, lastMonthUsersResult, lastMonthWorksResult] = await Promise.all([
        sequelize.query(
          `SELECT COUNT(*) as count FROM schedules WHERE 1=1 ${lastMonthConditions}`,
          { replacements: lastMonthReplacements, type: QueryTypes.SELECT }
        ),
        userId
          ? Promise.resolve([{ count: '0' }])
          : sequelize.query(
            'SELECT COUNT(*) as count FROM users WHERE created_at >= :lastMonthStart AND created_at <= :lastMonthEnd',
            { replacements: lastMonthReplacements, type: QueryTypes.SELECT }
          ),
        sequelize.query(
          `SELECT COUNT(*) as count FROM works WHERE 1=1 ${userId ? 'AND user_id = :userId' : ''} AND created_at >= :lastMonthStart AND created_at <= :lastMonthEnd`,
          { replacements: { ...lastMonthReplacements, userId }, type: QueryTypes.SELECT }
        ),
      ]);

      const lastMonthBookings = parseInt(((lastMonthBookingsResult[0] as any).count || '0'));
      const lastMonthUsers = parseInt(((lastMonthUsersResult[0] as any).count || '0'));
      const lastMonthWorks = parseInt(((lastMonthWorksResult[0] as any).count || '0'));

      // 计算趋势百分比
      const bookingTrendNum = lastMonthBookings > 0 ? ((total - lastMonthBookings) / lastMonthBookings) * 100 : 0;
      const userTrendNum = lastMonthUsers > 0 ? (((parseInt(userStats?.total || '0')) - lastMonthUsers) / lastMonthUsers) * 100 : 0;
      const workTrendNum = lastMonthWorks > 0 ? ((parseInt(totalWorks.toString()) - lastMonthWorks) / lastMonthWorks) * 100 : 0;

      // 转换为数字类型
      const bookingTrend =  bookingTrendNum || 0;
      const userTrend = userTrendNum || 0;
      const workTrend = workTrendNum || 0;

      // 返回前端期望的扁平结构
      return {
        // 基础统计
        totalUsers: parseInt(userStats?.total || '0'),
        activeUsers: parseInt(userStats?.active || '0'),
        monthlyBookings: parseInt(todayBookingsCount.toString()),
        totalSchedules: parseInt(total.toString()),
        totalWorks: parseInt(totalWorks.toString()),
        publishedWorks: parseInt(publishedWorks.toString()),

        // 预订统计
        total: parseInt(total.toString()),
        booked: parseInt(booked.toString()),
        reserve: parseInt(reserve.toString()),
        completed: parseInt(completed.toString()),
        todayBookings: parseInt(todayBookingsCount.toString()),

        // 收入统计
        totalRevenue: parseFloat(revenue.total || '0'),
        averageBookingValue: parseFloat(revenue.avg || '0'),
        todayRevenue: todayRevenue || 0,

        // 趋势数据
        bookingTrend: Math.round(bookingTrend * 100) / 100,
        userTrend: Math.round(userTrend * 100) / 100,
        workTrend: Math.round(workTrend * 100) / 100,
        revenue: {
          total: parseFloat(revenue.total || '0'),
          average: parseFloat(revenue.avg || '0'),
          today: todayRevenue || 0,
        },
        users: userStats,
        works: {
          total: parseInt(totalWorks.toString()),
          published: parseInt(publishedWorks.toString()),
        },
      };
    } catch (error) {
      logger.error('获取仪表盘统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取收入趋势统计
   */
  static async getRevenueStats(params: RevenueStatsParams) {
    try {
      const { period, year, month, userId } = params;

      // 使用原生SQL查询收入趋势
      let conditions = "WHERE is_paid = true";
      const replacements: Record<string, any> = {};

      if (userId) {
        conditions += " AND user_id = :userId";
        replacements.userId = userId;
      }

      let dateFormat: string;
      let startDate: Date;
      let endDate: Date;

      const currentYear = year || new Date().getFullYear();
      const currentMonth = month || new Date().getMonth() + 1;

      switch (period) {
        case 'week':
          // 最近7天
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 6);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
          dateFormat = '%Y-%m-%d';
          break;
        case 'month':
          // 指定月份或当前月份
          startDate = new Date(currentYear, currentMonth - 1, 1);
          endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
          dateFormat = '%Y-%m-%d';
          break;
        case 'quarter':
          // 当前季度
          const quarterStart = Math.floor((currentMonth - 1) / 3) * 3;
          startDate = new Date(currentYear, quarterStart, 1);
          endDate = new Date(currentYear, quarterStart + 3, 0, 23, 59, 59);
          dateFormat = '%Y-%m';
          break;
        case 'year':
          // 指定年份或当前年份
          startDate = new Date(currentYear, 0, 1);
          endDate = new Date(currentYear, 11, 31, 23, 59, 59);
          dateFormat = '%Y-%m';
          break;
        default:
          throw new Error('无效的时间周期');
      }

      conditions += " AND created_at >= :startDate AND created_at <= :endDate";
      replacements.startDate = startDate;
      replacements.endDate = endDate;

      const query = `
        SELECT 
          DATE_FORMAT(created_at, '${dateFormat}') as date,
          SUM(price) as revenue,
          COUNT(id) as bookings
        FROM schedules 
        ${conditions}
        GROUP BY DATE_FORMAT(created_at, '${dateFormat}')
        ORDER BY DATE_FORMAT(created_at, '${dateFormat}') ASC
      `;

      const revenueData: any = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      return revenueData.map((item: any) => ({
        date: item.date,
        revenue: parseFloat(item.revenue || '0'),
        bookings: parseInt(item.bookings || '0'),
      }));
    } catch (error) {
      logger.error('获取收入统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取预订趋势
   */
  static async getBookingTrends(params: BookingTrendsParams) {
    try {
      const { period, days = 30, userId } = params;

      // 使用原生SQL查询预订趋势
      let conditions = "WHERE status IN (:statuses)";
      const replacements: Record<string, any> = {};
      replacements.statuses = [ScheduleStatus.BOOKED, ScheduleStatus.RESERVE, ScheduleStatus.COMPLETED];

      if (userId) {
        conditions += " AND user_id = :userId";
        replacements.userId = userId;
      }

      let dateFormat: string;
      let startDate: Date;
      let endDate: Date = new Date();
      endDate.setHours(23, 59, 59, 999);

      switch (period) {
        case 'daily':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - (days - 1));
          startDate.setHours(0, 0, 0, 0);
          dateFormat = '%Y-%m-%d';
          break;
        case 'weekly':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - (days * 7 - 1));
          startDate.setHours(0, 0, 0, 0);
          dateFormat = '%Y-%u'; // 年-周
          break;
        case 'monthly':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - (days - 1));
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          dateFormat = '%Y-%m';
          break;
        default:
          throw new Error('无效的时间周期');
      }

      conditions += " AND created_at >= :startDate AND created_at <= :endDate";
      replacements.startDate = startDate;
      replacements.endDate = endDate;

      const query = `
        SELECT 
          DATE_FORMAT(created_at, '${dateFormat}') as period,
          COUNT(id) as bookings,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM schedules 
        ${conditions}
        GROUP BY DATE_FORMAT(created_at, '${dateFormat}')
        ORDER BY DATE_FORMAT(created_at, '${dateFormat}') ASC
      `;

      const trendData: any = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      return trendData.map((item: any) => ({
        period: item.period,
        bookings: parseInt(item.bookings || '0'),
        confirmed: parseInt(item.confirmed || '0'),
        completed: parseInt(item.completed || '0'),
      }));
    } catch (error) {
      logger.error('获取预订趋势失败:', error);
      throw error;
    }
  }

  /**
   * 获取事件类型分布
   */
  static async getEventTypeDistribution(params: DashboardStatsParams = {}) {
    try {
      const { startDate, endDate, userId } = params;

      // 使用原生SQL查询事件类型分布
      let conditions = "WHERE status IN (:statuses)";
      const replacements: Record<string, any> = {};
      replacements.statuses = [ScheduleStatus.BOOKED, ScheduleStatus.RESERVE, ScheduleStatus.CANCELLED];

      if (userId) {
        conditions += " AND user_id = :userId";
        replacements.userId = userId;
      }

      if (startDate || endDate) {
        if (startDate) {
          conditions += " AND created_at >= :startDate";
          replacements.startDate = new Date(startDate);
        }
        if (endDate) {
          conditions += " AND created_at <= :endDate";
          replacements.endDate = new Date(endDate);
        }
      }

      const query = `
        SELECT 
          COUNT(id) as count,
          SUM(price) as revenue
        FROM schedules 
        ${conditions}
        ORDER BY COUNT(id) DESC
      `;

      const data: any = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      return data.map((item: any) => ({
        count: parseInt(item.count || '0'),
        revenue: parseFloat(item.revenue || '0'),
      }));
    } catch (error) {
      logger.error('获取事件类型分布失败:', error);
      throw error;
    }
  }

  /**
   * 获取最近活动
   */
  static async getRecentActivities(params: DashboardStatsParams = {}) {
    try {
      const { startDate, endDate, userId } = params;
      
      // 使用原生SQL查询最近活动
      let conditions = "";
      const replacements: Record<string, any> = {};

      if (userId) {
        conditions += " WHERE user_id = :userId";
        replacements.userId = userId;
      }

      if (startDate || endDate) {
        const prefix = conditions ? " AND" : " WHERE";
        conditions += prefix + " updated_at IS NOT NULL";
        
        if (startDate) {
          conditions += " AND updated_at >= :startDate";
          replacements.startDate = new Date(startDate);
        }
        if (endDate) {
          conditions += " AND updated_at <= :endDate";
          replacements.endDate = new Date(endDate);
        }
      }

      const query = `
        SELECT *
        FROM schedules 
        ${conditions}
        ORDER BY updated_at DESC
        LIMIT 20
      `;

      const activities: any = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      // 手动获取用户信息
      const userIds = [
        ...new Set(
          activities
            .map((activity: any) => [activity.user_id])
            .flat()
        ),
      ];

      let users: any[] = [];
      if (userIds.length > 0) {
        const userQuery = `
          SELECT id, username, real_name, avatar_url
          FROM users 
          WHERE id IN (:userIds)
        `;

        users = await sequelize.query(userQuery, {
          replacements: { userIds },
          type: QueryTypes.SELECT,
        });
      }

      const userMap = users.reduce(
        (map, user) => {
          map[user.id] = user;
          return map;
        },
        {} as Record<string, any>,
      );

      return activities.map((activity: any) => {
        let actionType = '创建';
        let description: string;

        switch (activity.status) {
          case ScheduleStatus.BOOKED:
            actionType = '预订';
            description = `新预订: ${activity.title}`;
            break;
          case ScheduleStatus.RESERVE:
            actionType = '预留';
            description = `预留: ${activity.title}`;
            break;
          case ScheduleStatus.COMPLETED:
            actionType = '完成';
            description = `完成预订: ${activity.title}`;
            break;
          case ScheduleStatus.CANCELLED:
            actionType = '取消';
            description = `取消预订: ${activity.title}`;
            break;
          default:
            description = `更新预订: ${activity.title}`;
        }

        return {
          id: activity.id,
          type: actionType,
          description,
          user: userMap[activity.user_id]?.real_name || userMap[activity.user_id]?.username || '未知用户',
          customer:
            userMap[activity.customer_id]?.real_name ||
            userMap[activity.customer_id]?.username ||
            activity.customer_name ||
            '未知客户',
          timestamp: activity.updated_at,
          status: activity.status,
          eventType: activity.event_type,
        };
      });
    } catch (error) {
      logger.error('获取最近活动失败:', error);
      throw error;
    }
  }

  /**
   * 获取热门时间段
   */
  static async getPopularTimeSlots(params: DashboardStatsParams = {}) {
    try {
      const { startDate, endDate, userId } = params;

      // 使用原生SQL查询热门时间段
      let conditions = "WHERE status IN (:statuses)";
      const replacements: Record<string, any> = {};
      replacements.statuses = [ScheduleStatus.BOOKED, ScheduleStatus.RESERVE, ScheduleStatus.COMPLETED];

      if (userId) {
        conditions += " AND user_id = :userId";
        replacements.userId = userId;
      }

      if (startDate || endDate) {
        if (startDate) {
          conditions += " AND start_time >= :startDate";
          replacements.startDate = new Date(startDate);
        }
        if (endDate) {
          conditions += " AND start_time <= :endDate";
          replacements.endDate = new Date(endDate);
        }
      }

      // 按小时统计
      const hourlyQuery = `
        SELECT 
          HOUR(start_time) as hour,
          COUNT(id) as count
        FROM schedules 
        ${conditions}
        GROUP BY HOUR(start_time)
        ORDER BY COUNT(id) DESC
      `;

      // 按星期统计
      const weeklyQuery = `
        SELECT 
          DAYOFWEEK(start_time) as dayOfWeek,
          COUNT(id) as count
        FROM schedules 
        ${conditions}
        GROUP BY DAYOFWEEK(start_time)
        ORDER BY COUNT(id) DESC
      `;

      const [hourlyData, weeklyData] = await Promise.all([
        sequelize.query(hourlyQuery, {
          replacements,
          type: QueryTypes.SELECT
        }),
        sequelize.query(weeklyQuery, {
          replacements,
          type: QueryTypes.SELECT
        })
      ]);

      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

      return {
        hourly: (hourlyData as any[]).map(item => ({
          hour: parseInt(item.hour),
          count: parseInt(item.count || '0'),
          label: `${item.hour}:00`,
        })),
        weekly: (weeklyData as any[]).map(item => ({
          dayOfWeek: parseInt(item.dayOfWeek),
          count: parseInt(item.count || '0'),
          label: dayNames[parseInt(item.dayOfWeek) - 1] || '未知',
        })),
      };
    } catch (error) {
      logger.error('获取热门时间段失败:', error);
      throw error;
    }
  }

  /**
   * 获取客户统计
   */
  static async getCustomerStats(params: DashboardStatsParams = {}) {
    try {
      const { startDate, endDate, userId } = params;

      // 使用原生SQL查询客户统计
      let conditions = "WHERE status IN (:statuses)";
      const replacements: Record<string, any> = {};
      replacements.statuses = [ScheduleStatus.BOOKED, ScheduleStatus.RESERVE, ScheduleStatus.COMPLETED];

      if (userId) {
        conditions += " AND user_id = :userId";
        replacements.userId = userId;
      }

      if (startDate || endDate) {
        if (startDate) {
          conditions += " AND created_at >= :startDate";
          replacements.startDate = new Date(startDate);
        }
        if (endDate) {
          conditions += " AND created_at <= :endDate";
          replacements.endDate = new Date(endDate);
        }
      }

      // 新客户统计
      const newCustomersQuery = `
        SELECT 
          customer_id,
          customer_name,
          COUNT(id) as bookingCount,
          SUM(price) as totalSpent,
          MIN(created_at) as firstBooking
        FROM schedules 
        ${conditions}
        GROUP BY customer_id, customer_name
        HAVING COUNT(id) = 1
        ORDER BY MIN(created_at) DESC
        LIMIT 10
      `;

      // 回头客统计
      const returningCustomersQuery = `
        SELECT 
          customer_id,
          customer_name,
          COUNT(id) as bookingCount,
          SUM(price) as totalSpent
        FROM schedules 
        ${conditions}
        GROUP BY customer_id, customer_name
        HAVING COUNT(id) > 1
        ORDER BY SUM(price) DESC
        LIMIT 10
      `;

      const [newCustomers, returningCustomers] = await Promise.all([
        sequelize.query(newCustomersQuery, {
          replacements,
          type: QueryTypes.SELECT
        }),
        sequelize.query(returningCustomersQuery, {
          replacements,
          type: QueryTypes.SELECT
        })
      ]);

      return {
        newCustomers: (newCustomers as any[]).map(customer => ({
          id: customer.customer_id,
          name: customer.customer_name || '未知客户',
          bookingCount: parseInt(customer.bookingCount || '0'),
          totalSpent: parseFloat(customer.totalSpent || '0'),
          firstBooking: customer.firstBooking,
        })),
        returningCustomers: (returningCustomers as any[]).map(customer => ({
          id: customer.customer_id,
          name: customer.customer_name || '未知客户',
          bookingCount: parseInt(customer.bookingCount || '0'),
          totalSpent: parseFloat(customer.totalSpent || '0'),
        })),
      };
    } catch (error) {
      logger.error('获取客户统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取档期统计数据
   */
  static async getScheduleStats(params: DashboardStatsParams = {}) {
    try {
      const { startDate, endDate, userId } = params;

      // 创建日期范围条件
      const dateWhere: WhereOptions = {};
      if (startDate || endDate) {
        dateWhere.weddingDate = {};
        if (startDate) {
          (dateWhere.weddingDate as any)[Op.gte] = new Date(startDate as string);
        }
        if (endDate) {
          (dateWhere.weddingDate as any)[Op.lte] = new Date(endDate as string);
        }
      }

      // 如果指定了用户，则只查询该用户的档期
      const scheduleWhere: WhereOptions = {
        ...dateWhere,
        ...(userId ? { userId } : {}),
      };

      // 获取总档期数
      const totalCount = await Schedule.count({ where: scheduleWhere });

      // 获取已完成的档期数
      const completedCount = await Schedule.count({
        where: {
          ...scheduleWhere,
          status: ScheduleStatus.COMPLETED,
        },
      });

      // 获取预定中的档期数
      const reserveCount = await Schedule.count({
        where: {
          ...scheduleWhere,
          status: ScheduleStatus.RESERVE,
        },
      });

      // 计算总收入
      const totalRevenueResult = await Schedule.findOne({
        where: {
          ...scheduleWhere,
          status: ScheduleStatus.COMPLETED,
        },
        attributes: [[Schedule.sequelize!.fn('SUM', Schedule.sequelize!.col('price')), 'totalRevenue']],
        raw: true,
      });

      const totalRevenue = totalRevenueResult ? parseFloat((totalRevenueResult as any).totalRevenue || '0') : 0;

      // 如果指定了用户，只返回个人统计数据
      if (userId) {
        return {
          totalCount,
          completedCount,
          reserveCount,
          totalRevenue,
        };
      }

      // 获取所有团队统计数据
      // 移除 Sequelize 关联，改为手动关联查询
      const teams: Team[] = await Team.findAll({
        where: {
          status: TeamStatus.ACTIVE,
        },
      });
      for (const team of teams) {
        team.members = await team.getMembers();
      }
      // 计算每个团队的统计数据
      const teamStats = await Promise.all(
        teams.map(async team => {
          // 获取团队成员ID列表
          const userIds = team.members?.map((member: TeamMember) => member.userId) || [];

          // 团队档期条件
          const teamMembersWhere: WhereOptions = {
            ...dateWhere,
            userId: {
              [Op.in]: userIds,
            },
          };

          // 团队总档期数
          const teamTotalCount = await Schedule.count({ where: teamMembersWhere });

          // 团队已完成档期数
          const teamCompletedCount = await Schedule.count({
            where: {
              ...teamMembersWhere,
              status: ScheduleStatus.COMPLETED,
            },
          });

          // 团队总收入
          const teamRevenueResult = await Schedule.findOne({
            where: {
              ...teamMembersWhere,
              status: ScheduleStatus.COMPLETED,
            },
            attributes: [[Schedule.sequelize!.fn('SUM', Schedule.sequelize!.col('price')), 'totalRevenue']],
            raw: true,
          });

          const teamTotalRevenue = teamRevenueResult ? parseFloat((teamRevenueResult as any).totalRevenue || '0') : 0;

          // 计算团队成员统计数据
          const memberStats = await Promise.all(
            (team.members || []).map(async (member: any) => {
              // 成员档期条件
              const memberScheduleWhere: WhereOptions = {
                ...dateWhere,
                userId: member.userId,
              };

              // 成员档期数
              const scheduleCount = await Schedule.count({ where: memberScheduleWhere });

              // 成员已完成档期数
              const memberCompletedCount = await Schedule.count({
                where: {
                  ...memberScheduleWhere,
                  status: ScheduleStatus.COMPLETED,
                },
              });

              // 成员收入
              const memberRevenueResult = await Schedule.findOne({
                where: {
                  ...memberScheduleWhere,
                  status: ScheduleStatus.COMPLETED,
                },
                attributes: [[Schedule.sequelize!.fn('SUM', Schedule.sequelize!.col('price')), 'revenue']],
                raw: true,
              });

              const revenue = memberRevenueResult ? parseFloat((memberRevenueResult as any).revenue || '0') : 0;

              return {
                userId: member.userId,
                realName: member.memberUser?.realName || member.memberUser?.username || '未知用户',
                avatarUrl: member.memberUser?.avatarUrl,
                scheduleCount,
                completedCount: memberCompletedCount,
                revenue,
              };
            }),
          );

          return {
            teamId: team.id,
            teamName: team.name,
            totalRevenue: teamTotalRevenue,
            completedCount: teamCompletedCount,
            totalCount: teamTotalCount,
            memberCount: memberStats.length,
            memberStats,
          };
        }),
      );

      return {
        totalCount,
        completedCount,
        reserveCount,
        totalRevenue,
        teamStats,
        teamCount: teams.length,
      };
    } catch (error) {
      logger.error('获取档期统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取今日档期统计
   */
  static async getTodayScheduleStats(params: DashboardStatsParams = {}) {
    try {
      const { userId } = params;

      // 获取今日日期范围
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime());
      tomorrow.setDate(tomorrow.getDate() + 1);

      const where: WhereOptions = {
        weddingDate: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
      };

      if (userId) {
        where.userId = userId;
      }

      // 获取今日总档期数量
      const totalSchedules = await Schedule.count({ where });

      // 获取今日团队档期数量（通过关联团队表查询）
      // 完全移除 Sequelize 关联，改为手动关联查询
      // 首先获取所有活跃的团队成员
      const activeTeamMembers = await TeamMember.findAll({
        where: {
          status: TeamMemberStatus.ACTIVE,
        },
        attributes: ['userId'],
        raw: true,
      });

      // 提取用户ID列表
      const teamMemberUserIds = [
        ...new Set(
          activeTeamMembers
            .map((member: any) => member.userId)
            .filter((id): id is string => id !== null && id !== undefined),
        ),
      ];

      // 查询这些用户的团队档期数量
      const teamSchedules = await Schedule.count({
        where: {
          ...where,
          userId: {
            [Op.in]: teamMemberUserIds,
          },
        },
      });

      // 获取今日个人档期数量（总数减去团队档期）
      const personalSchedules = totalSchedules - teamSchedules;

      // 获取今日各状态档期统计
      const [availableCount, bookedCount, reserveCount, completedCount, cancelledCount] = await Promise.all([
        Schedule.count({ where: { ...where, status: ScheduleStatus.AVAILABLE } }),
        Schedule.count({ where: { ...where, status: ScheduleStatus.BOOKED } }),
        Schedule.count({ where: { ...where, status: ScheduleStatus.RESERVE } }),
        Schedule.count({ where: { ...where, status: ScheduleStatus.COMPLETED } }),
        Schedule.count({ where: { ...where, status: ScheduleStatus.CANCELLED } }),
      ]);

      // 获取今日档期详细列表（可选，用于展示详情）
      // 移除 Sequelize 关联，改为手动关联查询
      const todayScheduleList = await Schedule.findAll({
        where,
        order: [['weddingTime', 'ASC']],
        limit: 10, // 限制返回数量，避免数据过多
      });

      // 手动获取用户信息
      const userIds = [
        ...new Set(
          todayScheduleList
            .map(schedule => schedule.userId)
            .filter((id): id is string => id !== null && id !== undefined),
        ),
      ];
      const customerIds = [
        ...new Set(
          todayScheduleList
            .map(schedule => schedule.customerId)
            .filter((id): id is string => id !== null && id !== undefined),
        ),
      ];
      const allUserIds = [...userIds, ...customerIds].filter((id): id is string => id !== null && id !== undefined);

      const users = await User.findAll({
        where: {
          id: {
            [Op.in]: allUserIds,
          },
        },
        raw: true,
      });

      const userMap = users.reduce(
        (map, user) => {
          map[user.id] = user;
          return map;
        },
        {} as Record<string, any>,
      );

      // 占比计算
      const teamPercentageNum = totalSchedules > 0 ? Math.round((teamSchedules / totalSchedules) * 100) : 0;
      const personalPercentageNum = totalSchedules > 0 ? Math.round((personalSchedules / totalSchedules) * 100) : 0;
      
      const teamPercentage = teamPercentageNum || 0;
      const personalPercentage = personalPercentageNum || 0;

      return {
        // 基础统计
        totalSchedules,
        teamSchedules,
        personalSchedules,

        // 状态统计
        statusStats: {
          available: availableCount,
          booked: bookedCount,
          reserve: reserveCount,
          completed: completedCount,
          cancelled: cancelledCount,
        },

        // 占比计算
        teamPercentage: teamPercentage,
        personalPercentage: personalPercentage,

        // 今日档期列表
        scheduleList: todayScheduleList.map((schedule: any) => ({
          id: schedule.id,
          title: schedule.title,
          status: schedule.status,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          location: schedule.location,
          eventType: schedule.eventType,
          weddingTime: schedule.weddingTime,
          user: userMap[schedule.userId]
            ? {
                id: userMap[schedule.userId].id,
                name: userMap[schedule.userId].realName || userMap[schedule.userId].username,
                avatar: userMap[schedule.userId].avatarUrl,
              }
            : null,
          customer: userMap[schedule.customerId]
            ? {
                id: userMap[schedule.customerId].id,
                name: userMap[schedule.customerId].realName || userMap[schedule.customerId].username,
              }
            : null,
        })),

        // 统计日期
        date: today.toISOString().split('T')[0],
      };
    } catch (error) {
      logger.error('获取今日档期统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取性能指标
   */
  static async getPerformanceMetrics(params: DashboardStatsParams = {}) {
    try {
      const { startDate, endDate, userId } = params;

      // 使用原生SQL查询性能指标
      let conditions = "WHERE status IN (:statuses)";
      const replacements: Record<string, any> = {};
      replacements.statuses = [ScheduleStatus.BOOKED, ScheduleStatus.RESERVE, ScheduleStatus.COMPLETED];

      if (userId) {
        conditions += " AND user_id = :userId";
        replacements.userId = userId;
      }

      if (startDate || endDate) {
        if (startDate) {
          conditions += " AND created_at >= :startDate";
          replacements.startDate = new Date(startDate);
        }
        if (endDate) {
          conditions += " AND created_at <= :endDate";
          replacements.endDate = new Date(endDate);
        }
      }

      // 总预订数
      const totalQuery = `
        SELECT COUNT(*) as total FROM schedules ${conditions}
      `;

      // 完成的预订数
      const completedQuery = `
        SELECT COUNT(*) as completed 
        FROM schedules 
        ${conditions} AND status = :completedStatus
      `;
      replacements.completedStatus = ScheduleStatus.COMPLETED;

      // 取消的预订数
      const cancelledQuery = `
        SELECT COUNT(*) as cancelled 
        FROM schedules 
        ${conditions} AND status = :cancelledStatus
      `;
      replacements.cancelledStatus = ScheduleStatus.CANCELLED;

      // 平均预订价值
      const avgQuery = `
        SELECT AVG(price) as avgValue 
        FROM schedules 
        ${conditions} AND status = :completedStatus
      `;

      const [totalResult, completedResult, cancelledResult, avgResult] = await Promise.all([
        sequelize.query(totalQuery, {
          replacements,
          type: QueryTypes.SELECT
        }),
        sequelize.query(completedQuery, {
          replacements,
          type: QueryTypes.SELECT
        }),
        sequelize.query(cancelledQuery, {
          replacements,
          type: QueryTypes.SELECT
        }),
        sequelize.query(avgQuery, {
          replacements,
          type: QueryTypes.SELECT
        })
      ]);

      const totalBookings = parseInt(((totalResult[0] as any).total || '0'));
      const completedBookings = parseInt(((completedResult[0] as any).completed || '0'));
      const cancelledBookings = parseInt(((cancelledResult[0] as any).cancelled || '0'));

      // 计算转化率和完成率
      const completionRateNum = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
      const cancellationRateNum = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

      const completionRate = completionRateNum || 0;
      const cancellationRate = cancellationRateNum || 0;

      const avgBookingValueResult = avgResult[0] as any;

      return {
        completionRate: parseFloat(completionRate.toFixed(2)),
        cancellationRate: parseFloat(cancellationRate.toFixed(2)),
        averageBookingValue: parseFloat(avgBookingValueResult?.avgValue || '0'),
        totalBookings,
        completedBookings,
        cancelledBookings,
      };
    } catch (error) {
      logger.error('获取性能指标失败:', error);
      throw error;
    }
  }
}

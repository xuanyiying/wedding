import { Op, WhereOptions } from 'sequelize';
import { Schedule, User, Work } from '../models';
import { logger } from '../utils/logger';
import { ScheduleStatus } from '../types';

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

      const where: WhereOptions = {};

      if (userId) {
        where.userId = userId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          (where.createdAt as any)[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          (where.createdAt as any)[Op.lte] = new Date(endDate);
        }
      }

      // 预订统计
      const bookingWhere = {
        ...where,
        status: { [Op.in]: [ScheduleStatus.BOOKED, ScheduleStatus.CONFIRMED, ScheduleStatus.COMPLETED] },
      };

      const [totalBookings, confirmedBookings, pendingBookings, completedBookings] = await Promise.all([
        Schedule.count({ where: bookingWhere }),
        Schedule.count({ where: { ...bookingWhere, status: ScheduleStatus.CONFIRMED } }),
        Schedule.count({ where: { ...bookingWhere, status: ScheduleStatus.BOOKED } }),
        Schedule.count({ where: { ...bookingWhere, status: ScheduleStatus.COMPLETED } }),
      ]);

      // 收入统计
      const revenueStats = await Schedule.findAll({
        where: { ...bookingWhere, status: ScheduleStatus.COMPLETED },
        attributes: [
          [Schedule.sequelize!.fn('SUM', Schedule.sequelize!.col('price')), 'totalRevenue'],
          [Schedule.sequelize!.fn('AVG', Schedule.sequelize!.col('price')), 'avgBookingValue'],
          [Schedule.sequelize!.fn('COUNT', Schedule.sequelize!.col('id')), 'bookingCount'],
        ],
        raw: true,
      });

      const revenue = revenueStats[0] as any;

      // 用户统计（如果不是特定主持人）
      let userStats = null;
      if (!userId) {
        const [totalUsers, activeUsers] = await Promise.all([
          User.count(),
          User.count({
            where: {
              lastLoginAt: {
                [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天内活跃
              },
            },
          }),
        ]);

        userStats = {
          total: totalUsers,
          active: activeUsers,
        };
      }

      // 作品统计
      const workWhere: WhereOptions = {};
      if (userId) {
        workWhere.userId = userId;
      }

      const [totalWorks, publishedWorks] = await Promise.all([
        Work.count({ where: workWhere }),
        Work.count({ where: { ...workWhere, status: 'published' } }),
      ]);

      // 今日统计
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayWhere = {
        ...bookingWhere,
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
      };

      const [todayBookings, todayRevenue] = await Promise.all([
        Schedule.count({ where: todayWhere }),
        Schedule.sum('price', { where: { ...todayWhere, status: ScheduleStatus.COMPLETED } }),
      ]);

      return {
        bookings: {
          total: totalBookings,
          confirmed: confirmedBookings,
          pending: pendingBookings,
          completed: completedBookings,
          today: todayBookings,
        },
        revenue: {
          total: parseFloat(revenue.totalRevenue || '0'),
          deposit: parseFloat(revenue.totalDeposit || '0'),
          average: parseFloat(revenue.avgBookingValue || '0'),
          today: todayRevenue || 0,
        },
        users: userStats,
        works: {
          total: totalWorks,
          published: publishedWorks,
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

      const where: WhereOptions = {
        status: ScheduleStatus.COMPLETED,
      };

      if (userId) {
        where.userId = userId;
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

      where.createdAt = {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      };

      const revenueData = await Schedule.findAll({
        where,
        attributes: [
          [Schedule.sequelize!.fn('DATE_FORMAT', Schedule.sequelize!.col('createdAt'), dateFormat), 'date'],
          [Schedule.sequelize!.fn('SUM', Schedule.sequelize!.col('price')), 'revenue'],
          [Schedule.sequelize!.fn('COUNT', Schedule.sequelize!.col('id')), 'bookings'],
        ],
        group: [Schedule.sequelize!.fn('DATE_FORMAT', Schedule.sequelize!.col('createdAt'), dateFormat)],
        order: [[Schedule.sequelize!.fn('DATE_FORMAT', Schedule.sequelize!.col('createdAt'), dateFormat), 'ASC']],
        raw: true,
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

      const where: WhereOptions = {
        status: { [Op.in]: [ScheduleStatus.BOOKED, ScheduleStatus.CONFIRMED, ScheduleStatus.COMPLETED] },
      };

      if (userId) {
        where.userId = userId;
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

      where.createdAt = {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      };

      const trendData = await Schedule.findAll({
        where,
        attributes: [
          [Schedule.sequelize!.fn('DATE_FORMAT', Schedule.sequelize!.col('createdAt'), dateFormat), 'period'],
          [Schedule.sequelize!.fn('COUNT', Schedule.sequelize!.col('id')), 'bookings'],
          [
            Schedule.sequelize!.fn('COUNT', Schedule.sequelize!.literal("CASE WHEN status = 'confirmed' THEN 1 END")),
            'confirmed',
          ],
          [
            Schedule.sequelize!.fn('COUNT', Schedule.sequelize!.literal("CASE WHEN status = 'completed' THEN 1 END")),
            'completed',
          ],
        ],
        group: [Schedule.sequelize!.fn('DATE_FORMAT', Schedule.sequelize!.col('createdAt'), dateFormat)],
        order: [[Schedule.sequelize!.fn('DATE_FORMAT', Schedule.sequelize!.col('createdAt'), dateFormat), 'ASC']],
        raw: true,
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

      const where: WhereOptions = {
        status: { [Op.in]: [ScheduleStatus.BOOKED, ScheduleStatus.CONFIRMED, ScheduleStatus.COMPLETED] },
      };

      if (userId) {
        where.userId = userId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          (where.createdAt as any)[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          (where.createdAt as any)[Op.lte] = new Date(endDate);
        }
      }

      const eventTypeData = await Schedule.findAll({
        where,
        attributes: [
          'eventType',
          [Schedule.sequelize!.fn('COUNT', Schedule.sequelize!.col('id')), 'count'],
          [Schedule.sequelize!.fn('SUM', Schedule.sequelize!.col('price')), 'revenue'],
        ],
        group: ['eventType'],
        order: [[Schedule.sequelize!.fn('COUNT', Schedule.sequelize!.col('id')), 'DESC']],
        raw: true,
      });

      return eventTypeData.map((item: any) => ({
        eventType: item.eventType,
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
      const where: WhereOptions = {};

      if (userId) {
        where.userId = userId;
      }

      if (startDate || endDate) {
        where.updatedAt = {};
        if (startDate) {
          (where.updatedAt as any)[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          (where.updatedAt as any)[Op.lte] = new Date(endDate);
        }
      }

      const activities = await Schedule.findAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'realName'],
          },
          {
            model: User,
            as: 'customer',
            attributes: ['id', 'username', 'realName'],
            required: false,
          },
        ],
        order: [['updatedAt', 'DESC']],
      });

      return activities.map((activity: any) => {
        let actionType = '创建';
        let description = '';

        switch (activity.status) {
          case ScheduleStatus.BOOKED:
            actionType = '预订';
            description = `新预订: ${activity.title}`;
            break;
          case ScheduleStatus.CONFIRMED:
            actionType = '确认';
            description = `确认预订: ${activity.title}`;
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
          user: activity.user?.realName || activity.user?.username || '未知用户',
          customer: activity.customer?.realName || activity.customer?.username || activity.customerName || '未知客户',
          timestamp: activity.updatedAt,
          status: activity.status,
          eventType: activity.eventType,
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

      const where: WhereOptions = {
        status: { [Op.in]: [ScheduleStatus.BOOKED, ScheduleStatus.CONFIRMED, ScheduleStatus.COMPLETED] },
      };

      if (userId) {
        where.userId = userId;
      }

      if (startDate || endDate) {
        where.startTime = {};
        if (startDate) {
          (where.startTime as any)[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          (where.startTime as any)[Op.lte] = new Date(endDate);
        }
      }

      // 按小时统计
      const hourlyData = await Schedule.findAll({
        where,
        attributes: [
          [Schedule.sequelize!.fn('HOUR', Schedule.sequelize!.col('startTime')), 'hour'],
          [Schedule.sequelize!.fn('COUNT', Schedule.sequelize!.col('id')), 'count'],
        ],
        group: [Schedule.sequelize!.fn('HOUR', Schedule.sequelize!.col('startTime'))],
        order: [[Schedule.sequelize!.fn('COUNT', Schedule.sequelize!.col('id')), 'DESC']],
        raw: true,
      });

      // 按星期统计
      const weeklyData = await Schedule.findAll({
        where,
        attributes: [
          [Schedule.sequelize!.fn('DAYOFWEEK', Schedule.sequelize!.col('startTime')), 'dayOfWeek'],
          [Schedule.sequelize!.fn('COUNT', Schedule.sequelize!.col('id')), 'count'],
        ],
        group: [Schedule.sequelize!.fn('DAYOFWEEK', Schedule.sequelize!.col('startTime'))],
        order: [[Schedule.sequelize!.fn('COUNT', Schedule.sequelize!.col('id')), 'DESC']],
        raw: true,
      });

      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

      return {
        hourly: hourlyData.map((item: any) => ({
          hour: parseInt(item.hour),
          count: parseInt(item.count || '0'),
          label: `${item.hour}:00`,
        })),
        weekly: weeklyData.map((item: any) => ({
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

      const where: WhereOptions = {
        status: { [Op.in]: [ScheduleStatus.BOOKED, ScheduleStatus.CONFIRMED, ScheduleStatus.COMPLETED] },
      };

      if (userId) {
        where.userId = userId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          (where.createdAt as any)[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          (where.createdAt as any)[Op.lte] = new Date(endDate);
        }
      }

      // 新客户统计
      const newCustomers = await Schedule.findAll({
        where,
        attributes: [
          'customerId',
          'customerName',
          [Schedule.sequelize!.fn('COUNT', Schedule.sequelize!.col('id')), 'bookingCount'],
          [Schedule.sequelize!.fn('SUM', Schedule.sequelize!.col('price')), 'totalSpent'],
          [Schedule.sequelize!.fn('MIN', Schedule.sequelize!.col('createdAt')), 'firstBooking'],
        ],
        group: ['customerId', 'customerName'],
        having: Schedule.sequelize!.literal('COUNT(id) = 1'), // 只有一次预订的新客户
        order: [[Schedule.sequelize!.fn('MIN', Schedule.sequelize!.col('createdAt')), 'DESC']],
        limit: 10,
        raw: true,
      });

      // 回头客统计
      const returningCustomers = await Schedule.findAll({
        where,
        attributes: [
          'customerId',
          'customerName',
          [Schedule.sequelize!.fn('COUNT', Schedule.sequelize!.col('id')), 'bookingCount'],
          [Schedule.sequelize!.fn('SUM', Schedule.sequelize!.col('price')), 'totalSpent'],
        ],
        group: ['customerId', 'customerName'],
        having: Schedule.sequelize!.literal('COUNT(id) > 1'), // 多次预订的回头客
        order: [[Schedule.sequelize!.fn('SUM', Schedule.sequelize!.col('price')), 'DESC']],
        limit: 10,
        raw: true,
      });

      return {
        newCustomers: newCustomers.map((customer: any) => ({
          id: customer.customerId,
          name: customer.customerName || '未知客户',
          bookingCount: parseInt(customer.bookingCount || '0'),
          totalSpent: parseFloat(customer.totalSpent || '0'),
          firstBooking: customer.firstBooking,
        })),
        returningCustomers: returningCustomers.map((customer: any) => ({
          id: customer.customerId,
          name: customer.customerName || '未知客户',
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
   * 获取性能指标
   */
  static async getPerformanceMetrics(params: DashboardStatsParams = {}) {
    try {
      const { startDate, endDate, userId } = params;

      const where: WhereOptions = {
        status: { [Op.in]: [ScheduleStatus.BOOKED, ScheduleStatus.CONFIRMED, ScheduleStatus.COMPLETED] },
      };

      if (userId) {
        where.userId = userId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          (where.createdAt as any)[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          (where.createdAt as any)[Op.lte] = new Date(endDate);
        }
      }

      const [totalBookings, completedBookings, cancelledBookings] = await Promise.all([
        Schedule.count({ where }),
        Schedule.count({ where: { ...where, status: ScheduleStatus.COMPLETED } }),
        Schedule.count({ where: { ...where, status: ScheduleStatus.CANCELLED } }),
      ]);

      // 计算转化率和完成率
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
      const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

      // 平均预订价值
      const avgBookingValue = await Schedule.findOne({
        where: { ...where, status: ScheduleStatus.COMPLETED },
        attributes: [[Schedule.sequelize!.fn('AVG', Schedule.sequelize!.col('price')), 'avgValue']],
        raw: true,
      });

      return {
        completionRate: parseFloat(completionRate.toFixed(2)),
        cancellationRate: parseFloat(cancellationRate.toFixed(2)),
        averageBookingValue: parseFloat((avgBookingValue as any)?.avgValue || '0'),
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

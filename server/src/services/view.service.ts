import { ViewStat } from '../models';
import { Op } from 'sequelize';

export interface ViewStats {
  totalViews: number;
  uniqueViews: number;
  dailyStats: {
    visitDate: string;
    views: number;
    uniqueViews: number;
  }[];
}

export interface BatchViewStats {
  [pageId: string]: {
    totalViews: number;
    uniqueViews: number;
  };
}

class ViewService {
  /**
   * 记录页面访问
   */
  async recordView(data: {
    pageId?: string;
    pageType: 'work' | 'team_member' | 'homepage';
    visitorIp: string;
    userAgent?: string;
    referer?: string;
    sessionId?: string;
    duration?: number;
  }): Promise<ViewStat> {
    const params: any = {
      pageType: data.pageType,
      visitorIp: data.visitorIp,
    };
    
    if (data.pageId) params.pageId = data.pageId;
    if (data.userAgent) params.userAgent = data.userAgent;
    if (data.referer) params.referer = data.referer;
    if (data.sessionId) params.sessionId = data.sessionId;
    if (data.duration) params.duration = data.duration;
    
    return await ViewStat.recordView(params);
  }

  /**
   * 获取页面访问统计
   */
  async getViewStats(pageType: string, pageId?: string, days: number = 30): Promise<ViewStats> {
    const totalViews = await ViewStat.getViewCount(pageType, pageId);
    const uniqueViews = await ViewStat.getUniqueViewCount(pageType, pageId);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const params: any = {
      pageType,
      startDate,
      endDate,
    };
    
    if (pageId) params.pageId = pageId;
    
    const dailyStatsRaw = await ViewStat.getDailyStats(params);
    
    const dailyStats = dailyStatsRaw.map((stat: any) => ({
      visitDate: stat.visitDate,
      views: parseInt(stat.totalViews) || 0,
      uniqueViews: parseInt(stat.uniqueViews) || 0,
    }));
    
    return {
      totalViews,
      uniqueViews,
      dailyStats,
    };
  }

  /**
   * 批量获取页面访问统计
   */
  async getBatchViewStats(pageType: string, pageIds: string[]): Promise<BatchViewStats> {
    const stats = await ViewStat.getViewStatistics(pageType, pageIds);
    
    const result: BatchViewStats = {};
    pageIds.forEach(pageId => {
      result[pageId] = {
        totalViews: 0,
        uniqueViews: 0,
      };
    });
    
    stats.forEach((stat: any) => {
      if (stat.pageId) {
        result[stat.pageId] = {
          totalViews: parseInt(stat.totalViews) || 0,
          uniqueViews: parseInt(stat.uniqueViews) || 0,
        };
      }
    });
    
    return result;
  }

  /**
   * 获取热门页面
   */
  async getPopularPages(pageType?: 'work' | 'team_member', limit: number = 10) {
    const whereClause: any = {};
    if (pageType) {
      whereClause.pageType = pageType;
    }
    // 排除首页统计
    whereClause.pageId = {
      [Op.ne]: null,
    };

    return await ViewStat.findAll({
      attributes: [
        'pageId',
        'pageType',
        [ViewStat.sequelize!.fn('COUNT', '*'), 'totalViews'],
        [ViewStat.sequelize!.fn('COUNT', ViewStat.sequelize!.fn('DISTINCT', ViewStat.sequelize!.col('visitor_ip'))), 'uniqueViews'],
      ],
      where: whereClause,
      group: ['pageId', 'pageType'],
      order: [[ViewStat.sequelize!.fn('COUNT', '*'), 'DESC']],
      limit,
      raw: true,
    });
  }

  /**
   * 清理旧的访问记录
   */
  async cleanupOldRecords(days: number = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await ViewStat.destroy({
      where: {
        visitDate: {
          [Op.lt]: cutoffDate,
        },
      },
    });
  }

  /**
   * 获取首页访问统计
   */
  async getHomepageStats(days: number = 30): Promise<ViewStats> {
    return this.getViewStats('homepage', undefined, days);
  }

  /**
   * 获取管理员概览统计
   */
  async getAdminOverviewStats(days: number = 7) {
    return await ViewStat.getAdminStats(days);
  }
}

export const viewService = new ViewService();
export default viewService;

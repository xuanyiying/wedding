import { ViewStat } from '../models';
import { Op } from 'sequelize';

export interface ViewStats {
  totalViews: number;
  uniqueViews: number;
  totalPlays?: number;
  uniquePlays?: number;
  dailyStats: {
    visitDate: string;
    views: number;
    uniqueViews: number;
    plays?: number;
    uniquePlays?: number;
  }[];
}

export interface BatchViewStats {
  [pageId: string]: {
    totalViews: number;
    uniqueViews: number;
    totalPlays?: number;
    uniquePlays?: number;
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
    actionType?: 'view' | 'play';
  }): Promise<ViewStat> {
    const params: any = {
      pageType: data.pageType,
      visitorIp: data.visitorIp,
      actionType: data.actionType || 'view',
    };

    if (data.pageId) params.pageId = data.pageId;
    if (data.userAgent) params.userAgent = data.userAgent;
    if (data.referer) params.referer = data.referer;
    if (data.sessionId) params.sessionId = data.sessionId;
    if (data.duration) params.duration = data.duration;

    return await ViewStat.recordView(params);
  }

  /**
   * 记录作品播放
   */
  async recordPlay(data: {
    pageId: string;
    pageType: 'work';
    visitorIp: string;
    userAgent?: string;
    referer?: string;
    sessionId?: string;
    duration?: number;
  }): Promise<ViewStat> {
    return this.recordView({
      ...data,
      actionType: 'play',
    });
  }

  /**
   * 获取页面访问统计
   */
  async getViewStats(pageType: string, pageId?: string, days: number = 30): Promise<ViewStats> {
    const totalViews = await ViewStat.getViewCount(pageType, pageId, 'view');
    const uniqueViews = await ViewStat.getUniqueViewCount(pageType, pageId, 'view');
    
    // 获取播放统计（仅对作品类型）
    let totalPlays: number | undefined;
    let uniquePlays: number | undefined;
    if (pageType === 'work') {
      totalPlays = await ViewStat.getViewCount(pageType, pageId, 'play');
      uniquePlays = await ViewStat.getUniqueViewCount(pageType, pageId, 'play');
    }

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

    const dailyStats = dailyStatsRaw.map((stat: any) => {
      const baseStats = {
        visitDate: stat.visitDate,
        views: parseInt(stat.totalViews) || 0,
        uniqueViews: parseInt(stat.uniqueViews) || 0,
      };
      
      if (pageType === 'work') {
        return {
          ...baseStats,
          plays: parseInt(stat.totalPlays) || 0,
          uniquePlays: parseInt(stat.uniquePlays) || 0,
        };
      }
      
      return baseStats;
    });

    const result: ViewStats = {
      totalViews,
      uniqueViews,
      dailyStats,
    };

    if (pageType === 'work' && totalPlays !== undefined && uniquePlays !== undefined) {
      result.totalPlays = totalPlays;
      result.uniquePlays = uniquePlays;
    }

    return result;
  }

  /**
   * 批量获取页面访问统计
   */
  async getBatchViewStats(pageType: string, pageIds: string[]): Promise<BatchViewStats> {
    const stats = await ViewStat.getViewStatistics(pageType, pageIds);

    const result: BatchViewStats = {};
    pageIds.forEach(pageId => {
      const baseStats = {
        totalViews: 0,
        uniqueViews: 0,
      };
      
      if (pageType === 'work') {
        result[pageId] = {
          ...baseStats,
          totalPlays: 0,
          uniquePlays: 0,
        };
      } else {
        result[pageId] = baseStats;
      }
    });

    stats.forEach((stat: any) => {
      if (stat.pageId) {
        result[stat.pageId] = {
          totalViews: parseInt(stat.totalViews) || 0,
          uniqueViews: parseInt(stat.uniqueViews) || 0,
        };
        
        if (pageType === 'work') {
          const pageStats = result[stat.pageId] as BatchViewStats[string] & { totalPlays: number; uniquePlays: number };
          if (pageStats.totalPlays !== undefined && pageStats.uniquePlays !== undefined) {
            pageStats.totalPlays = parseInt(stat.totalPlays) || 0;
            pageStats.uniquePlays = parseInt(stat.uniquePlays) || 0;
          }
        }
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
        [
          ViewStat.sequelize!.fn('COUNT', ViewStat.sequelize!.fn('DISTINCT', ViewStat.sequelize!.col('visitor_ip'))),
          'uniqueViews',
        ],
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

  /**
   * 获取作品播放统计
   */
  async getPlayStats(pageId: string, days: number = 30): Promise<ViewStats> {
    return this.getViewStats('work', pageId, days);
  }

  /**
   * 批量获取作品播放统计
   */
  async getBatchPlayStats(pageIds: string[]): Promise<BatchViewStats> {
    return this.getBatchViewStats('work', pageIds);
  }
}

export const viewService = new ViewService();
export default viewService;

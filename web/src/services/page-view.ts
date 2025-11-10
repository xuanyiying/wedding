import request  from '../utils/request';
import type { ApiResponse } from "../types";

export interface PageViewStats {
  totalViews: number;
  uniqueViews: number;
  totalPlays?: number;
  uniquePlays?: number;
  pageType: 'team_member' | 'work' | 'team' | 'team_page';
  pageId: string;
}

export interface PlayStats {
  totalPlays: number;
  uniquePlays: number;
  pageId: string;
}

export interface PopularPage {
  pageId: string;
  totalViews: number;
  uniqueViews: number;
  rank: number;
}

export interface ViewTrend {
  date: string;
  views: number;
  uniqueViews: number;
}

export interface AdminStats {
  popularTeamMembers: PopularPage[];
  popularWorks: PopularPage[];
  trends: {
    teamMembers: ViewTrend[];
    works: ViewTrend[];
  };
}

export class PageViewService {
  /**
   * 记录页面访问
   */
  static async recordPageView(pageType: 'team_member' | 'work' | 'team' | 'team_page', pageId: string): Promise<void> {
    try {
      await request.post('/page-views/record', {
        pageType,
        pageId,
      });
    } catch (error) {
      // 静默处理错误，不影响用户体验
      console.warn('Failed to record page view:', error);
    }
  }

  /**
   * 获取页面访问统计
   */
  static async getPageViewStats(pageType: 'team_member' | 'work' | 'team' | 'team_page', pageId: string): Promise<ApiResponse<PageViewStats>> {
    return await request.get(`/page-views/stats/${pageType}/${pageId}`);
  }

  /**
   * 批量获取页面访问统计
   */
  static async getBatchPageViewStats(
    pageType: 'team_member' | 'work' | 'team' | 'team_page',
    pageIds: string[]
  ): Promise<ApiResponse<Record<string, PageViewStats>>> {
    return  await request.post(`/page-views/stats/${pageType}/batch`, {
      pageIds,
    });
  }

  /**
   * 记录作品播放
   */
  static async recordPlay(pageId: string): Promise<void> {
    try {
      await request.post('/page-views/play/record', {
        pageId,
      });
    } catch (error) {
      // 静默处理错误，不影响用户体验
      console.warn('Failed to record play:', error);
    }
  }

  /**
   * 获取作品播放统计
   */
  static async getPlayStats(pageId: string): Promise<ApiResponse<PlayStats>> {
    return await request.get(`/page-views/play/stats/${pageId}`);
  }

  /**
   * 批量获取作品播放统计
   */
  static async getBatchPlayStats(pageIds: string[]): Promise<ApiResponse<Record<string, PlayStats>>> {
    return await request.post('/page-views/play/stats/batch', {
      pageIds,
    });
  }

  /**
   * 获取热门页面排行
   */
  static async getPopularPages(
    pageType: 'team_member' | 'work' | 'team' | 'team_page',
    limit: number = 10,
    timeRange?: { start: Date; end: Date }
  ): Promise<ApiResponse<PopularPage[]>> {
    const params: any = { limit };
    if (timeRange) {
      params.startDate = timeRange.start.toISOString();
      params.endDate = timeRange.end.toISOString();
    }

    return await request.get(`/page-views/popular/${pageType}`, { params });
  }

  /**
   * 获取访问趋势数据
   */
  static async getViewTrends(
    pageType: 'team_member' | 'work' | 'team' | 'team_page',
    pageId?: string,
    days: number = 30
  ): Promise<ApiResponse<ViewTrend[]>> {
    const params: any = { days };
    if (pageId) {
      params.pageId = pageId;
    }

    return await request.get(`/page-views/trends/${pageType}`, { params });
  }

  /**
   * 获取管理员统计概览
   */
  static async getAdminStats(days: number = 7): Promise<ApiResponse<AdminStats>> {
    return await request.get('/page-views/admin/stats', {
      params: { days },
    });
  }
}
import { Request, Response } from 'express';
import viewService from '../services/view.service';
import { logger } from '../utils/logger';
import { ActionType } from '../models/ViewStat';

/**
 * 记录页面访问
 */
export const recordView = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pageType, pageId } = req.body;

    if (!pageType || !pageId) {
      res.status(400).json({
        success: false,
        message: '页面类型和页面ID不能为空',
      });
      return;
    }

    // 将传入的pageType转换为数据库支持的类型
    let dbPageType: 'work' | 'team_member' | 'homepage';
    
    if (pageType === 'work') {
      dbPageType = 'work';
    } else if (pageType === 'team_member') {
      dbPageType = 'team_member';
    } else if (pageType === 'team' || pageType === 'team_page') {
      // 将team和team_page都映射为team_member
      dbPageType = 'team_member';
    } else if (pageType === 'homepage') {
      dbPageType = 'homepage';
    } else {
      res.status(400).json({
        success: false,
        message: '无效的页面类型',
      });
      return;
    }

    const recordData: any = {
      pageType: dbPageType,
      pageId,
      visitorIp: req.ip || req.connection.remoteAddress || 'unknown',
      actionType: ActionType.VIEW,
    };

    const userAgent = req.get('User-Agent');
    const referer = req.get('Referer');

    if (userAgent) recordData.userAgent = userAgent;
    if (referer) recordData.referer = referer;

    const pageView = await viewService.recordView(recordData);

    res.json({
      success: true,
      data: pageView,
    });
  } catch (error) {
    logger.error('记录页面访问失败:', error);
    res.status(500).json({
      success: false,
      message: '记录页面访问失败',
    });
  }
};

/**
 * 获取页面访问统计
 */
export const getViewStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pageType, pageId } = req.params;

    if (!pageType || !pageId) {
      res.status(400).json({
        success: false,
        message: '页面类型和页面ID不能为空',
      });
      return;
    }

    if (!['team_member', 'work'].includes(pageType)) {
      res.status(400).json({
        success: false,
        message: '无效的页面类型',
      });
      return;
    }

    const stats = await viewService.getViewStats(pageType, pageId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('获取页面访问统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取页面访问统计失败',
    });
  }
};

/**
 * 批量获取页面访问统计
 */
export const getBatchViewStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pageType } = req.params;
    const { pageIds } = req.body;

    if (!pageType || !['team_member', 'work'].includes(pageType)) {
      res.status(400).json({
        success: false,
        message: '无效的页面类型',
      });
      return;
    }

    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      res.status(400).json({
        success: false,
        message: '页面ID列表不能为空',
      });
      return;
    }

    const stats = await viewService.getBatchViewStats(pageType, pageIds);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('批量获取页面访问统计失败:', error);
    res.status(500).json({
      success: false,
      message: '批量获取页面访问统计失败',
    });
  }
};

/**
 * 获取热门页面排行
 */
export const getPopularPages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pageType } = req.params;
    const { limit = 10, startDate, endDate } = req.query;

    if (!pageType || !['team_member', 'work'].includes(pageType)) {
      res.status(400).json({
        success: false,
        message: '无效的页面类型',
      });
      return;
    }

    if (startDate && endDate) {
    }

    const popularPages = await viewService.getPopularPages(
      pageType as 'team_member' | 'work',
      parseInt(limit as string) || 10,
    );

    res.json({
      success: true,
      data: popularPages,
    });
  } catch (error) {
    logger.error('获取热门页面排行失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热门页面排行失败',
    });
  }
};

/**
 * 获取访问趋势数据
 */
export const getViewTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pageType } = req.params;
    const { pageId, days = 30 } = req.query;

    if (!pageType || !['team_member', 'work'].includes(pageType)) {
      res.status(400).json({
        success: false,
        message: '无效的页面类型',
      });
      return;
    }

    const trends = await viewService.getViewStats(pageType, pageId as string, parseInt(days as string) || 30);

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logger.error('获取访问趋势数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取访问趋势数据失败',
    });
  }
};

/**
 * 记录作品播放
 */
export const recordPlay = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pageId } = req.body;

    if (!pageId) {
      res.status(400).json({
        success: false,
        message: '页面ID不能为空',
      });
      return;
    }

    const recordData: any = {
      pageType: 'work',
      pageId,
      visitorIp: req.ip || req.connection.remoteAddress || 'unknown',
      actionType: ActionType.PLAY,
    };

    const userAgent = req.get('User-Agent');
    const referer = req.get('Referer');

    if (userAgent) recordData.userAgent = userAgent;
    if (referer) recordData.referer = referer;

    const playRecord = await viewService.recordPlay(recordData);

    res.json({
      success: true,
      data: playRecord,
    });
  } catch (error) {
    logger.error('记录作品播放失败:', error);
    res.status(500).json({
      success: false,
      message: '记录作品播放失败',
    });
  }
};

/**
 * 获取作品播放统计
 */
export const getPlayStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pageId } = req.params;

    if (!pageId) {
      res.status(400).json({
        success: false,
        message: '页面ID不能为空',
      });
      return;
    }

    const stats = await viewService.getPlayStats(pageId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('获取作品播放统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取作品播放统计失败',
    });
  }
};

/**
 * 批量获取作品播放统计
 */
export const getBatchPlayStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pageIds } = req.body;

    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      res.status(400).json({
        success: false,
        message: '页面ID列表不能为空',
      });
      return;
    }

    const stats = await viewService.getBatchPlayStats(pageIds);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('批量获取作品播放统计失败:', error);
    res.status(500).json({
      success: false,
      message: '批量获取作品播放统计失败',
    });
  }
};

/**
 * 获取管理员统计概览
 */
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(days as string) || 7;

    // 获取团队成员页面热门排行
    const popularTeamMembers = await viewService.getPopularPages('team_member', 10);

    // 获取作品页面热门排行
    const popularWorks = await viewService.getPopularPages('work', 10);

    // 获取最近访问趋势
    const teamMemberTrends = await viewService.getViewStats('team_member', undefined, daysNum);
    const workTrends = await viewService.getViewStats('work', undefined, daysNum);

    res.json({
      success: true,
      data: {
        popularTeamMembers,
        popularWorks,
        trends: {
          teamMembers: teamMemberTrends,
          works: workTrends,
        },
      },
    });
  } catch (error) {
    logger.error('获取管理员统计概览失败:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员统计概览失败',
    });
  }
};

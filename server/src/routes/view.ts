import { Router } from 'express';
import {
 
  getPopularPages,
  getViewTrends,
  getAdminStats,
  getViewStats,
  recordView,
  getBatchViewStats,
} from '../controllers/view.controller';
import { authMiddleware, requireAdmin } from '../middlewares/auth';

const router = Router();

// 公开接口 - 记录页面访问（不需要认证）
router.post('/record', recordView);

// 公开接口 - 获取单个页面访问统计
router.get('/stats/:pageType/:pageId', getViewStats);

// 公开接口 - 批量获取页面访问统计
router.post('/stats/:pageType/batch', getBatchViewStats);

// 需要管理员权限的接口
router.use(authMiddleware, requireAdmin);

// 获取热门页面排行
router.get('/popular/:pageType', getPopularPages);

// 获取访问趋势数据
router.get('/trends/:pageType', getViewTrends);

// 获取管理员统计概览
router.get('/admin/stats', getAdminStats);

export default router;
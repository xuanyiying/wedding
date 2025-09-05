import { Router } from 'express';
import * as DashboardController from '../controllers/dashboard.controller';

const router = Router();

// 获取仪表盘统计数据
router.get('/stats', DashboardController.getDashboardStats);

// 获取最近活动
router.get('/activities', DashboardController.getRecentActivities);

// 获取收入统计
router.get('/revenue', DashboardController.getRevenueStats);

// 获取档期统计
router.get('/schedule-stats', DashboardController.getScheduleStats);

export default router;

import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './user';
import scheduleRoutes from './schedule';
import workRoutes from './work';
import fileRoutes from './file';
import directUploadRoutes from './direct-upload';
import dashboardRoutes from './dashboard';
import teamRoutes from './team';
import contactRoutes from './contact';
import settingsRoutes from './settings';
import pageViewRoutes from './view';
import profileRoutes from './profile';

const router = Router();

// API 根路径
router.get('/', (_req, res) => {
  res.json({
    message: 'Wedding Club API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/auth',
      users: '/users',
      schedules: '/schedules',
      works: '/works',
      files: '/files',
      'direct-upload': '/direct-upload',
      dashboard: '/dashboard',
      team: '/team',
      contact: '/contact',
      settings: '/settings',
      'page-views': '/page-views',
      profile: '/profile',
      docs: '/docs'
    }
  });
});

// 认证相关路由
router.use('/auth', authRoutes);

// 用户管理路由
router.use('/users', userRoutes);

// 档期管理路由
router.use('/schedules', scheduleRoutes);

// 作品管理路由
router.use('/works', workRoutes);

// 文件管理路由
router.use('/files', fileRoutes);

// 直传上传路由
router.use('/direct-upload', directUploadRoutes);

// 仪表盘路由
router.use('/dashboard', dashboardRoutes);

// 团队管理路由
router.use('/team', teamRoutes);

// 联系表单路由
router.use('/contact', contactRoutes);

// 设置管理路由
router.use('/settings', settingsRoutes);

// 页面访问统计路由
router.use('/page-views', pageViewRoutes);

// 用户档案路由
router.use('/profile', profileRoutes);

export default router;

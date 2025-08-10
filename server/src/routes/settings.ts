import { Router } from 'express';
import {
  getSettings,
  updateSiteSettings,
  updateEmailSettings,
  updateSecuritySettings,
  testEmail,
  clearCache,
  backupDatabase,
  getSystemInfo,
  getSiteConfig,
  updateSiteConfig,
  updateHomepageSections,
} from '../controllers/settings.controller';
import { authMiddleware, requireAdmin } from '../middlewares/auth';

const router = Router();

// 公开接口 - 获取网站配置
router.get('/site-config', getSiteConfig);

// 获取所有设置
router.get('/', getSettings);

// 需要管理员权限的接口
router.use(authMiddleware, requireAdmin);



// 更新设置
router.put('/site', updateSiteSettings);
router.put('/homepage-sections', updateHomepageSections);
router.put('/email', updateEmailSettings);
router.put('/security', updateSecuritySettings);
router.put('/site-config', updateSiteConfig);

// 测试邮件
router.post('/test-email', testEmail);

// 系统操作
router.post('/clear-cache', clearCache);
router.post('/backup-database', backupDatabase);

// 获取系统信息
router.get('/system-info', getSystemInfo);

export default router;
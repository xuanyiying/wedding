import { Router } from 'express';
import {
  getAllSettings,
  updateSiteSettings,
  updateHomepageSettings,
  updateThemeSettings,
  updateEmailSettings,
  testEmail,
  clearCache,
  getSiteSettings,
  getHomepageSettings,
  getThemeSettings,
  getEmailSettings
} from '../controllers/settings.controller';
import { authMiddleware, requireAdmin } from '../middlewares/auth';

const router = Router();


router.get('/site', getSiteSettings);
router.get('/homepage', getHomepageSettings);
router.get('/theme', getThemeSettings);
router.get('/email', getEmailSettings);
// 获取所有设置
router.get('/', getAllSettings);

// 需要管理员权限的接口
router.use(authMiddleware, requireAdmin);

router.post('/site', updateSiteSettings);
router.post('/homepage', updateHomepageSettings);
router.post('/theme', updateThemeSettings);
router.post('/email', updateEmailSettings);

// 测试邮件
router.post('/test-email', testEmail);

// 系统操作
router.post('/clear-cache', clearCache);

export default router;

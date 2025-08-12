import { Router } from 'express';
import { body, query } from 'express-validator';
import { ContactController } from '../controllers/contact.controller';
import { authMiddleware, requireAdmin } from '../middlewares/auth';
import { handleValidationErrors } from '../middlewares/validation';

const router = Router();
const contactController = new ContactController();

// 提交联系表单（公开接口）
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('姓名不能为空'),
    body('phone').isMobilePhone('zh-CN').withMessage('请输入正确的手机号码'),
    body('email').isEmail().withMessage('请输入正确的邮箱地址'),
    body('weddingDate').isISO8601().withMessage('请输入正确的日期格式'),
    body('weddingTime').notEmpty().withMessage('婚礼时间不能为空'),
    body('location').notEmpty().withMessage('婚礼地点不能为空'),
    body('guestCount').isInt({ min: 1 }).withMessage('宾客人数必须大于0'),
    body('serviceType').isIn(['wedding', 'engagement', 'anniversary', 'other']).withMessage('请选择正确的服务类型'),
    body('budget').isIn(['5000-10000', '10000-20000', '20000-50000', '50000+']).withMessage('请选择正确的预算范围'),
    body('requirements').optional().isString().withMessage('特殊要求必须是字符串'),
  ],
  handleValidationErrors,
  contactController.submitContact,
);

// 获取联系表单列表（管理员）
router.get(
  '/',
  authMiddleware,
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['pending', 'contacted', 'completed', 'cancelled']).withMessage('状态值不正确'),
    query('startDate').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式不正确'),
  ],
  handleValidationErrors,
  contactController.getContacts,
);

// 获取单个联系表单详情（管理员）
router.get('/:id', authMiddleware, requireAdmin, contactController.getContact);

// 更新联系表单状态（管理员）
router.put(
  '/:id/status',
  authMiddleware,
  requireAdmin,
  [
    body('status').isIn(['pending', 'contacted', 'completed', 'cancelled']).withMessage('状态值不正确'),
    body('notes').optional().isString().withMessage('备注必须是字符串'),
  ],
  handleValidationErrors,
  contactController.updateContactStatus,
);

// 删除联系表单（管理员）
router.delete('/:id', authMiddleware, requireAdmin, contactController.deleteContact);

// 批量删除联系表单（管理员）
router.delete(
  '/batch',
  authMiddleware,
  requireAdmin,
  [
    body('ids').isArray({ min: 1 }).withMessage('请选择要删除的联系表单'),
    body('ids.*').isUUID().withMessage('联系表单ID格式不正确'),
  ],
  handleValidationErrors,
  contactController.batchDeleteContacts,
);

// 获取联系表单统计（管理员）
router.get(
  '/stats',
  authMiddleware,
  requireAdmin,
  [
    query('startDate').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式不正确'),
  ],
  handleValidationErrors,
  contactController.getContactStats,
);

export default router;

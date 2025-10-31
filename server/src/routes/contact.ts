import { Router } from 'express';
import { ContactController } from '../controllers/contact.controller';
import { authMiddleware, requireAdmin } from '../middlewares/auth';
import { contactValidators } from '../middlewares/validators/contact';

const router = Router();
const contactController = new ContactController();

// 提交联系表单（公开接口）
router.post(
  '/',
  contactValidators.submitContact,
  contactController.submitContact,
);

// 获取联系表单列表（管理员）
router.get(
  '/',
  authMiddleware,
  requireAdmin,
  contactValidators.getContacts,
  contactController.getContacts,
);

// 获取单个联系表单详情（管理员）
router.get(
  '/:id',
  authMiddleware,
  requireAdmin,
  contactValidators.getContactById,
  contactController.getContact
);

// 更新联系表单状态（管理员）
router.put(
  '/:id/status',
  authMiddleware,
  requireAdmin,
  contactValidators.updateContactStatus,
  contactController.updateContactStatus,
);

// 删除联系表单（管理员）
router.delete(
  '/:id',
  authMiddleware,
  requireAdmin,
  contactValidators.deleteContact,
  contactController.deleteContact
);

// 批量删除联系表单（管理员）
router.delete(
  '/batch',
  authMiddleware,
  requireAdmin,
  contactValidators.batchDeleteContacts,
  contactController.batchDeleteContacts,
);

// 获取联系表单统计（管理员）
router.get(
  '/stats',
  authMiddleware,
  requireAdmin,
  contactValidators.getContactStats,
  contactController.getContactStats,
);

export default router;

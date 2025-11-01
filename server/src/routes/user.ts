import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  batchDeleteUsers,
  resetPassword,
  updateUserStatus,
  getUserStats,
  getCurrentUser,
  updateCurrentUserProfile,
  toggleCurrentUserProfilePublish,
} from '../controllers/user.controller';
import { authMiddleware, requireAdmin } from '../middlewares/auth';
import { getTeamsByUserId } from '../controllers/team.controller';

const router = Router();

// 获取当前用户信息
router.get('/me', authMiddleware, getCurrentUser);

// 更新当前用户资料
router.put('/me/profile', authMiddleware, updateCurrentUserProfile);

// 发布/取消发布当前用户资料
router.patch('/me/profile/publish', authMiddleware, toggleCurrentUserProfilePublish);

// 管理员权限路由
router.get('/',  getUsers);
router.get('/stats', getUserStats);
router.get('/:id', getUserById);
router.post('/', authMiddleware, requireAdmin, createUser);
router.put('/:id', authMiddleware, requireAdmin, updateUser);
router.delete('/:id', authMiddleware, requireAdmin, deleteUser);
router.post('/batch-delete', authMiddleware, requireAdmin, batchDeleteUsers);
router.post('/:id/reset-password', authMiddleware, requireAdmin, resetPassword);
router.patch('/:id/status', authMiddleware, requireAdmin, updateUserStatus);
// 获取用户的团队列表
router.get('/:userId/teams', getTeamsByUserId);
export default router;

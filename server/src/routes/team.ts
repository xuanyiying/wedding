import { Router } from 'express';
import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  getTeamMemberById,
  inviteTeamMember,
  deleteTeamMember,
  batchDeleteTeamMembers,
  updateTeamMemberStatus,
  updateTeamMember,
  getTeamStats,
  getAvailableUsers,
} from '../controllers/team.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// 团队管理路由
// 获取团队列表
router.get('/', getTeams);

// 创建团队
router.post('/', authMiddleware, createTeam);

// 获取团队统计信息 - 需要放在 /:id 之前
router.get('/stats', getTeamStats);

// 获取可邀请的用户列表 - 需要放在 /:id 之前
router.get('/:teamId/available-users', getAvailableUsers);

// 批量删除团队成员 - 需要放在 /members/:id 之前
router.delete('/members/batch', authMiddleware, batchDeleteTeamMembers);

// 获取团队成员列表 - 使用查询参数
router.get('/members', getTeamMembers);

// 获取团队成员详情
router.get('/members/:id', getTeamMemberById);

// 创建团队成员
router.post('/members', authMiddleware, inviteTeamMember);

// 更新团队成员
router.put('/members/:id', authMiddleware, updateTeamMember);

// 删除团队成员
router.delete('/members/:id', authMiddleware, deleteTeamMember);

// 更新团队成员状态
router.put('/members/:id/status', authMiddleware, updateTeamMemberStatus);

// 获取指定团队的成员列表
router.get('/:teamId/members', getTeamMembers)

// 团队详情路由 - 需要放在最后
// 获取团队详情
router.get('/:id', getTeamById);

// 更新团队信息
router.put('/:id', authMiddleware, updateTeam);

// 删除团队
router.delete('/:id', authMiddleware, deleteTeam);

export default router;

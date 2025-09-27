import { Router } from 'express';
import * as IssueController from '../controllers/Issue.controller';
import { createIssueValidator, updateIssueValidator, voteIssueValidator } from '../validators/issue';
import { authMiddleware } from '@/middlewares';

const router = Router();

/**
 * @route GET /api/issues
 * @desc 获取问题列表
 * @access Private
 */
router.get('/', authMiddleware, IssueController.getIssues);

/**
 * @route GET /api/issues/stats
 * @desc 获取问题统计
 * @access Private
 */
router.get('/stats', authMiddleware, IssueController.getIssueStats);

/**
 * @route GET /api/issues/:id
 * @desc 获取单个问题详情
 * @access Private
 */
router.get('/:id', authMiddleware, IssueController.getIssue);

/**
 * @route POST /api/issues
 * @desc 创建新问题
 * @access Private
 */
router.post('/', authMiddleware, createIssueValidator, IssueController.createIssue);

/**
 * @route PUT /api/issues/:id
 * @desc 更新问题
 * @access Private
 */
router.put('/:id', authMiddleware, updateIssueValidator, IssueController.updateIssue);

/**
 * @route DELETE /api/issues/:id
 * @desc 删除问题
 * @access Private (仅创建者或管理员)
 */
router.delete('/:id', authMiddleware, IssueController.deleteIssue);

/**
 * @route POST /api/issues/:id/vote
 * @desc 投票问题
 * @access Private
 */
router.post('/:id/vote', authMiddleware, voteIssueValidator, IssueController.voteIssue);

export default router;
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { issueValidators } from '../middlewares/validators/issue';
import { IssueController } from '@/controllers/issue.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Issue:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - type
 *         - priority
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: 问题ID
 *         title:
 *           type: string
 *           description: 问题标题
 *         description:
 *           type: string
 *           description: 问题描述
 *         type:
 *           type: string
 *           enum: [bug, feature, improvement, task]
 *           description: 问题类型
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           description: 优先级
 *         status:
 *           type: string
 *           enum: [open, in_progress, resolved, closed]
 *           description: 状态
 *         assigneeId:
 *           type: string
 *           format: uuid
 *           description: 指派人ID
 *         reporterId:
 *           type: string
 *           format: uuid
 *           description: 报告人ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 */

/**
 * @route GET /api/issues
 * @desc 获取问题列表
 * @access Private
 */
router.get('/', authMiddleware, issueValidators.getIssues, IssueController.getIssues);

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
router.get('/:id', authMiddleware, issueValidators.getIssueById, IssueController.getIssue);

/**
 * @route POST /api/issues
 * @desc 创建新问题
 * @access Private
 */
router.post('/', authMiddleware, issueValidators.createIssue, IssueController.createIssue);

/**
 * @route PUT /api/issues/:id
 * @desc 更新问题
 * @access Private
 */
router.put('/:id', authMiddleware, issueValidators.updateIssue, IssueController.updateIssue);

/**
 * @route DELETE /api/issues/:id
 * @desc 删除问题
 * @access Private (仅创建者或管理员)
 */
router.delete('/:id', authMiddleware, issueValidators.deleteIssue, IssueController.deleteIssue);

/**
 * @route POST /api/issues/:id/vote
 * @desc 投票问题
 * @access Private
 */
router.post('/:id/vote', authMiddleware, issueValidators.voteIssue, IssueController.voteIssue);

export default router;
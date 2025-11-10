import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { IssueController } from '../controllers/issue.controller';

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
 * @route GET /issues
 * @desc 获取问题列表
 * @access Private
 */
router.get('/', authMiddleware, IssueController.getIssues);

/**
 * @route GET /issues/stats
 * @desc 获取问题统计
 * @access Private
 */
router.get('/stats', authMiddleware, IssueController.getIssueStats);

/**
 * @route GET /issues/:id
 * @desc 获取单个问题详情
 * @access Private
 */
router.get('/:id', authMiddleware, IssueController.getIssue);

/**
 * @route POST /issues
 * @desc 创建新问题
 * @access Private
 */
router.post('/', authMiddleware, IssueController.createIssue);

/**
 * @route PUT /issues/:id
 * @desc 更新问题
 * @access Private
 */
router.put('/:id', authMiddleware, IssueController.updateIssue);

/**
 * @route DELETE /issues/:id
 * @desc 删除问题
 * @access Private (仅创建者或管理员)
 */
router.delete('/:id', authMiddleware, IssueController.deleteIssue);

/**
 * @route POST /issues/:id/vote
 * @desc 投票问题
 * @access Private
 */
router.post('/:id/vote', authMiddleware, IssueController.voteIssue);

export default router;
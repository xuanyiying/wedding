import { body } from 'express-validator';
import { IssueType, IssuePriority, IssueStatus } from '../models/Issue';

export const createIssueValidator = [
  body('title')
    .notEmpty()
    .withMessage('标题不能为空')
    .isLength({ min: 5, max: 100 })
    .withMessage('标题长度必须在5-100个字符之间'),

  body('description')
    .notEmpty()
    .withMessage('描述不能为空')
    .isLength({ min: 10 })
    .withMessage('描述至少需要10个字符'),

  body('type')
    .optional()
    .isIn(Object.values(IssueType))
    .withMessage('无效的问题类型'),

  body('priority')
    .optional()
    .isIn(Object.values(IssuePriority))
    .withMessage('无效的优先级'),

  body('stepsToReproduce')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('重现步骤不能超过1000个字符'),

  body('expectedBehavior')
    .optional()
    .isLength({ max: 500 })
    .withMessage('预期行为不能超过500个字符'),

  body('actualBehavior')
    .optional()
    .isLength({ max: 500 })
    .withMessage('实际行为不能超过500个字符'),

  body('environment')
    .optional()
    .isLength({ max: 100 })
    .withMessage('环境信息不能超过100个字符'),

  body('version')
    .optional()
    .isLength({ max: 50 })
    .withMessage('版本号不能超过50个字符'),

  body('labels')
    .optional()
    .custom((value) => {
      if (value && !Array.isArray(value)) {
        throw new Error('标签必须是数组');
      }
      return true;
    })
];

export const updateIssueValidator = [
  body('title')
    .optional()
    .isLength({ min: 5, max: 100 })
    .withMessage('标题长度必须在5-100个字符之间'),

  body('description')
    .optional()
    .isLength({ min: 10 })
    .withMessage('描述至少需要10个字符'),

  body('type')
    .optional()
    .isIn(Object.values(IssueType))
    .withMessage('无效的问题类型'),

  body('priority')
    .optional()
    .isIn(Object.values(IssuePriority))
    .withMessage('无效的优先级'),

  body('status')
    .optional()
    .isIn(Object.values(IssueStatus))
    .withMessage('无效的状态'),

  body('stepsToReproduce')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('重现步骤不能超过1000个字符'),

  body('expectedBehavior')
    .optional()
    .isLength({ max: 500 })
    .withMessage('预期行为不能超过500个字符'),

  body('actualBehavior')
    .optional()
    .isLength({ max: 500 })
    .withMessage('实际行为不能超过500个字符'),

  body('environment')
    .optional()
    .isLength({ max: 100 })
    .withMessage('环境信息不能超过100个字符'),

  body('version')
    .optional()
    .isLength({ max: 50 })
    .withMessage('版本号不能超过50个字符'),

  body('labels')
    .optional()
    .custom((value) => {
      if (value && !Array.isArray(value)) {
        throw new Error('标签必须是数组');
      }
      return true;
    }),

  body('assigneeId')
    .optional()
    .isUUID()
    .withMessage('无效的分配人ID'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('截止日期格式无效'),

  body('estimatedHours')
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage('预估工时必须在0-1000之间')
];

export const voteIssueValidator = [
  body('action')
    .notEmpty()
    .withMessage('投票动作不能为空')
    .isIn(['upvote', 'downvote'])
    .withMessage('无效的投票动作')
];
import Joi from 'joi';
import { validateRequest } from '@/middlewares';
import { IssueType, IssuePriority, IssueStatus } from '@/models/Issue';

// 创建问题验证规则
export const createIssueSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(5)
        .max(100)
        .optional()
        .allow( null)
        .messages({
            'string.empty': '标题不能为空',
            'string.min': '标题长度必须在5-100个字符之间',
            'string.max': '标题长度必须在5-100个字符之间',
            'any.required': '标题是必填项',
        }),
    description: Joi.string()
        .trim()
        .min(10)
        .optional()
        .allow( null)
        .messages({
            'string.empty': '描述不能为空',
            'string.min': '描述至少需要10个字符',
            'any.required': '描述是必填项',
        }),
    type: Joi.string()
        .valid(...Object.values(IssueType))
        .optional()
        .messages({
            'any.only': `问题类型必须是以下值之一：${Object.values(IssueType).join('、')}`,
        }),
    priority: Joi.string()
        .valid(...Object.values(IssuePriority))
        .optional()
        .messages({
            'any.only': `优先级必须是以下值之一：${Object.values(IssuePriority).join('、')}`,
        }),
    stepsToReproduce: Joi.string()
        .trim()
        .max(1000)
        .optional()
        .allow('')
        .messages({
            'string.max': '重现步骤不能超过1000个字符',
        }),
    expectedBehavior: Joi.string()
        .trim()
        .max(500)
        .optional()
        .allow('')
        .messages({
            'string.max': '预期行为不能超过500个字符',
        }),
    actualBehavior: Joi.string()
        .trim()
        .max(500)
        .optional()
        .allow('')
        .messages({
            'string.max': '实际行为不能超过500个字符',
        }),
    environment: Joi.string()
        .trim()
        .max(100)
        .optional()
        .allow('')
        .messages({
            'string.max': '环境信息不能超过100个字符',
        }),
    version: Joi.string()
        .trim()
        .max(50)
        .optional()
        .allow('')
        .messages({
            'string.max': '版本号不能超过50个字符',
        }),
    labels: Joi.array()
        .items(Joi.string().trim())
        .optional()
        .allow('')
        .messages({
            'array.base': '标签必须是数组',
        }),
});

// 更新问题验证规则
export const updateIssueSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(5)
        .max(100)
        .optional()
        .messages({
            'string.min': '标题长度必须在5-100个字符之间',
            'string.max': '标题长度必须在5-100个字符之间',
        }),
    description: Joi.string()
        .trim()
        .min(10)
        .optional()
        .messages({
            'string.min': '描述至少需要10个字符',
        }),
    type: Joi.string()
        .valid(...Object.values(IssueType))
        .optional()
        .messages({
            'any.only': `问题类型必须是以下值之一：${Object.values(IssueType).join('、')}`,
        }),
    priority: Joi.string()
        .valid(...Object.values(IssuePriority))
        .optional()
        .messages({
            'any.only': `优先级必须是以下值之一：${Object.values(IssuePriority).join('、')}`,
        }),
    status: Joi.string()
        .valid(...Object.values(IssueStatus))
        .optional()
        .messages({
            'any.only': `状态必须是以下值之一：${Object.values(IssueStatus).join('、')}`,
        }),
    stepsToReproduce: Joi.string()
        .trim()
        .max(1000)
        .optional()
        .messages({
            'string.max': '重现步骤不能超过1000个字符',
        }),
    expectedBehavior: Joi.string()
        .trim()
        .max(500)
        .optional()
        .messages({
            'string.max': '预期行为不能超过500个字符',
        }),
    actualBehavior: Joi.string()
        .trim()
        .max(500)
        .optional()
        .messages({
            'string.max': '实际行为不能超过500个字符',
        }),
    environment: Joi.string()
        .trim()
        .max(100)
        .optional()
        .messages({
            'string.max': '环境信息不能超过100个字符',
        }),
    version: Joi.string()
        .trim()
        .max(50)
        .optional()
        .messages({
            'string.max': '版本号不能超过50个字符',
        }),
    labels: Joi.array()
        .items(Joi.string().trim())
        .optional()
        .messages({
            'array.base': '标签必须是数组',
        }),
    assigneeId: Joi.string()
        .uuid()
        .optional()
        .messages({
            'string.guid': '分配人ID必须是有效的UUID格式',
        }),
    dueDate: Joi.date()
        .iso()
        .optional()
        .messages({
            'date.format': '截止日期格式无效',
        }),
    estimatedHours: Joi.number()
        .integer()
        .min(0)
        .max(1000)
        .optional()
        .messages({
            'number.integer': '预估工时必须是整数',
            'number.min': '预估工时必须在0-1000之间',
            'number.max': '预估工时必须在0-1000之间',
        }),
}).min(1).messages({
    'object.min': '至少需要提供一个要更新的字段',
});

// 问题投票验证规则
export const voteIssueSchema = Joi.object({
    action: Joi.string()
        .valid('upvote', 'downvote')
        .required()
        .messages({
            'any.only': '投票动作必须是upvote或downvote',
            'any.required': '投票动作是必填项',
        }),
});

// 获取问题详情验证规则
export const getIssueByIdSchema = Joi.object({
    id: Joi.string()
        .required()
        .messages({
            'string.empty': '问题ID不能为空',
            'any.required': '问题ID是必填项',
        }),
});

// 获取问题列表验证规则
export const getIssuesSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
            'number.integer': '页码必须是整数',
            'number.min': '页码必须大于0',
        }),
    pageSize: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
        .messages({
            'number.integer': '每页数量必须是整数',
            'number.min': '每页数量必须大于0',
            'number.max': '每页数量不能超过100',
        }),
    type: Joi.string()
        .valid(...Object.values(IssueType))
        .optional()
        .messages({
            'any.only': `问题类型必须是以下值之一：${Object.values(IssueType).join('、')}`,
        }),
    priority: Joi.string()
        .valid(...Object.values(IssuePriority))
        .optional()
        .messages({
            'any.only': `优先级必须是以下值之一：${Object.values(IssuePriority).join('、')}`,
        }),
    status: Joi.string()
        .valid(...Object.values(IssueStatus))
        .optional()
        .messages({
            'any.only': `状态必须是以下值之一：${Object.values(IssueStatus).join('、')}`,
        }),
    assigneeId: Joi.string()
        .uuid()
        .optional()
        .messages({
            'string.guid': '分配人ID必须是有效的UUID格式',
        }),
    keyword: Joi.string()
        .trim()
        .max(100)
        .optional()
        .messages({
            'string.max': '搜索关键词不能超过100个字符',
        }),
    sortBy: Joi.string()
        .valid('createdAt', 'updatedAt', 'priority', 'dueDate')
        .default('createdAt')
        .messages({
            'any.only': '排序字段必须是以下值之一：createdAt、updatedAt、priority、dueDate',
        }),
    sortOrder: Joi.string()
        .valid('ASC', 'DESC')
        .default('DESC')
        .messages({
            'any.only': '排序方向必须是ASC或DESC',
        }),
});

// 删除问题验证规则
export const deleteIssueSchema = Joi.object({
    id: Joi.string()
        .required()
        .messages({
            'string.empty': '问题ID不能为空',
            'any.required': '问题ID是必填项',
        }),
});

// 导出验证中间件
export const validateCreateIssue = validateRequest({ body: createIssueSchema });
export const validateUpdateIssue = validateRequest({ 
    params: getIssueByIdSchema, 
    body: updateIssueSchema 
});
export const validateVoteIssue = validateRequest({ 
    params: getIssueByIdSchema, 
    body: voteIssueSchema 
});
export const validateGetIssueById = validateRequest({ params: getIssueByIdSchema });
export const validateGetIssues = validateRequest({ query: getIssuesSchema });
export const validateDeleteIssue = validateRequest({ params: deleteIssueSchema });

// 导出验证器对象
export const issueValidators = {
    createIssue: validateCreateIssue,
    updateIssue: validateUpdateIssue,
    voteIssue: validateVoteIssue,
    getIssueById: validateGetIssueById,
    getIssues: validateGetIssues,
    deleteIssue: validateDeleteIssue,
};
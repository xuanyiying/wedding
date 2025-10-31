import Joi from 'joi';
import { validateRequest } from '@/middlewares';
import { WorkType, WorkCategory, WorkStatus } from '@/types';

/**
 * 获取作品列表验证模式
 */
export const getWorksSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .label('页码')
        .messages({
            'number.base': '页码必须是数字',
            'number.integer': '页码必须是整数',
            'number.min': '页码必须大于0'
        }),
    
    pageSize: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
        .label('每页数量')
        .messages({
            'number.base': '每页数量必须是数字',
            'number.integer': '每页数量必须是整数',
            'number.min': '每页数量必须大于0',
            'number.max': '每页数量不能超过100'
        }),
    
    userId: Joi.string()
        .label('用户ID')
        .messages({
            'string.base': '用户ID必须是字符串'
        }),
    
    type: Joi.string()
        .valid(...Object.values(WorkType))
        .label('作品类型')
        .messages({
            'any.only': `作品类型必须是以下值之一：${Object.values(WorkType).join('、')}`
        }),
    
    category: Joi.string()
        .valid(...Object.values(WorkCategory))
        .label('作品分类')
        .messages({
            'any.only': `作品分类必须是以下值之一：${Object.values(WorkCategory).join('、')}`
        }),
    
    status: Joi.string()
        .valid(...Object.values(WorkStatus))
        .label('作品状态')
        .messages({
            'any.only': `作品状态必须是以下值之一：${Object.values(WorkStatus).join('、')}`
        }),
    
    isFeatured: Joi.boolean()
        .label('精选状态')
        .messages({
            'boolean.base': '精选状态必须是布尔值'
        }),
    
    keyword: Joi.string()
        .trim()
        .max(100)
        .label('关键词')
        .messages({
            'string.base': '关键词必须是字符串',
            'string.max': '关键词不能超过100个字符'
        }),
    
    tags: Joi.array()
        .items(Joi.string().trim().max(50))
        .max(10)
        .label('标签')
        .messages({
            'array.base': '标签必须是数组格式',
            'array.max': '标签数量不能超过10个',
            'string.max': '每个标签不能超过50个字符'
        }),
    
    sortBy: Joi.string()
        .valid('createdAt', 'viewCount', 'likeCount', 'shareCount')
        .default('createdAt')
        .label('排序字段')
        .messages({
            'any.only': '排序字段必须是以下值之一：createdAt、viewCount、likeCount、shareCount'
        }),
    
    sortOrder: Joi.string()
        .valid('ASC', 'DESC')
        .default('DESC')
        .label('排序方向')
        .messages({
            'any.only': '排序方向必须是ASC或DESC'
        })
});

/**
 * 作品ID参数验证模式
 */
export const workIdSchema = Joi.object({
    id: Joi.string()
        .required()
        .label('作品ID')
        .messages({
            'string.base': '作品ID必须是字符串',
            'string.empty': '作品ID不能为空',
            'any.required': '作品ID是必填项'
        })
});

/**
 * 创建作品验证模式
 */
export const createWorkSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(1)
        .max(200)
        .required()
        .label('作品标题')
        .messages({
            'string.base': '作品标题必须是字符串',
            'string.empty': '作品标题不能为空',
            'string.min': '作品标题至少需要1个字符',
            'string.max': '作品标题不能超过200个字符',
            'any.required': '作品标题是必填项'
        }),
    
    description: Joi.string()
        .trim()
        .max(2000)
        .allow('')
        .label('作品描述')
        .messages({
            'string.base': '作品描述必须是字符串',
            'string.max': '作品描述不能超过2000个字符'
        }),
    
    type: Joi.string()
        .valid(...Object.values(WorkType))
        .required()
        .label('作品类型')
        .messages({
            'string.base': '作品类型必须是字符串',
            'any.only': `作品类型必须是以下值之一：${Object.values(WorkType).join('、')}`,
            'any.required': '作品类型是必填项'
        }),
    
    category: Joi.string()
        .valid(...Object.values(WorkCategory))
        .required()
        .label('作品分类')
        .messages({
            'string.base': '作品分类必须是字符串',
            'any.only': `作品分类必须是以下值之一：${Object.values(WorkCategory).join('、')}`,
            'any.required': '作品分类是必填项'
        }),
    
    coverUrl: Joi.string()
        .uri()
        .when('type', {
            is: WorkType.VIDEO,
            then: Joi.required().messages({
                'any.required': '视频作品必须上传封面图片'
            }),
            otherwise: Joi.optional()
        })
        .label('封面URL')
        .messages({
            'string.base': '封面URL必须是字符串',
            'string.uri': '封面URL必须是有效的网址格式'
        }),
    
    contentUrls: Joi.array()
        .items(Joi.string().uri())
        .min(1)
        .max(20)
        .label('内容URL列表')
        .messages({
            'array.base': '内容URL列表必须是数组格式',
            'array.min': '至少需要1个内容URL',
            'array.max': '内容URL数量不能超过20个',
            'string.uri': '内容URL必须是有效的网址格式'
        }),
    
    tags: Joi.array()
        .items(Joi.string().trim().max(50))
        .max(10)
        .default([])
        .label('标签')
        .messages({
            'array.base': '标签必须是数组格式',
            'array.max': '标签数量不能超过10个',
            'string.max': '每个标签不能超过50个字符'
        }),
    
    location: Joi.string()
        .trim()
        .max(200)
        .allow('')
        .label('拍摄地点')
        .messages({
            'string.base': '拍摄地点必须是字符串',
            'string.max': '拍摄地点不能超过200个字符'
        }),
    
    shootDate: Joi.date()
        .iso()
        .max('now')
        .label('拍摄日期')
        .messages({
            'date.base': '拍摄日期必须是有效的日期格式',
            'date.format': '拍摄日期必须是ISO格式',
            'date.max': '拍摄日期不能晚于当前时间'
        }),
    
    equipmentInfo: Joi.string()
        .trim()
        .max(1000)
        .allow('')
        .label('设备信息')
        .messages({
            'string.base': '设备信息必须是字符串',
            'string.max': '设备信息不能超过1000个字符'
        }),
    
    technicalInfo: Joi.object()
        .default({})
        .label('技术信息')
        .messages({
            'object.base': '技术信息必须是对象格式'
        })
});

/**
 * 更新作品验证模式
 */
export const updateWorkSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(1)
        .max(200)
        .label('作品标题')
        .messages({
            'string.base': '作品标题必须是字符串',
            'string.empty': '作品标题不能为空',
            'string.min': '作品标题至少需要1个字符',
            'string.max': '作品标题不能超过200个字符'
        }),
    
    description: Joi.string()
        .trim()
        .max(2000)
        .allow('')
        .label('作品描述')
        .messages({
            'string.base': '作品描述必须是字符串',
            'string.max': '作品描述不能超过2000个字符'
        }),
    
    type: Joi.string()
        .valid(...Object.values(WorkType))
        .label('作品类型')
        .messages({
            'string.base': '作品类型必须是字符串',
            'any.only': `作品类型必须是以下值之一：${Object.values(WorkType).join('、')}`
        }),
    
    category: Joi.string()
        .valid(...Object.values(WorkCategory))
        .label('作品分类')
        .messages({
            'string.base': '作品分类必须是字符串',
            'any.only': `作品分类必须是以下值之一：${Object.values(WorkCategory).join('、')}`
        }),
    
    coverUrl: Joi.string()
        .uri()
        .when('type', {
            is: WorkType.VIDEO,
            then: Joi.required().messages({
                'any.required': '视频作品必须上传封面图片'
            }),
            otherwise: Joi.optional()
        })
        .label('封面URL')
        .messages({
            'string.base': '封面URL必须是字符串',
            'string.uri': '封面URL必须是有效的网址格式'
        }),
    
    contentUrls: Joi.array()
        .items(Joi.string().uri())
        .min(1)
        .max(20)
        .label('内容URL列表')
        .messages({
            'array.base': '内容URL列表必须是数组格式',
            'array.min': '至少需要1个内容URL',
            'array.max': '内容URL数量不能超过20个',
            'string.uri': '内容URL必须是有效的网址格式'
        }),
    
    tags: Joi.array()
        .items(Joi.string().trim().max(50))
        .max(10)
        .label('标签')
        .messages({
            'array.base': '标签必须是数组格式',
            'array.max': '标签数量不能超过10个',
            'string.max': '每个标签不能超过50个字符'
        }),
    
    location: Joi.string()
        .trim()
        .max(200)
        .allow('')
        .label('拍摄地点')
        .messages({
            'string.base': '拍摄地点必须是字符串',
            'string.max': '拍摄地点不能超过200个字符'
        }),
    
    shootDate: Joi.date()
        .iso()
        .max('now')
        .label('拍摄日期')
        .messages({
            'date.base': '拍摄日期必须是有效的日期格式',
            'date.format': '拍摄日期必须是ISO格式',
            'date.max': '拍摄日期不能晚于当前时间'
        }),
    
    equipmentInfo: Joi.string()
        .trim()
        .max(1000)
        .allow('')
        .label('设备信息')
        .messages({
            'string.base': '设备信息必须是字符串',
            'string.max': '设备信息不能超过1000个字符'
        }),
    
    technicalInfo: Joi.object()
        .label('技术信息')
        .messages({
            'object.base': '技术信息必须是对象格式'
        }),
    
    status: Joi.string()
        .valid(...Object.values(WorkStatus))
        .label('作品状态')
        .messages({
            'string.base': '作品状态必须是字符串',
            'any.only': `作品状态必须是以下值之一：${Object.values(WorkStatus).join('、')}`
        }),
    
    isFeatured: Joi.boolean()
        .label('是否精选')
        .messages({
            'boolean.base': '是否精选必须是布尔值'
        }),
    
    isPublic: Joi.boolean()
        .label('是否公开')
        .messages({
            'boolean.base': '是否公开必须是布尔值'
        })
}).min(1).messages({
    'object.min': '至少需要更新一个字段'
});

/**
 * 设置作品精选状态验证模式
 */
export const setWorkFeaturedSchema = Joi.object({
    isFeatured: Joi.boolean()
        .required()
        .label('是否精选')
        .messages({
            'boolean.base': '是否精选必须是布尔值',
            'any.required': '是否精选是必填项'
        })
});

/**
 * 获取精选作品验证模式
 */
export const getFeaturedWorksSchema = Joi.object({
    limit: Joi.number()
        .integer()
        .min(1)
        .max(50)
        .default(10)
        .label('限制数量')
        .messages({
            'number.base': '限制数量必须是数字',
            'number.integer': '限制数量必须是整数',
            'number.min': '限制数量必须大于0',
            'number.max': '限制数量不能超过50'
        })
});

/**
 * 获取公开作品列表验证模式
 */
export const getPublicWorksSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .label('页码')
        .messages({
            'number.base': '页码必须是数字',
            'number.integer': '页码必须是整数',
            'number.min': '页码必须大于0'
        }),
    
    pageSize: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
        .label('每页数量')
        .messages({
            'number.base': '每页数量必须是数字',
            'number.integer': '每页数量必须是整数',
            'number.min': '每页数量必须大于0',
            'number.max': '每页数量不能超过100'
        }),
    
    type: Joi.string()
        .valid(...Object.values(WorkType))
        .label('作品类型')
        .messages({
            'any.only': `作品类型必须是以下值之一：${Object.values(WorkType).join('、')}`
        }),
    
    category: Joi.string()
        .valid(...Object.values(WorkCategory))
        .label('作品分类')
        .messages({
            'any.only': `作品分类必须是以下值之一：${Object.values(WorkCategory).join('、')}`
        }),
    
    isFeatured: Joi.boolean()
        .label('精选状态')
        .messages({
            'boolean.base': '精选状态必须是布尔值'
        }),
    
    keyword: Joi.string()
        .trim()
        .max(100)
        .label('关键词')
        .messages({
            'string.base': '关键词必须是字符串',
            'string.max': '关键词不能超过100个字符'
        }),
    
    tags: Joi.array()
        .items(Joi.string().trim().max(50))
        .max(10)
        .label('标签')
        .messages({
            'array.base': '标签必须是数组格式',
            'array.max': '标签数量不能超过10个',
            'string.max': '每个标签不能超过50个字符'
        }),
    
    sortBy: Joi.string()
        .valid('createdAt', 'viewCount', 'likeCount', 'shareCount')
        .default('createdAt')
        .label('排序字段')
        .messages({
            'any.only': '排序字段必须是以下值之一：createdAt、viewCount、likeCount、shareCount'
        }),
    
    sortOrder: Joi.string()
        .valid('ASC', 'DESC')
        .default('DESC')
        .label('排序方向')
        .messages({
            'any.only': '排序方向必须是ASC或DESC'
        })
});

/**
 * 获取热门作品验证模式
 */
export const getPopularWorksSchema = Joi.object({
    limit: Joi.number()
        .integer()
        .min(1)
        .max(50)
        .default(10)
        .label('限制数量')
        .messages({
            'number.base': '限制数量必须是数字',
            'number.integer': '限制数量必须是整数',
            'number.min': '限制数量必须大于0',
            'number.max': '限制数量不能超过50'
        }),
    
    days: Joi.number()
        .integer()
        .min(1)
        .max(30)
        .default(7)
        .label('天数')
        .messages({
            'number.base': '天数必须是数字',
            'number.integer': '天数必须是整数',
            'number.min': '天数必须大于0',
            'number.max': '天数不能超过30'
        })
});

/**
 * 获取相关作品验证模式
 */
export const getRelatedWorksSchema = Joi.object({
    limit: Joi.number()
        .integer()
        .min(1)
        .max(20)
        .default(6)
        .label('限制数量')
        .messages({
            'number.base': '限制数量必须是数字',
            'number.integer': '限制数量必须是整数',
            'number.min': '限制数量必须大于0',
            'number.max': '限制数量不能超过20'
        })
});

/**
 * 获取作品列表验证中间件
 */
export const validateGetWorks = validateRequest({
    query: getWorksSchema
});

/**
 * 获取作品详情验证中间件
 */
export const validateGetWork = validateRequest({
    params: workIdSchema
});

/**
 * 创建作品验证中间件
 */
export const validateCreateWork = validateRequest({
    body: createWorkSchema
});

/**
 * 更新作品验证中间件
 */
export const validateUpdateWork = validateRequest({
    params: workIdSchema,
    body: updateWorkSchema
});

/**
 * 删除作品验证中间件
 */
export const validateDeleteWork = validateRequest({
    params: workIdSchema
});

/**
 * 发布作品验证中间件
 */
export const validatePublishWork = validateRequest({
    params: workIdSchema
});

/**
 * 取消发布作品验证中间件
 */
export const validateUnpublishWork = validateRequest({
    params: workIdSchema
});

/**
 * 点赞作品验证中间件
 */
export const validateLikeWork = validateRequest({
    params: workIdSchema
});

/**
 * 取消点赞作品验证中间件
 */
export const validateUnlikeWork = validateRequest({
    params: workIdSchema
});

/**
 * 增加作品浏览量验证中间件
 */
export const validateIncrementViewCount = validateRequest({
    params: workIdSchema
});

/**
 * 获取精选作品验证中间件
 */
export const validateGetFeaturedWorks = validateRequest({
    query: getFeaturedWorksSchema
});

/**
 * 设置作品为精选验证中间件
 */
export const validateSetWorkFeatured = validateRequest({
    params: workIdSchema,
    body: setWorkFeaturedSchema
});

/**
 * 获取公开作品列表验证中间件
 */
export const validateGetPublicWorks = validateRequest({
    query: getPublicWorksSchema
});

/**
 * 获取热门作品验证中间件
 */
export const validateGetPopularWorks = validateRequest({
    query: getPopularWorksSchema
});

/**
 * 获取相关作品验证中间件
 */
export const validateGetRelatedWorks = validateRequest({
    params: workIdSchema,
    query: getRelatedWorksSchema
});

// 导出验证器对象
export const workValidators = {
    getWorks: validateGetWorks,
    getWork: validateGetWork,
    createWork: validateCreateWork,
    updateWork: validateUpdateWork,
    deleteWork: validateDeleteWork,
    publishWork: validatePublishWork,
    unpublishWork: validateUnpublishWork,
    likeWork: validateLikeWork,
    unlikeWork: validateUnlikeWork,
    incrementViewCount: validateIncrementViewCount,
    getFeaturedWorks: validateGetFeaturedWorks,
    setWorkFeatured: validateSetWorkFeatured,
    getPublicWorks: validateGetPublicWorks,
    getPopularWorks: validateGetPopularWorks,
    getRelatedWorks: validateGetRelatedWorks
};
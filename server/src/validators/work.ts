import { WorkType, WorkCategory, WorkStatus } from '../types';
import Joi from 'joi';

export const workValidators = {
  // 获取作品列表
  getWorks: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
      userId: Joi.string().optional(),
      type: Joi.string()
        .valid(...Object.values(WorkType))
        .optional(),
      category: Joi.string()
        .valid(...Object.values(WorkCategory))
        .optional(),
      status: Joi.string()
        .valid(...Object.values(WorkStatus))
        .optional(),
      isFeatured: Joi.boolean().optional(),
      keyword: Joi.string().trim().max(100).optional(),
      tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
      sortBy: Joi.string().valid('createdAt', 'viewCount', 'likeCount', 'shareCount').default('createdAt'),
      sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
    }),
  },

  // 获取作品详情
  getWorkById: {
    params: Joi.object({
      id: Joi.string().required(),
    }),
  },

  // 创建作品
  createWork: {
    body: Joi.object({
      title: Joi.string().trim().min(1).max(200).required(),
      description: Joi.string().trim().max(2000).optional(),
      type: Joi.string()
        .valid(...Object.values(WorkType))
        .required(),
      coverUrl: Joi.string()
        .uri()
        .when('type', {
          is: WorkType.VIDEO,
          then: Joi.required().messages({
            'any.required': '视频作品必须上传封面图片',
          }),
          otherwise: Joi.optional(),
        }),
      contentUrls: Joi.array().items(Joi.string().uri()).min(1).max(20).optional(),
      tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
      location: Joi.string().trim().max(200).optional(),
      shootDate: Joi.date().iso().max('now').optional(),
      equipmentInfo: Joi.string().trim().max(1000).optional(),
      technicalInfo: Joi.object().optional(),
    }),
  },

  // 更新作品
  updateWork: {
    params: Joi.object({
      id: Joi.string().required(),
    }),
    body: Joi.object({
      title: Joi.string().trim().min(1).max(200).optional(),
      description: Joi.string().trim().max(2000).optional(),
      type: Joi.string()
        .valid(...Object.values(WorkType))
        .optional(),
      category: Joi.string()
        .valid(...Object.values(WorkCategory))
        .optional(),
      coverUrl: Joi.string()
        .uri()
        .when('type', {
          is: WorkType.VIDEO,
          then: Joi.required().messages({
            'any.required': '视频作品必须上传封面图片',
          }),
          otherwise: Joi.optional(),
        }),
      contentUrls: Joi.array().items(Joi.string().uri()).min(1).max(20).optional(),
      tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
      location: Joi.string().trim().max(200).optional(),
      shootDate: Joi.date().iso().max('now').optional(),
      equipmentInfo: Joi.string().trim().max(1000).optional(),
      technicalInfo: Joi.object().optional(),
      status: Joi.string()
        .valid(...Object.values(WorkStatus))
        .optional(),
      isFeatured: Joi.boolean().optional(),
      isPublic: Joi.boolean().optional(),
    }).min(1),
  },

  // 删除作品
  deleteWork: {
    params: Joi.object({
      id: Joi.string().required(),
    }),
  },

  // 发布作品
  publishWork: {
    params: Joi.object({
      id: Joi.string().required(),
    }),
  },

  // 取消发布作品
  unpublishWork: {
    params: Joi.object({
      id: Joi.string().required(),
    }),
  },

  // 点赞作品
  likeWork: {
    params: Joi.object({
      id: Joi.string().required(),
    }),
  },

  // 取消点赞作品
  unlikeWork: {
    params: Joi.object({
      id: Joi.string().required(),
    }),
  },

  // 增加作品浏览量
  incrementViewCount: {
    params: Joi.object({
      id: Joi.string().required(),
    }),
  },

  // 获取精选作品
  getFeaturedWorks: {
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10),
    }),
  },

  // 设置作品为精选
  setWorkFeatured: {
    params: Joi.object({
      id: Joi.string().required(),
    }),
    body: Joi.object({
      isFeatured: Joi.boolean().required(),
    }),
  },

  // 获取公开作品列表
  getPublicWorks: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
      type: Joi.string()
        .valid(...Object.values(WorkType))
        .optional(),
      category: Joi.string()
        .valid(...Object.values(WorkCategory))
        .optional(),
      isFeatured: Joi.boolean().optional(),
      keyword: Joi.string().trim().max(100).optional(),
      tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
      sortBy: Joi.string().valid('createdAt', 'viewCount', 'likeCount', 'shareCount').default('createdAt'),
      sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
    }),
  },

  // 获取热门作品
  getPopularWorks: {
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10),
      days: Joi.number().integer().min(1).max(30).default(7),
    }),
  },

  // 获取相关作品
  getRelatedWorks: {
    params: Joi.object({
      id: Joi.string().required(),
    }),
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(20).default(6),
    }),
  },
};

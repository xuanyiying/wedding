import Joi from 'joi';
import { FileType } from '../types';

export const fileValidators = {
  // 单文件上传
  uploadFile: {
    body: Joi.object({
      fileType: Joi.string()
        .valid(...Object.values(FileType))
        .required(),
      category: Joi.string().valid('avatar', 'cover', 'event', 'work', 'profile', 'other').optional(),
      description: Joi.string().trim().max(500).optional(),
    }),
  },

  // 批量文件上传
  uploadFiles: {
    body: Joi.object({
      fileType: Joi.string()
        .valid(...Object.values(FileType))
        .required(),
      category: Joi.string().valid('avatar', 'cover', 'event', 'work', 'profile', 'other').optional(),
      description: Joi.string().trim().max(500).optional(),
    }),
  },

  // 获取文件列表
  getFiles: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
      userId: Joi.string().uuid().optional(),
      fileType: Joi.string()
        .valid(...Object.values(FileType))
        .optional(),
      category: Joi.string().valid('avatar', 'cover', 'event', 'work', 'profile', 'other').optional(),
      // status字段已移除，因为File模型中没有status字段
      keyword: Joi.string().trim().max(100).optional(),
      sortBy: Joi.string().valid('createdAt', 'size', 'filename').default('createdAt'),
      sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
    }),
  },

  // 获取文件详情
  getFileById: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  },

  // 删除文件
  deleteFile: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  },

  // 批量删除文件
  deleteFiles: {
    body: Joi.object({
      ids: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
    }),
  },

  // 获取上传令牌
  getUploadToken: {
    body: Joi.object({
      fileType: Joi.string()
        .valid(...Object.values(FileType))
        .required(),
    }),
  },

  // 更新文件信息
  updateFile: {
    params: Joi.object({
      id: Joi.string().required(),
    }),
    body: Joi.object({
      description: Joi.string().trim().max(500).optional(),
    }).min(1),
  },

  // 下载文件
  downloadFile: {
    params: Joi.object({
      id: Joi.string().required(),
    }),
  },

  // 生成缩略图
  generateThumbnail: {
    params: Joi.object({
      id: Joi.string().required(),
    }),
    body: Joi.object({
      width: Joi.number().integer().min(50).max(1000).default(200),
      height: Joi.number().integer().min(50).max(1000).default(200),
    }),
  },
};

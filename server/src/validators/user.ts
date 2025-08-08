import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { Resp } from '../utils/response';
import { UserRole, UserStatus, Gender } from '../types';

// 创建用户验证
export const createUserSchema = Joi.object({
  username: Joi.string().alphanum().min(2).max(20).required().messages({
    'string.alphanum': '用户名只能包含字母和数字',
    'string.min': '用户名长度至少为2位',
    'string.max': '用户名长度不能超过20位',
    'any.required': '用户名不能为空',
  }),
  email: Joi.string().email().required().messages({
    'string.email': '请输入有效的邮箱地址',
    'any.required': '邮箱不能为空',
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': '密码长度至少为6位',
    'string.max': '密码长度不能超过128位',
    'any.required': '密码不能为空',
  }),
  realName: Joi.string().max(50).optional().messages({
    'string.max': '真实姓名长度不能超过50位',
  }),
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': '请输入有效的手机号码',
      'any.required': '手机号不能为空',
    }),
  gender: Joi.string()
    .valid(...Object.values(Gender))
    .optional()
    .messages({
      'any.only': '性别值无效',
    }),
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .optional()
    .messages({
      'any.only': '用户角色无效',
    }),
  bio: Joi.string().max(500).optional().allow(''),  
  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .optional()
    .messages({
      'any.only': '用户状态无效',
    }),
});

// 更新用户验证
export const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional().messages({
    'string.alphanum': '用户名只能包含字母和数字',
    'string.min': '用户名长度至少为3位',
    'string.max': '用户名长度不能超过30位',
  }),
  email: Joi.string().email().optional().messages({
    'string.email': '请输入有效的邮箱地址',
  }),
  realName: Joi.string().max(50).optional().messages({
    'string.max': '真实姓名长度不能超过50位',
  }),
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': '请输入有效的手机号码',
    }),
  avatarUrl: Joi.string().uri().optional().allow('').messages({
    'string.uri': '头像必须是有效的URL',
  }),
  bio: Joi.string().max(500).optional().allow('').messages({
    'string.max': '个人简介长度不能超过500字',
  }),
  gender: Joi.string()
    .valid(...Object.values(Gender))
    .optional()
    .messages({
      'any.only': '性别值无效',
    }),
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .optional()
    .messages({
      'any.only': '用户角色无效',
    }),
  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .optional()
    .messages({
      'any.only': '用户状态无效',
    }),
});

// 用户查询验证
export const getUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().messages({
    'number.integer': '页码必须是整数',
    'number.min': '页码必须大于0',
  }),
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    'number.integer': '每页数量必须是整数',
    'number.min': '每页数量必须大于0',
    'number.max': '每页数量不能超过100',
  }),
  search: Joi.string().max(100).optional().messages({
    'string.max': '搜索关键词长度不能超过100字符',
  }),
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .optional()
    .messages({
      'any.only': '用户角色无效',
    }),
  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .optional()
    .messages({
      'any.only': '用户状态无效',
    }),
  _t: Joi.number().optional(), // 允许时间戳参数，用于防止缓存
});

// 重置密码验证
export const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).max(128).required().messages({
    'string.min': '新密码长度至少为6位',
    'string.max': '新密码长度不能超过128位',
    'any.required': '新密码不能为空',
  }),
});

// 更新用户状态验证
export const updateUserStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .required()
    .messages({
      'any.only': '用户状态无效',
      'any.required': '用户状态不能为空',
    }),
});

// 批量删除用户验证
export const batchDeleteUsersSchema = Joi.object({
  ids: Joi.array().items(Joi.string().uuid()).min(1).max(100).required().messages({
    'array.min': '至少选择一个用户',
    'array.max': '一次最多删除100个用户',
    'any.required': '用户ID列表不能为空',
  }),
});

// 验证中间件工厂函数
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      Resp.badRequest(res, errorMessages.join('; '));
      return;
    }

    next();
  };
};

// 验证查询参数中间件工厂函数
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      Resp.badRequest(res, errorMessages.join('; '));
      return;
    }

    next();
  };
};

// 导出验证中间件
export const validateCreateUser = validateRequest(createUserSchema);
export const validateUpdateUser = validateRequest(updateUserSchema);
export const validateGetUsers = validateQuery(getUsersQuerySchema);
export const validateResetPassword = validateRequest(resetPasswordSchema);
export const validateUpdateUserStatus = validateRequest(updateUserStatusSchema);
export const validateBatchDeleteUsers = validateRequest(batchDeleteUsersSchema);

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { Resp } from '../utils/response';

// 登录验证规则
export const loginSchema = Joi.object({
  identifier: Joi.string().min(3).max(100).required().messages({
    'string.empty': '请提供用户名或邮箱',
    'string.min': '用户名或邮箱至少3个字符',
    'string.max': '用户名或邮箱不能超过100个字符',
    'any.required': '请提供用户名或邮箱',
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.empty': '密码不能为空',
    'string.min': '密码至少6个字符',
    'string.max': '密码不能超过128个字符',
    'any.required': '密码是必填项',
  }),
});

// 注册验证规则
export const registerSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.empty': '用户名不能为空',
      'string.min': '用户名至少3个字符',
      'string.max': '用户名不能超过30个字符',
      'string.pattern.base': '用户名只能包含字母、数字和下划线',
      'any.required': '用户名是必填项',
    }),
  email: Joi.string().email().max(100).required().messages({
    'string.empty': '邮箱不能为空',
    'string.email': '请输入有效的邮箱地址',
    'string.max': '邮箱不能超过100个字符',
    'any.required': '邮箱是必填项',
  }),
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .optional()
    .messages({
      'string.pattern.base': '请输入有效的手机号码',
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/)
    .required()
    .messages({
      'string.empty': '密码不能为空',
      'string.min': '密码至少6个字符',
      'string.max': '密码不能超过128个字符',
      'string.pattern.base': '密码必须包含至少一个大写字母、一个小写字母和一个数字',
      'any.required': '密码是必填项',
    }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': '确认密码与密码不匹配',
    'any.required': '确认密码是必填项',
  }),
  realName: Joi.string().min(2).max(20).optional().messages({
    'string.min': '真实姓名至少2个字符',
    'string.max': '真实姓名不能超过20个字符',
  }),
  nickname: Joi.string().min(2).max(30).optional().messages({
    'string.min': '昵称至少2个字符',
    'string.max': '昵称不能超过30个字符',
  }),
});

// 刷新令牌验证规则
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'string.empty': '刷新令牌不能为空',
    'any.required': '刷新令牌是必填项',
  }),
});

// 修改密码验证规则
export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    'string.empty': '原密码不能为空',
    'any.required': '原密码是必填项',
  }),
  newPassword: Joi.string()
    .min(6)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/)
    .required()
    .messages({
      'string.empty': '新密码不能为空',
      'string.min': '新密码至少6个字符',
      'string.max': '新密码不能超过128个字符',
      'string.pattern.base': '新密码必须包含至少一个大写字母、一个小写字母和一个数字',
      'any.required': '新密码是必填项',
    }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': '确认密码与新密码不匹配',
    'any.required': '确认密码是必填项',
  }),
});

// 更新个人信息验证规则
export const updateProfileSchema = Joi.object({
  realName: Joi.string().min(2).max(20).optional().messages({
    'string.min': '真实姓名至少2个字符',
    'string.max': '真实姓名不能超过20个字符',
  }),
  nickname: Joi.string().min(2).max(30).optional().messages({
    'string.min': '昵称至少2个字符',
    'string.max': '昵称不能超过30个字符',
  }),
  bio: Joi.string().max(500).optional().messages({
    'string.max': '个人简介不能超过500个字符',
  }),
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .optional()
    .messages({
      'string.pattern.base': '请输入有效的手机号码',
    }),
  specialties: Joi.array().items(Joi.string().max(50)).max(10).optional().messages({
    'array.max': '专长不能超过10个',
    'string.max': '每个专长不能超过50个字符',
  }),
  experienceYears: Joi.number().integer().min(0).max(50).optional().messages({
    'number.integer': '经验年数必须是整数',
    'number.min': '经验年数不能小于0',
    'number.max': '经验年数不能超过50',
  }),
  location: Joi.string().max(100).optional().messages({
    'string.max': '所在地不能超过100个字符',
  }),
  contactInfo: Joi.object({
    wechat: Joi.string().max(50).optional(),
    qq: Joi.string().max(20).optional(),
    phone: Joi.string()
      .pattern(/^1[3-9]\d{9}$/)
      .optional(),
  }).optional(),
  avatarUrl: Joi.string().uri().optional(),
  socialLinks: Joi.object({
    weibo: Joi.string().uri().optional(),
    douyin: Joi.string().max(100).optional(),
    xiaohongshu: Joi.string().max(100).optional(),
  }).optional(),
});

// 验证中间件工厂函数
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      Resp.unprocessableEntity(res, errorMessages.join('; '));
      return;
    }

    next();
  };
};

// 导出验证中间件
export const validateLogin = validateRequest(loginSchema);
export const validateRegister = validateRequest(registerSchema);
export const validateRefreshToken = validateRequest(refreshTokenSchema);
export const validateChangePassword = validateRequest(changePasswordSchema);
export const validateUpdateProfile = validateRequest(updateProfileSchema);

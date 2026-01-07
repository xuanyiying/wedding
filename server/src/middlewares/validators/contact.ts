import Joi from 'joi';
import { validateRequest } from '../validation';

// 提交联系表单验证
const submitContactSchema = Joi.object({
  name: Joi.string()
    .required()
    .messages({
      'any.required': '姓名不能为空',
      'string.empty': '姓名不能为空',
    }),
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .required()
    .messages({
      'any.required': '手机号码不能为空',
      'string.pattern.base': '请输入正确的手机号码',
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'any.required': '邮箱地址不能为空',
      'string.email': '请输入正确的邮箱地址',
    }),
  date: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': '婚礼日期不能为空',
      'date.format': '请输入正确的日期格式',
    }),
  timeSlot: Joi.string()
    .required()
    .messages({
      'any.required': '婚礼时间不能为空',
      'string.empty': '婚礼时间不能为空',
    }),
  location: Joi.string()
    .optional()
    .allow('')
    .messages({
      'any.required': '婚礼地点不能为空',
      'string.empty': '婚礼地点不能为空',
    }),
  guestCount: Joi.number()
    .integer()
    .min(1)
    .optional()
    .allow(null)
    .messages({
      'any.required': '宾客人数不能为空',
      'number.min': '宾客人数必须大于0',
      'number.integer': '宾客人数必须是整数',
    }),
  serviceType: Joi.string()
    .valid('wedding', 'engagement', 'anniversary', 'other')
    .optional()
    .default('wedding')
    .allow('')
    .messages({
      'any.required': '服务类型不能为空',
      'any.only': '请选择正确的服务类型',
    }),
  budget: Joi.string()
    .valid('5000-10000', '10000-20000', '20000-50000', '50000+')
    .optional()
    .default('5000-10000')
    .allow('')
    .messages({
      'any.required': '预算范围不能为空',
      'any.only': '请选择正确的预算范围',
    }),
  requirements: Joi.string()
    .optional()
    .allow('')
    .messages({
      'string.base': '特殊要求必须是字符串',
    }),
});

// 获取联系表单列表验证
const getContactsSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.min': '页码必须大于0',
      'number.integer': '页码必须是整数',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.min': '每页数量必须大于0',
      'number.max': '每页数量不能超过100',
      'number.integer': '每页数量必须是整数',
    }),
  status: Joi.string()
    .valid('pending', 'contacted', 'completed', 'cancelled')
    .optional()
    .default('pending')
    .allow('')
    .messages({
      'any.only': '状态值不正确',
    }),
  startDate: Joi.date()
    .iso()
    .optional()
    .allow(null)
    .messages({
      'date.format': '开始日期格式不正确',
    }),
  endDate: Joi.date()
    .iso()
    .optional()
    .allow(null)
    .messages({
      'date.format': '结束日期格式不正确',
    }),
});

// 获取单个联系表单验证
const getContactByIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'any.required': '联系表单ID不能为空',
      'string.guid': '联系表单ID格式不正确',
    }),
});

// 更新联系表单状态验证
const updateContactStatusSchema = Joi.object({
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'any.required': '联系表单ID不能为空',
        'string.guid': '联系表单ID格式不正确',
      }),
  }),
  body: Joi.object({
    status: Joi.string()
      .valid('pending', 'contacted', 'completed', 'cancelled')
      .required()
      .messages({
        'any.required': '状态不能为空',
        'any.only': '状态值不正确',
      }),
    notes: Joi.string()
      .optional()
      .allow('')
      .messages({
        'string.base': '备注必须是字符串',
      }),
  }),
});

// 删除联系表单验证
const deleteContactSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'any.required': '联系表单ID不能为空',
      'string.guid': '联系表单ID格式不正确',
    }),
});

// 批量删除联系表单验证
const batchDeleteContactsSchema = Joi.object({
  ids: Joi.array()
    .items(
      Joi.string()
        .uuid()
        .messages({
          'string.guid': '联系表单ID格式不正确',
        })
    )
    .min(1)
    .required()
    .messages({
      'any.required': '请选择要删除的联系表单',
      'array.min': '请选择要删除的联系表单',
    }),
});

// 获取联系表单统计验证
const getContactStatsSchema = Joi.object({
  startDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': '开始日期格式不正确',
    }),
  endDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': '结束日期格式不正确',
    }),
});

// 导出验证中间件
export const contactValidators = {
  submitContact: validateRequest({ body: submitContactSchema }),
  getContacts: validateRequest({ query: getContactsSchema }),
  getContactById: validateRequest({ params: getContactByIdSchema }),
  updateContactStatus: validateRequest(updateContactStatusSchema),
  deleteContact: validateRequest({ params: deleteContactSchema }),
  batchDeleteContacts: validateRequest({ body: batchDeleteContactsSchema }),
  getContactStats: validateRequest({ query: getContactStatsSchema }),
};
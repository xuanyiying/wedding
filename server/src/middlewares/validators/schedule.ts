import Joi from 'joi';
import { validateRequest } from '@/middlewares';
import { TimeSlot, ScheduleStatus } from '@/types';

/**
 * 自定义验证函数：检查定金不能超过总价
 * @param value 定金值
 * @param helpers Joi验证辅助对象
 * @returns 验证结果
 */
const validateDeposit = (value: number, helpers: any) => {
    const price = helpers.state.ancestors[0].price;
    if (price && value > price) {
        return helpers.error('custom.depositExceedsPrice');
    }
    return value;
};

/**
 * 自定义验证函数：检查婚礼日期不能早于当前日期
 * @param value 日期值
 * @param helpers Joi验证辅助对象
 * @returns 验证结果
 */
const validateDate = (value: Date, helpers: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (value < today) {
        return helpers.error('custom.pastDate');
    }
    return value;
};

/**
 * 创建日程验证模式
 */
export const createScheduleSchema = Joi.object({
    date: Joi.date()
        .custom(validateDate)
        .required()
        .label('婚礼日期')
        .messages({
            'date.base': '婚礼日期必须是有效的日期格式',
            'any.required': '婚礼日期是必填项',
            'custom.pastDate': '婚礼日期不能早于当前日期'
        }),
    
    timeSlot: Joi.string()
        .valid(...Object.values(TimeSlot))
        .required()
        .label('婚礼时间')
        .messages({
            'any.only': `婚礼时间必须是以下值之一：${Object.values(TimeSlot).join('、')}`,
            'any.required': '婚礼时间是必填项'
        }),
    
    location: Joi.string()
        .max(200)
        .optional()
        .allow( null)
        .label('婚礼地点')
        .messages({
            'string.empty': '婚礼地点不能为空',
            'string.min': '婚礼地点至少需要1个字符',
            'string.max': '婚礼地点不能超过200个字符',
            'any.required': '婚礼地点是必填项'
        }),
    
    price: Joi.number()
        .min(0)
        .max(999999.99)
        .precision(2)
        .optional()
        .allow( null)
        .label('价格')
        .messages({
            'number.base': '价格必须是数字',
            'number.min': '价格不能为负数',
            'number.max': '价格不能超过999,999.99元',
            'number.precision': '价格最多保留2位小数',
            'any.required': '价格是必填项'
        }),
    
    deposit: Joi.number()
        .min(0)
        .max(999999.99)
        .precision(2)
        .custom(validateDeposit)
        .optional()
        .allow( null)
        .label('定金')
        .messages({
            'number.base': '定金必须是数字',
            'number.min': '定金不能为负数',
            'number.max': '定金不能超过999,999.99元',
            'number.precision': '定金最多保留2位小数',
            'any.required': '定金是必填项',
            'custom.depositExceedsPrice': '定金不能超过总价格'
        }),
    
    customerName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[\u4e00-\u9fa5a-zA-Z\s]+$/)
        .optional()
        .allow( null)
        .label('客户姓名')
        .messages({
            'string.empty': '客户姓名不能为空',
            'string.min': '客户姓名至少需要2个字符',
            'string.max': '客户姓名不能超过50个字符',
            'string.pattern.base': '客户姓名只能包含中文、英文字母和空格',
            'any.required': '客户姓名是必填项'
        }),
    
    customerPhone: Joi.string()
        .pattern(/^1[3-9]\d{9}$/)
        .optional()
        .allow( null)
        .label('客户手机号')
        .messages({
            'string.pattern.base': '客户手机号必须为11位有效手机号（以1开头，第二位为3-9）',
            'any.required': '客户手机号是必填项'
        }),
    
    notes: Joi.string()
        .max(500)
        .allow('')
        .label('备注')
        .messages({
            'string.max': '备注不能超过500个字符'
        }),
    
    hostId: Joi.string()
        .required()
        .label('主持人ID')
        .messages({
            'number.base': '主持人ID必须是数字',
            'number.integer': '主持人ID必须是整数',
            'number.positive': '主持人ID必须是正数',
            'any.required': '主持人ID是必填项'
        }),
    
    status: Joi.string()
        .valid(...Object.values(ScheduleStatus))
        .default(ScheduleStatus.AVAILABLE)
        .label('状态')
        .messages({
            'any.only': `状态必须是以下值之一：${Object.values(ScheduleStatus).join('、')}`
        }),
    
    isPaid: Joi.boolean()
        .default(false)
        .label('支付状态')
        .messages({
            'boolean.base': '支付状态必须是布尔值'
        })
});

/**
 * 更新日程验证模式
 */
export const updateScheduleSchema = Joi.object({
    date: Joi.date()
        .custom(validateDate)
        .label('婚礼日期')
        .messages({
            'date.base': '婚礼日期必须是有效的日期格式',
            'custom.pastDate': '婚礼日期不能早于当前日期'
        }),
    
    timeSlot: Joi.string()
        .valid(...Object.values(TimeSlot))
        .label('婚礼时间')
        .messages({
            'any.only': `婚礼时间必须是以下值之一：${Object.values(TimeSlot).join('、')}`
        }),
    
    location: Joi.string()
        .min(1)
        .max(200)
        .optional()
        .allow( null)
        .label('婚礼地点')
        .messages({
            'string.empty': '婚礼地点不能为空',
            'string.min': '婚礼地点至少需要1个字符',
            'string.max': '婚礼地点不能超过200个字符'
        }),
    
    price: Joi.number()
        .min(0)
        .max(999999.99)
        .precision(2)
        .optional()
        .allow( null)
        .label('价格')
        .messages({
            'number.base': '价格必须是数字',
            'number.min': '价格不能为负数',
            'number.max': '价格不能超过999,999.99元',
            'number.precision': '价格最多保留2位小数'
        }),
    
    deposit: Joi.number()
        .min(0)
        .max(999999.99)
        .precision(2)
        .custom(validateDeposit)
        .optional()
        .allow( null)
        .label('定金')
        .messages({
            'number.base': '定金必须是数字',
            'number.min': '定金不能为负数',
            'number.max': '定金不能超过999,999.99元',
            'number.precision': '定金最多保留2位小数',
            'custom.depositExceedsPrice': '定金不能超过总价格'
        }),
    
    customerName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[\u4e00-\u9fa5a-zA-Z\s]+$/)
        .optional()
        .allow( null)
        .label('客户姓名')
        .messages({
            'string.empty': '客户姓名不能为空',
            'string.min': '客户姓名至少需要2个字符',
            'string.max': '客户姓名不能超过50个字符',
            'string.pattern.base': '客户姓名只能包含中文、英文字母和空格'
        }),
    
    customerPhone: Joi.string()
        .pattern(/^1[3-9]\d{9}$/)
        .optional()
        .allow( null)
        .label('客户手机号')
        .messages({
            'string.pattern.base': '客户手机号必须为11位有效手机号（以1开头，第二位为3-9）'
        }),
    
    notes: Joi.string()
        .max(500)
        .allow('')
        .label('备注')
        .messages({
            'string.max': '备注不能超过500个字符'
        }),
    
    hostId: Joi.string()
        .required()
        .label('主持人ID')
        .messages({
            'string.base': '主持人ID必须是字符串',
            'any.required': '主持人ID是必填项'
        }),
    
    status: Joi.string()
        .valid(...Object.values(ScheduleStatus))
        .label('状态')
        .messages({
            'any.only': `状态必须是以下值之一：${Object.values(ScheduleStatus).join('、')}`
        }),
    
    isPaid: Joi.boolean()
        .default(false)
        .label('支付状态')
        .messages({
            'boolean.base': '支付状态必须是布尔值'
        })
});

/**
 * 查询日程验证模式
 */
export const getSchedulesSchema = Joi.object({
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
    
    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10)
        .label('每页数量')
        .messages({
            'number.base': '每页数量必须是数字',
            'number.integer': '每页数量必须是整数',
            'number.min': '每页数量必须大于0',
            'number.max': '每页数量不能超过100'
        }),
    
    isPaid: Joi.boolean()
        .optional()
        .allow( null)
        .label('支付状态')
        .messages({
            'boolean.base': '支付状态必须是布尔值'
        }),

    status: Joi.string()
        .valid(...Object.values(ScheduleStatus))
        .optional()
        .allow( null)
        .label('状态')
        .messages({
            'any.only': `状态必须是以下值之一：${Object.values(ScheduleStatus).join('、')}`
        }),
    
    hostId: Joi.string()
        .optional()
        .allow( null)
        .label('主持人ID')
        .messages({
            'number.base': '主持人ID必须是数字',
            'number.integer': '主持人ID必须是整数',
            'number.positive': '主持人ID必须是正数'
        }),
    date: Joi.date()
        .label('日期')
        .optional()
        .allow( null)
        .messages({
            'date.base': '日期必须是一个日期',
            'any.required': '日期是必填的'
        }),
    startDate: Joi.date()
        .label('开始日期')
        .optional()
        .allow( null)
        .messages({
            'date.base': '开始日期必须是有效的日期格式'
        }),
    
    endDate: Joi.date()
        .min(Joi.ref('startDate'))
        .label('结束日期')
        .optional()
        .allow( null)
        .messages({
            'date.base': '结束日期必须是有效的日期格式',
            'date.min': '结束日期不能早于开始日期'
        }),
    _t: Joi.string()
        .optional()
        .label('时间戳')
        .messages({
            'any.required': '时间戳是必填项'
        })
});

/**
 * ID参数验证模式
 */
export const scheduleIdSchema = Joi.object({
    id: Joi.number()
        .integer()
        .positive()
        .required()
        .label('日程ID')
        .messages({
            'number.base': '日程ID必须是数字',
            'number.integer': '日程ID必须是整数',
            'number.positive': '日程ID必须是正数',
            'any.required': '日程ID是必填项'
        })
});

/**
 * 创建日程验证中间件
 */
export const validateCreateSchedule = validateRequest({
    body: createScheduleSchema
});

/**
 * 更新日程验证中间件
 */
export const validateUpdateSchedule = validateRequest({
    body: updateScheduleSchema,
    params: scheduleIdSchema
});

/**
 * 获取日程列表验证中间件
 */
export const validateGetSchedules = validateRequest({
    query: getSchedulesSchema
});

/**
 * 获取单个日程验证中间件
 */
export const validateGetSchedule = validateRequest({
    params: scheduleIdSchema
});

/**
 * 删除日程验证中间件
 */
export const validateDeleteSchedule = validateRequest({
    params: scheduleIdSchema
});

// 获取可用主持人验证规则
export const getAvailableHostsSchema = Joi.object({
    date: Joi.date()
        .required()
        .label('婚礼日期')
        .messages({
            'date.base': '日期必须是有效的日期格式',
            'any.required': '日期是必填项'
        }),
    timeSlot: Joi.string()
        .valid(...Object.values(TimeSlot))
        .optional()
        .default(TimeSlot.LUNCH)
        .label('婚礼时间')
        .messages({
            'any.only': `时间必须是以下值之一：${Object.values(TimeSlot).join('、')}`,
            'any.required': '时间是必填项'
        }),
  teamId: Joi.string()
        .optional()
        .allow( null)
        .label('团队ID')
        .messages({
            'any.required': '团队ID是必填项'
        }),
  _t: Joi.string()
        .optional()
        .label('时间戳')
        .messages({
            'any.required': '时间戳是必填项'
        })
});

export const validateGetAvailableHosts = validateRequest({
    query: getAvailableHostsSchema
});

// 检查冲突验证规则
export const checkConflictSchema = Joi.object({
    date: Joi.date()
        .required()
        .label('婚礼日期')
        .messages({
            'date.base': '婚礼日期必须是有效的日期格式',
            'any.required': '婚礼日期是必填项'
        }),
    timeSlot: Joi.string()
        .valid(...Object.values(TimeSlot))
        .required()
        .label('婚礼时间')
        .messages({
            'any.only': `婚礼时间必须是以下值之一：${Object.values(TimeSlot).join('、')}`,
            'any.required': '婚礼时间是必填项'
        }),
    hostId: Joi.number()
        .integer()
        .positive()
        .required()
        .label('主持人ID')
        .messages({
            'number.base': '主持人ID必须是数字',
            'number.integer': '主持人ID必须是整数',
            'number.positive': '主持人ID必须是正数',
            'any.required': '主持人ID是必填项'
        }),
    excludeId: Joi.number()
        .integer()
        .positive()
        .optional()
        .label('排除的日程ID')
        .messages({
            'number.base': '排除的日程ID必须是数字',
            'number.integer': '排除的日程ID必须是整数',
            'number.positive': '排除的日程ID必须是正数'
        })
});

export const validateCheckConflict = validateRequest({
    body: checkConflictSchema
});

// 获取日历验证规则
export const getCalendarSchema = Joi.object({
    userId: Joi.number()
        .integer()
        .positive()
        .required()
        .label('用户ID')
        .messages({
            'number.base': '用户ID必须是数字',
            'number.integer': '用户ID必须是整数',
            'number.positive': '用户ID必须是正数',
            'any.required': '用户ID是必填项'
        }),
    year: Joi.number()
        .integer()
        .min(2020)
        .max(2030)
        .required()
        .label('年份')
        .messages({
            'number.base': '年份必须是数字',
            'number.integer': '年份必须是整数',
            'number.min': '年份必须在2020-2030之间',
            'number.max': '年份必须在2020-2030之间',
            'any.required': '年份是必填项'
        }),
    month: Joi.number()
        .integer()
        .min(1)
        .max(12)
        .required()
        .label('月份')
        .messages({
            'number.base': '月份必须是数字',
            'number.integer': '月份必须是整数',
            'number.min': '月份必须在1-12之间',
            'number.max': '月份必须在1-12之间',
            'any.required': '月份是必填项'
        })
});

export const validateGetCalendar = validateRequest({
    params: getCalendarSchema
});

export const validateGetPublicSchedules = validateRequest({
    query: getSchedulesSchema
});

// 导出验证器对象
export const scheduleValidators = {
    createSchedule: validateCreateSchedule,
    updateSchedule: validateUpdateSchedule,
    getSchedules: validateGetSchedules,
    getSchedule: validateGetSchedule,
    getScheduleById: validateGetSchedule, // 别名
    deleteSchedule: validateDeleteSchedule,
    getAvailableHosts: validateGetAvailableHosts,
    checkConflict: validateCheckConflict,
    getCalendar: validateGetCalendar,
    getPublicSchedules: validateGetPublicSchedules,
};
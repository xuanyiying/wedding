import Joi from 'joi';
import { validateRequest } from '@/middlewares';
import { TeamMemberStatus, TeamMemberRole } from '@/types';

/**
 * 获取团队成员列表验证模式
 */
export const getTeamMembersSchema = Joi.object({
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
    
    role: Joi.string()
        .valid(...Object.values(TeamMemberRole))
        .label('角色')
        .messages({
            'any.only': `角色必须是以下值之一：${Object.values(TeamMemberRole).join('、')}`
        }),
    
    status: Joi.string()
        .valid(...Object.values(TeamMemberStatus))
        .label('状态')
        .messages({
            'any.only': `状态必须是以下值之一：${Object.values(TeamMemberStatus).join('、')}`
        }),
    
    search: Joi.string()
        .min(1)
        .max(50)
        .label('搜索关键词')
        .messages({
            'string.empty': '搜索关键词不能为空',
            'string.min': '搜索关键词至少需要1个字符',
            'string.max': '搜索关键词不能超过50个字符'
        }),
    
    managerId: Joi.string()
        .label('管理者ID')
        .messages({
            'string.empty': '管理者ID不能为空'
        }),
    
    _t: Joi.number()
        .label('时间戳')
        .messages({
            'number.base': '时间戳必须是数字'
        })
});

/**
 * 团队成员ID参数验证模式
 */
export const teamMemberIdSchema = Joi.object({
    id: Joi.string()
        .required()
        .label('团队成员ID')
        .messages({
            'string.empty': '团队成员ID不能为空',
            'any.required': '团队成员ID是必填项'
        })
});

/**
 * 创建团队成员验证模式
 */
export const createTeamMemberSchema = Joi.object({
    userId: Joi.string()
        .required()
        .label('用户ID')
        .messages({
            'string.empty': '用户ID不能为空',
            'any.required': '用户ID是必填项'
        }),
    
    employeeId: Joi.string()
        .min(1)
        .max(20)
        .required()
        .label('员工编号')
        .messages({
            'string.empty': '员工编号不能为空',
            'string.min': '员工编号至少需要1个字符',
            'string.max': '员工编号不能超过20个字符',
            'any.required': '员工编号是必填项'
        }),
    
    realName: Joi.string()
        .min(1)
        .max(50)
        .required()
        .label('真实姓名')
        .messages({
            'string.empty': '真实姓名不能为空',
            'string.min': '真实姓名至少需要1个字符',
            'string.max': '真实姓名不能超过50个字符',
            'any.required': '真实姓名是必填项'
        }),
    
    nickname: Joi.string()
        .max(50)
        .allow('')
        .label('昵称')
        .messages({
            'string.max': '昵称不能超过50个字符'
        }),
    
    position: Joi.string()
        .min(1)
        .max(100)
        .required()
        .label('职位')
        .messages({
            'string.empty': '职位不能为空',
            'string.min': '职位至少需要1个字符',
            'string.max': '职位不能超过100个字符',
            'any.required': '职位是必填项'
        }),
    
    role: Joi.string()
        .valid(...Object.values(TeamMemberRole))
        .required()
        .label('角色')
        .messages({
            'any.only': `角色必须是以下值之一：${Object.values(TeamMemberRole).join('、')}`,
            'any.required': '角色是必填项'
        }),
    
    managerId: Joi.string()
        .allow('')
        .label('管理者ID')
        .messages({
            'string.empty': '管理者ID不能为空'
        }),
    
    hireDate: Joi.date()
        .iso()
        .required()
        .label('入职日期')
        .messages({
            'date.base': '入职日期必须是有效的日期格式',
            'date.format': '入职日期格式必须为ISO格式',
            'any.required': '入职日期是必填项'
        }),
    
    salary: Joi.number()
        .min(0)
        .required()
        .label('薪资')
        .messages({
            'number.base': '薪资必须是数字',
            'number.min': '薪资不能为负数',
            'any.required': '薪资是必填项'
        }),
    
    skills: Joi.array()
        .items(Joi.string())
        .default([])
        .label('技能')
        .messages({
            'array.base': '技能必须是数组格式'
        }),
    
    certifications: Joi.array()
        .items(Joi.string())
        .default([])
        .label('证书')
        .messages({
            'array.base': '证书必须是数组格式'
        }),
    
    workExperience: Joi.number()
        .integer()
        .min(0)
        .required()
        .label('工作经验')
        .messages({
            'number.base': '工作经验必须是数字',
            'number.integer': '工作经验必须是整数',
            'number.min': '工作经验不能为负数',
            'any.required': '工作经验是必填项'
        }),
    
    education: Joi.string()
        .max(100)
        .allow('')
        .label('学历')
        .messages({
            'string.max': '学历不能超过100个字符'
        }),
    
    contactInfo: Joi.object()
        .default({})
        .label('联系信息')
        .messages({
            'object.base': '联系信息必须是对象格式'
        }),
    
    emergencyContact: Joi.object()
        .default({})
        .label('紧急联系人')
        .messages({
            'object.base': '紧急联系人必须是对象格式'
        }),
    
    notes: Joi.string()
        .max(1000)
        .allow('')
        .label('备注')
        .messages({
            'string.max': '备注不能超过1000个字符'
        })
});

/**
 * 更新团队成员验证模式
 */
export const updateTeamMemberSchema = Joi.object({
    userId: Joi.string()
        .label('用户ID')
        .messages({
            'string.empty': '用户ID不能为空'
        }),
    
    employeeId: Joi.string()
        .min(1)
        .max(20)
        .label('员工编号')
        .messages({
            'string.empty': '员工编号不能为空',
            'string.min': '员工编号至少需要1个字符',
            'string.max': '员工编号不能超过20个字符'
        }),
    
    realName: Joi.string()
        .min(1)
        .max(50)
        .label('真实姓名')
        .messages({
            'string.empty': '真实姓名不能为空',
            'string.min': '真实姓名至少需要1个字符',
            'string.max': '真实姓名不能超过50个字符'
        }),
    
    nickname: Joi.string()
        .max(50)
        .allow('')
        .label('昵称')
        .messages({
            'string.max': '昵称不能超过50个字符'
        }),
    
    position: Joi.string()
        .min(1)
        .max(100)
        .label('职位')
        .messages({
            'string.empty': '职位不能为空',
            'string.min': '职位至少需要1个字符',
            'string.max': '职位不能超过100个字符'
        }),
    
    role: Joi.string()
        .valid(...Object.values(TeamMemberRole))
        .label('角色')
        .messages({
            'any.only': `角色必须是以下值之一：${Object.values(TeamMemberRole).join('、')}`
        }),
    
    status: Joi.string()
        .valid(...Object.values(TeamMemberStatus))
        .label('状态')
        .messages({
            'any.only': `状态必须是以下值之一：${Object.values(TeamMemberStatus).join('、')}`
        }),
    
    managerId: Joi.string()
        .allow('')
        .label('管理者ID')
        .messages({
            'string.empty': '管理者ID不能为空'
        }),
    
    hireDate: Joi.date()
        .iso()
        .label('入职日期')
        .messages({
            'date.base': '入职日期必须是有效的日期格式',
            'date.format': '入职日期格式必须为ISO格式'
        }),
    
    salary: Joi.number()
        .min(0)
        .label('薪资')
        .messages({
            'number.base': '薪资必须是数字',
            'number.min': '薪资不能为负数'
        }),
    
    skills: Joi.array()
        .items(Joi.string())
        .label('技能')
        .messages({
            'array.base': '技能必须是数组格式'
        }),
    
    certifications: Joi.array()
        .items(Joi.string())
        .label('证书')
        .messages({
            'array.base': '证书必须是数组格式'
        }),
    
    workExperience: Joi.number()
        .integer()
        .min(0)
        .label('工作经验')
        .messages({
            'number.base': '工作经验必须是数字',
            'number.integer': '工作经验必须是整数',
            'number.min': '工作经验不能为负数'
        }),
    
    education: Joi.string()
        .max(100)
        .allow('')
        .label('学历')
        .messages({
            'string.max': '学历不能超过100个字符'
        }),
    
    contactInfo: Joi.object()
        .label('联系信息')
        .messages({
            'object.base': '联系信息必须是对象格式'
        }),
    
    emergencyContact: Joi.object()
        .label('紧急联系人')
        .messages({
            'object.base': '紧急联系人必须是对象格式'
        }),
    
    notes: Joi.string()
        .max(1000)
        .allow('')
        .label('备注')
        .messages({
            'string.max': '备注不能超过1000个字符'
        })
});

/**
 * 批量删除团队成员验证模式
 */
export const batchDeleteTeamMembersSchema = Joi.object({
    ids: Joi.array()
        .items(Joi.string().required())
        .min(1)
        .required()
        .label('团队成员ID列表')
        .messages({
            'array.base': '团队成员ID列表必须是数组格式',
            'array.min': '至少需要选择一个团队成员',
            'any.required': '团队成员ID列表是必填项'
        })
});

/**
 * 更新团队成员状态验证模式
 */
export const updateTeamMemberStatusSchema = Joi.object({
    id: Joi.string()
        .required()
        .label('团队成员ID')
        .messages({
            'string.empty': '团队成员ID不能为空',
            'any.required': '团队成员ID是必填项'
        }),
    
    status: Joi.string()
        .valid(...Object.values(TeamMemberStatus))
        .required()
        .label('状态')
        .messages({
            'any.only': `状态必须是以下值之一：${Object.values(TeamMemberStatus).join('、')}`,
            'any.required': '状态是必填项'
        })
});

/**
 * 按技能搜索成员验证模式
 */
export const searchMembersBySkillsSchema = Joi.object({
    skills: Joi.array()
        .items(Joi.string())
        .min(1)
        .required()
        .label('技能列表')
        .messages({
            'array.base': '技能列表必须是数组格式',
            'array.min': '至少需要指定一个技能',
            'any.required': '技能列表是必填项'
        })
});

/**
 * 转移下属验证模式
 */
export const transferSubordinatesSchema = Joi.object({
    subordinates: Joi.array()
        .items(Joi.string().required())
        .min(1)
        .required()
        .label('下属成员ID列表')
        .messages({
            'array.base': '下属成员ID列表必须是数组格式',
            'array.min': '至少需要选择一个下属成员',
            'any.required': '下属成员ID列表是必填项'
        })
});

/**
 * 获取团队成员列表验证中间件
 */
export const validateGetTeamMembers = validateRequest({
    query: getTeamMembersSchema
});

/**
 * 获取团队成员详情验证中间件
 */
export const validateGetTeamMember = validateRequest({
    params: teamMemberIdSchema
});

/**
 * 创建团队成员验证中间件
 */
export const validateCreateTeamMember = validateRequest({
    body: createTeamMemberSchema
});

/**
 * 更新团队成员验证中间件
 */
export const validateUpdateTeamMember = validateRequest({
    params: teamMemberIdSchema,
    body: updateTeamMemberSchema
});

/**
 * 删除团队成员验证中间件
 */
export const validateDeleteTeamMember = validateRequest({
    params: teamMemberIdSchema
});

/**
 * 批量删除团队成员验证中间件
 */
export const validateBatchDeleteTeamMembers = validateRequest({
    body: batchDeleteTeamMembersSchema
});

/**
 * 更新团队成员状态验证中间件
 */
export const validateUpdateTeamMemberStatus = validateRequest({
    body: updateTeamMemberStatusSchema
});

/**
 * 获取下属验证中间件
 */
export const validateGetSubordinates = validateRequest({
    params: teamMemberIdSchema
});

/**
 * 按技能搜索成员验证中间件
 */
export const validateSearchMembersBySkills = validateRequest({
    query: searchMembersBySkillsSchema
});

/**
 * 转移下属验证中间件
 */
export const validateTransferSubordinates = validateRequest({
    params: teamMemberIdSchema,
    body: transferSubordinatesSchema
});

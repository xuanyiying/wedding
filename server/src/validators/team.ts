import Joi from 'joi';
import { TeamMemberStatus, TeamMemberRole } from '../types';
import { updateTeamMember } from '../controllers/team.controller';

export interface TeamValidators {
  getTeamMembers: any;
  getTeamMemberById: any;
  createTeamMember: any;
  updateTeamMember: any;
  deleteTeamMember: any;
  batchDeleteTeamMembers: any;
  updateTeamMemberStatus: any;
  getSubordinates: any;
  searchMembersBySkills: any;
  transferSubordinates: any;
}

export const teamValidators: TeamValidators = {
  // 获取团队成员列表验证
  getTeamMembers: {
    query: Joi.object({
      page: Joi.number().integer().min(1).optional().messages({
        'number.integer': '页码必须是整数',
        'number.min': '页码必须大于0',
      }),
      limit: Joi.number().integer().min(1).max(100).optional().messages({
        'number.integer': '每页数量必须是整数',
        'number.min': '每页数量必须大于0',
        'number.max': '每页数量不能超过100',
      }),
      role: Joi.string()
        .valid(...Object.values(TeamMemberRole))
        .optional()
        .messages({
          'any.only': '角色参数无效',
        }),
      status: Joi.string()
        .valid(...Object.values(TeamMemberStatus))
        .optional()
        .messages({
          'any.only': '状态参数无效',
        }),
      search: Joi.string().min(1).max(50).optional().messages({
        'string.min': '搜索关键词长度必须至少1字符',
        'string.max': '搜索关键词长度不能超过50字符',
      }),
      managerId: Joi.string().uuid().optional().messages({
        'string.guid': '管理者ID格式无效',
      }),
      _t: Joi.number().optional(), // 允许时间戳参数，用于防止缓存
    }),
  },

  // 获取团队成员详情验证
  getTeamMemberById: {
    params: Joi.object({
      id: Joi.string().uuid().required().messages({
        'string.guid': '团队成员ID格式无效',
        'any.required': '团队成员ID是必填项',
      }),
    }),
  },

  // 创建团队成员验证
  createTeamMember: {
    body: Joi.object({
      userId: Joi.string().uuid().required().messages({
        'string.guid': '用户ID格式无效',
        'any.required': '用户ID是必填项',
      }),
      employeeId: Joi.string().min(1).max(20).required().messages({
        'string.min': '员工编号长度必须至少1字符',
        'string.max': '员工编号长度不能超过20字符',
        'any.required': '员工编号是必填项',
      }),
      realName: Joi.string().min(1).max(50).required().messages({
        'string.min': '真实姓名长度必须至少1字符',
        'string.max': '真实姓名长度不能超过50字符',
        'any.required': '真实姓名是必填项',
      }),
      nickname: Joi.string().max(50).optional().messages({
        'string.max': '昵称长度不能超过50字符',
      }),
      position: Joi.string().min(1).max(100).required().messages({
        'string.min': '职位长度必须至少1字符',
        'string.max': '职位长度不能超过100字符',
        'any.required': '职位是必填项',
      }),
      role: Joi.string()
        .valid(...Object.values(TeamMemberRole))
        .required()
        .messages({
          'any.only': '角色参数无效',
          'any.required': '角色是必填项',
        }),
      managerId: Joi.string().uuid().optional().messages({
        'string.guid': '管理者ID格式无效',
      }),
      hireDate: Joi.date().iso().required().messages({
        'date.format': '入职日期格式无效',
        'any.required': '入职日期是必填项',
      }),
      salary: Joi.number().min(0).required().messages({
        'number.min': '薪资必须是非负数',
        'any.required': '薪资是必填项',
      }),
      skills: Joi.array().items(Joi.string()).optional().messages({
        'array.base': '技能必须是数组格式',
      }),
      certifications: Joi.array().items(Joi.string()).optional().messages({
        'array.base': '证书必须是数组格式',
      }),
      workExperience: Joi.number().integer().min(0).required().messages({
        'number.integer': '工作经验必须是整数',
        'number.min': '工作经验必须是非负数',
        'any.required': '工作经验是必填项',
      }),
      education: Joi.string().max(100).optional().messages({
        'string.max': '学历长度不能超过100字符',
      }),
      contactInfo: Joi.object().optional().messages({
        'object.base': '联系信息必须是对象格式',
      }),
      emergencyContact: Joi.object().optional().messages({
        'object.base': '紧急联系人必须是对象格式',
      }),
      notes: Joi.string().max(1000).optional().messages({
        'string.max': '备注长度不能超过1000字符',
      }),
    }),
  },

  // 更新团队成员验证
  updateTeamMember: {
    params: Joi.object({
      id: Joi.string().uuid().required().messages({
        'string.guid': '团队成员ID格式无效',
        'any.required': '团队成员ID是必填项',
      }),
    }),
    body: Joi.object({
      ...updateTeamMember,
    }),
  },

  // 删除团队成员验证
  deleteTeamMember: {
    params: Joi.object({
      id: Joi.string().uuid().required().messages({
        'string.guid': '团队成员ID格式无效',
        'any.required': '团队成员ID是必填项',
      }),
    }),
  },

  // 批量删除团队成员验证
  batchDeleteTeamMembers: {
    body: Joi.object({
      ids: Joi.array().items(Joi.string().uuid()).required().messages({}),
    }),
  },
  updateTeamMemberStatus: {
    body: Joi.object({
      id: Joi.string().uuid().required().messages({
        'string.guid': '团队成员ID格式无效',
        'any.required': '团队成员ID是必填项',
      }),
      status: Joi.string()
        .valid(...Object.values(TeamMemberStatus))
        .required()
        .messages({
          'any.only': '状态参数无效',
          'any.required': '状态是必填项',
        }),
    }),
  },

  getSubordinates: {
    params: Joi.object({
      id: Joi.string().uuid().required().messages({
        'string.guid': '团队成员ID格式无效',
        'any.required': '团队成员ID是必填项',
      }),
    }),
  },
  searchMembersBySkills: {
    query: Joi.object({
      skills: Joi.array().items(Joi.string()).required().messages({
        'array.base': '技能必须是数组格式',
        'any.required': '技能是必填项',
      }),
    }),
  },
  transferSubordinates: {
    params: Joi.object({
      id: Joi.string().uuid().required().messages({
        'string.guid': '团队成员ID格式无效',
        'any.required': '团队成员ID是必填项',
      }),
    }),
    body: Joi.object({
      subordinates: Joi.array().items(Joi.string().uuid()).required().messages({
        'array.base': '下属成员ID必须是数组格式',
        'any.required': '下属成员ID是必填项',
      }),
    }),
  },
};

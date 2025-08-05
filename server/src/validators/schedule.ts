import Joi from 'joi';
import { ScheduleStatus, EventType, WeddingTime } from '../types';

export const scheduleValidators = {
  // 获取档期列表
  getSchedules: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
      userId: Joi.string().uuid().optional(),
      status: Joi.string()
        .valid(...Object.values(ScheduleStatus))
        .optional(),
      eventType: Joi.string()
        .valid(...Object.values(EventType))
        .optional(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
      isPublic: Joi.boolean().optional(),
      _t: Joi.number().optional(), // 允许时间戳参数，用于防止缓存
    }),
  },

  // 获取档期详情
  getScheduleById: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  },

  // 创建档期
  createSchedule: {
    body: Joi.object({
      title: Joi.string().trim().min(1).max(200).required(),
      startTime: Joi.date().iso().greater('now').required(),
      endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
      location: Joi.string().trim().max(500).optional(),
      eventType: Joi.string()
        .valid(...Object.values(EventType))
        .required(),
      description: Joi.string().trim().max(2000).optional(),
      price: Joi.number().min(0).optional(),
      deposit: Joi.number().min(0).max(Joi.ref('price')).optional(),
      clientId: Joi.string().uuid().optional(),
      clientName: Joi.string().trim().max(100).optional(),
      clientPhone: Joi.string()
        .trim()
        .pattern(/^1[3-9]\d{9}$/)
        .optional(),
      clientEmail: Joi.string().email().optional(),
      isPublic: Joi.boolean().default(false),
      notes: Joi.string().trim().max(1000).optional(),
    }),
  },

  // 更新档期
  updateSchedule: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      title: Joi.string().trim().min(1).max(200).optional(),
      startTime: Joi.date().iso().optional(),
      endTime: Joi.date().iso().optional(),
      location: Joi.string().trim().max(500).optional(),
      eventType: Joi.string()
        .valid(...Object.values(EventType))
        .optional(),
      description: Joi.string().trim().max(2000).optional(),
      price: Joi.number().min(0).optional(),
      deposit: Joi.number().min(0).optional(),
      clientId: Joi.string().uuid().optional(),
      clientName: Joi.string().trim().max(100).optional(),
      clientPhone: Joi.string()
        .trim()
        .pattern(/^1[3-9]\d{9}$/)
        .optional(),
      clientEmail: Joi.string().email().optional(),
      isPublic: Joi.boolean().optional(),
      notes: Joi.string().trim().max(1000).optional(),
      status: Joi.string()
        .valid(...Object.values(ScheduleStatus))
        .optional(),
    }).min(1),
  },

  // 删除档期
  deleteSchedule: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  },

  // 确认档期
  confirmSchedule: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      notes: Joi.string().trim().max(1000).optional(),
    }),
  },

  // 检查档期冲突
  checkConflict: {
    body: Joi.object({
      userId: Joi.string().uuid().optional(),
      startTime: Joi.date().iso().required(),
      endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
      excludeId: Joi.string().uuid().optional(),
    }),
  },

  // 获取用户档期日历
  getCalendar: {
    params: Joi.object({
      userId: Joi.string().uuid().required(),
      year: Joi.number().integer().min(2020).max(2030).required(),
      month: Joi.number().integer().min(1).max(12).required(),
    }),
  },

  // 获取公开档期
  getPublicSchedules: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
      eventType: Joi.string()
        .valid(...Object.values(EventType))
        .optional(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    }),
  },

  // 根据时间查询可预订的主持人
  getAvailableHosts: {
    query: Joi.object({
      weddingDate: Joi.date().iso().required(),
      weddingTime: Joi.string()
        .valid(...Object.values(WeddingTime))
        .required(),
    }),
  },
};

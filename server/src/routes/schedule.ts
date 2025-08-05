import { Router } from 'express';
import * as ScheduleController from '../controllers/schedule.controller';
import { authMiddleware } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { scheduleValidators } from '../validators/schedule';

const router = Router();

// 获取档期列表
router.get('/', validateRequest(scheduleValidators.getSchedules), ScheduleController.getSchedules);

// 获取客户端档期可用性
router.get('/client/availability', ScheduleController.getClientScheduleAvailability);

// 根据时间查询可预订的主持人 - 必须在 /:id 之前定义
router.get(
  '/available-hosts',
  validateRequest(scheduleValidators.getAvailableHosts),
  ScheduleController.getAvailableHosts,
);

// 获取档期详情
router.get(
  '/:id',
  validateRequest(scheduleValidators.getScheduleById),
  ScheduleController.getScheduleById,
);

// 创建档期
router.post('/', authMiddleware, validateRequest(scheduleValidators.createSchedule), ScheduleController.createSchedule);

// 更新档期
router.put(
  '/:id',
  authMiddleware,
  validateRequest(scheduleValidators.updateSchedule),
  ScheduleController.updateSchedule,
);

// 删除档期
router.delete(
  '/:id',
  authMiddleware,
  validateRequest(scheduleValidators.deleteSchedule),
  ScheduleController.deleteSchedule,
);

// 确认档期
router.post(
  '/:id/confirm',
  authMiddleware,
  validateRequest(scheduleValidators.confirmSchedule),
  ScheduleController.confirmSchedule,
);

// 检查档期冲突
router.post(
  '/check-conflict',
  authMiddleware,
  validateRequest(scheduleValidators.checkConflict),
  ScheduleController.checkScheduleConflict,
);

// 获取用户档期日历
router.get(
  '/calendar/:userId/:year/:month',
  validateRequest(scheduleValidators.getCalendar),
  ScheduleController.getUserScheduleCalendar,
);

// 获取公开档期
router.get(
  '/public/list',
  validateRequest(scheduleValidators.getPublicSchedules),
  ScheduleController.getPublicSchedules,
);

export default router;

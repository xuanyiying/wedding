import { Router } from 'express';
import * as ScheduleController from '../controllers/schedule.controller';
import { authMiddleware } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { scheduleValidators } from '../validators/schedule';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ScheduleRequest:
 *       type: object
 *       required:
 *         - title
 *         - startDate
 *         - endDate
 *       properties:
 *         title:
 *           type: string
 *           description: 档期标题
 *         description:
 *           type: string
 *           description: 档期描述
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: 开始时间
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: 结束时间
 *         status:
 *           type: string
 *           enum: [available, booked, blocked]
 *           description: 档期状态
 *         hostId:
 *           type: integer
 *           description: 主持人ID
 *         location:
 *           type: string
 *           description: 地点
 *         price:
 *           type: number
 *           description: 价格
 *     ScheduleResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/Schedule'
 *         - type: object
 *           properties:
 *             host:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 avatar:
 *                   type: string
 *     AvailableHostsQuery:
 *       type: object
 *       required:
 *         - startDate
 *         - endDate
 *       properties:
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: 开始时间
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: 结束时间
 *         location:
 *           type: string
 *           description: 地点筛选
 */

// 获取档期列表

/**
 * @swagger
 * /api/schedules:
 *   get:
 *     summary: 获取档期列表
 *     tags: [Schedules]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, booked, blocked]
 *         description: 档期状态筛选
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期筛选
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期筛选
 *     responses:
 *       200:
 *         description: 档期列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginationResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', validateRequest(scheduleValidators.getSchedules), ScheduleController.getSchedules);

// 获取客户端档期可用性

/**
 * @swagger
 * /api/schedules/client/availability:
 *   get:
 *     summary: 获取客户端档期可用性
 *     tags: [Schedules]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           format: date
 *         description: 查询月份 (YYYY-MM)
 *       - in: query
 *         name: hostId
 *         schema:
 *           type: integer
 *         description: 主持人ID筛选
 *     responses:
 *       200:
 *         description: 档期可用性数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 availableDates:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: date
 *                   description: 可用日期列表
 *                 bookedDates:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: date
 *                   description: 已预订日期列表
 */
router.get('/client/availability', ScheduleController.getClientScheduleAvailability);

// 根据时间查询可预订的主持人 - 必须在 /:id 之前定义

/**
 * @swagger
 * /api/schedules/available-hosts:
 *   get:
 *     summary: 根据时间查询可预订的主持人
 *     tags: [Schedules]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: 地点筛选
 *     responses:
 *       200:
 *         description: 可用主持人列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: 主持人ID
 *                   name:
 *                     type: string
 *                     description: 主持人姓名
 *                   avatar:
 *                     type: string
 *                     description: 头像URL
 *                   experience:
 *                     type: integer
 *                     description: 经验年数
 *                   rating:
 *                     type: number
 *                     description: 评分
 *                   price:
 *                     type: number
 *                     description: 价格
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/available-hosts',
  validateRequest(scheduleValidators.getAvailableHosts),
  ScheduleController.getAvailableHosts,
);

// 获取档期详情

/**
 * @swagger
 * /api/schedules/{id}:
 *   get:
 *     summary: 获取档期详情
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 档期ID
 *     responses:
 *       200:
 *         description: 档期详情
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduleResponse'
 *       404:
 *         description: 档期不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', validateRequest(scheduleValidators.getScheduleById), ScheduleController.getScheduleById);

// 创建档期

/**
 * @swagger
 * /api/schedules:
 *   post:
 *     summary: 创建档期
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScheduleRequest'
 *     responses:
 *       201:
 *         description: 档期创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduleResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authMiddleware, validateRequest(scheduleValidators.createSchedule), ScheduleController.createSchedule);

// 更新档期

/**
 * @swagger
 * /api/schedules/{id}:
 *   put:
 *     summary: 更新档期
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 档期ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScheduleRequest'
 *     responses:
 *       200:
 *         description: 档期更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduleResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 档期不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/:id',
  authMiddleware,
  validateRequest(scheduleValidators.updateSchedule),
  ScheduleController.updateSchedule,
);

// 删除档期

/**
 * @swagger
 * /api/schedules/{id}:
 *   delete:
 *     summary: 删除档期
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 档期ID
 *     responses:
 *       200:
 *         description: 档期删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 档期删除成功
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 档期不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

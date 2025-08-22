import { Router } from 'express';
import * as WorkController from '../controllers/work.controller';
import { authMiddleware } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { workValidators } from '../validators/work';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     WorkRequest:
 *       type: object
 *       required:
 *         - title
 *         - category
 *       properties:
 *         title:
 *           type: string
 *           description: 作品标题
 *         description:
 *           type: string
 *           description: 作品描述
 *         category:
 *           type: string
 *           enum: [wedding, portrait, event, commercial]
 *           description: 作品分类
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: 标签列表
 *         location:
 *           type: string
 *           description: 拍摄地点
 *         shootDate:
 *           type: string
 *           format: date
 *           description: 拍摄日期
 *         isPublic:
 *           type: boolean
 *           description: 是否公开
 *         isFeatured:
 *           type: boolean
 *           description: 是否精选
 *     WorkResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/Work'
 *         - type: object
 *           properties:
 *             images:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   url:
 *                     type: string
 *                   thumbnailUrl:
 *                     type: string
 *                   order:
 *                     type: integer
 *             author:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 avatar:
                     type: string
 */

// 获取作品列表

/**
 * @swagger
 * /api/works:
 *   get:
 *     summary: 获取作品列表
 *     tags: [Works]
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
 *           default: 12
 *         description: 每页数量
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [wedding, portrait, event, commercial]
 *         description: 作品分类筛选
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: 标签筛选（逗号分隔）
 *       - in: query
 *         name: authorId
 *         schema:
 *           type: integer
 *         description: 作者ID筛选
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: 是否只显示精选作品
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 作品列表
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
router.get('/', validateRequest(workValidators.getWorks), WorkController.getWorks);

// 获取作品详情

/**
 * @swagger
 * /api/works/{id}:
 *   get:
 *     summary: 获取作品详情
 *     tags: [Works]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 作品ID
 *     responses:
 *       200:
 *         description: 作品详情
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkResponse'
 *       404:
 *         description: 作品不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', validateRequest(workValidators.getWorkById), WorkController.getWorkById);

// 创建作品

/**
 * @swagger
 * /api/works:
 *   post:
 *     summary: 创建作品
 *     tags: [Works]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WorkRequest'
 *     responses:
 *       201:
 *         description: 作品创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkResponse'
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
router.post('/', authMiddleware, validateRequest(workValidators.createWork), WorkController.createWork);

// 更新作品

/**
 * @swagger
 * /api/works/{id}:
 *   put:
 *     summary: 更新作品
 *     tags: [Works]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 作品ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WorkRequest'
 *     responses:
 *       200:
 *         description: 作品更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkResponse'
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
 *         description: 作品不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', authMiddleware, validateRequest(workValidators.updateWork), WorkController.updateWork);

// 删除作品

/**
 * @swagger
 * /api/works/{id}:
 *   delete:
 *     summary: 删除作品
 *     tags: [Works]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 作品ID
 *     responses:
 *       200:
 *         description: 作品删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 作品删除成功
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 作品不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', authMiddleware, validateRequest(workValidators.deleteWork), WorkController.deleteWork);

// 发布作品
router.post('/:id/publish', authMiddleware, validateRequest(workValidators.publishWork), WorkController.publishWork);

// 取消发布作品
router.post(
  '/:id/unpublish',
  authMiddleware,
  validateRequest(workValidators.unpublishWork),
  WorkController.unpublishWork,
);

// 点赞作品
router.post('/:id/like', authMiddleware, validateRequest(workValidators.likeWork), WorkController.likeWork);

// 取消点赞作品
router.delete('/:id/like', authMiddleware, validateRequest(workValidators.unlikeWork), WorkController.unlikeWork);

// 增加作品浏览量
router.post('/:id/view', validateRequest(workValidators.incrementViewCount), WorkController.incrementViewCount);

// 获取精选作品
router.get('/featured/list', validateRequest(workValidators.getFeaturedWorks), WorkController.getFeaturedWorks);

// 设置作品为精选
router.post(
  '/:id/featured',
  authMiddleware,
  validateRequest(workValidators.setWorkFeatured),
  WorkController.setWorkFeatured,
);

// 获取用户作品统计
router.get('/stats/user', WorkController.getUserWorkStats);

// 获取公开作品列表
router.get('/public/list', validateRequest(workValidators.getPublicWorks), WorkController.getPublicWorks);

// 获取热门作品
router.get('/popular/list', validateRequest(workValidators.getPopularWorks), WorkController.getPopularWorks);

// 获取相关作品
router.get('/:id/related', validateRequest(workValidators.getRelatedWorks), WorkController.getRelatedWorks);

export default router;

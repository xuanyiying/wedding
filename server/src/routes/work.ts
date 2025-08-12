import { Router } from 'express';
import * as WorkController from '../controllers/work.controller';
import { authMiddleware } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { workValidators } from '../validators/work';

const router = Router();

// 获取作品列表
router.get('/', validateRequest(workValidators.getWorks), WorkController.getWorks);

// 获取作品详情
router.get('/:id', validateRequest(workValidators.getWorkById), WorkController.getWorkById);

// 创建作品
router.post('/', authMiddleware, validateRequest(workValidators.createWork), WorkController.createWork);

// 更新作品
router.put('/:id', authMiddleware, validateRequest(workValidators.updateWork), WorkController.updateWork);

// 删除作品
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

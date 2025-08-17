import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const profileController = new ProfileController();

// 媒体资料CRUD操作
// 创建媒体资料
router.post('/media-profiles', authMiddleware, profileController.createMediaProfile.bind(profileController));

// 批量创建媒体资料
router.post('/media-profiles/batch', authMiddleware, profileController.batchCreateMediaProfiles.bind(profileController));

// 获取用户媒体资料列表
router.get('/media-profiles/:userId', profileController.getUserMediaProfiles.bind(profileController));

// 更新媒体资料排序
router.put('/media-profiles/order', authMiddleware, profileController.updateMediaProfilesOrder.bind(profileController));

// 批量删除媒体资料
router.delete('/media-profiles/batch', authMiddleware, profileController.batchDeleteMediaProfiles.bind(profileController));

// 删除单个媒体资料
router.delete('/media-profiles/:fileId', authMiddleware, profileController.deleteMediaProfile.bind(profileController));

// 更新单个媒体资料
router.put('/media-profiles/:fileId', authMiddleware, profileController.updateSingleMediaProfile.bind(profileController));

// 获取单个媒体资料详情
router.get('/media-profiles/:fileId', profileController.getMediaProfileById.bind(profileController));

// 用户资料相关（包含用户信息和媒体文件）
// 获取用户完整资料（用户信息 + 媒体文件）
router.get('/user/:userId', profileController.getUserProfile.bind(profileController));

// 获取公开的用户资料
router.get('/public', profileController.getPublicUserProfiles.bind(profileController));

// 获取用户可用文件
router.get('/available-files', profileController.getUserAvailableFiles.bind(profileController));

export default router;

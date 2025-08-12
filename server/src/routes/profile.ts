import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { profileController } from '../controllers/profile.controller';
import { authMiddleware } from '../middlewares/auth';
import { handleValidationErrors } from '../middlewares/validation';

const router = Router();

// 公开路由 - 获取用户档案（通过用户ID）
router.get(
  '/user/:userId',
  [param('userId').isMongoId().withMessage('Invalid user ID')],
  handleValidationErrors,
  profileController.getUserProfileByUserId,
);

// 公开路由 - 获取公开档案列表
router.get(
  '/public',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortBy').optional().isIn(['viewCount', 'createdAt', 'updatedAt']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  ],
  handleValidationErrors,
  profileController.getPublicUserProfiles,
);

// 认证路由 - 获取当前用户档案
router.get('/me', authMiddleware, profileController.getCurrentUserProfile);

// 认证路由 - 创建或更新当前用户档案
router.put(
  '/me',
  authMiddleware,
  [
    body('displayName').optional().isLength({ min: 1, max: 100 }).withMessage('Display name must be 1-100 characters'),
    body('bio').optional().isLength({ max: 1000 }).withMessage('Bio must not exceed 1000 characters'),
    body('avatarFileId').optional().isMongoId().withMessage('Invalid avatar file ID'),
    body('coverFileId').optional().isMongoId().withMessage('Invalid cover file ID'),
    body('selectedWorkIds').optional().isArray().withMessage('Selected work IDs must be an array'),
    body('selectedWorkIds.*').isMongoId().withMessage('Invalid work ID'),
    body('selectedFileIds').optional().isArray().withMessage('Selected file IDs must be an array'),
    body('selectedFileIds.*').isMongoId().withMessage('Invalid file ID'),
    body('mediaOrder').optional().isArray().withMessage('Media order must be an array'),
    body('mediaOrder.*.type').isIn(['work', 'file']).withMessage('Media type must be work or file'),
    body('mediaOrder.*.id').isMongoId().withMessage('Invalid media ID'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
    body('socialLinks').optional().isObject().withMessage('Social links must be an object'),
    body('socialLinks.website').optional().isURL().withMessage('Invalid website URL'),
    body('socialLinks.instagram').optional().isString().withMessage('Instagram must be a string'),
    body('socialLinks.facebook').optional().isString().withMessage('Facebook must be a string'),
    body('socialLinks.wechat').optional().isString().withMessage('WeChat must be a string'),
    body('contactInfo').optional().isObject().withMessage('Contact info must be an object'),
    body('contactInfo.phone').optional().isMobilePhone('zh-CN').withMessage('Invalid phone number'),
    body('contactInfo.email').optional().isEmail().withMessage('Invalid email address'),
    body('contactInfo.address').optional().isString().withMessage('Address must be a string'),
  ],
  handleValidationErrors,
  profileController.createOrUpdateUserProfile,
);

// 认证路由 - 更新媒体排序
router.put(
  '/me/media-order',
  authMiddleware,
  [
    body('mediaOrder').isArray().withMessage('Media order must be an array'),
    body('mediaOrder.*.type').isIn(['work', 'file']).withMessage('Media type must be work or file'),
    body('mediaOrder.*.id').isMongoId().withMessage('Invalid media ID'),
  ],
  handleValidationErrors,
  profileController.updateMediaOrder,
);

// 认证路由 - 添加作品到档案
router.post(
  '/me/works',
  authMiddleware,
  [body('workId').isMongoId().withMessage('Invalid work ID')],
  handleValidationErrors,
  profileController.addWorkToProfile,
);

// 认证路由 - 从档案移除作品
router.delete(
  '/me/works/:workId',
  authMiddleware,
  [param('workId').isMongoId().withMessage('Invalid work ID')],
  handleValidationErrors,
  profileController.removeWorkFromProfile,
);

// 认证路由 - 添加文件到档案
router.post(
  '/me/files',
  authMiddleware,
  [body('fileId').isMongoId().withMessage('Invalid file ID')],
  handleValidationErrors,
  profileController.addFileToProfile,
);

// 认证路由 - 从档案移除文件
router.delete(
  '/me/files/:fileId',
  authMiddleware,
  [param('fileId').isMongoId().withMessage('Invalid file ID')],
  handleValidationErrors,
  profileController.removeFileFromProfile,
);

export default router;

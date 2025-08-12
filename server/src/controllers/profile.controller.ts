import { Request, Response } from 'express';
import { userProfileService } from '../services/profile.service';
import { AuthenticatedRequest } from '../interfaces';
import { validationResult } from 'express-validator';

export class ProfileController {
  /**
   * 获取当前用户的公开资料
   */
  async getCurrentUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const profile = await userProfileService.getUserProfileWithMedia(userId);

      if (!profile) {
        res.status(404).json({ message: '用户公开资料不存在' });
        return;
      }

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error('获取用户公开资料失败:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  }

  /**
   * 根据用户ID获取公开资料
   */
  async getUserProfileByUserId(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({ message: '用户ID参数缺失' });
        return;
      }

      const profile = await userProfileService.getUserProfileWithMedia(userId);

      if (!profile || !profile.isPublic) {
        res.status(404).json({ message: '用户公开资料不存在或未公开' });
        return;
      }

      // 增加浏览次数
      await userProfileService.incrementViewCount(userId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error('获取用户公开资料失败:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  }

  /**
   * 创建或更新用户公开资料
   */
  async createOrUpdateUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: '参数验证失败', errors: errors.array() });
        return;
      }

      const userId = req.user!.id;
      const {
        displayName,
        bio,
        avatarFileId,
        coverFileId,
        selectedWorkIds,
        selectedFileIds,
        mediaOrder,
        isPublic,
        socialLinks,
        contactInfo,
      } = req.body;

      // 检查是否已存在公开资料
      let profile = await userProfileService.getUserProfileByUserId(userId);

      if (profile) {
        // 更新现有资料
        profile = await userProfileService.updateUserProfile(userId, {
          displayName,
          bio,
          avatarFileId,
          coverFileId,
          selectedWorkIds,
          selectedFileIds,
          mediaOrder,
          isPublic,
          socialLinks,
          contactInfo,
        });
      } else {
        // 创建新资料
        profile = await userProfileService.createUserProfile({
          userId,
          displayName,
          bio,
          avatarFileId,
          coverFileId,
          selectedWorkIds,
          selectedFileIds,
          mediaOrder,
          isPublic: isPublic ?? true,
          viewCount: 0,
          socialLinks,
          contactInfo,
        });
      }

      res.json({
        success: true,
        data: profile,
        message: profile ? '用户公开资料更新成功' : '用户公开资料创建成功',
      });
    } catch (error) {
      console.error('创建/更新用户公开资料失败:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  }

  /**
   * 更新媒体排序
   */
  async updateMediaOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: '参数验证失败', errors: errors.array() });
        return;
      }

      const userId = req.user!.id;
      const { mediaOrder } = req.body;

      const profile = await userProfileService.updateMediaOrder(userId, mediaOrder);

      if (!profile) {
        res.status(404).json({ message: '用户公开资料不存在' });
        return;
      }

      res.json({
        success: true,
        data: profile,
        message: '媒体排序更新成功',
      });
    } catch (error) {
      console.error('更新媒体排序失败:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  }

  /**
   * 添加作品到公开资料
   */
  async addWorkToProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: '参数验证失败', errors: errors.array() });
        return;
      }

      const userId = req.user!.id;
      const { workId } = req.body;

      const profile = await userProfileService.addWorkToProfile(userId, workId);

      if (!profile) {
        res.status(404).json({ message: '用户公开资料不存在' });
        return;
      }

      res.json({
        success: true,
        data: profile,
        message: '作品添加成功',
      });
    } catch (error) {
      console.error('添加作品失败:', error);
      if (error instanceof Error && error.message.includes('作品不存在')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '服务器内部错误' });
      }
    }
  }

  /**
   * 从公开资料移除作品
   */
  async removeWorkFromProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { workId } = req.params;

      if (!workId) {
        res.status(400).json({ message: '作品ID参数缺失' });
        return;
      }

      const profile = await userProfileService.removeWorkFromProfile(userId, workId);

      if (!profile) {
        res.status(404).json({ message: '用户公开资料不存在' });
        return;
      }

      res.json({
        success: true,
        data: profile,
        message: '作品移除成功',
      });
    } catch (error) {
      console.error('移除作品失败:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  }

  /**
   * 添加文件到公开资料
   */
  async addFileToProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: '参数验证失败', errors: errors.array() });
        return;
      }

      const userId = req.user!.id;
      const { fileId } = req.body;

      const profile = await userProfileService.addFileToProfile(userId, fileId);

      if (!profile) {
        res.status(404).json({ message: '用户公开资料不存在' });
        return;
      }

      res.json({
        success: true,
        data: profile,
        message: '文件添加成功',
      });
    } catch (error) {
      console.error('添加文件失败:', error);
      if (error instanceof Error && error.message.includes('文件不存在')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '服务器内部错误' });
      }
    }
  }

  /**
   * 从公开资料移除文件
   */
  async removeFileFromProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { fileId } = req.params;

      if (!fileId) {
        res.status(400).json({ message: '文件ID参数缺失' });
        return;
      }

      const profile = await userProfileService.removeFileFromProfile(userId, fileId);

      if (!profile) {
        res.status(404).json({ message: '用户公开资料不存在' });
        return;
      }

      res.json({
        success: true,
        data: profile,
        message: '文件移除成功',
      });
    } catch (error) {
      console.error('移除文件失败:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  }

  /**
   * 获取用户可选择的作品列表
   */
  async getUserAvailableWorks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const works = await userProfileService.getUserAvailableWorks(userId);

      res.json({
        success: true,
        data: works,
      });
    } catch (error) {
      console.error('获取可选作品列表失败:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  }

  /**
   * 获取用户可选择的文件列表
   */
  async getUserAvailableFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const files = await userProfileService.getUserAvailableFiles(userId);

      res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      console.error('获取可选文件列表失败:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  }

  /**
   * 获取公开的用户资料列表
   */
  async getPublicUserProfiles(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await userProfileService.getPublicUserProfiles(page, limit);

      res.json({
        success: true,
        data: result.profiles,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      console.error('获取公开用户资料列表失败:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  }

  /**
   * 删除用户公开资料
   */
  async deleteUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const success = await userProfileService.deleteUserProfile(userId);

      if (!success) {
        res.status(404).json({ message: '用户公开资料不存在' });
        return;
      }

      res.json({
        success: true,
        message: '用户公开资料删除成功',
      });
    } catch (error) {
      console.error('删除用户公开资料失败:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  }
}

export const profileController = new ProfileController();

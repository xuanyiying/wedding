import { Request, Response } from 'express';
import ProfileService from '../services/profile.service';
import { AuthenticatedRequest } from '../interfaces';
import { Resp } from '@/utils/response';
import { FileType } from '@/types';

export class ProfileController {
  async createMediaProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    const { fileId, mediaOrder, fileType } = req.body;
    if (!fileId) {
      Resp.badRequest(res, '请提供文件ID');
      return;
    }
    if (!mediaOrder) {
      Resp.badRequest(res, '请提供媒体排序序号');
      return;
    }
    if (!userId) {
      Resp.badRequest(res, '用户ID不存在');
      return;
    }

    const mediaProfiles = await ProfileService.createMediaProfile({
      mediaOrder,
      userId,
      fileId,
      fileType: fileType as FileType,
    });
    Resp.success(res, mediaProfiles);
  }
  async updateMediaOrder(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      Resp.badRequest(res, '用户ID不存在');
      return;
    }
    const medias = req.body.mediaOrder;
    if (!medias || !Array.isArray(medias)) {
      Resp.badRequest(res, '参数错误');
      return;
    }
    await ProfileService.updateMediaProfilesOrder(userId, medias);
    Resp.success(res, '更新成功');
  }

  async updateMediaProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      Resp.badRequest(res, '用户ID不存在');
      return;
    }
    const mediaProfile = req.body.mediaProfile;
    if (!mediaProfile) {
      Resp.badRequest(res, '参数错误');
      return;
    }
    await ProfileService.updateMediaProfile(userId, mediaProfile);
    Resp.success(res, '更新成功');
  };

  async getUserMediaProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      Resp.badRequest(res, '用户ID不存在');
      return;
    }
    const mediaProfile = await ProfileService.getUserMediaProfile(userId);
    Resp.success(res, mediaProfile);
  }
  async deleteMediaProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      Resp.badRequest(res, '用户ID不存在');
      return;
    }
    const { fileId } = req.params;
    if (!fileId) {
      Resp.badRequest(res, '请提供文件ID');
      return;
    }
    await ProfileService.deleteMediaProfile(userId, fileId);
    Resp.success(res, '删除成功');
  }

  async getMediaProfileById(req: Request, res: Response): Promise<void> {
    const { fileId } = req.params;
    if (!fileId) {
      Resp.badRequest(res, '请提供文件ID');
      return;
    }
    const mediaProfile = await ProfileService.getMediaProfileById(fileId);
    Resp.success(res, mediaProfile);
  }

  /**
   * 批量 create media profiles
   * 
   */
  async batchCreateMediaProfiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      Resp.badRequest(res, '用户ID不存在');
      return;
    }
    const { mediaProfiles } = req.body;
    if (!mediaProfiles || !Array.isArray(mediaProfiles)) {
      Resp.badRequest(res, '参数错误');
      return;
    }
    const result = await ProfileService.batchCreateMediaProfile(userId, mediaProfiles);

    Resp.success(res, result);
  }

  // 获取用户资料（包含媒体）
  async getUserProfile(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    if (!userId) {
      Resp.badRequest(res, '请提供用户ID');
      return;
    }

    const profile = await ProfileService.getUserMediaProfile(userId);

    if (!profile) {
      Resp.badRequest(res, '用户资料不存在');
      return;
    }

    Resp.success(res, profile);
  }

  // 创建用户资料
  async createUserProfile(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const profileData = req.body;

    if (!userId) {
      Resp.badRequest(res, '请提供用户ID');
      return;
    }

    const profile = await ProfileService.createMediaProfile({
      ...profileData,
      userId,
    });

    Resp.success(res, profile);
  }

  // 获取公开的用户资料
  async getPublicUserProfiles(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      Resp.badRequest(res, '用户ID不存在');
      return;
    }

    const profiles = await ProfileService.getPublicMediaProfiles(userId);
    Resp.success(res, profiles);
  }

  // 添加文件到资料
  async addFileToProfile(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const { fileId, mediaOrder, fileType } = req.body;

    if (!userId) {
      Resp.badRequest(res, '请提供用户ID');
      return;
    }

    if (!fileId) {
      Resp.badRequest(res, '请提供文件ID');
      return;
    }

    const profile = await ProfileService.createMediaProfile({
      userId,
      fileId,
      mediaOrder,
      fileType: fileType as FileType,
    });

    Resp.success(res, profile);
  }

  // 从资料中移除文件
  async removeFileFromProfile(req: Request, res: Response): Promise<void> {
    const { userId, fileId } = req.params;

    if (!userId) {
      Resp.badRequest(res, '请提供用户ID');
      return;
    }

    if (!fileId) {
      Resp.badRequest(res, '请提供文件ID');
      return;
    }

    await ProfileService.deleteMediaProfile(userId, fileId);

    Resp.success(res, '文件移除成功');
  }

  // 获取用户可用文件
  async getUserAvailableFiles(req: Request, res: Response): Promise<void> {
    let { userId } = req.params;
    // 如果路径参数中没有userId，尝试从查询参数获取
    if (!userId) {
      userId = req.query.userId as string;
    }
    // 如果还是没有，尝试从认证用户获取
    if (!userId) {
      userId = req.user?.id;
    }
    if (!userId) {
      Resp.badRequest(res, '用户ID不存在');
      return;
    }
    const files = await ProfileService.getUserAvailableFiles(userId);
    Resp.success(res, files);
  }

  // 批量删除媒体资料
  async batchDeleteMediaProfiles(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      Resp.badRequest(res, '用户ID不存在');
      return;
    }

    const { fileIds } = req.body;
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      Resp.badRequest(res, '请提供要删除的文件ID列表');
      return;
    }

    const result = await ProfileService.deleteMediaProfiles(userId, fileIds);
    if (result) {
      Resp.success(res, '批量删除成功');
    } else {
      Resp.badRequest(res, '删除失败，未找到相关文件');
    }
  }

  // 更新单个媒体资料
  async updateSingleMediaProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      Resp.badRequest(res, '用户ID不存在');
      return;
    }

    const { fileId } = req.params;
    const updateData = req.body;

    if (!fileId) {
      Resp.badRequest(res, '请提供文件ID');
      return;
    }

    const result = await ProfileService.updateSingleMediaProfile(userId, fileId, updateData);
    Resp.success(res, result);
  }

  // 获取用户媒体资料列表
  async getUserMediaProfiles(req: Request, res: Response): Promise<void> {
    const { userId } = req.params
    if (!userId) {
      Resp.badRequest(res, '用户ID不存在');
      return;
    }

    const mediaProfiles = await ProfileService.getUserMediaProfiles(userId);
    Resp.success(res, mediaProfiles);
  }

  // 更新媒体资料排序
  async updateMediaProfilesOrder(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      Resp.badRequest(res, '用户ID不存在');
      return;
    }

    const { orderData } = req.body;
    if (!Array.isArray(orderData)) {
      Resp.badRequest(res, '排序数据格式错误');
      return;
    }

    await ProfileService.updateMediaProfilesOrder(userId, orderData);
    Resp.success(res, '排序更新成功');
  }
}
export const profileController = new ProfileController();

import MediaProfile, { MediaProfileAttributes, MediaProfileCreationAttributes } from '../models/MediaProfile';
import File from '../models/File';
import User from '../models/User';
import { UserMediaProfile } from '@/interfaces';
import { UserService } from './user.service';
import { generateId } from '@/utils/id.generator';
import logger from '@/utils/logger';
import { FileService } from './file.service';
import { FileCategory, OssType } from '@/types';
import { Op } from 'sequelize';

export class MediaProfileService {
  async getMediaProfileById(id: string) {
    return await MediaProfile.findByPk(id);
  }
  /**
   * 创建用户公开资料
   */
  async createMediaProfile(data: MediaProfileCreationAttributes): Promise<MediaProfile> {
    if (!data.id) {
      data.id = generateId();
    }
    if(!data.mediaOrder){
      // 获取当前用 MediaProfile 的mediaOrder最大值
      const maxOrder = await MediaProfile.max('mediaOrder', { where: { userId :data.userId } });
      data.mediaOrder = maxOrder !== null ? Number(maxOrder) + 1 : 1;
    }
    return await MediaProfile.create(data);
  }

  /**
   * 根据用户ID获取用户公开资料
   */
  async getPublicMediaProfiles(userId: string): Promise<MediaProfile[] | null> {
    const user = await UserService.getUserById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    return await MediaProfile.findAll({
      where: { userId },
      include: [
        {
          model: File,
          as: 'file',
          attributes: ['id', 'originalName', 'filename', 'filePath', 'fileUrl', 'fileSize', 'mimeType', 'width', 'height', 'duration', 'thumbnailUrl', 'hashMd5', 'hashSha256', 'ossType', 'bucketName', 'isPublic', 'downloadCount', 'metadata', 'category', 'createdAt', 'updatedAt', 'deletedAt'],
        }
      ],
      order: [['mediaOrder', 'ASC']],
    });
  }

  /**
   * 获取用户的媒体资料
   */
  async getUserMediaProfile(userId: string): Promise<UserMediaProfile | null> {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'phone', 'avatarUrl', 'role', 'status', 'createdAt', 'updatedAt'],
    });
    if (!user) {
      return null;
    }

    const files = await MediaProfile.findAll({
      where: { userId },
      include: [
        {
          model: File,
          as: 'file',
          attributes: ['id', 'originalName', 'filename', 'filePath', 'fileUrl', 'fileSize', 'mimeType', 'width', 'height', 'duration', 'thumbnailUrl', 'hashMd5', 'hashSha256', 'ossType', 'bucketName', 'isPublic', 'downloadCount', 'metadata', 'category', 'createdAt', 'updatedAt', 'deletedAt'],
        }
      ],
      order: [['mediaOrder', 'ASC']],
    });
    ;

    const userObj = {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      avatar: user.avatarUrl,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    } as any; // 临时使用any类型避免严格类型检查

    return {
      userId,
      user: userObj,
      files: files.map((f) => ({
        id: f.id,
        userId: f.userId,
        fileId: f.fileId,
        mediaOrder: f.mediaOrder,
        fileType: f.fileType,
        originalName: f.file?.originalName || '',
        filename: f.file?.filename || '',
        filePath: f.file?.filePath || '',
        fileUrl: f.file?.fileUrl || '',
        fileSize: f.file?.fileSize || 0,
        mimeType: f.file?.mimeType || '',
        width: f.file?.width || null,
        height: f.file?.height || null,
        duration: f.file?.duration || 0,
        thumbnailUrl: f.file?.thumbnailUrl || '',
        hashMd5: f.file?.hashMd5 || '',
        hashSha256: f.file?.hashSha256 || '',
        ossType: f.file?.ossType || OssType.minio,
        bucketName: f.file?.bucketName || '',
        isPublic: f.file?.isPublic || false,
        downloadCount: f.file?.downloadCount || 0,
        metadata: f.file?.metadata || {},
        category: f.file?.category || FileCategory.OTHER,
      })).filter(f => f.originalName !== ''), // 过滤掉没有关联文件的记录
    };
  }

  /**
   * 获取用户完整资料（用户信息 + 媒体文件）- 用于profile路由
   */
  async getUserProfile(userId: string): Promise<UserMediaProfile | null> {
    return this.getUserMediaProfile(userId);
  }

  /**
   * 批量更新用户公开资料
   */
  async updateMediaProfile(userId: string, data: Partial<MediaProfileAttributes>[]): Promise<MediaProfile[]> {
    const profiles = await MediaProfile.findAll({ where: { userId } });
    if (!profiles || profiles.length === 0) {
      throw new Error('用户档案不存在');
    }
    for (const profileData of data) {
      const profile = profiles.find((p: MediaProfile) => p.id === profileData.id);
      if (!profile) {
        throw new Error('用户档案不存在');
      }
      await profile.update(profileData);
    }
    return profiles;
  }

  /**
   * 获取用户媒体资料列表
   */
  async getUserMediaProfiles(userId: string): Promise<MediaProfile[]> {
    logger.info(`获取用户媒体资料列表，用户ID：${userId}`);
    return await MediaProfile.findAll({
      where: { userId },
      include: [
        {
          model: File,
          as: 'file',
          attributes: ['id', 'originalName', 'filename', 'filePath', 'fileUrl', 'fileSize', 'mimeType', 'width', 'height', 'duration', 'thumbnailUrl', 'hashMd5', 'hashSha256', 'ossType', 'bucketName', 'isPublic', 'downloadCount', 'metadata', 'category', 'createdAt', 'updatedAt'],
          where: { deletedAt: null } // 只关联未删除的文件
        }
      ],
      order: [['mediaOrder', 'ASC']]
    });
  }

  /**
   * 更新媒体资料排序
   */
  async updateMediaProfilesOrder(userId: string, orderData: Array<{ id: string; mediaOrder: number }>): Promise<void> {
    for (const item of orderData) {
      await MediaProfile.update(
        { mediaOrder: item.mediaOrder },
        {
          where: { id: item.id, userId }
        }
      );
    }
  }

  /**
   * 批量删除用户公开资料
   */
  async deleteMediaProfiles(userId: string, ids: string[]): Promise<boolean> {
    const profiles = await MediaProfile.findAll({ where: { userId, id: { [Op.in]: ids} }});
    if (!profiles || profiles.length === 0) {
      return false;
    }

    await FileService.deleteFiles(profiles.map(p => p.fileId), userId);
    await MediaProfile.destroy({ where: { userId, id: ids } });
    return true;
  }

  /**
   * 删除用户公开资料
   */
  async deleteMediaProfile(userId: string, id: string): Promise<boolean> {
    const profile = await MediaProfile.findByPk(id);
    if (!profile) {
      return false;
    }
    const fileId = profile.fileId;
    // 1. 删除关联记录，确保从用户资料中移除
    await profile.destroy();

    await FileService.deleteFile(fileId, userId);

    return true;
  }


  /**
   * 批量创建媒体资料
   */
  async batchCreateMediaProfile(userId: string, mediaProfiles: Partial<MediaProfileCreationAttributes>[]): Promise<MediaProfile[]> {
    // 获取当前用 MediaProfile 的mediaOrder最大值
    const maxOrder = await MediaProfile.max('mediaOrder', { where: { userId } });
    const profilesWithIds = mediaProfiles.map((p, index) => {
      const profile: MediaProfileCreationAttributes = {
        id: p.id || generateId(),
        userId,
        fileId: p.fileId!,
        fileType: p.fileType!,
        mediaOrder: p.mediaOrder ?? (maxOrder !== null ? Number(maxOrder) + index + 1 : index + 1),
      };
      return profile;
    });

    return await MediaProfile.bulkCreate(profilesWithIds);
  }

  /**
   * 添加文件到用户资料
   */
  async addFileToProfile(userId: string, fileId: string, options?: {
    mediaOrder?: number;
    fileType?: string;
  }): Promise<MediaProfile> {
    const existingCount = await MediaProfile.count({ where: { userId } });
    const mediaOrder = options?.mediaOrder ?? existingCount;

    const profileData: MediaProfileCreationAttributes = {
      userId,
      fileId,
      mediaOrder,
      fileType: options?.fileType as any || 'image',
    };

    return await this.createMediaProfile(profileData);
  }

  /**
   * 更新单个媒体资料
   */
  async updateSingleMediaProfile(userId: string, fileId: string, updateData: Partial<MediaProfileAttributes>): Promise<MediaProfile> {
    const profile = await MediaProfile.findOne({ where: { userId, fileId } });
    if (!profile) {
      throw new Error('媒体资料不存在');
    }

    await profile.update(updateData);
    return profile;
  }

  /**
   * 从用户资料中移除文件
   */
  async removeFileFromProfile(userId: string, fileId: string): Promise<boolean> {
    return await this.deleteMediaProfile(userId, fileId);
  }

  /**
   * 获取用户可用的文件列表
   */
  async getUserAvailableFiles(userId: string): Promise<File[]> {
    return await File.findAll({
      where: { userId: userId },
      order: [['createdAt', 'DESC']],
    });
  }

}

export default new MediaProfileService();

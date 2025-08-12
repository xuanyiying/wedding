import UserProfile, { UserProfileAttributes, UserProfileCreationAttributes } from '../models/UserProfile';
import User from '../models/User';
import File from '../models/File';
import Work from '../models/Work';
import { Op } from 'sequelize';

export class UserProfileService {
  /**
   * 创建用户公开资料
   */
  async createUserProfile(data: UserProfileCreationAttributes): Promise<UserProfile> {
    return await UserProfile.create(data);
  }

  /**
   * 根据用户ID获取用户公开资料
   */
  async getUserProfileByUserId(userId: string): Promise<UserProfile | null> {
    return await UserProfile.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'nickname'],
        },
        {
          model: File,
          as: 'avatarFile',
          attributes: ['id', 'fileUrl', 'thumbnailUrl'],
        },
        {
          model: File,
          as: 'coverFile',
          attributes: ['id', 'fileUrl', 'thumbnailUrl'],
        },
      ],
    });
  }

  /**
   * 根据ID获取用户公开资料
   */
  async getUserProfileById(id: string): Promise<UserProfile | null> {
    return await UserProfile.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'nickname'],
        },
        {
          model: File,
          as: 'avatarFile',
          attributes: ['id', 'fileUrl', 'thumbnailUrl'],
        },
        {
          model: File,
          as: 'coverFile',
          attributes: ['id', 'fileUrl', 'thumbnailUrl'],
        },
      ],
    });
  }

  /**
   * 获取用户公开资料的完整媒体数据（包含作品和文件）
   */
  async getUserProfileWithMedia(userId: string): Promise<any> {
    const profile = await this.getUserProfileByUserId(userId);
    if (!profile) {
      return null;
    }

    // 获取选中的作品
    let selectedWorks: Work[] = [];
    if (profile.selectedWorkIds && profile.selectedWorkIds.length > 0) {
      selectedWorks = await Work.findAll({
        where: {
          id: { [Op.in]: profile.selectedWorkIds },
          status: 'published',
        },
        attributes: ['id', 'title', 'description', 'type', 'coverUrl', 'contentUrls', 'tags', 'location', 'shootDate'],
      });
    }

    // 获取选中的文件
    let selectedFiles: File[] = [];
    if (profile.selectedFileIds && profile.selectedFileIds.length > 0) {
      selectedFiles = await File.findAll({
        where: {
          id: { [Op.in]: profile.selectedFileIds },
          isPublic: true,
        },
        attributes: ['id', 'originalName', 'fileUrl', 'thumbnailUrl', 'fileType', 'width', 'height', 'duration'],
      });
    }

    // 根据mediaOrder排序媒体数据
    const orderedMedia: Array<{ type: 'work' | 'file'; data: Work | File }> = [];
    if (profile.mediaOrder && profile.mediaOrder.length > 0) {
      for (const mediaId of profile.mediaOrder) {
        const work = selectedWorks.find(w => w.id === mediaId);
        const file = selectedFiles.find(f => f.id === mediaId);
        if (work) {
          orderedMedia.push({ type: 'work', data: work });
        } else if (file) {
          orderedMedia.push({ type: 'file', data: file });
        }
      }
    }

    return {
      ...profile.toJSON(),
      selectedWorks,
      selectedFiles,
      orderedMedia,
    };
  }

  /**
   * 更新用户公开资料
   */
  async updateUserProfile(userId: string, data: Partial<UserProfileAttributes>): Promise<UserProfile | null> {
    const profile = await UserProfile.findOne({ where: { userId } });
    if (!profile) {
      return null;
    }

    await profile.update(data);
    return profile;
  }

  /**
   * 更新媒体排序
   */
  async updateMediaOrder(userId: string, mediaOrder: string[]): Promise<UserProfile | null> {
    const profile = await UserProfile.findOne({ where: { userId } });
    if (!profile) {
      throw new Error('用户档案不存在');
    }

    await profile.updateMediaOrder(mediaOrder);
    return profile;
  }

  /**
   * 添加作品到公开资料
   */
  async addWorkToProfile(userId: string, workId: string): Promise<UserProfile | null> {
    const profile = await UserProfile.findOne({ where: { userId } });
    if (!profile) {
      return null;
    }

    // 验证作品是否属于该用户且已发布
    const work = await Work.findOne({
      where: {
        id: workId,
        userId,
        status: 'published',
      },
    });

    if (!work) {
      throw new Error('作品不存在或未发布');
    }

    await profile.addWork(workId);
    return profile;
  }

  /**
   * 从公开资料移除作品
   */
  async removeWorkFromProfile(userId: string, workId: string): Promise<UserProfile | null> {
    const profile = await UserProfile.findOne({ where: { userId } });
    if (!profile) {
      return null;
    }

    await profile.removeWork(workId);
    return profile;
  }

  /**
   * 添加文件到公开资料
   */
  async addFileToProfile(userId: string, fileId: string): Promise<UserProfile | null> {
    const profile = await UserProfile.findOne({ where: { userId } });
    if (!profile) {
      return null;
    }

    // 验证文件是否属于该用户且公开
    const file = await File.findOne({
      where: {
        id: fileId,
        userId,
        isPublic: true,
      },
    });

    if (!file) {
      throw new Error('文件不存在或未公开');
    }

    await profile.addFile(fileId);
    return profile;
  }

  /**
   * 从公开资料移除文件
   */
  async removeFileFromProfile(userId: string, fileId: string): Promise<UserProfile | null> {
    const profile = await UserProfile.findOne({ where: { userId } });
    if (!profile) {
      return null;
    }

    await profile.removeFile(fileId);
    return profile;
  }

  /**
   * 获取用户可选择的作品列表
   */
  async getUserAvailableWorks(userId: string): Promise<Work[]> {
    return await Work.findAll({
      where: {
        userId,
        status: 'published',
      },
      attributes: ['id', 'title', 'description', 'type', 'coverUrl', 'tags', 'location', 'shootDate', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * 获取用户可选择的文件列表
   */
  async getUserAvailableFiles(userId: string): Promise<File[]> {
    return await File.findAll({
      where: {
        userId,
        isPublic: true,
      },
      attributes: [
        'id',
        'originalName',
        'fileUrl',
        'thumbnailUrl',
        'fileType',
        'width',
        'height',
        'duration',
        'createdAt',
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * 删除用户公开资料
   */
  async deleteUserProfile(userId: string): Promise<boolean> {
    const profile = await UserProfile.findOne({ where: { userId } });
    if (!profile) {
      return false;
    }

    await profile.destroy();
    return true;
  }

  /**
   * 获取公开的用户资料列表（分页）
   */
  async getPublicUserProfiles(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ profiles: UserProfile[]; total: number }> {
    const offset = (page - 1) * limit;

    const { count, rows } = await UserProfile.findAndCountAll({
      where: { isPublic: true },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'nickname'],
        },
        {
          model: File,
          as: 'avatarFile',
          attributes: ['id', 'fileUrl', 'thumbnailUrl'],
        },
      ],
      order: [
        ['viewCount', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit,
      offset,
    });

    return {
      profiles: rows,
      total: count,
    };
  }

  /**
   * 增加浏览次数
   */
  async incrementViewCount(userId: string): Promise<void> {
    const profile = await UserProfile.findOne({ where: { userId } });
    if (profile) {
      await profile.incrementViewCount();
    }
  }
}

export const userProfileService = new UserProfileService();

import { Op, WhereOptions } from 'sequelize';
import {
  Work,
  WorkAttributes,
  WorkCreationAttributes,
  WorkLike,
  User,
} from '../models';
import { logger } from '../utils/logger';
import { WorkType, WorkCategory, WorkStatus } from '../types';
import { FileService } from './file.service';

interface GetWorksParams {
  page: number;
  pageSize: number;
  userId?: string;
  type?: WorkType;
  category?: WorkCategory;
  status?: WorkStatus;
  isFeatured?: boolean;
  keyword?: string;
  tags?: string[];
  sortBy?: 'createdAt' | 'viewCount' | 'likeCount' | 'shareCount';
  sortOrder?: 'ASC' | 'DESC';
}

interface GetPublicWorksParams {
  page: number;
  pageSize: number;
  type?: WorkType;
  category?: WorkCategory;
  isFeatured?: boolean;
  keyword?: string;
  tags?: string[];
  sortBy?: 'createdAt' | 'viewCount' | 'likeCount' | 'shareCount';
  sortOrder?: 'ASC' | 'DESC';
}

export class WorkService {
  /**
   * 获取作品列表
   */
  static async getWorks(params: GetWorksParams) {
    const {
      page,
      pageSize,
      userId,
      type,
      category,
      status,
      isFeatured,
      keyword,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = params;
    const offset = (page - 1) * pageSize;

    const where: WhereOptions = {};

    if (userId) {
      where.userId = userId;
    }

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (keyword) {
      (where as any)[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
        { location: { [Op.like]: `%${keyword}%` } },
      ];
    }

    if (tags && tags.length > 0) {
      where.tags = {
        [Op.overlap]: tags,
      };
    }

    const { count, rows } = await Work.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatarUrl'],
        },
      ],
      order: [[sortBy, sortOrder]],
      limit: pageSize,
      offset,
    });

    return {
      works: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  }

  /**
   * 获取作品详情
   */
  static async getWorkById(id: string, currentUserId?: string) {
    const work = await Work.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatarUrl', 'bio'],
        },
      ],
    });

    if (!work) {
      throw new Error('作品不存在');
    }

    // 检查是否已点赞（如果用户已登录）
    let isLiked = false;
    if (currentUserId) {
      const like = await WorkLike.findOne({
        where: {
          workId: id,
          userId: currentUserId,
        },
      });
      isLiked = !!like;
    }

    return {
      ...work.toJSON(),
      isLiked,
    };
  }

  /**
   * 创建作品
   */
  static async createWork(data: WorkCreationAttributes) {
    // 验证必填字段
    if (!data.title || !data.type || !data.category) {
      throw new Error('验证失败：标题、类型和分类为必填项');
    }

    // 验证内容URL
    if (data.contentUrls && data.contentUrls.length === 0) {
      throw new Error('验证失败：至少需要上传一张作品图片');
    }

    // 如果是视频作品，且没有提供封面，则自动生成封面
    if (data.type === WorkType.VIDEO && !data.coverUrl) {
      if (data.contentUrls && data.contentUrls.length > 0) {
        const videoUrl = data.contentUrls[0];
        try {
          if (!data.userId ) {
            throw new Error('用户ID不能为空');
          } 
          if (!videoUrl) {
            throw new Error('请上传视频文件');
          }
          const coverUrl = await FileService.generateVideoCover(videoUrl, data.userId);
            data.coverUrl = coverUrl;
        } catch (error) {
          logger.error('生成视频封面失败:', error);
          // 可以选择抛出错误，或者允许在没有封面的情况下创建
          throw new Error('生成视频封面失败');
        }
      }
    }

    const work = await Work.create({
      ...data,
      status: WorkStatus.DRAFT, // 默认为草稿状态
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
    });

    return this.getWorkById(work.id);
  }

  /**
   * 更新作品
   */
  static async updateWork(id: string, data: Partial<WorkAttributes>, currentUserId: string) {
    const work = await Work.findOne({
      where: { id },
    });

    if (!work) {
      throw new Error('作品不存在');
    }

    // 检查权限
    if (work.userId !== currentUserId ) {
      throw new Error('无权限操作此作品');
    }

    // 如果是已发布的作品，某些字段不能修改
    if (work.status === WorkStatus.PUBLISHED) {
      const restrictedFields = ['type', 'category'];
      for (const field of restrictedFields) {
        if (data[field as keyof WorkAttributes] !== undefined) {
          throw new Error(`已发布的作品不能修改${field}`);
        }
      }
    }

    await work.update(data);
    return this.getWorkById(id);
  }

  /**
   * 删除作品
   */
  static async deleteWork(id: string, currentUserId: string) {
    const work = await Work.findOne({
      where: { id },
    });

    if (!work) {
      throw new Error('作品不存在');
    }

    // 检查权限
    if (work.userId !== currentUserId) {
      throw new Error('无权限操作此作品');
    }

    // 软删除
    await work.update({ deletedAt: new Date() });

    logger.info(`作品已删除: ${id}, 操作用户: ${currentUserId}`);
  }

  /**
   * 发布作品
   */
  static async publishWork(id: string, currentUserId: string) {
    const work = await Work.findOne({
      where: { id },
    });

    if (!work) {
      throw new Error('作品不存在');
    }

    // 检查权限
    if (work.userId !== currentUserId) {
      throw new Error('无权限操作此作品');
    }

    // 检查状态
    if (work.status !== WorkStatus.DRAFT) {
      throw new Error('状态不允许：只有草稿状态的作品才能发布');
    }

    // 验证发布条件
    if (!work.title || !work.coverUrl || !work.contentUrls || work.contentUrls.length === 0) {
      throw new Error('发布失败：作品信息不完整（需要标题、封面和内容图片）');
    }

    await work.publish();
    return this.getWorkById(id);
  }

  /**
   * 取消发布作品
   */
  static async unpublishWork(id: string, currentUserId: string) {
    const work = await Work.findOne({
      where: { id },
    });

    if (!work) {
      throw new Error('作品不存在');
    }

    // 检查权限
    if (work.userId !== currentUserId) {
      throw new Error('无权限操作此作品');
    }

    // 检查状态
    if (work.status !== WorkStatus.PUBLISHED) {
      throw new Error('状态不允许：只有已发布的作品才能取消发布');
    }

    await work.unpublish();
    return this.getWorkById(id);
  }

  /**
   * 点赞作品
   */
  static async likeWork(workId: string, userId: string) {
    const work = await Work.findOne({
      where: { id: workId, status: WorkStatus.PUBLISHED },
    });

    if (!work) {
      throw new Error('作品不存在或未发布');
    }

    // 检查是否已点赞
    const existingLike = await WorkLike.findOne({
      where: { workId, userId },
    });

    if (existingLike) {
      throw new Error('已经点赞过此作品');
    }

    // 创建点赞记录
    await WorkLike.create({ workId, userId });

    // 更新作品点赞数
    await work.increment('likeCount');

    logger.info(`用户 ${userId} 点赞作品 ${workId}`);

    return { message: '点赞成功' };
  }

  /**
   * 取消点赞作品
   */
  static async unlikeWork(workId: string, userId: string) {
    const work = await Work.findOne({
      where: { id: workId },
    });

    if (!work) {
      throw new Error('作品不存在');
    }

    // 查找点赞记录
    const like = await WorkLike.findOne({
      where: { workId, userId },
    });

    if (!like) {
      throw new Error('尚未点赞此作品');
    }

    // 删除点赞记录
    await like.destroy();

    // 更新作品点赞数
    await work.decrement('likeCount');

    logger.info(`用户 ${userId} 取消点赞作品 ${workId}`);

    return { message: '取消点赞成功' };
  }

  /**
   * 增加作品浏览量
   */
  static async incrementViewCount(id: string) {
    const work = await Work.findOne({
      where: { id, status: WorkStatus.PUBLISHED },
    });

    if (!work) {
      throw new Error('作品不存在或未发布');
    }

    await work.increment('viewCount');

    return { message: '浏览量已更新' };
  }

  /**
   * 获取精选作品
   */
  static async getFeaturedWorks(limit = 10) {
    const works = await Work.findAll({
        where: {
          status: WorkStatus.PUBLISHED,
          isFeatured: true,
        },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatarUrl'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
    });

    return works;
  }

  /**
   * 设置作品为精选
   */
  static async setWorkFeatured(id: string, isFeatured: boolean, currentUserId: string) {
    const work = await Work.findOne({
      where: { id },
    });

    if (!work) {
      throw new Error('作品不存在');
    }

    // 这里应该检查管理员权限，暂时允许作品所有者操作
    if (work.userId !== currentUserId) {
      throw new Error('无权限操作此作品');
    }

    // 只有已发布的作品才能设为精选
    if (work.status !== WorkStatus.PUBLISHED) {
      throw new Error('只有已发布的作品才能设为精选');
    }

    await work.update({ isFeatured });

    logger.info(`作品 ${id} ${isFeatured ? '设为' : '取消'}精选, 操作用户: ${currentUserId}`);

    return this.getWorkById(id);
  }

  /**
   * 获取用户作品统计
   */
  static async getUserWorkStats(userId: string) {
    const [total, published, draft, archived, totalViews, totalLikes] = await Promise.all([
      Work.count({ where: { userId } }),
      Work.count({ where: { userId, status: WorkStatus.PUBLISHED } }),
      Work.count({ where: { userId, status: WorkStatus.DRAFT } }),
      Work.count({ where: { userId, status: WorkStatus.ARCHIVED } }),
      Work.sum('viewCount', { where: { userId } }) || 0,
      Work.sum('likeCount', { where: { userId } }) || 0,
    ]);

    return {
      total,
      published,
      draft,
      archived,
      totalViews,
      totalLikes,
    };
  }

  /**
   * 获取公开作品列表
   */
  static async getPublicWorks(params: GetPublicWorksParams) {
    const {
      page,
      pageSize,
      type,
      category,
      isFeatured,
      keyword,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = params;
    const offset = (page - 1) * pageSize;

    const where: WhereOptions = {
        status: WorkStatus.PUBLISHED,
      };

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (keyword) {
      (where as any)[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
        { location: { [Op.like]: `%${keyword}%` } },
      ];
    }

    if (tags && tags.length > 0) {
      where.tags = {
        [Op.overlap]: tags,
      };
    }

    const { count, rows } = await Work.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatarUrl'],
          where: { status: 'active' },
        },
      ],
      order: [[sortBy, sortOrder]],
      limit: pageSize,
      offset,
    });

    return {
      works: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  }

  /**
   * 获取热门作品
   */
  static async getPopularWorks(limit = 10, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const works = await Work.findAll({
      where: {
        status: WorkStatus.PUBLISHED,
        createdAt: {
          [Op.gte]: startDate,
        },
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatarUrl'],
        },
      ],
      order: [
        ['viewCount', 'DESC'],
        ['likeCount', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit,
    });

    return works;
  }

  /**
   * 获取相关作品
   */
  static async getRelatedWorks(workId: string, limit = 6) {
    const work = await Work.findByPk(workId);
    if (!work) {
      return [];
    }

    const where: WhereOptions = {
      status: WorkStatus.PUBLISHED,
      id: { [Op.ne]: workId },
    };

    // 优先匹配同类型和同分类的作品
    const relatedWorks = await Work.findAll({
      where: {
        ...where,
        ...({
          [Op.or]: [{ type: work.type, category: work.category }, { type: work.type }, { category: work.category }],
        } as any),
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'avatarUrl'],
        },
      ],
      order: [
        ['viewCount', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit,
    });

    return relatedWorks;
  }
}

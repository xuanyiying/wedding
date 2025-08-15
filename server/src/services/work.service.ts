import { Op, WhereOptions } from 'sequelize';
import { Work, WorkAttributes, WorkCreationAttributes, WorkLike, User } from '../models';
import { logger } from '../utils/logger';
import { WorkType, WorkCategory, WorkStatus } from '../types';
import File from '../models/File';

interface GetWorksParams {
  page: number;
  pageSize: number;
  userId?: string;
  teamId?: string;
  type?: WorkType;
  category?: WorkCategory;
  status?: WorkStatus;
  isFeatured?: boolean;
  keyword?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
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
      teamId,
      type,
      category,
      status,
      isFeatured,
      keyword,
      tags,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = params;
    const offset = (page - 1) * pageSize;

    const where: WhereOptions = {};
    const include: any[] = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'nickname', 'realName', 'avatarUrl', 'role', 'phone', 'bio'],
      },
    ];

    if (userId) {
      where.userId = userId;
    }

    // 处理teamId过滤 - 通过关联查询团队成员
    if (teamId) {
      include.push({
        model: User,
        as: 'user',
        attributes: ['id', 'nickname', 'realName', 'avatarUrl', 'role', 'phone', 'bio'],
        include: [
          {
            model: require('../models').TeamMember,
            as: 'teamMemberships',
            where: { teamId },
            required: true,
            attributes: [],
          },
        ],
        required: true,
      });
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

    if (isFeatured !== undefined && isFeatured) {
      where.isFeatured = isFeatured;
    }

    // 日期范围过滤
    if (dateFrom || dateTo) {
      const dateWhere: any = {};
      if (dateFrom) {
        dateWhere[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        dateWhere[Op.lte] = new Date(dateTo);
      }
      where.weddingDate = dateWhere;
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
      include: teamId
        ? include
        : [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'nickname', 'realName', 'avatarUrl', 'role', 'phone', 'bio'],
          },
        ],
      order: [[sortBy, sortOrder]],
      limit: pageSize,
      offset,
      distinct: true, // 避免关联查询时的重复计数
    });
    logger.info('获取作品列表成功:', { count, rows });
    const worksWithFiles = await WorkService.setFiles(rows);
    return {
      count,
      works: worksWithFiles,
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

    // 手动填充files属性
    const workJson = work.toJSON();
    if (workJson.fileIds && workJson.fileIds.length > 0) {
      const files = await File.findAll({
        where: {
          id: workJson.fileIds,
        },
        attributes: ['id', 'originalName', 'filename', 'fileUrl', 'fileSize', 'mimeType', 'fileType', 'width', 'height', 'duration', 'thumbnailUrl'],
      });
      workJson.files = files;
    } else {
      workJson.files = [];
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
      ...workJson,
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
    if (data.fileIds && data.fileIds.length === 0) {
      throw new Error('验证失败：至少需要上传一张作品图片');
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
    if (work.userId !== currentUserId) {
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
    if (!work.title || !work.fileIds || work.fileIds.length === 0) {
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
    logger.info('featured works:', works);

    const worksWithFiles = await WorkService.setFiles(works);
    logger.info('Get featured works:', worksWithFiles);
    return worksWithFiles;
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
          attributes: ['id', 'nickname', 'realName', 'avatarUrl'],
          where: { status: 'active' },
        },
      ],
      order: [[sortBy, sortOrder]],
      limit: pageSize,
      offset,
    });

    const worksWithFiles = await WorkService.setFiles(rows);

    return {
      works: worksWithFiles,
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
          attributes: ['id', 'nickname', 'realName', 'avatarUrl'],
        },
      ],
      order: [
        ['viewCount', 'DESC'],
        ['likeCount', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit,
    });

    return await WorkService.setFiles(works);

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
        [Op.or]: [{ type: work.type, category: work.category }, { type: work.type }, { category: work.category }],
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nickname', 'realName', 'avatarUrl', 'role', 'phone', 'bio'],
        },
      ],
      order: [
        ['viewCount', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit,
    });

    return await WorkService.setFiles(relatedWorks);
  }
  
  static async setFiles(works: Work[]) {
    // 手动填充files属性
    const worksWithFiles = await Promise.all(
      works.map(async (work) => {
        const workJson = work.toJSON();
        if (workJson.fileIds && workJson.fileIds.length > 0) {
          const files = await File.findAll({
            where: {
              id: workJson.fileIds,
            },
            attributes: ['id', 'originalName', 'filename', 'fileUrl', 'fileSize', 'mimeType', 'fileType', 'width', 'height', 'duration', 'thumbnailUrl'],
          });
          workJson.files = files;
        } else {
          workJson.files = [];
        }
        return workJson;
      })
    );
    logger.info('Set files for works' ,worksWithFiles);
    return worksWithFiles;
  };

}


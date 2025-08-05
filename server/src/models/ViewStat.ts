import { Model, DataTypes, Sequelize, Optional, Op } from 'sequelize';

// Interface for PageViewStat attributes
export interface ViewStatAttributes {
  id: string;
  pageType: 'team_member' | 'work' | 'homepage';
  pageId: string | null; // team member id, work id, or null for homepage
  visitorIp: string;
  userAgent: string | null;
  referer: string | null;
  sessionId: string | null;
  visitDate: Date; // 访问日期（用于统计）
  duration: number; // 停留时长（秒）
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for PageViewStat creation attributes
export interface ViewStatCreationAttributes extends Optional<ViewStatAttributes, 'id'> {}

class ViewStat
  extends Model<ViewStatAttributes, ViewStatCreationAttributes>
  implements ViewStatAttributes
{
  public id!: string;
  public pageType!: 'team_member' | 'work' | 'homepage';
  public pageId!: string | null;
  public visitorIp!: string;
  public userAgent!: string | null;
  public referer!: string | null;
  public sessionId!: string | null;
  public visitDate!: Date;
  public duration!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Static method to record a page view
  public static async recordView(data: {
    pageType: 'team_member' | 'work' | 'homepage';
    pageId?: string;
    visitorIp: string;
    userAgent?: string;
    referer?: string;
    sessionId?: string;
    duration?: number;
  }): Promise<ViewStat> {
    return this.create({
      pageType: data.pageType,
      pageId: data.pageId || null,
      visitorIp: data.visitorIp,
      userAgent: data.userAgent || null,
      referer: data.referer || null,
      sessionId: data.sessionId || null,
      visitDate: new Date(),
      duration: data.duration || 0,
    });
  }

  // Static method to get view count for a specific page
  public static async getViewCount(pageType: string, pageId?: string): Promise<number> {
    const where: any = { pageType };
    if (pageId) {
      where.pageId = pageId;
    } else {
      where.pageId = null;
    }
    
    return this.count({ where });
  }

  // Static method to get unique view count (by IP) for a specific page
  public static async getUniqueViewCount(pageType: string, pageId?: string): Promise<number> {
    const where: any = { pageType };
    if (pageId) {
      where.pageId = pageId;
    } else {
      where.pageId = null;
    }

    const result = await this.findAll({
      where,
      attributes: [[Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('visitor_ip'))), 'count']],
      raw: true,
    });
    return (result[0] as any).count || 0;
  }

  // Static method to get view statistics for multiple pages
  public static async getViewStatistics(pageType: string, pageIds?: string[]) {
    const where: any = { pageType };
    if (pageIds && pageIds.length > 0) {
      where.pageId = pageIds;
    }

    const result = await this.findAll({
      where,
      attributes: [
        'pageId',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalViews'],
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('visitor_ip'))), 'uniqueViews'],
        [Sequelize.fn('AVG', Sequelize.col('duration')), 'avgDuration'],
      ],
      group: ['pageId'],
      raw: true,
    });
    return result;
  }

  // Static method to get daily statistics
  public static async getDailyStats(params: {
    pageType?: string;
    pageId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};
    if (params.pageType) where.pageType = params.pageType;
    if (params.pageId) where.pageId = params.pageId;
    if (params.startDate && params.endDate) {
      where.visit_date = {
        [Op.between]: [params.startDate, params.endDate],
      };
    }

    const result = await this.findAll({
      where,
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('visit_date')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalViews'],
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('visitor_ip'))), 'uniqueViews'],
        [Sequelize.fn('AVG', Sequelize.col('duration')), 'avgDuration'],
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('visit_date'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('visit_date')), 'ASC']],
      raw: true,
    });
    return result;
  }

  // Static method to get admin overview statistics
  public static async getAdminStats(days: number = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // 获取总体统计
    const totalStats = await this.findAll({
      where: {
        visitDate: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalViews'],
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('visitor_ip'))), 'uniqueViews'],
      ],
      raw: true,
    });

    // 获取热门作品
    const popularWorks = await this.findAll({
      where: {
        pageType: 'work',
        visitDate: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        'pageId',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalViews'],
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('visitor_ip'))), 'uniqueViews'],
      ],
      group: ['pageId'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true,
    });

    return {
      totalViews: (totalStats[0] as any)?.totalViews || 0,
      uniqueViews: (totalStats[0] as any)?.uniqueViews || 0,
      popularWorks,
    };
  }
}

export const initViewStat = (sequelize: Sequelize): void => {
  ViewStat.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '访问记录ID',
      },
      pageType: {
        type: DataTypes.ENUM('team_member', 'work', 'homepage'),
        allowNull: false,
        field: 'page_type',
        comment: '页面类型',
      },
      pageId: {
        type: DataTypes.UUID,
        field: 'page_id',
        comment: '页面ID（团队成员ID、作品ID或null表示首页）',
      },
      visitorIp: {
        type: new DataTypes.STRING(45), // IPv6 support
        allowNull: false,
        field: 'visitor_ip',
        comment: '访问者IP地址',
      },
      userAgent: {
        type: DataTypes.TEXT,
        field: 'user_agent',
        comment: '用户代理字符串',
      },
      referer: {
        type: DataTypes.TEXT,
        comment: '来源页面',
      },
      sessionId: {
        type: new DataTypes.STRING(128),
        field: 'session_id',
        comment: '会话ID',
      },
      visitDate: {  
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '访问日期',
        field: 'visit_date',
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '停留时长（秒）',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        comment: '创建时间',
      },
        updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
        comment: '更新时间',
      },
    },
    {
      tableName: 'view_stats',
      sequelize,
      timestamps: true,
      comment: '页面访问统计表',
      indexes: [
        { name: 'idx_page_view_stats_page', fields: ['page_type', 'page_id'] },
        { name: 'idx_page_view_stats_ip', fields: ['visitor_ip'] },
        { name: 'idx_page_view_stats_session', fields: ['session_id'] },
        { name: 'idx_page_view_stats_visit_date', fields: ['visit_date'] },
      ],
    },
  );
};

export default ViewStat;

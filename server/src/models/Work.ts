import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import User from './User';
import { WorkType, WorkCategory, WorkStatus } from '../types';

// Work attributes interface
export interface WorkAttributes {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  type: WorkType;
  category: WorkCategory;
  coverUrl: string | null;
  contentUrls: string[] | null;
  tags: string[] | null;
  location: string | null;
  shootDate: Date | null;
  equipmentInfo: any | null;
  technicalInfo: any | null;
  status: WorkStatus;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  sortOrder: number;
  publishedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

// Work creation attributes interface
export interface WorkCreationAttributes extends Optional<WorkAttributes, 'id'> {}

// Work model class
class Work extends Model<WorkAttributes, WorkCreationAttributes> implements WorkAttributes {
  public id!: string;
  public userId!: string;
  public title!: string;
  public description!: string | null;
  public type!: WorkType;
  public category!: WorkCategory;
  public coverUrl!: string | null;
  public contentUrls!: string[] | null;
  public tags!: string[] | null;
  public location!: string | null;
  public shootDate!: Date | null;
  public equipmentInfo!: any | null;
  public technicalInfo!: any | null;
  public status!: WorkStatus;
  public isFeatured!: boolean;
  public viewCount!: number;
  public likeCount!: number;
  public shareCount!: number;
  public sortOrder!: number;
  public publishedAt!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;

  // Associations
  public readonly user?: User;

  // Method to publish a work
  public async publish(): Promise<void> {
    if (this.status === WorkStatus.DRAFT) {
      this.status = WorkStatus.PUBLISHED;
      this.publishedAt = new Date();
      await this.save();
    }
  }

  // Method to unpublish a work
  public async unpublish(): Promise<void> {
    if (this.status === WorkStatus.PUBLISHED) {
      this.status = WorkStatus.DRAFT;
      this.publishedAt = null;
      await this.save();
    }
  }

  // Method to archive a work
  public async archive(): Promise<void> {
    if (this.status === WorkStatus.PUBLISHED) {
      this.status = WorkStatus.ARCHIVED;
      await this.save();
    }
  }
}

export const initWork = (sequelize: Sequelize): void => {
  Work.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '作品ID',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        field: 'user_id',
        comment: '用户ID',
      },
      title: {
        type: new DataTypes.STRING(200),
        allowNull: false,
        comment: '作品标题',
      },
      description: {
        type: DataTypes.TEXT,
        comment: '作品描述',
      },
      type: {
        type: DataTypes.ENUM(...Object.values(WorkType)),
        allowNull: false,
        comment: '作品类型',
      },
      category: {
        type: DataTypes.ENUM(...Object.values(WorkCategory)),
        allowNull: false,
        defaultValue: WorkCategory.WEDDING,
        comment: '作品分类',
      },
      coverUrl: {
        type: new DataTypes.STRING(500),
        field: 'cover_url',
        comment: '封面图片URL',
      },
      contentUrls: {
        type: DataTypes.JSON,
        field: 'content_urls',
        comment: '内容文件URLs',
      },
      tags: {
        type: DataTypes.JSON,
        comment: '标签',
      },
      location: {
        type: new DataTypes.STRING(255),
        comment: '拍摄地点',
      },
      shootDate: {
        type: DataTypes.DATEONLY,
        field: 'shoot_date',
        comment: '拍摄日期',
      },
      equipmentInfo: {
        type: DataTypes.JSON,
        field: 'equipment_info',
        comment: '设备信息',
      },
      technicalInfo: {
        type: DataTypes.JSON,
        field: 'technical_info',
        comment: '技术参数',
      },
      status: {
        type: DataTypes.ENUM(...Object.values(WorkStatus)),
        allowNull: false,
        defaultValue: WorkStatus.DRAFT,
        comment: '发布状态',
      },
      isFeatured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_featured',
        comment: '是否精选',
      },
      viewCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'view_count',
        comment: '浏览次数',
      },
      likeCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'like_count',
        comment: '点赞次数',
      },
      shareCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'share_count',
        comment: '分享次数',
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order',
        comment: '排序权重',
      },
      publishedAt: {
        type: DataTypes.DATE,
        field: 'published_at',
        comment: '发布时间',
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at',
        comment: '创建时间',
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at',
        comment: '更新时间',
      },
      deletedAt: {
        type: DataTypes.DATE,
        field: 'deleted_at',
        comment: '删除时间',
      },
    },
    {
      tableName: 'works',
      sequelize,
      timestamps: true,
      paranoid: true,
      comment: '作品表',
      indexes: [
        { name: 'idx_works_user_id', fields: ['user_id'] },
        { name: 'idx_works_type', fields: ['type'] },
        { name: 'idx_works_category', fields: ['category'] },
        { name: 'idx_works_status', fields: ['status'] },
        { name: 'idx_works_featured', fields: ['is_featured'] },
        { name: 'idx_works_published_at', fields: ['published_at'] },
        { name: 'idx_works_view_count', fields: ['view_count'] },
        { name: 'idx_works_sort_order', fields: ['sort_order'] },
        { name: 'idx_works_created_at', fields: ['created_at'] },
        { name: 'idx_works_deleted_at', fields: ['deleted_at'] },
      ],
    },
  );

  Work.belongsTo(User, { as: 'user', foreignKey: 'userId' });
};

export default Work;

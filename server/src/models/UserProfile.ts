import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import User from './User';
import File from './File';
import Work from './Work';

// UserProfile attributes interface
export interface UserProfileAttributes {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  avatarFileId: string | null;
  coverFileId: string | null;
  selectedWorkIds: string[] | null; // 选中的作品ID数组
  selectedFileIds: string[] | null; // 选中的文件ID数组
  mediaOrder: string[] | null; // 媒体排序数组，包含work和file的ID
  isPublic: boolean;
  viewCount: number;
  socialLinks: any | null;
  contactInfo: any | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// UserProfile creation attributes interface
export interface UserProfileCreationAttributes extends Optional<UserProfileAttributes, 'id'> {}

// UserProfile model class
class UserProfile extends Model<UserProfileAttributes, UserProfileCreationAttributes> implements UserProfileAttributes {
  public id!: string;
  public userId!: string;
  public displayName!: string | null;
  public bio!: string | null;
  public avatarFileId!: string | null;
  public coverFileId!: string | null;
  public selectedWorkIds!: string[] | null;
  public selectedFileIds!: string[] | null;
  public mediaOrder!: string[] | null;
  public isPublic!: boolean;
  public viewCount!: number;
  public socialLinks!: any | null;
  public contactInfo!: any | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;

  // Associations
  public readonly user?: User;
  public readonly avatarFile?: File;
  public readonly coverFile?: File;
  public readonly selectedWorks?: Work[];
  public readonly selectedFiles?: File[];

  // Method to increment view count
  public async incrementViewCount(): Promise<void> {
    this.viewCount += 1;
    await this.save();
  }

  // Method to update media order
  public async updateMediaOrder(mediaIds: string[]): Promise<void> {
    this.mediaOrder = mediaIds;
    await this.save();
  }

  // Method to add work to profile
  public async addWork(workId: string): Promise<void> {
    const currentWorkIds = this.selectedWorkIds || [];
    if (!currentWorkIds.includes(workId)) {
      this.selectedWorkIds = [...currentWorkIds, workId];
      // Add to media order if not exists
      const currentOrder = this.mediaOrder || [];
      if (!currentOrder.includes(workId)) {
        this.mediaOrder = [...currentOrder, workId];
      }
      await this.save();
    }
  }

  // Method to remove work from profile
  public async removeWork(workId: string): Promise<void> {
    const currentWorkIds = this.selectedWorkIds || [];
    this.selectedWorkIds = currentWorkIds.filter(id => id !== workId);
    // Remove from media order
    const currentOrder = this.mediaOrder || [];
    this.mediaOrder = currentOrder.filter(id => id !== workId);
    await this.save();
  }

  // Method to add file to profile
  public async addFile(fileId: string): Promise<void> {
    const currentFileIds = this.selectedFileIds || [];
    if (!currentFileIds.includes(fileId)) {
      this.selectedFileIds = [...currentFileIds, fileId];
      // Add to media order if not exists
      const currentOrder = this.mediaOrder || [];
      if (!currentOrder.includes(fileId)) {
        this.mediaOrder = [...currentOrder, fileId];
      }
      await this.save();
    }
  }

  // Method to remove file from profile
  public async removeFile(fileId: string): Promise<void> {
    const currentFileIds = this.selectedFileIds || [];
    this.selectedFileIds = currentFileIds.filter(id => id !== fileId);
    // Remove from media order
    const currentOrder = this.mediaOrder || [];
    this.mediaOrder = currentOrder.filter(id => id !== fileId);
    await this.save();
  }
}

export const initUserProfile = (sequelize: Sequelize): void => {
  UserProfile.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '用户公开资料ID',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        field: 'user_id',
        comment: '用户ID',
      },
      displayName: {
        type: new DataTypes.STRING(100),
        field: 'display_name',
        comment: '显示名称',
      },
      bio: {
        type: DataTypes.TEXT,
        comment: '个人简介',
      },
      avatarFileId: {
        type: DataTypes.UUID,
        references: { model: 'files', key: 'id' },
        field: 'avatar_file_id',
        comment: '头像文件ID',
      },
      coverFileId: {
        type: DataTypes.UUID,
        references: { model: 'files', key: 'id' },
        field: 'cover_file_id',
        comment: '封面文件ID',
      },
      selectedWorkIds: {
        type: DataTypes.JSON,
        field: 'selected_work_ids',
        comment: '选中的作品ID数组',
      },
      selectedFileIds: {
        type: DataTypes.JSON,
        field: 'selected_file_ids',
        comment: '选中的文件ID数组',
      },
      mediaOrder: {
        type: DataTypes.JSON,
        field: 'media_order',
        comment: '媒体排序数组',
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_public',
        comment: '是否公开',
      },
      viewCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'view_count',
        comment: '浏览次数',
      },
      socialLinks: {
        type: DataTypes.JSON,
        field: 'social_links',
        comment: '社交链接',
      },
      contactInfo: {
        type: DataTypes.JSON,
        field: 'contact_info',
        comment: '联系信息',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: '创建时间',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
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
      sequelize,
      modelName: 'UserProfile',
      tableName: 'user_profiles',
      timestamps: true,
      paranoid: true,
      underscored: true,
      indexes: [
        {
          fields: ['user_id'],
          unique: true,
        },
        {
          fields: ['is_public'],
        },
        {
          fields: ['view_count'],
        },
        {
          fields: ['created_at'],
        },
      ],
    },
  );
};

export const associateUserProfile = (): void => {
  // UserProfile belongs to User
  UserProfile.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // UserProfile belongs to File (avatar)
  UserProfile.belongsTo(File, {
    foreignKey: 'avatarFileId',
    as: 'avatarFile',
  });

  // UserProfile belongs to File (cover)
  UserProfile.belongsTo(File, {
    foreignKey: 'coverFileId',
    as: 'coverFile',
  });

  // User has one UserProfile
  User.hasOne(UserProfile, {
    foreignKey: 'userId',
    as: 'profile',
  });
};

export default UserProfile;

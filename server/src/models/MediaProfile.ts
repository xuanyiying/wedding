import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import User from './User';
import { FileType } from '../types';
import File from './File';


// MediaProfile attributes interface
export interface MediaProfileAttributes {
  id: string;
  userId: string;
  fileType: FileType;
  fileId: string;
  mediaOrder: number;
}

// MediaProfile creation attributes interface
export interface MediaProfileCreationAttributes extends Optional<MediaProfileAttributes, 'id'> {}

// MediaProfile model class
class MediaProfile
  extends Model<MediaProfileAttributes, MediaProfileCreationAttributes>
  implements MediaProfileAttributes
{
  public id!: string;
  public userId!: string;
  public fileId!: string;
  public fileType!: FileType;
  public mediaOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;

  // Associations
  public file!: File | null ;

  public async getUser(): Promise<User | null> {
    return User.findByPk(this.userId);
  }

  public async getFile(): Promise<File | null> {
    return File.findOne({ where: { id: this.fileId, category: 'profile' } });
  }
}

export const initMediaProfile = (sequelize: Sequelize): void => {
  MediaProfile.init(
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
        references: { model: 'users', key: 'id' },
        field: 'user_id',
        comment: '用户ID',
      },
      fileId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'files', key: 'id' },
        field: 'file_id',
        comment: '文件ID',
      },

      fileType: {
        type: DataTypes.ENUM(...Object.values(FileType)),
        allowNull: false,
        field: 'file_type',
        comment: '媒体类型',
      },
      mediaOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'media_order',
        comment: '媒体排序',
      },
    },
    {
      sequelize,
      modelName: 'MediaProfile',
      tableName: 'media_profiles',
      timestamps: true, // 启用时间戳
      paranoid: false, // 软删除
      underscored: true, // 使用下划线
      indexes: [
        {
          fields: ['user_id', 'media_order'],
        },
        {
          fields: ['user_id', 'file_id'],
          unique: true,
        },
      ],
    },
  );
  
};

export default MediaProfile;
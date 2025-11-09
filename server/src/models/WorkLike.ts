import { Model, DataTypes, Sequelize, Optional, BelongsToGetAssociationMixin } from 'sequelize';
import User, { UserAttributes } from './User';
import Work, { WorkAttributes } from './Work';

// Interface for WorkLike attributes
export interface WorkLikeAttributes {
  id: string;
  workId: string;
  userId: string | null;
  ipAddress: string | null; // IP地址
  userAgent: string | null; // 用户代理
  createdAt?: Date;
}

// Interface for WorkLike creation attributes
export interface WorkLikeCreationAttributes extends Optional<WorkLikeAttributes, 'id'> {}

class WorkLike extends Model<WorkLikeAttributes, WorkLikeCreationAttributes> implements WorkLikeAttributes {
  public id!: string;
  public workId!: string;
  public userId!: string | null;
  public ipAddress!: string | null;
  public userAgent!: string | null;

  public readonly createdAt!: Date;

  // Associations
  public getWork!: BelongsToGetAssociationMixin<WorkAttributes>;
  public getUser!: BelongsToGetAssociationMixin<UserAttributes>;

  public readonly work?: WorkAttributes;
  public readonly user?: UserAttributes;

  public static associations: {
    work: any;
    user: any;
  };
}

export const initWorkLike = (sequelize: Sequelize): void => {
  WorkLike.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '点赞ID',
      },
      workId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'work_id',
        comment: '作品ID',
      },
      userId: {
        type: DataTypes.UUID,
        field: 'user_id',
        comment: '用户ID',
      },
      ipAddress: {
        type: new DataTypes.STRING(45),
        field: 'ip_address',
        comment: 'IP地址',
      },
      userAgent: {
        type: DataTypes.TEXT,
        field: 'user_agent',
        comment: '用户代理',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        comment: '创建时间',
      },
    },
    {
      tableName: 'work_likes',
      sequelize,
      timestamps: true,
      updatedAt: false, // No updated_at field in this table
      comment: '作品点赞表',
      indexes: [
        { name: 'uk_work_likes_user', unique: true, fields: ['work_id', 'user_id'] },
        { name: 'uk_work_likes_ip', unique: true, fields: ['work_id', 'ip_address'] },
        { name: 'idx_work_likes_work_id', fields: ['work_id'] },
      ],
    },
  );

  WorkLike.belongsTo(Work, {
    foreignKey: 'workId',
    as: 'work',
    onDelete: 'CASCADE',
  });

  WorkLike.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
  });
};

export default WorkLike;

import { Model, DataTypes, Sequelize, Optional, BelongsToGetAssociationMixin } from 'sequelize';
import User, { UserAttributes } from './User';

// Interface for UserPermission attributes
export interface UserPermissionAttributes {
  id: string;
  userId: string;
  permission: string;
  resourceType: string | null;
  resourceId: string | null;
  grantedBy: string | null;
  expiresAt: Date | null;
  createdAt?: Date;
}

// Interface for UserPermission creation attributes
export interface UserPermissionCreationAttributes extends Optional<UserPermissionAttributes, 'id'> {}

class UserPermission
  extends Model<UserPermissionAttributes, UserPermissionCreationAttributes>
  implements UserPermissionAttributes
{
  public id!: string;
  public userId!: string;
  public permission!: string;
  public resourceType!: string | null;
  public resourceId!: string | null;
  public grantedBy!: string | null;
  public expiresAt!: Date | null;

  public readonly createdAt!: Date;

  // Associations
  public getUser!: BelongsToGetAssociationMixin<UserAttributes>;
  public getGranter!: BelongsToGetAssociationMixin<UserAttributes>;

  public readonly user?: UserAttributes;
  public readonly granter?: UserAttributes;

  public static associations: {
    user: any;
    granter: any;
  };
}

export const initUserPermission = (sequelize: Sequelize): void => {
  UserPermission.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '权限ID',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        comment: '用户ID',
      },
      permission: {
        type: new DataTypes.STRING(100),
        allowNull: false,
        comment: '权限标识',
      },
      resourceType: {
        type: new DataTypes.STRING(50),
        field: 'resource_type',
        comment: '资源类型',
      },
      resourceId: {
        type: DataTypes.UUID,
        field: 'resource_id',
        comment: '资源ID',
      },
      grantedBy: {
        type: DataTypes.UUID,
        field: 'granted_by',
        comment: '授权人ID',
      },
      expiresAt: {
        type: DataTypes.DATE,
        field: 'expires_at',
        comment: '过期时间',
      },
    },
    {
      tableName: 'user_permissions',
      sequelize,
      timestamps: true,
      updatedAt: false, // No updated_at field in this table
      comment: '用户权限表',
      indexes: [
        {
          name: 'uk_user_permissions',
          unique: true,
          fields: ['user_id', 'permission', 'resource_type', 'resource_id'],
        },
        { name: 'idx_user_permissions_user_id', fields: ['user_id'] },
        { name: 'idx_user_permissions_permission', fields: ['permission'] },
        { name: 'idx_user_permissions_resource', fields: ['resource_type', 'resource_id'] },
        { name: 'idx_user_permissions_expires_at', fields: ['expires_at'] },
      ],
    },
  );

  UserPermission.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
  });

  UserPermission.belongsTo(User, {
    foreignKey: 'grantedBy',
    as: 'granter',
    onDelete: 'SET NULL',
  });
};

export default UserPermission;

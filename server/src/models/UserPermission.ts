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

/**
 * 权限常量定义
 * 定义系统中所有可用的权限类型
 */
export const PERMISSIONS = {
  // 系统管理权限
  SYSTEM: {
    ADMIN: 'system:admin',                    // 系统管理员权限
    CONFIG: 'system:config',                  // 系统配置管理
    USER_MANAGE: 'system:user:manage',        // 用户管理
    ROLE_MANAGE: 'system:role:manage',        // 角色管理
    LOG_VIEW: 'system:log:view',              // 日志查看
  },
  
  // 用户相关权限
  USER: {
    PROFILE_VIEW: 'user:profile:view',        // 查看用户资料
    PROFILE_EDIT: 'user:profile:edit',        // 编辑用户资料
    PASSWORD_CHANGE: 'user:password:change',  // 修改密码
    AVATAR_UPLOAD: 'user:avatar:upload',      // 上传头像
  },
  
  // 作品管理权限
  WORK: {
    CREATE: 'work:create',                    // 创建作品
    VIEW: 'work:view',                        // 查看作品
    EDIT: 'work:edit',                        // 编辑作品
    DELETE: 'work:delete',                    // 删除作品
    PUBLISH: 'work:publish',                  // 发布作品
    MODERATE: 'work:moderate',                // 审核作品
  },
  
  // 团队管理权限
  TEAM: {
    CREATE: 'team:create',                    // 创建团队
    VIEW: 'team:view',                        // 查看团队
    EDIT: 'team:edit',                        // 编辑团队
    DELETE: 'team:delete',                    // 删除团队
    MEMBER_MANAGE: 'team:member:manage',      // 管理团队成员
    INVITE: 'team:invite',                    // 邀请成员
  },
  
  // 日程管理权限
  SCHEDULE: {
    CREATE: 'schedule:create',                // 创建日程
    VIEW: 'schedule:view',                    // 查看日程
    EDIT: 'schedule:edit',                    // 编辑日程
    DELETE: 'schedule:delete',                // 删除日程
    MANAGE_ALL: 'schedule:manage:all',        // 管理所有日程
  },
  
  // 文件管理权限
  FILE: {
    UPLOAD: 'file:upload',                    // 文件上传
    VIEW: 'file:view',                        // 文件查看
    DELETE: 'file:delete',                    // 文件删除
    MANAGE_ALL: 'file:manage:all',            // 管理所有文件
  },
  
  // 联系人管理权限
  CONTACT: {
    CREATE: 'contact:create',                 // 创建联系人
    VIEW: 'contact:view',                     // 查看联系人
    EDIT: 'contact:edit',                     // 编辑联系人
    DELETE: 'contact:delete',                 // 删除联系人
    EXPORT: 'contact:export',                 // 导出联系人
  },
  
  // 统计分析权限
  ANALYTICS: {
    VIEW: 'analytics:view',                   // 查看统计数据
    EXPORT: 'analytics:export',               // 导出统计数据
    DASHBOARD: 'analytics:dashboard',         // 查看仪表板
  },
} as const;

/**
 * 资源类型常量
 */
export const RESOURCE_TYPES = {
  SYSTEM: 'system',
  USER: 'user',
  WORK: 'work',
  TEAM: 'team',
  SCHEDULE: 'schedule',
  FILE: 'file',
  CONTACT: 'contact',
} as const;

/**
 * 默认权限配置
 * 定义不同角色的默认权限集合
 */
export const DEFAULT_PERMISSIONS = {
  // 超级管理员权限（拥有所有权限）
  super_admin: [
    PERMISSIONS.SYSTEM.ADMIN,
    PERMISSIONS.SYSTEM.CONFIG,
    PERMISSIONS.SYSTEM.USER_MANAGE,
    PERMISSIONS.SYSTEM.ROLE_MANAGE,
    PERMISSIONS.SYSTEM.LOG_VIEW,
    PERMISSIONS.USER.PROFILE_VIEW,
    PERMISSIONS.USER.PROFILE_EDIT,
    PERMISSIONS.USER.PASSWORD_CHANGE,
    PERMISSIONS.USER.AVATAR_UPLOAD,
    PERMISSIONS.WORK.CREATE,
    PERMISSIONS.WORK.VIEW,
    PERMISSIONS.WORK.EDIT,
    PERMISSIONS.WORK.DELETE,
    PERMISSIONS.WORK.PUBLISH,
    PERMISSIONS.WORK.MODERATE,
    PERMISSIONS.TEAM.CREATE,
    PERMISSIONS.TEAM.VIEW,
    PERMISSIONS.TEAM.EDIT,
    PERMISSIONS.TEAM.DELETE,
    PERMISSIONS.TEAM.MEMBER_MANAGE,
    PERMISSIONS.TEAM.INVITE,
    PERMISSIONS.SCHEDULE.CREATE,
    PERMISSIONS.SCHEDULE.VIEW,
    PERMISSIONS.SCHEDULE.EDIT,
    PERMISSIONS.SCHEDULE.DELETE,
    PERMISSIONS.SCHEDULE.MANAGE_ALL,
    PERMISSIONS.FILE.UPLOAD,
    PERMISSIONS.FILE.VIEW,
    PERMISSIONS.FILE.DELETE,
    PERMISSIONS.FILE.MANAGE_ALL,
    PERMISSIONS.CONTACT.CREATE,
    PERMISSIONS.CONTACT.VIEW,
    PERMISSIONS.CONTACT.EDIT,
    PERMISSIONS.CONTACT.DELETE,
    PERMISSIONS.CONTACT.EXPORT,
    PERMISSIONS.ANALYTICS.VIEW,
    PERMISSIONS.ANALYTICS.EXPORT,
    PERMISSIONS.ANALYTICS.DASHBOARD,
  ],
  
  // 管理员权限
  admin: [
    PERMISSIONS.SYSTEM.CONFIG,
    PERMISSIONS.SYSTEM.USER_MANAGE,
    PERMISSIONS.SYSTEM.LOG_VIEW,
    PERMISSIONS.USER.PROFILE_VIEW,
    PERMISSIONS.USER.PROFILE_EDIT,
    PERMISSIONS.USER.PASSWORD_CHANGE,
    PERMISSIONS.USER.AVATAR_UPLOAD,
    PERMISSIONS.WORK.CREATE,
    PERMISSIONS.WORK.VIEW,
    PERMISSIONS.WORK.EDIT,
    PERMISSIONS.WORK.DELETE,
    PERMISSIONS.WORK.PUBLISH,
    PERMISSIONS.WORK.MODERATE,
    PERMISSIONS.TEAM.CREATE,
    PERMISSIONS.TEAM.VIEW,
    PERMISSIONS.TEAM.EDIT,
    PERMISSIONS.TEAM.MEMBER_MANAGE,
    PERMISSIONS.TEAM.INVITE,
    PERMISSIONS.SCHEDULE.CREATE,
    PERMISSIONS.SCHEDULE.VIEW,
    PERMISSIONS.SCHEDULE.EDIT,
    PERMISSIONS.SCHEDULE.DELETE,
    PERMISSIONS.SCHEDULE.MANAGE_ALL,
    PERMISSIONS.FILE.UPLOAD,
    PERMISSIONS.FILE.VIEW,
    PERMISSIONS.FILE.DELETE,
    PERMISSIONS.CONTACT.CREATE,
    PERMISSIONS.CONTACT.VIEW,
    PERMISSIONS.CONTACT.EDIT,
    PERMISSIONS.CONTACT.DELETE,
    PERMISSIONS.CONTACT.EXPORT,
    PERMISSIONS.ANALYTICS.VIEW,
    PERMISSIONS.ANALYTICS.EXPORT,
    PERMISSIONS.ANALYTICS.DASHBOARD,
  ],
  
  // 普通用户权限
  user: [
    PERMISSIONS.USER.PROFILE_VIEW,
    PERMISSIONS.USER.PROFILE_EDIT,
    PERMISSIONS.USER.PASSWORD_CHANGE,
    PERMISSIONS.USER.AVATAR_UPLOAD,
    PERMISSIONS.WORK.CREATE,
    PERMISSIONS.WORK.VIEW,
    PERMISSIONS.WORK.EDIT,
    PERMISSIONS.SCHEDULE.CREATE,
    PERMISSIONS.SCHEDULE.VIEW,
    PERMISSIONS.SCHEDULE.EDIT,
    PERMISSIONS.FILE.UPLOAD,
    PERMISSIONS.FILE.VIEW,
    PERMISSIONS.CONTACT.CREATE,
    PERMISSIONS.CONTACT.VIEW,
    PERMISSIONS.CONTACT.EDIT,
  ],
} as const;

/**
 * 初始化用户权限数据
 * 为指定用户分配默认权限
 * 
 * @param userId - 用户ID
 * @param role - 用户角色 ('super_admin' | 'admin' | 'user')
 * @param grantedBy - 授权人ID（可选）
 * @param expiresAt - 权限过期时间（可选）
 * @returns Promise<UserPermission[]> 创建的权限记录数组
 */
export const initializeUserPermissions = async (
  userId: string,
  role: keyof typeof DEFAULT_PERMISSIONS,
  grantedBy?: string,
  expiresAt?: Date
): Promise<UserPermission[]> => {
  const permissions = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.user;
  const permissionRecords: UserPermission[] = [];
  
  for (const permission of permissions) {
    try {
      // 检查权限是否已存在
      const existingPermission = await UserPermission.findOne({
        where: {
          userId,
          permission,
          resourceType: null,
          resourceId: null,
        },
      });
      
      if (!existingPermission) {
        const permissionRecord = await UserPermission.create({
          userId,
          permission,
          resourceType: null,
          resourceId: null,
          grantedBy: grantedBy || null,
          expiresAt: expiresAt || null,
        });
        
        permissionRecords.push(permissionRecord);
      }
    } catch (error) {
      console.error(`Failed to create permission ${permission} for user ${userId}:`, error);
    }
  }
  
  return permissionRecords;
};

/**
 * 为用户分配特定资源权限
 * 
 * @param userId - 用户ID
 * @param permission - 权限标识
 * @param resourceType - 资源类型
 * @param resourceId - 资源ID
 * @param grantedBy - 授权人ID（可选）
 * @param expiresAt - 权限过期时间（可选）
 * @returns Promise<UserPermission> 创建的权限记录
 */
export const grantResourcePermission = async (
  userId: string,
  permission: string,
  resourceType: string,
  resourceId: string,
  grantedBy?: string,
  expiresAt?: Date
): Promise<UserPermission> => {
  return await UserPermission.create({
    userId,
    permission,
    resourceType,
    resourceId,
    grantedBy: grantedBy || null,
    expiresAt: expiresAt || null,
  });
};

/**
 * 检查用户是否拥有指定权限
 * 
 * @param userId - 用户ID
 * @param permission - 权限标识
 * @param resourceType - 资源类型（可选）
 * @param resourceId - 资源ID（可选）
 * @returns Promise<boolean> 是否拥有权限
 */
export const hasPermission = async (
  userId: string,
  permission: string,
  resourceType?: string,
  resourceId?: string
): Promise<boolean> => {
  const whereClause: any = {
    userId,
    permission,
  };
  
  if (resourceType) {
    whereClause.resourceType = resourceType;
  }
  
  if (resourceId) {
    whereClause.resourceId = resourceId;
  }
  
  const permissionRecord = await UserPermission.findOne({
    where: whereClause,
  });
  
  // 检查权限是否存在且未过期
  if (!permissionRecord) {
    return false;
  }
  
  if (permissionRecord.expiresAt && permissionRecord.expiresAt < new Date()) {
    return false;
  }
  
  return true;
};

/**
 * 获取用户的所有权限
 * 
 * @param userId - 用户ID
 * @returns Promise<UserPermission[]> 用户权限列表
 */
export const getUserPermissions = async (userId: string): Promise<UserPermission[]> => {
  return await UserPermission.findAll({
    where: {
      userId,
    },
    order: [['permission', 'ASC']],
  });
};

/**
 * 撤销用户权限
 * 
 * @param userId - 用户ID
 * @param permission - 权限标识
 * @param resourceType - 资源类型（可选）
 * @param resourceId - 资源ID（可选）
 * @returns Promise<number> 删除的记录数
 */
export const revokePermission = async (
  userId: string,
  permission: string,
  resourceType?: string,
  resourceId?: string
): Promise<number> => {
  const whereClause: any = {
    userId,
    permission,
  };
  
  if (resourceType) {
    whereClause.resourceType = resourceType;
  }
  
  if (resourceId) {
    whereClause.resourceId = resourceId;
  }
  
  return await UserPermission.destroy({
    where: whereClause,
  });
};

/**
 * 清理过期权限
 * 删除所有已过期的权限记录
 * 
 * @returns Promise<number> 删除的记录数
 */
export const cleanupExpiredPermissions = async (): Promise<number> => {
  return await UserPermission.destroy({
    where: {
      expiresAt: {
        [require('sequelize').Op.lt]: new Date(),
      },
    },
  });
};

export default UserPermission;

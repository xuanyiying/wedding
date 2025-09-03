import { Transaction } from 'sequelize';
import UserPermission, { 
  initializeUserPermissions, 
  grantResourcePermission,
  hasPermission,
  getUserPermissions,
  revokePermission,
  cleanupExpiredPermissions,
  PERMISSIONS,
  DEFAULT_PERMISSIONS,
  RESOURCE_TYPES
} from '../models/UserPermission';
import User from '../models/User';
import { logger } from '../utils/logger';

/**
 * 权限管理服务
 * 提供用户权限的创建、查询、更新和删除功能
 */
export class PermissionService {
  
  /**
   * 初始化用户权限
   * 根据用户角色自动分配默认权限
   * 
   * @param userId - 用户ID
   * @param role - 用户角色
   * @param grantedBy - 授权人ID（可选）
   * @param transaction - 数据库事务（可选）
   * @returns Promise<UserPermission[]> 创建的权限记录
   */
  async initializeUserPermissions(
    userId: string,
    role: keyof typeof DEFAULT_PERMISSIONS,
    grantedBy?: string,
    _transaction?: Transaction
  ): Promise<UserPermission[]> {
    try {
      logger.info(`Initializing permissions for user ${userId} with role ${role}`);
      
      // 检查用户是否存在
      const findOptions = _transaction ? { transaction: _transaction } : {};
      const user = await User.findByPk(userId, findOptions);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      // 初始化权限
      const permissions = await initializeUserPermissions(userId, role, grantedBy);
      
      logger.info(`Successfully initialized ${permissions.length} permissions for user ${userId}`);
      return permissions;
      
    } catch (error) {
      logger.error(`Failed to initialize permissions for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * 授予资源权限
   * 为用户分配特定资源的权限
   * 
   * @param userId - 用户ID
   * @param permission - 权限标识
   * @param resourceType - 资源类型
   * @param resourceId - 资源ID
   * @param grantedBy - 授权人ID（可选）
   * @param expiresAt - 过期时间（可选）
   * @param transaction - 数据库事务（可选）
   * @returns Promise<UserPermission> 创建的权限记录
   */
  async grantResourcePermission(
    userId: string,
    permission: string,
    resourceType: string,
    resourceId: string,
    grantedBy?: string,
    expiresAt?: Date,
    _transaction?: Transaction
  ): Promise<UserPermission> {
    try {
      logger.info(`Granting permission ${permission} on ${resourceType}:${resourceId} to user ${userId}`);
      
      const permissionRecord = await grantResourcePermission(
        userId,
        permission,
        resourceType,
        resourceId,
        grantedBy,
        expiresAt
      );
      
      logger.info(`Successfully granted permission ${permission} to user ${userId}`);
      return permissionRecord;
      
    } catch (error) {
      logger.error(`Failed to grant permission ${permission} to user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * 检查用户权限
   * 验证用户是否拥有指定权限
   * 
   * @param userId - 用户ID
   * @param permission - 权限标识
   * @param resourceType - 资源类型（可选）
   * @param resourceId - 资源ID（可选）
   * @returns Promise<boolean> 是否拥有权限
   */
  async checkPermission(
    userId: string,
    permission: string,
    resourceType?: string,
    resourceId?: string
  ): Promise<boolean> {
    try {
      const hasAccess = await hasPermission(userId, permission, resourceType, resourceId);
      
      logger.debug(`Permission check for user ${userId}, permission ${permission}: ${hasAccess}`);
      return hasAccess;
      
    } catch (error) {
      logger.error(`Failed to check permission ${permission} for user ${userId}:`, error);
      return false;
    }
  }
  
  /**
   * 获取用户所有权限
   * 
   * @param userId - 用户ID
   * @returns Promise<UserPermission[]> 用户权限列表
   */
  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    try {
      const permissions = await getUserPermissions(userId);
      
      logger.debug(`Retrieved ${permissions.length} permissions for user ${userId}`);
      return permissions;
      
    } catch (error) {
      logger.error(`Failed to get permissions for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * 撤销用户权限
   * 
   * @param userId - 用户ID
   * @param permission - 权限标识
   * @param resourceType - 资源类型（可选）
   * @param resourceId - 资源ID（可选）
   * @returns Promise<number> 删除的记录数
   */
  async revokePermission(
    userId: string,
    permission: string,
    resourceType?: string,
    resourceId?: string
  ): Promise<number> {
    try {
      logger.info(`Revoking permission ${permission} from user ${userId}`);
      
      const deletedCount = await revokePermission(userId, permission, resourceType, resourceId);
      
      logger.info(`Successfully revoked ${deletedCount} permission(s) from user ${userId}`);
      return deletedCount;
      
    } catch (error) {
      logger.error(`Failed to revoke permission ${permission} from user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * 批量授予权限
   * 为用户批量分配多个权限
   * 
   * @param userId - 用户ID
   * @param permissions - 权限列表
   * @param grantedBy - 授权人ID（可选）
   * @param expiresAt - 过期时间（可选）
   * @returns Promise<UserPermission[]> 创建的权限记录
   */
  async batchGrantPermissions(
    userId: string,
    permissions: string[],
    grantedBy?: string,
    expiresAt?: Date
  ): Promise<UserPermission[]> {
    try {
      logger.info(`Batch granting ${permissions.length} permissions to user ${userId}`);
      
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
          logger.error(`Failed to grant permission ${permission} to user ${userId}:`, error);
        }
      }
      
      logger.info(`Successfully granted ${permissionRecords.length} permissions to user ${userId}`);
      return permissionRecords;
      
    } catch (error) {
      logger.error(`Failed to batch grant permissions to user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * 更新用户角色权限
   * 根据新角色重新分配权限
   * 
   * @param userId - 用户ID
   * @param newRole - 新角色
   * @param grantedBy - 授权人ID（可选）
   * @returns Promise<UserPermission[]> 新的权限记录
   */
  async updateUserRolePermissions(
    userId: string,
    newRole: keyof typeof DEFAULT_PERMISSIONS,
    grantedBy?: string
  ): Promise<UserPermission[]> {
    try {
      logger.info(`Updating role permissions for user ${userId} to role ${newRole}`);
      
      // 删除现有的系统权限（保留资源特定权限）
      await UserPermission.destroy({
        where: {
          userId,
          resourceType: null,
          resourceId: null,
        },
      });
      
      // 分配新角色的权限
      const newPermissions = await this.initializeUserPermissions(userId, newRole, grantedBy);
      
      logger.info(`Successfully updated role permissions for user ${userId}`);
      return newPermissions;
      
    } catch (error) {
      logger.error(`Failed to update role permissions for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * 清理过期权限
   * 删除所有已过期的权限记录
   * 
   * @returns Promise<number> 删除的记录数
   */
  async cleanupExpiredPermissions(): Promise<number> {
    try {
      logger.info('Cleaning up expired permissions');
      
      const deletedCount = await cleanupExpiredPermissions();
      
      logger.info(`Successfully cleaned up ${deletedCount} expired permissions`);
      return deletedCount;
      
    } catch (error) {
      logger.error('Failed to cleanup expired permissions:', error);
      throw error;
    }
  }
  
  /**
   * 获取权限统计信息
   * 
   * @param userId - 用户ID（可选，如果不提供则返回全局统计）
   * @returns Promise<object> 权限统计信息
   */
  async getPermissionStats(userId?: string): Promise<{
    totalPermissions: number;
    expiredPermissions: number;
    resourcePermissions: number;
    systemPermissions: number;
  }> {
    try {
      const whereClause = userId ? { userId } : {};
      
      const [
        totalPermissions,
        expiredPermissions,
        resourcePermissions,
        systemPermissions
      ] = await Promise.all([
        UserPermission.count({ where: whereClause }),
        UserPermission.count({
          where: {
            ...whereClause,
            expiresAt: {
              [require('sequelize').Op.lt]: new Date(),
            },
          },
        }),
        UserPermission.count({
          where: {
            ...whereClause,
            resourceType: {
              [require('sequelize').Op.ne]: null,
            },
          },
        }),
        UserPermission.count({
          where: {
            ...whereClause,
            resourceType: null,
          },
        }),
      ]);
      
      return {
        totalPermissions,
        expiredPermissions,
        resourcePermissions,
        systemPermissions,
      };
      
    } catch (error) {
      logger.error('Failed to get permission stats:', error);
      throw error;
    }
  }
}

// 导出权限常量供其他模块使用
export { PERMISSIONS, RESOURCE_TYPES, DEFAULT_PERMISSIONS };

// 导出服务实例
export const permissionService = new PermissionService();
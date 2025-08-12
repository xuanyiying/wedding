import { AuthChecker, PERMISSIONS } from './auth';
import { UserRole } from '../types';

/**
 * 权限工具函数
 */
export class PermissionUtils {
  /**
   * 检查用户是否可以管理用户
   */
  static canManageUsers(): boolean {
    return AuthChecker.hasAnyPermission([
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.USER_DELETE,
    ]);
  }

  /**
   * 检查用户是否可以管理档期
   */
  static canManageSchedules(): boolean {
    return AuthChecker.hasAnyPermission([
      PERMISSIONS.SCHEDULE_VIEW,
      PERMISSIONS.SCHEDULE_CREATE,
      PERMISSIONS.SCHEDULE_UPDATE,
      PERMISSIONS.SCHEDULE_DELETE,
    ]);
  }

  /**
   * 检查用户是否可以管理作品
   */
  static canManageWorks(): boolean {
    return AuthChecker.hasAnyPermission([
      PERMISSIONS.WORK_VIEW,
      PERMISSIONS.WORK_CREATE,
      PERMISSIONS.WORK_UPDATE,
      PERMISSIONS.WORK_DELETE,
    ]);
  }

  /**
   * 检查用户是否可以管理预订
   */
  static canManageBookings(): boolean {
    return AuthChecker.hasAnyPermission([
      PERMISSIONS.BOOKING_VIEW,
      PERMISSIONS.BOOKING_CREATE,
      PERMISSIONS.BOOKING_UPDATE,
      PERMISSIONS.BOOKING_DELETE,
    ]);
  }

  /**
   * 检查用户是否可以管理系统
   */
  static canManageSystem(): boolean {
    return AuthChecker.hasAnyPermission([
      PERMISSIONS.SYSTEM_CONFIG,
      PERMISSIONS.SYSTEM_LOGS,
      PERMISSIONS.SYSTEM_BACKUP,
    ]);
  }

  /**
   * 检查用户是否可以编辑指定用户的档期
   */
  static canEditSchedule(scheduleOwnerId: string): boolean {
    return AuthChecker.canAccessResource(scheduleOwnerId, PERMISSIONS.SCHEDULE_UPDATE);
  }

  /**
   * 检查用户是否可以编辑指定用户的作品
   */
  static canEditWork(workOwnerId: string): boolean {
    return AuthChecker.canAccessResource(workOwnerId, PERMISSIONS.WORK_UPDATE);
  }

  /**
   * 检查用户是否可以删除指定用户的档期
   */
  static canDeleteSchedule(scheduleOwnerId: string): boolean {
    return AuthChecker.canAccessResource(scheduleOwnerId, PERMISSIONS.SCHEDULE_DELETE);
  }

  /**
   * 检查用户是否可以删除指定用户的作品
   */
  static canDeleteWork(workOwnerId: string): boolean {
    return AuthChecker.canAccessResource(workOwnerId, PERMISSIONS.WORK_DELETE);
  }

  /**
   * 获取用户可访问的菜单项
   */
  static getAccessibleMenus(): string[] {
    const menus: string[] = [];

    // 仪表盘 - 所有登录用户都可以访问
    if (AuthChecker.isLoggedIn()) {
      menus.push('dashboard');
    }

    // 档期管理
    if (this.canManageSchedules()) {
      menus.push('schedules');
    }

    // 作品管理
    if (this.canManageWorks()) {
      menus.push('works');
    }

    // 预订管理
    if (this.canManageBookings()) {
      menus.push('bookings');
    }

    // 用户管理 - 仅管理员
    if (this.canManageUsers()) {
      menus.push('users');
    }

    // 系统管理 - 仅超级管理员
    if (this.canManageSystem()) {
      menus.push('system');
    }

    return menus;
  }

  /**
   * 检查用户是否可以访问指定菜单
   */
  static canAccessMenu(menuKey: string): boolean {
    const accessibleMenus = this.getAccessibleMenus();
    return accessibleMenus.includes(menuKey);
  }

  /**
   * 根据用户角色获取默认首页路径
   */
  static getDefaultHomePath(): string {
    const userRole = AuthChecker.getCurrentUserRole();
    
    switch (userRole) {
      case UserRole.SUPER_ADMIN:
        return '/admin/dashboard';
      case UserRole.ADMIN:
        return '/admin/dashboard';
      case UserRole.USER:
        return '/dashboard';
      default:
        return '/works'; // 访客默认查看作品页面
    }
  }

  /**
   * 检查用户是否可以执行批量操作
   */
  static canPerformBulkActions(resourceType: 'schedule' | 'work' | 'booking' | 'user'): boolean {
    switch (resourceType) {
      case 'schedule':
        return AuthChecker.hasPermission(PERMISSIONS.SCHEDULE_DELETE) || 
               AuthChecker.hasPermission(PERMISSIONS.SCHEDULE_VIEW_ALL);
      case 'work':
        return AuthChecker.hasPermission(PERMISSIONS.WORK_DELETE) || 
               AuthChecker.hasPermission(PERMISSIONS.WORK_VIEW_ALL);
      case 'booking':
        return AuthChecker.hasPermission(PERMISSIONS.BOOKING_DELETE) || 
               AuthChecker.hasPermission(PERMISSIONS.BOOKING_VIEW_ALL);
      case 'user':
        return AuthChecker.hasPermission(PERMISSIONS.USER_DELETE);
      default:
        return false;
    }
  }

  /**
   * 检查用户是否可以导出数据
   */
  static canExportData(dataType: 'schedule' | 'work' | 'booking' | 'user'): boolean {
    // 通常导出权限与查看所有数据的权限相关
    switch (dataType) {
      case 'schedule':
        return AuthChecker.hasPermission(PERMISSIONS.SCHEDULE_VIEW_ALL);
      case 'work':
        return AuthChecker.hasPermission(PERMISSIONS.WORK_VIEW_ALL);
      case 'booking':
        return AuthChecker.hasPermission(PERMISSIONS.BOOKING_VIEW_ALL);
      case 'user':
        return AuthChecker.hasPermission(PERMISSIONS.USER_VIEW);
      default:
        return false;
    }
  }

  /**
   * 检查用户是否可以查看统计数据
   */
  static canViewStatistics(): boolean {
    return AuthChecker.isAdmin(); // 仅管理员可以查看统计数据
  }

  /**
   * 检查用户是否可以查看系统日志
   */
  static canViewLogs(): boolean {
    return AuthChecker.hasPermission(PERMISSIONS.SYSTEM_LOGS);
  }

  /**
   * 检查用户是否可以修改系统配置
   */
  static canModifySystemConfig(): boolean {
    return AuthChecker.hasPermission(PERMISSIONS.SYSTEM_CONFIG);
  }

  /**
   * 检查用户是否可以执行系统备份
   */
  static canBackupSystem(): boolean {
    return AuthChecker.hasPermission(PERMISSIONS.SYSTEM_BACKUP);
  }

  /**
   * 获取用户角色的显示名称
   */
  static getRoleDisplayName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      admin: '管理员',
      user: '普通用户',
      super_admin: '超级管理员',
    };
    
    return roleNames[role] || '未知角色';
  }

  /**
   * 获取权限的显示名称
   */
  static getPermissionDisplayName(permission: string): string {
    const permissionNames: Record<string, string> = {
      [PERMISSIONS.USER_VIEW]: '查看用户',
      [PERMISSIONS.USER_CREATE]: '创建用户',
      [PERMISSIONS.USER_UPDATE]: '更新用户',
      [PERMISSIONS.USER_DELETE]: '删除用户',
      
      [PERMISSIONS.SCHEDULE_VIEW]: '查看档期',
      [PERMISSIONS.SCHEDULE_CREATE]: '创建档期',
      [PERMISSIONS.SCHEDULE_UPDATE]: '更新档期',
      [PERMISSIONS.SCHEDULE_DELETE]: '删除档期',
      [PERMISSIONS.SCHEDULE_VIEW_ALL]: '查看所有档期',
      
      [PERMISSIONS.WORK_VIEW]: '查看作品',
      [PERMISSIONS.WORK_CREATE]: '创建作品',
      [PERMISSIONS.WORK_UPDATE]: '更新作品',
      [PERMISSIONS.WORK_DELETE]: '删除作品',
      [PERMISSIONS.WORK_VIEW_ALL]: '查看所有作品',
      
      [PERMISSIONS.BOOKING_VIEW]: '查看预订',
      [PERMISSIONS.BOOKING_CREATE]: '创建预订',
      [PERMISSIONS.BOOKING_UPDATE]: '更新预订',
      [PERMISSIONS.BOOKING_DELETE]: '删除预订',
      [PERMISSIONS.BOOKING_VIEW_ALL]: '查看所有预订',
      
      [PERMISSIONS.SYSTEM_CONFIG]: '系统配置',
      [PERMISSIONS.SYSTEM_LOGS]: '系统日志',
      [PERMISSIONS.SYSTEM_BACKUP]: '系统备份',
    };
    
    return permissionNames[permission] || permission;
  }
}

export default PermissionUtils;
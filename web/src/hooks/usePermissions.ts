import React, { useMemo } from 'react';
import { useAppSelector } from '../store';
import { AuthChecker, PERMISSIONS } from '../utils/auth';
import type { UserRole } from '../types';

/**
 * 权限管理 Hook
 * 提供便捷的权限检查功能
 */
export const usePermissions = () => {
  // 从 Redux 状态获取用户信息
  const user = useAppSelector(state => state.auth.user);
  
  // 缓存权限检查结果
  const permissions = useMemo(() => {
    if (!user) {
      return {
        isLoggedIn: false,
        isAdmin: false,
        isSuperAdmin: false,
        userRole: null,
        userPermissions: [],
        isAccountActive: false,
      };
    }

    return {
      isLoggedIn: AuthChecker.isLoggedIn(),
      isAdmin: AuthChecker.isAdmin(),
      isSuperAdmin: AuthChecker.isSuperAdmin(),
      userRole: AuthChecker.getCurrentUserRole(),
      userPermissions: AuthChecker.getUserPermissions(),
      isAccountActive: AuthChecker.isAccountActive(),
    };
  }, [user]);

  // 权限检查方法
  const hasPermission = (permission: string): boolean => {
    return AuthChecker.hasPermission(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return AuthChecker.hasAnyPermission(permissionList);
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return AuthChecker.hasAllPermissions(permissionList);
  };

  const hasRole = (role: UserRole): boolean => {
    return AuthChecker.hasRole(role);
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return AuthChecker.hasAnyRole(roles);
  };

  const canAccessResource = (resourceOwnerId: string, requiredPermission: string): boolean => {
    return AuthChecker.canAccessResource(resourceOwnerId, requiredPermission);
  };

  // 常用权限检查的便捷方法
  const can = {
    // 用户管理
    viewUsers: () => hasPermission(PERMISSIONS.USER_VIEW),
    createUser: () => hasPermission(PERMISSIONS.USER_CREATE),
    updateUser: () => hasPermission(PERMISSIONS.USER_UPDATE),
    deleteUser: () => hasPermission(PERMISSIONS.USER_DELETE),

    // 档期管理
    viewSchedules: () => hasPermission(PERMISSIONS.SCHEDULE_VIEW),
    createSchedule: () => hasPermission(PERMISSIONS.SCHEDULE_CREATE),
    updateSchedule: () => hasPermission(PERMISSIONS.SCHEDULE_UPDATE),
    deleteSchedule: () => hasPermission(PERMISSIONS.SCHEDULE_DELETE),
    viewAllSchedules: () => hasPermission(PERMISSIONS.SCHEDULE_VIEW_ALL),

    // 作品管理
    viewWorks: () => hasPermission(PERMISSIONS.WORK_VIEW),
    createWork: () => hasPermission(PERMISSIONS.WORK_CREATE),
    updateWork: () => hasPermission(PERMISSIONS.WORK_UPDATE),
    deleteWork: () => hasPermission(PERMISSIONS.WORK_DELETE),
    viewAllWorks: () => hasPermission(PERMISSIONS.WORK_VIEW_ALL),

    // 预订管理
    viewBookings: () => hasPermission(PERMISSIONS.BOOKING_VIEW),
    createBooking: () => hasPermission(PERMISSIONS.BOOKING_CREATE),
    updateBooking: () => hasPermission(PERMISSIONS.BOOKING_UPDATE),
    deleteBooking: () => hasPermission(PERMISSIONS.BOOKING_DELETE),
    viewAllBookings: () => hasPermission(PERMISSIONS.BOOKING_VIEW_ALL),

    // 系统管理
    manageSystem: () => hasPermission(PERMISSIONS.SYSTEM_CONFIG),
    viewLogs: () => hasPermission(PERMISSIONS.SYSTEM_LOGS),
    backupSystem: () => hasPermission(PERMISSIONS.SYSTEM_BACKUP),
  };

  return {
    ...permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    canAccessResource,
    can,
  };
};

/**
 * 权限守卫 Hook
 * 用于在组件中进行权限检查，不满足条件时可以显示替代内容
 */
export const usePermissionGuard = () => {
  const { hasPermission, hasAnyPermission, hasRole, hasAnyRole, isLoggedIn } = usePermissions();

  /**
   * 权限守卫组件
   * @param permission 需要的权限
   * @param fallback 权限不足时显示的内容
   * @param children 有权限时显示的内容
   */
  const PermissionGuard: React.FC<{
    permission?: string;
    permissions?: string[];
    role?: UserRole;
    roles?: UserRole[];
    requireLogin?: boolean;
    fallback?: React.ReactNode;
    children: React.ReactNode;
  }> = ({ 
    permission, 
    permissions, 
    role, 
    roles, 
    requireLogin = false,
    fallback = null, 
    children 
  }) => {
    // 检查登录状态
    if (requireLogin && !isLoggedIn) {
      return React.createElement(React.Fragment, null, fallback);
    }

    // 检查单个权限
    if (permission && !hasPermission(permission)) {
      return React.createElement(React.Fragment, null, fallback);
    }

    // 检查多个权限（任意一个）
    if (permissions && !hasAnyPermission(permissions)) {
      return React.createElement(React.Fragment, null, fallback);
    }

    // 检查单个角色
    if (role && !hasRole(role)) {
      return React.createElement(React.Fragment, null, fallback);
    }

    // 检查多个角色（任意一个）
    if (roles && !hasAnyRole(roles)) {
      return React.createElement(React.Fragment, null, fallback);
    }

    return React.createElement(React.Fragment, null, children);
  };

  return { PermissionGuard };
};

export default usePermissions;
/**
 * 认证工具类 - 统一管理token和用户信息存储
 * 避免直接操作localStorage，提供统一的接口
 */
import type { User } from '../types';
import { UserRole } from '../types';

// localStorage键名常量
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  USER: 'user',
} as const;

/**
 * 认证存储管理类
 */
export class AuthStorage {
  /**
   * 获取访问令牌
   */
  static getAccessToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('获取访问令牌失败:', error);
      return null;
    }
  }

  /**
   * 设置访问令牌
   */
  static setAccessToken(token: string): void {
    try {
      console.log('🔑 设置访问令牌:', { token, type: typeof token });
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      console.log('✅ 访问令牌设置成功，验证:', localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
    } catch (error) {
      console.error('❌ 设置访问令牌失败:', error);
    }
  }



  /**
   * 获取用户信息
   */
  static getUser(): User | null {
    try {
      const userStr = localStorage.getItem(STORAGE_KEYS.USER);
      if (!userStr) return null;
      
      return JSON.parse(userStr) as User;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 清除无效的用户数据
      this.removeUser();
      return null;
    }
  }

  /**
   * 设置用户信息
   */
  static setUser(user: User): void {
    try {
      console.log('👤 设置用户信息:', { user, type: typeof user });
      const userStr = JSON.stringify(user);
      localStorage.setItem(STORAGE_KEYS.USER, userStr);
      console.log('✅ 用户信息设置成功，验证:', localStorage.getItem(STORAGE_KEYS.USER));
    } catch (error) {
      console.error('❌ 设置用户信息失败:', error);
    }
  }

  /**
   * 设置完整的认证信息
   */
  static setAuthData(data: {
    user: User;
    accessToken: string;
  }): void {
    console.log('🎯 AuthStorage.setAuthData 开始执行:', data);
    console.log('📊 输入数据类型检查:', {
      userType: typeof data.user,
      accessTokenType: typeof data.accessToken,
      accessTokenValue: data.accessToken
    });
    
    console.log('👤 开始设置用户信息...');
    this.setUser(data.user);
    
    console.log('🔑 开始设置访问令牌...');
    this.setAccessToken(data.accessToken);
    
    console.log('🔍 最终localStorage状态检查:', {
      accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
      user: localStorage.getItem(STORAGE_KEYS.USER)
    });
    
    console.log('✅ AuthStorage.setAuthData 执行完成');
  }

  /**
   * 获取完整的认证信息
   */
  static getAuthData(): {
    user: User | null;
    accessToken: string | null;
  } {
    return {
      user: this.getUser(),
      accessToken: this.getAccessToken(),
    };
  }

  /**
   * 移除访问令牌
   */
  static removeAccessToken(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('移除访问令牌失败:', error);
    }
  }



  /**
   * 移除用户信息
   */
  static removeUser(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch (error) {
      console.error('移除用户信息失败:', error);
    }
  }

  /**
   * 清除所有认证信息
   */
  static clearAll(): void {
    this.removeAccessToken();
    this.removeUser();
  }

  /**
   * 检查是否有有效的认证信息
   */
  static hasValidAuth(): boolean {
    const accessToken = this.getAccessToken();
    const user = this.getUser();
    
    return !!(accessToken && user);
  }

  /**
   * 检查token是否即将过期（可选功能，需要JWT解析）
   */
  static isTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
    try {
      // 简单的JWT解析（仅用于获取过期时间）
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // 转换为毫秒
      const now = Date.now();
      const threshold = thresholdMinutes * 60 * 1000; // 转换为毫秒
      
      return (exp - now) <= threshold;
    } catch (error) {
      console.error('解析token失败:', error);
      return true; // 解析失败时认为即将过期
    }
  }
}

/**
 * 权限定义
 */
export const PERMISSIONS = {
  // 用户管理权限
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // 档期管理权限
  SCHEDULE_VIEW: 'schedule:view',
  SCHEDULE_CREATE: 'schedule:create',
  SCHEDULE_UPDATE: 'schedule:update',
  SCHEDULE_DELETE: 'schedule:delete',
  SCHEDULE_VIEW_ALL: 'schedule:view_all', // 查看所有用户的档期
  
  // 作品管理权限
  WORK_VIEW: 'work:view',
  WORK_CREATE: 'work:create',
  WORK_UPDATE: 'work:update',
  WORK_DELETE: 'work:delete',
  WORK_VIEW_ALL: 'work:view_all', // 查看所有用户的作品
  
  // 预订管理权限
  BOOKING_VIEW: 'booking:view',
  BOOKING_CREATE: 'booking:create',
  BOOKING_UPDATE: 'booking:update',
  BOOKING_DELETE: 'booking:delete',
  BOOKING_VIEW_ALL: 'booking:view_all', // 查看所有预订
  
  // 系统管理权限
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_BACKUP: 'system:backup',
} as const;

/**
 * 角色权限映射
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  [UserRole.SUPER_ADMIN]: [
    // 超级管理员拥有所有权限
    ...Object.values(PERMISSIONS)
  ],
  
  [UserRole.ADMIN]: [
    // 管理员权限
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    
    PERMISSIONS.SCHEDULE_VIEW,
    PERMISSIONS.SCHEDULE_CREATE,
    PERMISSIONS.SCHEDULE_UPDATE,
    PERMISSIONS.SCHEDULE_DELETE,
    PERMISSIONS.SCHEDULE_VIEW_ALL,
    
    PERMISSIONS.WORK_VIEW,
    PERMISSIONS.WORK_CREATE,
    PERMISSIONS.WORK_UPDATE,
    PERMISSIONS.WORK_DELETE,
    PERMISSIONS.WORK_VIEW_ALL,
    
    PERMISSIONS.BOOKING_VIEW,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.BOOKING_DELETE,
    PERMISSIONS.BOOKING_VIEW_ALL,
  ],
  
  [UserRole.USER]: [
    // 普通用户权限
    PERMISSIONS.SCHEDULE_VIEW,
    PERMISSIONS.SCHEDULE_CREATE,
    PERMISSIONS.SCHEDULE_UPDATE,
    PERMISSIONS.SCHEDULE_DELETE,
    
    PERMISSIONS.WORK_VIEW,
    PERMISSIONS.WORK_CREATE,
    PERMISSIONS.WORK_UPDATE,
    PERMISSIONS.WORK_DELETE,
    
    PERMISSIONS.BOOKING_VIEW,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_UPDATE,
  ],
  
};

/**
 * 认证状态检查工具
 */
export class AuthChecker {
  /**
   * 检查用户是否已登录
   */
  static isLoggedIn(): boolean {
    return AuthStorage.hasValidAuth();
  }

  /**
   * 获取当前用户角色
   */
  static getCurrentUserRole(): UserRole | null {
    const user = AuthStorage.getUser();
    return user?.role || null;
  }

  /**
   * 检查用户是否有特定权限
   */
  static hasPermission(permission: string): boolean {
    const user = AuthStorage.getUser();
    if (!user) return false;
    
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission);
  }

  /**
   * 检查用户是否有多个权限中的任意一个
   */
  static hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * 检查用户是否拥有所有指定权限
   */
  static hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * 检查用户是否是管理员（包括超级管理员）
   */
  static isAdmin(): boolean {
    const user = AuthStorage.getUser();
    if (!user) return false;
    
    return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  }

  /**
   * 检查用户是否是超级管理员
   */
  static isSuperAdmin(): boolean {
    const user = AuthStorage.getUser();
    if (!user) return false;
    
    return user.role === UserRole.SUPER_ADMIN;
  }

  /**
   * 检查用户是否有指定角色
   */
  static hasRole(role: UserRole): boolean {
    const user = AuthStorage.getUser();
    if (!user) return false;
    
    return user.role === role;
  }

  /**
   * 检查用户是否有指定角色中的任意一个
   */
  static hasAnyRole(roles: UserRole[]): boolean {
    const user = AuthStorage.getUser();
    if (!user) return false;
    
    return roles.includes(user.role);
  }

  /**
   * 检查用户是否可以访问指定资源
   * @param resourceOwnerId 资源所有者ID
   * @param requiredPermission 需要的权限
   */
  static canAccessResource(resourceOwnerId: string, requiredPermission: string): boolean {
    const user = AuthStorage.getUser();
    if (!user) return false;
    
    // 如果是资源所有者，直接允许访问
    if (user.id === resourceOwnerId) {
      return this.hasPermission(requiredPermission);
    }
    
    // 检查是否有查看所有资源的权限
    const viewAllPermission = requiredPermission.replace(':view', ':view_all');
    return this.hasPermission(viewAllPermission);
  }

  /**
   * 获取用户的所有权限
   */
  static getUserPermissions(): string[] {
    const user = AuthStorage.getUser();
    if (!user) return [];
    
    return ROLE_PERMISSIONS[user.role] || [];
  }

  /**
   * 检查用户账户状态是否正常
   */
  static isAccountActive(): boolean {
    const user = AuthStorage.getUser();
    if (!user) return false;
    
    // 检查用户状态（假设User接口有status字段）
    return user.status === 'active';
  }
}

// 导出便捷的函数
export const {
  getAccessToken,
  setAccessToken,
  getUser,
  setUser,
  setAuthData,
  getAuthData,
  clearAll: clearAuthData,
  hasValidAuth,
} = AuthStorage;

export const {
  isLoggedIn,
  getCurrentUserRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isAdmin,
  isSuperAdmin,
  hasRole,
  hasAnyRole,
  canAccessResource,
  getUserPermissions,
  isAccountActive,
} = AuthChecker;

// 权限常量已在上面导出，这里不需要重复导出
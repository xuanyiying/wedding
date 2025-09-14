import * as jwt from 'jsonwebtoken';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

export interface MCPUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

export class MCPAuthService {
  /**
   * 验证JWT令牌并返回用户信息
   * @param token JWT令牌
   * @returns 用户信息或null（如果验证失败）
   */
  public static async verifyToken(token: string): Promise<MCPUser | null> {
    try {
      // 移除Bearer前缀（如果存在）
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      
      // 验证JWT令牌
      const decoded = jwt.verify(cleanToken, config.jwt.secret) as any;
      
      // 返回用户信息
      return {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || []
      };
    } catch (error) {
      logger.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * 检查用户是否有指定权限
   * @param user 用户信息
   * @param permission 权限名称
   * @returns 是否有权限
   */
  public static hasPermission(user: MCPUser, permission: string): boolean {
    // 管理员拥有所有权限
    if (user.role === 'admin') {
      return true;
    }
    
    // 检查用户权限列表
    return user.permissions.includes(permission);
  }

  /**
   * 检查用户角色
   * @param user 用户信息
   * @param role 角色名称
   * @returns 是否具有指定角色
   */
  public static hasRole(user: MCPUser, role: string): boolean {
    return user.role === role;
  }
}
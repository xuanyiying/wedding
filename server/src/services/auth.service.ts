import bcrypt from 'bcryptjs';
import { User } from '../models';
import { JWTUtils } from '../utils/helpers';
import { RedisCache } from '../config/redis';
import { logger } from '../utils/logger';
import { AuthenticationError, ValidationError } from '../middlewares/error';
import { Op } from 'sequelize';
import { UserRole, UserStatus } from '../types';

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  phone?: string;
  password: string;
  realName?: string;
  nickname?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  realName?: string;
  nickname?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days

  /**
   * 用户登录
   */
  static async login(credentials: LoginCredentials): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const { identifier, password } = credentials;
    logger.info(identifier);

    if (!identifier) {
      logger.error('No identifier provided');
      throw new ValidationError('请提供用户名或邮箱');
    }

    // 查找用户（支持用户名、邮箱、手机号登录）
    const user = await User.findOne({
      where: {
        [Op.or]: [{ username: identifier }, { email: identifier }, { phone: identifier }],
      },
    });
    logger.info(user);
    if (!user) {
      logger.error('User not found');
      throw new AuthenticationError('用户名或密码错误');
    }

    // 检查用户状态
    if (user.status !== UserStatus.ACTIVE) {
      logger.error('User account is not active');
      throw new AuthenticationError('账户已被禁用或未激活');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      logger.error('Invalid password');
      throw new AuthenticationError('用户名或密码错误');
    }

    // 更新最后登录信息
    await user.update({
      lastLoginAt: new Date(),
      lastLoginIp: '127.0.0.1', // 默认IP地址
    });

    // 生成令牌
    const tokens = await this.generateTokens(user);

    // 记录登录日志
    logger.info('User logged in successfully', {
      userId: user.id,
      username: user.username,
      ip: '127.0.0.1',
    });

    return {
      user: this.formatUserProfile(user),
      tokens,
    };
  }

  /**
   * 用户注册
   */
  static async register(data: RegisterData): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const { username, email, phone, password, realName, nickname } = data;

    // 检查用户名是否已存在
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }, ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ValidationError('用户名已存在');
      }
      if (existingUser.email === email) {
        throw new ValidationError('邮箱已被注册');
      }
      if (phone && existingUser.phone === phone) {
        throw new ValidationError('手机号已被注册');
      }
    }

    // 加密密码
    const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    // 创建用户
    const userData: any = {
      username,
      email,
      phone: phone || '',
      passwordHash,
      salt,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      bio: '',
    };

    if (realName) {
      userData.realName = realName;
    }

    if (nickname) {
      userData.nickname = nickname;
    }

    const user = await User.create(userData);

    // 生成令牌
    const tokens = await this.generateTokens(user);

    // 记录注册日志
    logger.info('User registered successfully', {
      userId: user.id,
      username: user.username,
    });

    return {
      user: this.formatUserProfile(user),
      tokens,
    };
  }

  /**
   * 刷新访问令牌
   */
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // 验证刷新令牌
      const payload = JWTUtils.verifyRefreshToken(refreshToken);

      // 检查令牌是否在黑名单中
      const isBlacklisted = await RedisCache.get(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        throw new AuthenticationError('刷新令牌已失效');
      }

      // 查找用户
      const user = await User.findByPk((payload as any).id);
      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new AuthenticationError('用户不存在或已被禁用');
      }

      // 生成新的令牌对
      const tokens = await this.generateTokens(user);

      // 将旧的刷新令牌加入黑名单
      await RedisCache.set(`blacklist:${refreshToken}`, 'true', this.REFRESH_TOKEN_EXPIRY);

      return tokens;
    } catch (error) {
      throw new AuthenticationError('刷新令牌无效或已过期');
    }
  }

  /**
   * 用户登出
   */
  static async logout(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      // 将访问令牌加入黑名单
      const accessPayload = JWTUtils.verifyAccessToken(accessToken) as any;
      const accessTokenExpiry = accessPayload.exp - Math.floor(Date.now() / 1000);

      if (accessTokenExpiry > 0) {
        await RedisCache.set(`blacklist:${accessToken}`, 'true', accessTokenExpiry);
      }

      // 如果提供了刷新令牌，也加入黑名单
      if (refreshToken) {
        await RedisCache.set(`blacklist:${refreshToken}`, 'true', this.REFRESH_TOKEN_EXPIRY);
      }

      logger.info('User logged out successfully', {
        userId: accessPayload?.id,
      });
    } catch (error) {
      // 即使令牌验证失败，也不抛出错误，因为登出应该总是成功的
      logger.warn('Logout with invalid token', { error });
    }
  }

  /**
   * 修改密码
   */
  static async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AuthenticationError('用户不存在');
    }

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new AuthenticationError('原密码错误');
    }

    // 加密新密码
    const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // 更新密码
    await user.update({
      passwordHash,
      salt,
    });

    logger.info('Password changed successfully', {
      userId: user.id,
    });
  }

  /**
   * 生成访问令牌和刷新令牌
   */
  private static async generateTokens(user: any): Promise<AuthTokens> {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = JWTUtils.generateAccessToken(payload);
    const refreshToken = JWTUtils.generateRefreshToken(payload);

    // 存储刷新令牌到 Redis
    await RedisCache.set(`refresh_token:${user.id}`, refreshToken, this.REFRESH_TOKEN_EXPIRY);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour
    };
  }

  /**
   * 格式化用户信息
   */
  private static formatUserProfile(user: any): UserProfile {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      realName: user.realName,
      nickname: user.nickname,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * 根据用户名或邮箱查找用户
   */
  static async findUserByUsernameOrEmail(identifier: string): Promise<any> {
    return await User.findOne({
      where: {
          [Op.or]: [{ username: identifier }, { email: identifier }],
        },
    });
  }

  /**
   * 验证用户密码
   */
  static async validatePassword(user: any, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.passwordHash);
  }
}

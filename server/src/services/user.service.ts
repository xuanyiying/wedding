import { User } from '../models';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import { UserRole, UserStatus } from '../types';

export class UserService {
  /**
   * 获取用户列表（分页）
   */
  static async getUsers({
    page = 1,
    limit = 10,
    search,
    role,
    status,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    status?: UserStatus;
  }) {
    try {
      const offset = (page - 1) * limit;
      const where: any = {
        deletedAt: {
          [Op.is]: null,
        },
        status: {
          [Op.not]: UserStatus.DELETED,
        },
      };

      // 搜索条件
      if (search) {
        where[Op.or] = [
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { realName: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ];
      }

      // 角色筛选
      if (role) {
        where.role = role;
      }

      // 状态筛选
      if (status) {
        where.status = status;
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['password'] },
      });

      return {
        users: rows,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      };
    } catch (error) {
      logger.error('获取用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取用户详情
   */
  static async getUserById(id: string) {
    try {
      const user = await User.findByPk(id, {
        attributes: { exclude: ['passwordHash', 'salt'] },
      });

      if (!user || user.status === UserStatus.DELETED || user.deletedAt) {
        throw new Error('用户不存在');
      }
      return user;
    } catch (error) {
      logger.error('获取用户详情失败:', error);
      throw error;
    }
  }

  /**
   * 创建用户
   */
  static async createUser(userData: {
    username: string;
    email: string;
    password: string;
    realName?: string;
    phone?: string;
    role?: UserRole;
    status?: UserStatus;
  }) {
    try {
      // 检查用户名和邮箱是否已存在
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ username: userData.username }, { email: userData.email }],
        },
      });

      if (existingUser) {
        if (existingUser.username === userData.username) {
          throw new Error('用户名已存在');
        }
        if (existingUser.email === userData.email) {
          throw new Error('邮箱已存在');
        }
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      const user = await User.create({
        ...userData,
        passwordHash: hashedPassword,
        salt: '', // You may need to generate a proper salt
        role: userData.role || UserRole.USER,
        status: userData.status || UserStatus.ACTIVE,
      });

      // 返回用户信息（不包含密码）
      const { passwordHash, salt, ...userWithoutPassword } = user.toJSON();
      return userWithoutPassword;
    } catch (error) {
      logger.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  static async updateUser(
    id: string,
    updateData: {
      username?: string;
      email?: string;
      realName?: string;
      phone?: string;
      avatar?: string;
      avatarUrl?: string;
      bio?: string;
      role?: UserRole;
      status?: UserStatus;
      isPublished?: boolean;
      nickname?: string;
      specialties?: any;
      experienceYears?: number;
      location?: string;
      contactInfo?: any;
      socialLinks?: any;
    },
  ) {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查用户名和邮箱唯一性（如果要更新的话）
      if (updateData.username || updateData.email) {
        const whereConditions = [];
        if (updateData.username) {
          whereConditions.push({ username: updateData.username });
        }
        if (updateData.email) {
          whereConditions.push({ email: updateData.email });
        }

        const existingUser = await User.findOne({
          where: {
            id: { [Op.ne]: id },
            [Op.or]: whereConditions,
          },
        });

        if (existingUser) {
          if (updateData.username && existingUser.username === updateData.username) {
            throw new Error('用户名已存在');
          }
          if (updateData.email && existingUser.email === updateData.email) {
            throw new Error('邮箱已存在');
          }
        }
      }

      await user.update(updateData as any);
      await user.reload();

      // 返回更新后的用户信息（不包含密码）
      const { passwordHash, salt, ...userWithoutPassword } = user.toJSON();
      return userWithoutPassword;
    } catch (error) {
      logger.error('更新用户失败:', error);
      throw error;
    }
  }

  /**
   * 删除用户（软删除）
   */
  static async deleteUser(id: string) {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 软删除：将状态设置为已删除
      await user.update({ status: UserStatus.DELETED, deletedAt: new Date() });

      return true;
    } catch (error) {
      logger.error('删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除用户
   */
  static async batchDeleteUsers(ids: string[]) {
    try {
      const result = await User.update(
        { status: UserStatus.DELETED, deletedAt: new Date() },
        {
          where: {
            id: { [Op.in]: ids },
          },
        },
      );

      return result[0]; // 返回受影响的行数
    } catch (error) {
      logger.error('批量删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 重置用户密码
   */
  static async resetPassword(id: string, newPassword: string) {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('用户不存在');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await user.update({ passwordHash: hashedPassword });

      return true;
    } catch (error) {
      logger.error('重置密码失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户状态
   */
  static async updateUserStatus(id: string, status: UserStatus) {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('用户不存在');
      }

      await user.update({ status });

      // 返回更新后的用户信息（不包含密码）
      const { passwordHash, salt, ...userWithoutPassword } = user.toJSON();
      return userWithoutPassword;
    } catch (error) {
      logger.error('更新用户状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计信息
   */
  static async getUserStats(role: UserRole, startDate: string, endDate: string) {
    try {
      const totalUsers = await User.count({
        where: {
          role,
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
        },
      });
      const activeUsers = await User.count({
        where: {
          role,
          status: UserStatus.ACTIVE,
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
        },
      });
      const inactiveUsers = await User.count({
        where: {
          role,
          status: UserStatus.INACTIVE,
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
        },
      });
      const deletedUsers = await User.count({
        where: {
          role,
          status: UserStatus.DELETED,
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
        },
      });

      const usersByRole = await User.findAll({
        attributes: ['role', [User.sequelize!.fn('COUNT', User.sequelize!.col('id')), 'count']],
        group: ['role'],
        raw: true,
      });

      return {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        deleted: deletedUsers,
        byRole: usersByRole,
      };
    } catch (error) {
      logger.error('获取用户统计失败:', error);
      throw error;
    }
  }
}

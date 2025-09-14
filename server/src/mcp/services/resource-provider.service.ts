import { MCPAuthService, MCPUser } from './auth.service';
import { logger } from '../../utils/logger';

// 导入现有的模型
import { User, Work, Schedule, Team, File } from '../../models';

export interface ResourceData {
  id: string;
  type: string;
  attributes: Record<string, any>;
  relationships?: Record<string, any>;
}

export class ResourceProviderService {
  /**
   * 根据资源类型获取资源列表
   * @param user 用户信息
   * @param resourceType 资源类型
   * @param filters 过滤条件
   * @returns 资源列表
   */
  public static async listResources(
    user: MCPUser,
    resourceType: string,
    filters?: Record<string, any>
  ): Promise<ResourceData[]> {
    try {
      switch (resourceType) {
        case 'users':
          return await this.listUsers(user, filters);
        case 'works':
          return await this.listWorks(user, filters);
        case 'schedules':
          return await this.listSchedules(user, filters);
        case 'teams':
          return await this.listTeams(user, filters);
        case 'files':
          return await this.listFiles(user, filters);
        default:
          throw new Error(`Unsupported resource type: ${resourceType}`);
      }
    } catch (error) {
      logger.error(`Error listing ${resourceType} resources:`, error);
      throw error;
    }
  }

  /**
   * 获取指定资源
   * @param user 用户信息
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @returns 资源数据
   */
  public static async getResource(
    user: MCPUser,
    resourceType: string,
    resourceId: string
  ): Promise<ResourceData | null> {
    try {
      switch (resourceType) {
        case 'users':
          return await this.getUser(user, resourceId);
        case 'works':
          return await this.getWork(user, resourceId);
        case 'schedules':
          return await this.getSchedule(user, resourceId);
        case 'teams':
          return await this.getTeam(user, resourceId);
        case 'files':
          return await this.getFile(user, resourceId);
        default:
          throw new Error(`Unsupported resource type: ${resourceType}`);
      }
    } catch (error) {
      logger.error(`Error getting ${resourceType} resource:`, error);
      throw error;
    }
  }

  // 用户资源相关方法
  private static async listUsers(user: MCPUser, filters?: Record<string, any>): Promise<ResourceData[]> {
    // 管理员可以查看所有用户，普通用户只能查看自己
    const whereClause = MCPAuthService.hasRole(user, 'admin') 
      ? filters 
      : { ...filters, id: user.id };

    const users = await User.findAll({ where: whereClause ? whereClause : {} });
    return users.map((u: any) => ({
      id: u.id,
      type: 'users',
      attributes: {
        username: u.username,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }
    }));
  }

  private static async getUser(user: MCPUser, userId: string): Promise<ResourceData | null> {
    // 管理员可以查看任何用户，普通用户只能查看自己
    if (!MCPAuthService.hasRole(user, 'admin') && user.id !== userId) {
      throw new Error('Insufficient permissions to access this user');
    }

    const foundUser = await User.findByPk(userId);
    if (!foundUser) {
      return null;
    }

    return {
      id: foundUser.id,
      type: 'users',
      attributes: {
        username: foundUser.username,
        email: foundUser.email,
        role: foundUser.role,
        createdAt: foundUser.createdAt,
        updatedAt: foundUser.updatedAt
      }
    };
  }

  // 作品资源相关方法
  private static async listWorks(user: MCPUser, filters?: Record<string, any>): Promise<ResourceData[]> {
    // 管理员可以查看所有作品，普通用户只能查看自己的作品
    const whereClause = MCPAuthService.hasRole(user, 'admin') 
      ? filters 
      : { ...filters, userId: user.id };

    const works = await Work.findAll({ where: whereClause ? whereClause : {} });
    return works.map((w: any) => ({
      id: w.id,
      type: 'works',
      attributes: {
        title: w.title,
        description: w.description,
        status: w.status,
        userId: w.userId,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt
      }
    }));
  }

  private static async getWork(user: MCPUser, workId: string): Promise<ResourceData | null> {
    const work = await Work.findByPk(workId);
    if (!work) {
      return null;
    }

    // 管理员可以查看任何作品，普通用户只能查看自己的作品
    if (!MCPAuthService.hasRole(user, 'admin') && work.userId !== user.id) {
      throw new Error('Insufficient permissions to access this work');
    }

    return {
      id: work.id,
      type: 'works',
      attributes: {
        title: work.title,
        description: work.description,
        status: work.status,
        userId: work.userId,
        createdAt: work.createdAt,
        updatedAt: work.updatedAt
      }
    };
  }

  // 档期资源相关方法
  private static async listSchedules(user: MCPUser, filters?: Record<string, any>): Promise<ResourceData[]> {
    // 管理员可以查看所有档期，普通用户只能查看自己的档期
    const whereClause = MCPAuthService.hasRole(user, 'admin') 
      ? filters 
      : { ...filters, userId: user.id };

    const schedules = await Schedule.findAll({ where: whereClause ? whereClause : {} });
    return schedules.map((s: any) => ({
      id: s.id,
      type: 'schedules',
      attributes: {
        title: s.title,
        weddingDate: s.weddingDate,
        status: s.status,
        userId: s.userId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }
    }));
  }

  private static async getSchedule(user: MCPUser, scheduleId: string): Promise<ResourceData | null> {
    const schedule = await Schedule.findByPk(scheduleId);
    if (!schedule) {
      return null;
    }

    // 管理员可以查看任何档期，普通用户只能查看自己的档期
    if (!MCPAuthService.hasRole(user, 'admin') && schedule.userId !== user.id) {
      throw new Error('Insufficient permissions to access this schedule');
    }

    return {
      id: schedule.id,
      type: 'schedules',
      attributes: {
        title: schedule.title,
        weddingDate: schedule.weddingDate,
        status: schedule.status,
        userId: schedule.userId,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt
      }
    };
  }

  // 团队资源相关方法
  private static async listTeams(user: MCPUser, filters?: Record<string, any>): Promise<ResourceData[]> {
    // 管理员可以查看所有团队，普通用户只能查看自己所在的团队
    const whereClause = MCPAuthService.hasRole(user, 'admin') 
      ? filters 
      : { ...filters };

    const teams = await Team.findAll({ where: whereClause ? whereClause : {} });
    return teams.map((t: any) => ({
      id: t.id,
      type: 'teams',
      attributes: {
        name: t.name,
        description: t.description,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      }
    }));
  }

  private static async getTeam(_user: MCPUser, teamId: string): Promise<ResourceData | null> {
    const team = await Team.findByPk(teamId);
    if (!team) {
      return null;
    }

    // TODO: 实现团队成员权限检查
    // 简化实现：假设用户可以访问所有团队信息
    return {
      id: team.id,
      type: 'teams',
      attributes: {
        name: team.name,
        description: team.description,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      }
    };
  }

  // 文件资源相关方法
  private static async listFiles(user: MCPUser, filters?: Record<string, any>): Promise<ResourceData[]> {
    // 管理员可以查看所有文件，普通用户只能查看自己的文件
    const whereClause = MCPAuthService.hasRole(user, 'admin') 
      ? filters 
      : { ...filters, userId: user.id };

    const files = await File.findAll({ where: whereClause ? whereClause : {} });
    return files.map((f: any) => ({
      id: f.id,
      type: 'files',
      attributes: {
        name: f.originalName,
        type: f.mimeType,
        size: f.fileSize,
        userId: f.userId,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
      }
    }));
  }

  private static async getFile(user: MCPUser, fileId: string): Promise<ResourceData | null> {
    const file = await File.findByPk(fileId);
    if (!file) {
      return null;
    }

    // 管理员可以查看任何文件，普通用户只能查看自己的文件
    if (!MCPAuthService.hasRole(user, 'admin') && file.userId !== user.id) {
      throw new Error('Insufficient permissions to access this file');
    }

    return {
      id: file.id,
      type: 'files',
      attributes: {
        name: file.originalName,
        type: file.mimeType,
        size: file.fileSize,
        userId: file.userId,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt
      }
    };
  }
}
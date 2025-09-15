import { MCPAuthService, MCPUser } from './auth.service';
import axios, { AxiosInstance } from 'axios';

// 导入MCP内部模型
import { User, Work, Schedule, Team, File } from '../models';
import { logger } from '../utils/logger';
import { config } from '../config/config'; // 导入MCP配置

export interface ResourceData {
  id: string;
  type: string;
  attributes: Record<string, any>;
  relationships?: Record<string, any>;
}

export class ResourceProviderService {
  private static apiClient: AxiosInstance;

  // 初始化API客户端
  private static initializeApiClient(token: string): void {
    this.apiClient = axios.create({
      baseURL: config.apiBaseUrl, // 使用MCP配置中的API基础URL
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10秒超时
    });
  }

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
      // 初始化API客户端
      this.initializeApiClient(user.token);

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
      // 初始化API客户端
      this.initializeApiClient(user.token);

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
    try {
      // 管理员可以查看所有用户，普通用户只能查看自己
      const params = MCPAuthService.hasRole(user, 'admin')
        ? filters
        : { ...filters, id: user.id };

      const response = await this.apiClient.get('/api/v1/users', { params });
      const users: User[] = response.data.data || response.data;

      return users.map((u: User) => ({
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
    } catch (error) {
      logger.error('Error fetching users:', error);
      throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async getUser(user: MCPUser, userId: string): Promise<ResourceData | null> {
    try {
      // 管理员可以查看任何用户，普通用户只能查看自己
      if (!MCPAuthService.hasRole(user, 'admin') && user.id !== userId) {
        throw new Error('Insufficient permissions to access this user');
      }

      const response = await this.apiClient.get(`/api/v1/users/${userId}`);
      const foundUser: User = response.data.data || response.data;

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
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      logger.error('Error fetching user:', error);
      throw new Error(`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 作品资源相关方法
  private static async listWorks(user: MCPUser, filters?: Record<string, any>): Promise<ResourceData[]> {
    try {
      // 管理员可以查看所有作品，普通用户只能查看自己的作品
      const params = MCPAuthService.hasRole(user, 'admin')
        ? filters
        : { ...filters, userId: user.id };

      const response = await this.apiClient.get('/api/v1/works', { params });
      const works: Work[] = response.data.data || response.data;

      return works.map((w: Work) => ({
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
    } catch (error) {
      logger.error('Error fetching works:', error);
      throw new Error(`Failed to fetch works: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async getWork(user: MCPUser, workId: string): Promise<ResourceData | null> {
    try {
      const response = await this.apiClient.get(`/api/v1/works/${workId}`);
      const work: Work = response.data.data || response.data;

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
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      logger.error('Error fetching work:', error);
      throw new Error(`Failed to fetch work: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 档期资源相关方法
  private static async listSchedules(user: MCPUser, filters?: Record<string, any>): Promise<ResourceData[]> {
    try {
      // 管理员可以查看所有档期，普通用户只能查看自己的档期
      const params = MCPAuthService.hasRole(user, 'admin')
        ? filters
        : { ...filters, userId: user.id };

      const response = await this.apiClient.get('/api/v1/schedules', { params });
      const schedules: Schedule[] = response.data.data || response.data;

      return schedules.map((s: Schedule) => ({
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
    } catch (error) {
      logger.error('Error fetching schedules:', error);
      throw new Error(`Failed to fetch schedules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async getSchedule(user: MCPUser, scheduleId: string): Promise<ResourceData | null> {
    try {
      const response = await this.apiClient.get(`/api/v1/schedules/${scheduleId}`);
      const schedule: Schedule = response.data.data || response.data;

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
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      logger.error('Error fetching schedule:', error);
      throw new Error(`Failed to fetch schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 团队资源相关方法
  private static async listTeams(user: MCPUser, filters?: Record<string, any>): Promise<ResourceData[]> {
    try {
      // 管理员可以查看所有团队，普通用户只能查看自己所在的团队
      const params = MCPAuthService.hasRole(user, 'admin')
        ? filters
        : { ...filters };

      const response = await this.apiClient.get('/api/v1/teams', { params });
      const teams: Team[] = response.data.data || response.data;

      return teams.map((t: Team) => ({
        id: t.id,
        type: 'teams',
        attributes: {
          name: t.name,
          description: t.description,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt
        }
      }));
    } catch (error) {
      logger.error('Error fetching teams:', error);
      throw new Error(`Failed to fetch teams: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async getTeam(_user: MCPUser, teamId: string): Promise<ResourceData | null> {
    try {
      const response = await this.apiClient.get(`/api/v1/teams/${teamId}`);
      const team: Team = response.data.data || response.data;

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
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      logger.error('Error fetching team:', error);
      throw new Error(`Failed to fetch team: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 文件资源相关方法
  private static async listFiles(user: MCPUser, filters?: Record<string, any>): Promise<ResourceData[]> {
    try {
      // 管理员可以查看所有文件，普通用户只能查看自己的文件
      const params = MCPAuthService.hasRole(user, 'admin')
        ? filters
        : { ...filters, userId: user.id };

      const response = await this.apiClient.get('/api/v1/files', { params });
      const files: File[] = response.data.data || response.data;

      return files.map((f: File) => ({
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
    } catch (error) {
      logger.error('Error fetching files:', error);
      throw new Error(`Failed to fetch files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async getFile(user: MCPUser, fileId: string): Promise<ResourceData | null> {
    try {
      const response = await this.apiClient.get(`/api/v1/files/${fileId}`);
      const file: File = response.data.data || response.data;

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
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      logger.error('Error fetching file:', error);
      throw new Error(`Failed to fetch file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
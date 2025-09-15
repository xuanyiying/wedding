import { MCPAuthService, MCPUser } from './auth.service';
import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export class ToolService {
  private static apiClient: AxiosInstance;

  // 初始化API客户端
  private static initializeApiClient(token: string): void {
    this.apiClient = axios.create({
      baseURL: config.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10秒超时
    });
  }

  /**
   * 获取可用工具列表
   * @param user 用户信息
   * @returns 工具定义列表
   */
  public static async listTools(user: MCPUser): Promise<ToolDefinition[]> {
    const tools: ToolDefinition[] = [];

    // 所有用户都可以创建问题报告
    tools.push({
      name: 'createIssue',
      description: 'Create a new issue report',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Issue title' },
          description: { type: 'string', description: 'Issue description' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Issue priority' }
        },
        required: ['title', 'description']
      }
    });

    // 档期所有者或管理员可以更新档期状态
    if (MCPAuthService.hasRole(user, 'admin') || MCPAuthService.hasPermission(user, 'manage_schedules')) {
      tools.push({
        name: 'updateSchedule',
        description: 'Update schedule status',
        inputSchema: {
          type: 'object',
          properties: {
            scheduleId: { type: 'string', description: 'Schedule ID' },
            status: { type: 'string', enum: ['available', 'booked', 'unavailable'], description: 'New status' }
          },
          required: ['scheduleId', 'status']
        }
      });
    }

    // 管理员可以创建新用户
    if (MCPAuthService.hasRole(user, 'admin')) {
      tools.push({
        name: 'createUser',
        description: 'Create a new user',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'User email' },
            username: { type: 'string', description: 'User username' },
            role: { type: 'string', enum: ['user', 'admin'], description: 'User role' }
          },
          required: ['email', 'username', 'role']
        }
      });

      tools.push({
        name: 'assignTeamMember',
        description: 'Assign a team member',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID' },
            userId: { type: 'string', description: 'User ID' }
          },
          required: ['teamId', 'userId']
        }
      });

      tools.push({
        name: 'updateWorkStatus',
        description: 'Update work status',
        inputSchema: {
          type: 'object',
          properties: {
            workId: { type: 'string', description: 'Work ID' },
            status: { type: 'string', enum: ['draft', 'published', 'archived'], description: 'New status' }
          },
          required: ['workId', 'status']
        }
      });
    }

    return tools;
  }

  /**
   * 调用指定工具
   * @param user 用户信息
   * @param toolName 工具名称
   * @param arguments 工具参数
   * @returns 工具执行结果
   */
  public static async callTool(
    user: MCPUser,
    toolName: string,
    args: Record<string, any>
  ): Promise<ToolResult> {
    try {
      // 初始化API客户端
      this.initializeApiClient(user.token);

      switch (toolName) {
        case 'createIssue':
          return await this.createIssue(args);
        case 'updateSchedule':
          return await this.updateSchedule(user, args);
        case 'createUser':
          return await this.createUser(user, args);
        case 'assignTeamMember':
          return await this.assignTeamMember(user, args);
        case 'updateWorkStatus':
          return await this.updateWorkStatus(user, args);
        default:
          throw new Error(`Unsupported tool: ${toolName}`);
      }
    } catch (error) {
      logger.error(`Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * 创建问题报告
   */
  private static async createIssue(args: Record<string, any>): Promise<ToolResult> {
    const { title, description, priority = 'medium' } = args;

    try {
      const response = await this.apiClient.post('/api/v1/issues', {
        title,
        description,
        priority,
      });

      return {
        content: [{
          type: 'text',
          text: `Issue created successfully with ID: ${response.data.id}`
        }]
      };
    } catch (error) {
      logger.error('Error creating issue:', error);
      throw new Error(`Failed to create issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 更新档期状态
   */
  private static async updateSchedule(user: MCPUser, args: Record<string, any>): Promise<ToolResult> {
    const { scheduleId, status } = args;

    // 检查权限
    if (!MCPAuthService.hasRole(user, 'admin') && !MCPAuthService.hasPermission(user, 'manage_schedules')) {
      throw new Error('Insufficient permissions to update schedule');
    }

    try {
      await this.apiClient.patch(`/api/v1/schedules/${scheduleId}`, { status });

      return {
        content: [{
          type: 'text',
          text: `Schedule ${scheduleId} updated successfully`
        }]
      };
    } catch (error) {
      logger.error('Error updating schedule:', error);
      throw new Error(`Failed to update schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 创建新用户
   */
  private static async createUser(user: MCPUser, args: Record<string, any>): Promise<ToolResult> {
    // 检查权限
    if (!MCPAuthService.hasRole(user, 'admin')) {
      throw new Error('Insufficient permissions to create user');
    }

    const { email, username, role } = args;

    try {
      const response = await this.apiClient.post('/api/v1/users', {
        email,
        username,
        role,
        password: 'temporary-password' // 临时密码，用户需要重置
      });

      return {
        content: [{
          type: 'text',
          text: `User created successfully with ID: ${response.data.id}`
        }]
      };
    } catch (error) {
      logger.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 分配团队成员
   */
  private static async assignTeamMember(user: MCPUser, args: Record<string, any>): Promise<ToolResult> {
    // 检查权限
    if (!MCPAuthService.hasRole(user, 'admin')) {
      throw new Error('Insufficient permissions to assign team member');
    }

    const { teamId, userId } = args;

    // 这里需要根据实际的API进行调整
    return {
      content: [{
        type: 'text',
        text: `Team member assignment functionality not fully implemented yet. Would assign user ${userId} to team ${teamId}`
      }]
    };
  }

  /**
   * 更新作品状态
   */
  private static async updateWorkStatus(user: MCPUser, args: Record<string, any>): Promise<ToolResult> {
    // 检查权限
    if (!MCPAuthService.hasRole(user, 'admin')) {
      throw new Error('Insufficient permissions to update work status');
    }

    const { workId, status } = args;

    try {
      await this.apiClient.patch(`/api/v1/works/${workId}`, { status });

      return {
        content: [{
          type: 'text',
          text: `Work ${workId} status updated successfully`
        }]
      };
    } catch (error) {
      logger.error('Error updating work status:', error);
      throw new Error(`Failed to update work status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
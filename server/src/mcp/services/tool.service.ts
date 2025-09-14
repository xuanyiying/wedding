import { MCPAuthService, MCPUser } from './auth.service';
import { logger } from '../../utils/logger';

// 导入现有的服务
import { IssueService } from '../../services/issue.service';
import { ScheduleService } from '../../services/schedule.service';
import { UserService } from '../../services/user.service';
import { WorkService } from '../../services/work.service';

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
      switch (toolName) {
        case 'createIssue':
          return await this.createIssue(user, args);
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
  private static async createIssue(user: MCPUser, args: Record<string, any>): Promise<ToolResult> {
    const { title, description, priority = 'medium' } = args;
    
    // 使用现有的IssueService创建问题
    const issue = await IssueService.createIssue({
      title,
      description,
      priority,
    }, user.id);

    return {
      content: [{
        type: 'text',
        text: `Issue created successfully with ID: ${issue.id}`
      }]
    };
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
    
    // 使用现有的ScheduleService更新档期
    await ScheduleService.updateSchedule(scheduleId, { status }, user.id);

    return {
      content: [{
        type: 'text',
        text: `Schedule ${scheduleId} updated successfully`
      }]
    };
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
    
    // 使用现有的UserService创建用户
    const newUser = await UserService.createUser({
      email,
      username,
      role,
      password: 'temporary-password' // 临时密码，用户需要重置
    });

    return {
      content: [{
        type: 'text',
        text: `User created successfully with ID: ${newUser.id}`
      }]
    };
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
    
    // 使用现有的TeamService分配成员
    // 注意：这里需要根据实际的TeamService API进行调整
    // 假设有一个addTeamMember方法
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
    
    // 使用现有的WorkService更新作品状态
    await WorkService.updateWork(workId, { status }, user.id);

    return {
      content: [{
        type: 'text',
        text: `Work ${workId} status updated successfully`
      }]
    };
  }
}
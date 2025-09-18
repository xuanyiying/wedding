import { Issue, IssueType, IssuePriority, IssueStatus } from '../models/Issue';
import { User } from '../models';
import { Op } from 'sequelize';
import { logger } from '../utils/logger';

export interface GetIssuesParams {
  page?: number;
  pageSize?: number;
  type?: IssueType;
  priority?: IssuePriority;
  status?: IssueStatus;
  search?: string;
  assigneeId?: string;
  reporterId?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class IssueService {
  /**
   * 获取问题列表
   */
  static async getIssues(params: GetIssuesParams) {
    try {
      const {
        page = 1,
        pageSize = 20,
        type,
        priority,
        status,
        search,
        assigneeId,
        reporterId,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = params;

      const where: any = {};

      if (type) where.type = type;
      if (priority) where.priority = priority;
      if (status) where.status = status;
      if (assigneeId) where.assigneeId = assigneeId;
      if (reporterId) where.reporterId = reporterId;

      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * pageSize;
      const limit = pageSize;

      const { count, rows: issues } = await Issue.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'username', 'avatar']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'username', 'avatar']
          }
        ],
        order: [[sortBy, sortOrder]],
        offset,
        limit
      });

      return {
        issues,
        pagination: {
          page,
          pageSize,
          total: count,
          totalPages: Math.ceil(count / pageSize)
        }
      };
    } catch (error) {
      logger.error('获取问题列表失败:', error);
      throw new Error('获取问题列表失败');
    }
  }

  /**
   * 获取单个问题详情
   */
  static async getIssueById(id: string) {
    try {
      const issue = await Issue.findByPk(id, {
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'username', 'avatar']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'username', 'avatar']
          }
        ]
      });

      if (!issue) {
        throw new Error('问题不存在');
      }

      return issue;
    } catch (error) {
      logger.error('获取问题详情失败:', error);
      throw new Error('获取问题详情失败');
    }
  }

  /**
   * 创建新问题
   */
  static async createIssue(issueData: any, reporterId: string) {
    try {
      const {
        title,
        description,
        type,
        priority,
        stepsToReproduce,
        expectedBehavior,
        actualBehavior,
        environment,
        version,
        labels
      } = issueData;

      const issue = await Issue.create({
        title,
        description,
        type: type || IssueType.BUG,
        priority: priority || IssuePriority.MEDIUM,
        status: IssueStatus.OPEN,
        stepsToReproduce,
        expectedBehavior,
        actualBehavior,
        environment,
        version,
        labels: labels ? JSON.stringify(labels) : null,
        reporterId,
        voteCount: 0,
        commentCount: 0
      });

      return await this.getIssueById(issue.id);
    } catch (error) {
      logger.error('创建问题失败:', error);
      throw new Error('创建问题失败');
    }
  }

  /**
   * 更新问题
   */
  static async updateIssue(id: string, updates: any, userId: string, userRole: string) {
    try {
      const issue = await Issue.findByPk(id);
      if (!issue) {
        throw new Error('问题不存在');
      }

      // 权限检查：只有创建者或管理员可以修改
      if (issue.reporterId !== userId && userRole !== 'admin') {
        throw new Error('没有权限修改此问题');
      }

      if (updates.labels) {
        updates.labels = JSON.stringify(updates.labels);
      }

      await issue.update(updates);
      return await this.getIssueById(id);
    } catch (error) {
      logger.error('更新问题失败:', error);
      throw new Error('更新问题失败');
    }
  }

  /**
   * 删除问题
   */
  static async deleteIssue(id: string, userId: string, userRole: string) {
    try {
      const issue = await Issue.findByPk(id);
      if (!issue) {
        throw new Error('问题不存在');
      }

      // 权限检查：只有创建者或管理员可以删除
      if (issue.reporterId !== userId && userRole !== 'admin') {
        throw new Error('没有权限删除此问题');
      }

      await issue.destroy();
      return true;
    } catch (error) {
      logger.error('删除问题失败:', error);
      throw new Error('删除问题失败');
    }
  }

  /**
   * 投票问题
   */
  static async voteIssue(id: string, action: 'upvote' | 'downvote') {
    try {
      const issue = await Issue.findByPk(id);
      if (!issue) {
        throw new Error('问题不存在');
      }

      const voteChange = action === 'upvote' ? 1 : -1;
      await issue.update({
        voteCount: Math.max(0, issue.voteCount + voteChange)
      });

      return {
        voteCount: issue.voteCount
      };
    } catch (error) {
      logger.error('投票失败:', error);
      throw new Error('投票失败');
    }
  }

  /**
   * 获取问题统计
   */
  static async getIssueStats() {
    try {
      const stats = await Issue.findAll({
        attributes: [
          'status',
          [Issue.sequelize!.fn('COUNT', Issue.sequelize!.col('id')), 'count']
        ],
        group: ['status']
      });

      const total = await Issue.count();
      const open = await Issue.count({ where: { status: IssueStatus.OPEN } });
      const inProgress = await Issue.count({ where: { status: IssueStatus.IN_PROGRESS } });
      const resolved = await Issue.count({ where: { status: IssueStatus.RESOLVED } });

      return {
        total,
        open,
        inProgress,
        resolved,
        byStatus: stats
      };
    } catch (error) {
      logger.error('获取问题统计失败:', error);
      throw new Error('获取问题统计失败');
    }
  }
}
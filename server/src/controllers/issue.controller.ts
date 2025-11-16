import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { IssueService } from '../services/issue.service';
import { Resp } from '../utils/response';
import { logger } from '../utils/logger';
export class IssueController {

  /**
 * 获取问题列表
 */
  public static async getIssues(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      } = req.query;

      const result = await IssueService.getIssues({
        page: Number(page),
        pageSize: Number(pageSize),
        type: type as any,
        priority: priority as any,
        status: status as any,
        search: search as string,
        assigneeId: assigneeId as string,
        reporterId: reporterId as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC'
      });

      Resp.success(res, {
        issues: result.issues,
        pagination: result.pagination
      }, '获取问题列表成功');
    } catch (error) {
      logger.error('获取问题列表失败:', error);
      next(error);
    }
  };

  /**
   * 获取单个问题详情
   */
  public static async getIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new Error('问题ID不能为空');
      }
      const issue = await IssueService.getIssueById(id);
      Resp.success(res, issue, '获取问题详情成功');
    } catch (error: any) {
      logger.error('获取问题详情失败:', error);
      next(error);
    }
  };

  /**
   * 创建新问题
   */
  public static async createIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error('参数验证失败');
        (error as any).status = 400;
        (error as any).details = errors.array();
        return next(error);
      }

      const issueData = req.body;
      const reporterId = (req.user as any).id;
      const issue = await IssueService.createIssue(issueData, reporterId);

      Resp.created(res, issue, '问题创建成功');
    } catch (error) {
      logger.error('创建问题失败:', error);
      next(error);
    }
  };

  /**
   * 更新问题
   */
  public static async updateIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new Error('问题ID不能为空');
      }
      const updates = req.body;
      const userId = (req.user as any).id;
      const userRole = (req.user as any).role;

      const issue = await IssueService.updateIssue(id, updates, userId, userRole);
      Resp.success(res, issue, '问题更新成功');
    } catch (error: any) {
      logger.error('更新问题失败:', error);
      next(error);
    }
  };

  /**
   * 删除问题
   */
  public static async deleteIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new Error('问题ID不能为空');
      }
      const userId = (req.user as any).id;
      const userRole = (req.user as any).role;

      await IssueService.deleteIssue(id, userId, userRole);
      Resp.success(res, null, '问题删除成功');
    } catch (error: any) {
      logger.error('删除问题失败:', error);
      next(error);
    }
  };

  /**
   * 投票问题
   */
  public static async voteIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new Error('问题ID不能为空');
      }
      const { action } = req.body;

      const result = await IssueService.voteIssue(id, action);
      Resp.success(res, result, '投票成功');
    } catch (error: any) {
      logger.error('投票失败:', error);
      next(error);
    }
  };

  /**
   * 获取问题统计
   */
  public static async getIssueStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await IssueService.getIssueStats();
      Resp.success(res, stats, '获取问题统计成功');
    } catch (error) {
      logger.error('获取问题统计失败:', error);
      next(error);
    }
  };
}

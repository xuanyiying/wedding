import type { ApiResponse } from '../types';
import type {
  Issue,
  CreateIssueRequest,
  UpdateIssueRequest,
  IssueListResponse,
  IssueStats,
  VoteRequest,
  VoteResponse
} from '../types/issue';
import request from '../utils/request';

export const issue = {
  /**
   * 获取问题列表
   */
  async getIssues(params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    priority?: string;
    status?: string;
    search?: string;
    assigneeId?: string;
    reporterId?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ApiResponse<IssueListResponse>> {
    return await request.get('/issues', { params });
  },

  /**
   * 获取问题统计
   */
  async getIssueStats(): Promise<ApiResponse<IssueStats>> {
    return await request.get('/issues/stats');
  },

  /**
   * 获取单个问题详情
   */
  async getIssue(id: string): Promise<ApiResponse<Issue>> {
    return await request.get(`/issues/${id}`);
  },

  /**
   * 创建新问题
   */
  async createIssue(data: CreateIssueRequest): Promise<ApiResponse<Issue>> {
    return await request.post('/issues', data);
  },

  /**
   * 更新问题
   */
  async updateIssue(id: string, data: UpdateIssueRequest): Promise<ApiResponse<Issue>> {
    return await request.put(`/issues/${id}`, data);
  },

  /**
   * 删除问题
   */
  async deleteIssue(id: string): Promise<ApiResponse<void>> {
    return await request.delete(`/issues/${id}`);
  },

  /**
   * 投票问题
   */
  async voteIssue(id: string, data: VoteRequest): Promise<ApiResponse<VoteResponse>> {
    return await request.post(`/issues/${id}/vote`, data);
  }
};

export default issue;
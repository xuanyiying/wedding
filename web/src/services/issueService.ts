
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

export const issueService = {
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
  }): Promise<IssueListResponse> {
    const response = await request.get('/issues', { params });
    return response.data;
  },

  /**
   * 获取问题统计
   */
  async getIssueStats(): Promise<IssueStats> {
    const response = await request.get('/issues/stats');
    return response.data;
  },

  /**
   * 获取单个问题详情
   */
  async getIssue(id: string): Promise<Issue> {
    const response = await request.get(`/issues/${id}`);
    return response.data;
  },

  /**
   * 创建新问题
   */
  async createIssue(data: CreateIssueRequest): Promise<Issue> {
    const response = await request.post('/issues', data);
    return response.data;
  },

  /**
   * 更新问题
   */
  async updateIssue(id: string, data: UpdateIssueRequest): Promise<Issue> {
    const response = await request.put(`/issues/${id}`, data);
    return response.data;
  },

  /**
   * 删除问题
   */
  async deleteIssue(id: string): Promise<void> {
    await request.delete(`/issues/${id}`);
  },

  /**
   * 投票问题
   */
  async voteIssue(id: string, data: VoteRequest): Promise<VoteResponse> {
    const response = await request.post(`/issues/${id}/vote`, data);
    return response.data;
  }
};

export default issueService;
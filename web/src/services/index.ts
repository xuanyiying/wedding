import { http } from '../utils/request';
import type {
  User,
  Schedule,
  Work,
  ApiResponse,
  PaginationParams,
  LoginForm,
  RegisterForm,
  ContactForm,
  DashboardStats,
  TeamMember,
  TeamStats,
  TeamMemberStatus,
  TeamMemberRole,
  Team,
  MediaFile,
  FileType,
} from '../types';

// 认证相关API
export const authService = {
  // 用户登录
  login: (data: LoginForm): Promise<ApiResponse<{ user: User; token: string }>> => {
    return http.post('/auth/login', data);
  },

  // 用户注册
  register: (data: RegisterForm): Promise<ApiResponse<{ user: User; token: string }>> => {
    return http.post('/auth/register', data);
  },

  // 用户登出
  logout: (): Promise<ApiResponse<null>> => {
    return http.post('/auth/logout');
  },



  // 获取当前用户信息
  getCurrentUser: (): Promise<ApiResponse<User>> => {
    return http.get('/auth/me');
  },

  // 更新用户资料
  updateProfile: (data: Partial<User>): Promise<ApiResponse<User>> => {
    return http.put('/auth/profile', data);
  },

  // 修改密码
  changePassword: (data: { oldPassword: string; newPassword: string }): Promise<ApiResponse<null>> => {
    return http.put('/auth/password', data);
  },

  // 忘记密码
  forgotPassword: (email: string): Promise<ApiResponse<null>> => {
    return http.post('/auth/forgot-password', { email });
  },

  // 重置密码
  resetPassword: (data: { token: string; password: string }): Promise<ApiResponse<null>> => {
    return http.post('/auth/reset-password', data);
  },
};

// 日程相关API
export const scheduleService = {
  // 获取日程列表
  getSchedules: (params?: PaginationParams & {
    startDate?: string;
    endDate?: string;
    status?: string;
    userId?: string;
  }): Promise<ApiResponse<{ schedules: Schedule[]; total: number }>> => {
    return http.get('/schedules', { params });
  },

  // 获取单个日程
  getSchedule: (id: string): Promise<ApiResponse<{ schedule: Schedule }>> => {
    return http.get(`/schedules/${id}`);
  },

  // 创建日程
    createSchedule: (data: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Schedule>> => {
    return http.post('/schedules', data);
  },

  // 更新日程
  updateSchedule: (id: string, data: Partial<Schedule>): Promise<ApiResponse<Schedule>> => {
    return http.put(`/schedules/${id}`, data);
  },

  // 删除日程
  deleteSchedule: (id: string): Promise<ApiResponse<null>> => {
    return http.delete(`/schedules/${id}`);
  },

  // 批量更新日程状态
  batchUpdateStatus: (ids: string[], status: string): Promise<ApiResponse<null>> => {
    return http.put('/schedules/batch-status', { ids, status });
  },

  // 获取可用时间段
  getAvailableSlots: (date: string, hostId?: string): Promise<ApiResponse<string[]>> => {
    return http.get('/schedules/available-slots', { params: { date, hostId } });
  },

  // 获取用户档期日历
  getUserScheduleCalendar: (userId: string, year: number, month: number): Promise<ApiResponse<Array<{
    date: string;
    schedules: Array<{
      id: string;
      title: string;
      status: string;
      startTime: string;
      endTime: string;
    }>;
  }>>> => {
    return http.get(`/schedules/calendar/${userId}/${year}/${month}`);
  },

  // 获取用户日程列表
  // 根据时间查询可用主持人
  getAvailableHosts: (params: {
    weddingDate: string;
    weddingTime: string;
  }): Promise<ApiResponse<{
    users: User[];
    total: number;
  }>> => {
    return http.get('/schedules/available-hosts', { params });
  },
};

// 作品相关API
export const workService = {
  // 获取作品列表
  getWorks: (params?: PaginationParams & {
    category?: string;
    status?: string;
    featured?: boolean;
    search?: string;
  }): Promise<ApiResponse<{ works: Work[]; total: number }>> => {
    return http.get('/works', { params });
  },

  // 获取单个作品
  getWork: (id: string): Promise<ApiResponse<Work>> => {
    return http.get(`/works/${id}`);
  },

  // 创建作品
  createWork: (data: Omit<Work, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Work>> => {
    return http.post('/works', data);
  },

  // 更新作品
  updateWork: (id: string, data: Partial<Work>): Promise<ApiResponse<Work>> => {
    return http.put(`/works/${id}`, data);
  },

  // 删除作品
  deleteWork: (id: string): Promise<ApiResponse<null>> => {
    return http.delete(`/works/${id}`);
  },

  // 批量删除作品
  batchDeleteWorks: (ids: string[]): Promise<ApiResponse<null>> => {
    return http.delete('/works/batch', { data: { ids } });
  },

  // 获取作品分类
  getCategories: (): Promise<ApiResponse<string[]>> => {
    return http.get('/works/categories');
  },

  // 上传作品图片
  uploadImages: (files: File[]): Promise<ApiResponse<string[]>> => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    return http.upload('/works/upload-images', formData);
  },
};

// 用户相关API
export const userService = {
  // 获取用户列表（管理员）
  getUsers: (params?: PaginationParams & {
    role?: string;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<{ users: User[]; total: number }>> => {
    return http.get('/users', { params });
  },

  // 获取单个用户
  getUser: (id: string): Promise<ApiResponse<User>> => {
    return http.get(`/users/${id}`);
  },
  // 创建用户
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<User>> => {
    return http.post('/users', data);
  },
  // 更新用户（管理员）
  updateUser: (id: string, data: Partial<User>): Promise<ApiResponse<User>> => {
    return http.put(`/users/${id}`, data);
  },

  // 删除用户（管理员）
  deleteUser: (id: string): Promise<ApiResponse<null>> => {
    return http.delete(`/users/${id}`);
  },

  // 获取主持人列表
  getHosts: (params?: {
    available?: boolean;
    date?: string;
    category?: string;
  }): Promise<ApiResponse<User[]>> => {
    return http.get('/users/hosts', { params });
  },

  // 获取当前用户信息
  getCurrentUser: (): Promise<ApiResponse<User>> => {
    return http.get('/users/me');
  },

  // 更新当前用户资料
  updateCurrentUserProfile: (data: Partial<User>): Promise<ApiResponse<User>> => {
    return http.put('/users/me/profile', data);
  },

  // 根据userId获取团队列表
  getTeamsByUserId: (userId: string): Promise<ApiResponse<Team[]>> => {
    return http.get(`/users/${userId}/teams`);
  },

  // 发布/取消发布当前用户资料
  toggleCurrentUserProfilePublish: (isPublished: boolean): Promise<ApiResponse<User>> => {
    return http.patch('/users/me/profile/publish', { isPublished });
  },
};

// 联系表单相关API
export const contactService = {
  // 提交联系表单
  submitContact: (data: ContactForm): Promise<ApiResponse<Boolean>> => {
    return http.post('/contact', data);
  },

  // 获取联系表单列表（管理员）
  getContacts: (params?: PaginationParams & {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ contacts: ContactForm[]; total: number }>> => {
    return http.get('/contact', { params });
  },

  // 更新联系表单状态（管理员）
  updateContactStatus: (id: string, status: string): Promise<ApiResponse<Boolean>> => {
    return http.put(`/contact/${id}/status`, { status });
  },
};

// 仪表板相关API
export const dashboardService = {
  // 获取仪表板统计数据
  getStats: (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<DashboardStats>> => {
    return http.get('/dashboard/stats', { params });
  },

  // 获取最近活动
  getRecentActivities: (limit: number = 10): Promise<ApiResponse<Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    createdAt: string;
    user?: User;
  }>>> => {
    return http.get('/dashboard/activities', { params: { limit } });
  },

  // 获取收入统计
  getRevenueStats: (params?: {
    startDate?: string;
    endDate?: string;
    period?: 'day' | 'week' | 'month' | 'year';
  }): Promise<ApiResponse<Array<{
    date: string;
    amount: number;
    count: number;
  }>>> => {
    return http.get('/dashboard/revenue', { params });
  },
};

// 作品展示相关API
export const worksService = {
  // 获取作品列表
  getWorks: (params?: PaginationParams & {
    category?: string;
    type?: string;
    featured?: boolean;
    search?: string;
  }): Promise<ApiResponse<{ data: Work[]; total: number }>> => {
    return http.get('/works', { params });
  },

  // 获取单个作品
  getWork: (id: string): Promise<ApiResponse<Work>> => {
    return http.get(`/works/${id}`);
  },
};

// 团队管理相关API
export const teamService = {
  // 团队CRUD操作
  // 获取团队列表
  getTeams: (params?: PaginationParams & {
    search?: string;
    status?: string;
  }): Promise<ApiResponse<{ teams: Team[]; total: number }>> => {
    return http.get('/team', { params });
  },

// 根据团队id获取团队=0 `
  getTeam: (id: string): Promise<ApiResponse<Team>> => {
    return http.get(`/team/${id}`);
  },

  // 创建团队
  createTeam: (data: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Team>> => {
    return http.post('/team', data);
  },

  // 更新团队
  updateTeam: (id: string, data: Partial<Team>): Promise<ApiResponse<Team>> => {
    return http.put(`/team/${id}`, data);
  },

  updateTeamAvatar: (id: string, avatarUrl: string): Promise<ApiResponse<Team>> => {
    return http.put(`/team/${id}`, { avatar: avatarUrl });
  },

  // 删除团队
  deleteTeam: (id: string): Promise<ApiResponse<null>> => {
    return http.delete(`/team/${id}`);
  },

  // 团队成员管理
  // 获取团队成员列表
  getTeamMembers: (teamId: string, params?: PaginationParams & {
    role?: TeamMemberRole;
    status?: TeamMemberStatus;
    search?: string;
  }): Promise<ApiResponse<{ members: TeamMember[]; total: number }>> => {
    return http.get(`/team/${teamId}/members`, { params });
  },

  // 获取单个团队成员
  getTeamMember: (id: string): Promise<ApiResponse<TeamMember>> => {
    return http.get(`/team/members/${id}`);
  },

// 获取可邀请的用户列表（排除已在团队中的用户）
  getAvailableUsers: (teamId: string, params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ users: User[]; total: number }>> => {
    return http.get(`/team/${teamId}/available-users`, { params });
  },

  // 邀请团队成员
  inviteTeamMember: (data: {
    userIds: string[];
    role: TeamMemberRole;
    teamId: string;
  }): Promise<ApiResponse<TeamMember[]>> => {
    return http.post('/team/members', data);
  },

  // 创建团队成员
  createTeamMember: (data: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<TeamMember>> => {
    return http.post('/team/members', data);
  },

  // 更新团队成员
  updateTeamMember: (id: string, data: Partial<TeamMember>): Promise<ApiResponse<TeamMember>> => {
    return http.put(`/team/members/${id}`, data);
  },

  // 删除团队成员
  deleteTeamMember: (id: string): Promise<ApiResponse<null>> => {
    return http.delete(`/team/members/${id}`);
  },

  // 批量删除团队成员
  batchDeleteMembers: (ids: string[]): Promise<ApiResponse<null>> => {
    return http.delete('/team/members/batch', { data: { ids } });
  },

  // 更新成员状态
  updateMemberStatus: (id: string, status: TeamMemberStatus): Promise<ApiResponse<TeamMember>> => {
    return http.put(`/team/members/${id}/status`, { status });
  },

  // 获取团队统计
  getTeamStats: (): Promise<ApiResponse<TeamStats>> => {
    return http.get('/team/stats');
  },

  // 获取下属成员
  getSubordinates: (managerId: string): Promise<ApiResponse<TeamMember[]>> => {
    return http.get(`/team/managers/${managerId}/subordinates`);
  },

  // 根据技能搜索成员
  searchBySkills: (skills: string[]): Promise<ApiResponse<TeamMember[]>> => {
    return http.get('/team/search/skills', { params: { skills: skills.join(',') } });
  },

  // 转移下属关系
  transferSubordinates: (fromManagerId: string, toManagerId: string, memberIds: string[]): Promise<ApiResponse<null>> => {
    return http.put('/team/transfer-subordinates', {
      fromManagerId,
      toManagerId,
      memberIds
    });
  },
};

// 系统设置相关API
export const settingsService = {
  // 获取系统设置
  getSettings: (): Promise<ApiResponse<Record<string, any>>> => {
    return http.get('/settings');
  },

  // 更新网站设置
  updateSiteSettings: (data: Record<string, any>): Promise<ApiResponse<null>> => {
    return http.put('/settings/site', data);
  },

  // 更新邮件设置
  updateEmailSettings: (data: Record<string, any>): Promise<ApiResponse<null>> => {
    return http.put('/settings/email', data);
  },

  // 更新安全设置
  updateSecuritySettings: (data: Record<string, any>): Promise<ApiResponse<null>> => {
    return http.put('/settings/security', data);
  },

  // 测试邮件
  testEmail: (data: { to: string; subject: string; content: string }): Promise<ApiResponse<null>> => {
    return http.post('/settings/test-email', data);
  },

  // 清除缓存
  clearCache: (): Promise<ApiResponse<null>> => {
    return http.post('/settings/clear-cache');
  },

  // 备份数据库
  backupDatabase: (): Promise<ApiResponse<null>> => {
    return http.post('/settings/backup-database');
  },

  // 获取网站配置
  getSiteConfig: (): Promise<ApiResponse<{
    siteName: string;
    siteDescription: string;
    logo: string;
    favicon: string;
    contactInfo: {
      phone: string;
      email: string;
      address: string;
      wechat: string;
      qq: string;
    };
    socialMedia: {
      weibo: string;
      wechat: string;
      douyin: string;
    };
  }>> => {
    return http.get('/settings/site-config');
  },

  // 更新网站配置
  updateSiteConfig: (data: any): Promise<ApiResponse<null>> => {
    return http.put('/settings/site-config', data);
  },
};

export const fileService = {
  // 获取用户媒体文件
  getUserMedia: (userId: string, type: FileType): Promise<ApiResponse<{ mediaFiles: MediaFile[] }>> => {
    return http.get(`/files/user/${userId}/${type}`);
  },

  // 上传用户媒体文件
  uploadUserMedia: (userId: string, type: FileType, file: File): Promise<ApiResponse<MediaFile>> => {
    const formData = new FormData();
    formData.append('file', file);
    return http.post(`/files/user/${userId}/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 上传单个文件
  uploadFile: (file: File, type: FileType): Promise<ApiResponse<MediaFile>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return http.upload('/files/upload', formData);
  },

  // 上传多个文件
  uploadFiles: (files: File[], type: 'image' | 'video' | 'document' = 'image'): Promise<ApiResponse<{
    urls: string[];
    files: Array<{
      url: string;
      filename: string;
      size: number;
      type: string;
    }>;
  }>> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('type', type);
    return http.upload('/files/upload/batch', formData);
  },

  // 删除文件
  deleteFile: (id: string): Promise<ApiResponse<Boolean>> => {
    return http.delete(`/files/${id}`);
  },
};
export const profileService = {
  getProfile: (userId: string): Promise<ApiResponse<User>> => {
    return http.get(`/users/${userId}`);
  },
  updateProfile: (userId: string, data: any): Promise<ApiResponse<User>> => {
    return http.put(`/users/${userId}`, data);
  },
  deleteProfile: (userId: string): Promise<ApiResponse<null>> => {
    return http.delete(`/users/${userId}`);
  },
  updateMediaOrder: (sortData: { id: string; sortOrder: number }[]): Promise<ApiResponse<boolean>> => {
    return http.put('/profile/me/media-order', { sortData });
  },
}
// 导出所有服务
export default {
  auth: authService,
  schedule: scheduleService,
  work: workService,
  works: worksService,
  team: teamService,
  user: userService,
  contact: contactService,
  dashboard: dashboardService,
  settings: settingsService,
  profile: profileService,
};

export { directUploadService } from './direct-upload';
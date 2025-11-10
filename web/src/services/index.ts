import { http } from "../utils/request";
import type {
  User,
  Schedule,
  Work,
  ApiResponse,
  PaginationParams,
  LoginForm,
  RegisterForm,
  ContactForm,
  TeamMember,
  TeamStats,
  TeamMemberStatus,
  TeamMemberRole,
  Team,
  MediaFile,
  FileType,
  FileInfo,
  DayAvailability,
  DashboardScheduleStats,
} from "../types";

// 认证相关API
export const authService = {
  // 用户登录
  login: (data: LoginForm): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> => {
    return http.post("/auth/login", data);
  },

  // 用户注册
  register: (data: RegisterForm): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> => {
    return http.post("/auth/register", data);
  },

  // 用户登出
  logout: (): Promise<ApiResponse<null>> => {
    return http.post("/auth/logout");
  },

  // 刷新访问令牌
  refreshToken: (refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> => {
    return http.post("/auth/refresh-token", { refreshToken });
  },

  // 获取当前用户信息
  getCurrentUser: (): Promise<ApiResponse<User>> => {
    return http.get("/auth/me");
  },

  // 更新用户资料
  updateProfile: (data: Partial<User>): Promise<ApiResponse<User>> => {
    return http.put("/auth/profile", data);
  },

  // 修改密码
  changePassword: (data: { oldPassword: string; newPassword: string }): Promise<ApiResponse<null>> => {
    return http.put("/auth/password", data);
  },

  // 忘记密码
  forgotPassword: (email: string): Promise<ApiResponse<null>> => {
    return http.post("/auth/forgot-password", { email });
  },

  // 重置密码
  resetPassword: (data: { token: string; password: string }): Promise<ApiResponse<null>> => {
    return http.post("/auth/reset-password", data);
  }
};

// 日程相关API
export const scheduleService = {
  // 获取日程列表
  getSchedules: (
    params?: PaginationParams & {
      startDate?: string;
      endDate?: string;
      status?: string;
      userId?: string;
    },
  ): Promise<ApiResponse<{ schedules: Schedule[]; total: number }>> => {
    return http.get("/schedules", { params });
  },

  // 获取单个日程
  getSchedule: (id: string): Promise<ApiResponse<{ schedule: Schedule }>> => {
    return http.get(`/schedules/${id}`);
  },

  // 创建日程
  createSchedule: (
    data: Omit<Schedule, "id" | "createdAt" | "updatedAt">,
  ): Promise<ApiResponse<Schedule>> => {
    return http.post("/schedules", data);
  },

  // 更新日程
  updateSchedule: (
    id: string,
    data: Partial<Schedule>,
  ): Promise<ApiResponse<Schedule>> => {
    return http.put(`/schedules/${id}`, data);
  },

  // 删除日程
  deleteSchedule: (id: string): Promise<ApiResponse<null>> => {
    return http.delete(`/schedules/${id}`);
  },

  // 批量更新日程状态
  batchUpdateStatus: (
    ids: string[],
    status: string,
  ): Promise<ApiResponse<null>> => {
    return http.put("/schedules/batch-status", { ids, status });
  },

  // 获取可用时间段
  getAvailableSlots: (
    date: string,
    hostId?: string,
  ): Promise<ApiResponse<DayAvailability[]>> => {
    return http.get("/schedules/available-slots", { params: { date, hostId } });
  },

  // 获取用户档期日历
  getUserScheduleCalendar: (
    userId: string,
    year: number,
    month: number,
  ): Promise<
    ApiResponse<
      Array<{
        date: string;
        schedules: Array<{
          id: string;
          title: string;
          status: string;
          startTime: string;
          endTime: string;
        }>;
      }>
    >
  > => {
    return http.get(`/schedules/calendar/${userId}/${year}/${month}`);
  },

  // 获取用户日程列表
  // 根据时间查询可用主持人
  getAvailableHosts: (params: {
    teamId: string;
    weddingDate: string;
    weddingTime: string;
  }): Promise<ApiResponse<{ hosts: TeamMember[]; total: number }>> => {
    return http.get("/schedules/available-hosts", { params });
  },

  // 检查档期冲突
  checkScheduleConflict: (params: {
    userId: string;
    weddingDate: string;
    weddingTime: string;
    excludeId?: string;
  }): Promise<
    ApiResponse<{
      hasConflict: boolean;
      userId: string;
    }>
  > => {
    return http.post("/schedules/check-conflict", params);
  },

  // 获取团队档期统计数据
  getPersonalScheduleStats: (params: {
    userId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> => {
    return http.get("/schedules/stats/personal", { params });
  },

  // 获取所有团队档期统计数据
  getAllTeamsScheduleStats: (params: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> => {
    return http.get("/schedules/stats/all-teams", { params });
  },
};

// 作品相关API
export const workService = {
  // 获取作品列表
  getWorks: (params?: PaginationParams & {
    category?: string;
    status?: string;
    featured?: boolean;
    userId?: string;
    search?: string;
    teamId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<{ works: Work[]; total: number }>> => {
    return http.get("/works", { params });
  },

  // 获取单个作品
  getWork: (id: string): Promise<ApiResponse<Work>> => {
    return http.get(`/works/${id}`);
  },

  // 创建作品
  createWork: (data: Omit<Work, "id" | "createdAt" | "updatedAt">): Promise<ApiResponse<Work>> => {
    return http.post("/works", data);
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
    return http.delete("/works/batch", { data: { ids } });
  },

  // 获取作品分类
  getCategories: (): Promise<ApiResponse<string[]>> => {
    return http.get("/works/categories");
  },

  // 上传作品图片
  uploadImages: (files: File[]): Promise<ApiResponse<string[]>> => {
    const formData = new FormData();
    files.forEach(file => formData.append("images", file));
    return http.upload("/works/upload-images", formData);
  }
};

// 用户相关API
export const userService = {
  // 获取用户列表（管理员）
  getUsers: (params?: PaginationParams & {
    role?: string;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<{ users: User[]; total: number }>> => {
    return http.get("/users", { params });
  },

  // 获取单个用户
  getUser: (id: string): Promise<ApiResponse<User>> => {
    return http.get(`/users/${id}`);
  },
  // 创建用户
  createUser: (data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<ApiResponse<User>> => {
    return http.post("/users", data);
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
    return http.get("/users/hosts", { params });
  },

  // 获取当前用户信息
  getCurrentUser: (): Promise<ApiResponse<User>> => {
    return http.get("/users/me");
  },

  // 更新当前用户资料
  updateCurrentUserProfile: (data: Partial<User>): Promise<ApiResponse<User>> => {
    return http.put("/users/me/profile", data);
  },

  // 根据userId获取团队列表
  getTeamsByUserId: (userId: string): Promise<ApiResponse<Team[]>> => {
    return http.get(`/users/${userId}/teams`);
  },

  // 发布/取消发布当前用户资料
  toggleCurrentUserProfilePublish: (isPublished: boolean): Promise<ApiResponse<User>> => {
    return http.patch("/users/me/profile/publish", { isPublished });
  }
};

// 联系表单相关API
export const contactService = {
  // 提交联系表单
  submitContact: (data: ContactForm): Promise<ApiResponse<boolean>> => {
    return http.post("/contact", data);
  },

  // 获取联系表单列表（管理员）
  getContacts: (params?: PaginationParams & {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ contacts: ContactForm[]; total: number }>> => {
    return http.get("/contact", { params });
  },

  // 更新联系表单状态（管理员）
  updateContactStatus: (id: string, status: string): Promise<ApiResponse<boolean>> => {
    return http.put(`/contact/${id}/status`, { status });
  }
};

// 仪表板相关API
export const dashboardService = {
  // 获取仪表板统计数据
  getStats: (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<DashboardScheduleStats>> => {
    return http.get("/dashboard/stats", { params });
  },

  // 获取仪表板档期统计数据
  getScheduleStats: (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<DashboardScheduleStats>> => {
    return http.get("/dashboard/schedule-stats", { params });
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
    return http.get("/dashboard/activities", { params: { limit } });
  },

  // 获取收入统计
  getRevenueStats: (params?: {
    startDate?: string;
    endDate?: string;
    period?: "day" | "week" | "month" | "year";
  }): Promise<ApiResponse<Array<{
    date: string;
    amount: number;
    count: number;
  }>>> => {
    return http.get("/dashboard/revenue", { params });
  },

  // 获取今日档期统计
  getTodayScheduleStats: (): Promise<ApiResponse<{
    totalSchedules: number;
    teamSchedules: number;
    personalSchedules: number;
    statusStats: {
      available: number;
      booked: number;
      reserve: number;
      completed: number;
      cancelled: number;
    };
    teamPercentage: number;
    personalPercentage: number;
    scheduleList: Array<{
      id: string;
      title: string;
      status: string;
      startTime: string;
      endTime: string;
      location: string;
      eventType: string;
      weddingTime: string;
      user: {
        id: string;
        name: string;
        avatar: string;
      };
      customer: {
        id: string;
        name: string;
      };
    }>;
    date: string;
  }>> => {
    return http.get("/dashboard/today-schedule-stats");
  }
};

// 团队管理相关API
export const teamService = {
  // 团队CRUD操作
  // 获取团队列表
  getTeams: (params?: PaginationParams & {
    search?: string;
    status?: string;
  }): Promise<ApiResponse<{ teams: Team[]; total: number }>> => {
    return http.get("/team", { params });
  },

  // 根据团队id获取团队
  getTeamById: (id: string): Promise<ApiResponse<Team>> => {
    return http.get(`/team/${id}`);
  },

  // 创建团队
  createTeam: (data: Omit<Team, "id" | "createdAt" | "updatedAt">): Promise<ApiResponse<Team>> => {
    return http.post("/team", data);
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
    return http.post("/team/members", data);
  },

  // 创建团队成员
  createTeamMember: (data: Omit<TeamMember, "id" | "createdAt" | "updatedAt">): Promise<ApiResponse<TeamMember>> => {
    return http.post("/team/members", data);
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
    return http.delete("/team/members/batch", { data: { ids } });
  },

  // 更新成员状态
  updateMemberStatus: (id: string, status: TeamMemberStatus): Promise<ApiResponse<TeamMember>> => {
    return http.put(`/team/members/${id}/status`, { status });
  },

  // 获取团队统计
  getTeamStats: (): Promise<ApiResponse<TeamStats>> => {
    return http.get("/team/stats");
  },

  // 获取下属成员
  getSubordinates: (managerId: string): Promise<ApiResponse<TeamMember[]>> => {
    return http.get(`/team/managers/${managerId}/subordinates`);
  },

  // 根据技能搜索成员
  searchBySkills: (skills: string[]): Promise<ApiResponse<TeamMember[]>> => {
    return http.get("/team/search/skills", { params: { skills: skills.join(",") } });
  },

  // 转移下属关系
  transferSubordinates: (fromManagerId: string, toManagerId: string, memberIds: string[]): Promise<ApiResponse<null>> => {
    return http.put("/team/transfer-subordinates", {
      fromManagerId,
      toManagerId,
      memberIds
    });
  }
};

// 系统设置相关API - 重构为分离的数据模块
export const settingsService = {
  // ========== 网站设置模块 ==========
  // 获取网站设置
  getSiteSettings: (): Promise<ApiResponse<any>> => {
    return http.get("/settings/site");
  },

  // ========== 首页设置模块 ==========
  // 获取首页设置
  getHomepageSettings: (): Promise<ApiResponse<any>> => {
    return http.get("/settings/homepage");
  },

  // ========== 主题设置模块 ==========
  // 获取主题设置
  getThemeSettings: (): Promise<ApiResponse<any>> => {
    return http.get("/settings/theme");
  },

  // ========== 邮件设置模块 ==========
  // 获取邮件设置
  getEmailSettings: (): Promise<ApiResponse<any>> => {
    return http.get("/settings/email");
  },
  // ========== 通用功能 ==========
  // 测试邮件
  testEmail: (data: { to: string; subject: string; content: string }): Promise<ApiResponse<null>> => {
    return http.post("/settings/test-email", data);
  },

  // 清除缓存
  clearCache: (): Promise<ApiResponse<null>> => {
    return http.post("/settings/clear-cache");
  },

  // 备份数据库
  backupDatabase: (): Promise<ApiResponse<null>> => {
    return http.post("/settings/backup-database");
  },

  // ========== 兼容性接口（保留旧版本支持） ==========
  // 获取系统设置（兼容）
  getSettings: (): Promise<ApiResponse<any>> => {
    return http.get("/settings");
  },

  // 更新网站设置（兼容）
  updateSiteSettings: (data: any): Promise<ApiResponse<null>> => {
    return http.post("/settings/site", data);
  },

  // 更新首页设置（兼容）
  updateHomepageSettings: (data: any): Promise<ApiResponse<null>> => {
    return http.post("/settings/homepage", data);
  },

  // 更新主题设置（兼容）
  updateThemeSettings: (data: any): Promise<ApiResponse<null>> => {
    return http.post("/settings/theme", data);
  },

  // 更新邮件设置（兼容）
  updateEmailSettings: (data: any): Promise<ApiResponse<null>> => {
    return http.post("/settings/email", data);
  }
};

export const fileService = {
  // 上传单个文件
  uploadFile: (file: File, data: { fileType: FileType; category?: string }): Promise<ApiResponse<MediaFile>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", data.fileType);
    if (data.category) {
      formData.append("category", data.category);
    }
    return http.upload("/files/upload", formData);
  },

  // 上传多个文件
  uploadFiles: (files: File[], fileType: "image" | "video" = "image", category?: string): Promise<ApiResponse<{
    urls: string[];
    files: Array<{
      url: string;
      filename: string;
      size: number;
      fileType: string;
      category?: string;
    }>;
  }>> => {
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    formData.append("fileType", fileType);
    if (category) {
      formData.append("category", category);
    }
    return http.upload("/files/upload/batch", formData);
  },

  // 删除文件
  deleteFile: (id: string): Promise<ApiResponse<boolean>> => {
    return http.delete(`/files/${id}`);
  },
  getFile: (id: string): Promise<ApiResponse<FileInfo>> => {
    return http.get(`/files/${id}`);
  },

  uploadVideoCover: (file: File, videoFileId: string): Promise<ApiResponse<string>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", "image");
    formData.append("category", "cover");
    return http.upload(`/files/${videoFileId}/cover`, formData);
  },

  // 分块上传相关方法
  initChunkUpload: (data: {
    filename: string;
    fileSize: number;
    mimeType: string;
    category: string;
    totalChunks: number;
  }): Promise<ApiResponse<{
    uploadId: string;
    uploadUrl: string;
  }>> => {
    return http.post("/files/chunk/init", data);
  },

  uploadChunk: (data: {
    uploadId: string;
    chunkIndex: number;
    chunk: Blob;
  }): Promise<ApiResponse<{
    success: boolean;
  }>> => {
    const formData = new FormData();
    formData.append("uploadId", data.uploadId);
    formData.append("chunkIndex", data.chunkIndex.toString());
    formData.append("chunk", data.chunk);
    return http.upload("/files/chunk/upload", formData);
  },

  completeChunkUpload: (data: {
    uploadId: string;
    fileId: string;
  }): Promise<ApiResponse<{
    fileId: string;
    filename: string;
    url: string;
  }>> => {
    return http.post("/files/chunk/complete", data);
  },

  // 检查分块上传状态
  checkChunkUploadStatus: (uploadId: string): Promise<ApiResponse<{
    uploadId: string;
    totalChunks: number;
    uploadedChunks: number;
    missingChunks: number[];
    isCompleted: boolean;
    canResume: boolean;
    sessionExpired: boolean;
    suggestions?: string[];
  }>> => {
    return http.get(`/files/chunk/status/${uploadId}`);
  },

  checkDuplicate: (param: { hash: string; fileName: string; category: string }): Promise<ApiResponse<{
    exists: boolean;
    fileId?: string;
    url?: string;
  }>> => {
    return http.post("/files/check-duplicate", param);
  },

  checkResumableUpload(param: { fileName: string; fileSize: number; category: string }) : Promise<ApiResponse<{
    uploadId: string;
    completedChunks: number[];
    nextChunkIndex: number;
    totalChunks: number;
    chunkSize: number;
    canResume: boolean;
  }>> {
    return http.post("/files/check-resumable", param);
  }
}
export const profileService = {
  // 用户资料相关（包含用户信息和媒体文件）
  getUserProfile: (userId: string): Promise<ApiResponse<any>> => {
    return http.get(`/profile/user/${userId}`);
  },

  // 媒体资料CRUD操作 - 修复接口路径，与后端保持一致
  getUserMediaProfiles: (userId: string): Promise<ApiResponse<MediaFile[]>> => {
    return http.get(`/profile/media-profiles/${userId}`);
  },
  createMediaProfile: (data: any): Promise<ApiResponse<any>> => {
    return http.post("/profile/media-profiles", data);
  },
  batchCreateMediaProfiles: (userId: string, data: { mediaProfiles: MediaFile[] }): Promise<ApiResponse<any>> => {
    return http.post(`/profile/media-profiles/batch/${userId}`, data);
  },
  updateSingleMediaProfile: (fileId: string, data: any): Promise<ApiResponse<any>> => {
    return http.put(`/profile/media-profiles/${fileId}`, data);
  },
  updateMediaProfilesOrder: (data: { orderData: { id: string; mediaOrder: number }[] }): Promise<ApiResponse<any>> => {
    return http.put("/profile/media-profiles/order", data);
  },
  deleteMediaProfile: (fileId: string): Promise<ApiResponse<any>> => {
    return http.delete(`/profile/media-profiles/${fileId}`);
  },
  batchDeleteMediaProfiles: (userId: string, fileIds: string[]): Promise<ApiResponse<any>> => {
    return http.delete(`/profile/media-profiles/batch/${userId}`, { data: { fileIds } });
  },
  getMediaProfileById: (fileId: string): Promise<ApiResponse<any>> => {
    return http.get(`/profile/media-profiles/${fileId}`);
  }
};
// 导出所有服务
export { directUploadService } from "./direct-upload";
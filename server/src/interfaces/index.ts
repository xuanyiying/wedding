import { EventType, UserRole, NotificationType, UserStatus, Gender, ContactStatus, FileCategory, ConfigCategory } from "../types";
// 统计数据类型
export interface Statistics {
  totalUsers: number;
  totalHosts: number;
  totalBookings: number;
  totalRevenue: number;
  monthlyBookings: MonthlyData[];
  monthlyRevenue: MonthlyData[];
  popularServices: ServiceStats[];
  topHosts: HostStats[];
}

export interface MonthlyData {
  month: string;
  value: number;
}

export interface ServiceStats {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  revenue: number;
}

export interface HostStats {
  hostId: string;
  hostName: string;
  bookingCount: number;
  rating: number;
  revenue: number;
}

// 分页类型
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 搜索类型
export interface SearchQuery {
  keyword?: string;
  category?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  eventType?: EventType;
  dateFrom?: Date;
  dateTo?: Date;
}

import { Request } from 'express';
 // 扩展的 Express Request 类型
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
  };
}

// JWT Payload 类型
export interface JWTPayload {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
export interface Aut<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

// API 错误类型
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  statusCode: number;
}

// 邮件模板类型
export interface EmailTemplate {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

// 通知类型
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  profile?: UserProfile;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface UserProfile {
  realName?: string;
  gender?: Gender;
  birthday?: Date;
  address?: string;
  bio?: string;
  wechat?: string;
  qq?: string;
}

// 联系咨询类型
export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  eventType: EventType;
  eventDate?: Date;
  location?: string;
  budget?: number;
  guestCount?: number;
  requirements?: string;
  preferredHostId?: string;
  status: ContactStatus;
  assignedToId?: string;
  notes?: string;
  followUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}


// 文件上传类型
export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  uploadedBy: string;
  category: FileCategory;
  isPublic: boolean;
  createdAt: Date;
}


// 系统配置类型
export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: ConfigCategory;
  isPublic: boolean;
  updatedAt: Date;
  updatedBy: string;
}

export { UserRole, UserStatus };

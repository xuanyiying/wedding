import {
  UserRole,
  UserStatus,
  Gender,
  ContactStatus,
  FileCategory,
  FileType,
  OssType,
} from '../types';

export interface DashboardScheduleStats {
    totalCount: number;
    completedCount: number;
    reserveCount: number;
    totalRevenue: number;
    teamStats: TeamScheduleStats[];
    teamCount: number;
}

// 统计数据类型
export interface TeamScheduleStats {
  teamId: string;
  teamName: string;
  totalRevenue: number;
  completedCount: number;
  totalCount: number;
  memberCount: number;
  memberStats: PersonalScheduleStats[];
}

export interface PersonalScheduleStats {
  userId: string;
  realName: string;
  avatarUrl?: string;
  scheduleCount: number;
  completedCount: number;
  reserveCount: number;
  revenue: number;
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


// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  profile?: Profile;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Profile {
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

export interface UserMediaProfile {
  userId: string;
  user?: User;
  files: MediaFile[];
}

export interface MediaFile {
  id?: string;
  userId?: string;
  fileId: string;
  mediaOrder?: number;
  fileType?: FileType;
  originalName: string;
  filename: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailUrl: string | null;
  hashMd5: string | null;
  ossType: OssType;
  bucketName: string | null;
  isPublic: boolean;
  downloadCount: number | null;
  metadata: any | null;
  category: FileCategory;
}

export { UserRole, UserStatus };

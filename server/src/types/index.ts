
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum ContactStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  IN_PROGRESS = 'in_progress',
  QUOTED = 'quoted',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIAL = 'partial',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum ConfigCategory {
  GENERAL = 'general',
  EMAIL = 'email',
  PAYMENT = 'payment',
  UPLOAD = 'upload',
  SECURITY = 'security',
  OTHER = 'other',
}

export enum NotificationType {
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELLED = 'booking_cancelled',
  PAYMENT_RECEIVED = 'payment_received',
  REVIEW_RECEIVED = 'review_received',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  OTHER = 'other',
}

export enum ResourceType {
  USER = 'user',
  TEAM = 'team',
  WORK = 'work',
  VIDEO = 'video',
}

// Enums defined according to database-design.md
export enum ScheduleStatus {
  AVAILABLE = 'available', // 可预订
  BOOKED = 'booked', // 已预订
  COMPLETED = 'completed', // 已完成
  CANCELLED = 'cancelled', // 已取消
  DELETED = 'deleted', // 已删除
  RESERVE = 'reserve', // 预留
}

export enum EventType {
  WEDDING = 'wedding', // 婚礼
  ENGAGEMENT = 'engagement', // 订婚
  ANNIVERSARY = 'anniversary', // 纪念日
  CONSULTATION = 'consultation', // 咨询
  OTHER = 'other', // 其他
}

export enum WeddingTime {
  LUNCH = 'lunch', // 午宴
  DINNER = 'dinner', // 晚宴
}

// 团队状态枚举
export enum TeamStatus {
  DISABLED = 'disabled', // 禁用
  ACTIVE = 'active', // 正常
  PENDING = 'pending', // 待审核
}

// 团队成员角色枚举
export enum TeamMemberRole {
  MEMBER = 1, // 成员
  ADMIN = 2, // 管理员
  OWNER = 3, // 所有者
}

// 团队成员状态枚举
export enum TeamMemberStatus {
  ACTIVE = 1, // 正常
  PENDING = 2, // 待审核
  INACTIVE = 3, // 已离职
}

// Enums defined according to database-design.md
export enum FileType {
  IMAGE = 'image', // 图片
  VIDEO = 'video', // 视频
}

export enum OssType {
  minio = 'minio', // 对象存储服务
  aws = 'aws', // AWS S3
  aliyun = 'aliyun', // CDN
  tencent = 'tencent',
}

// Enums defined according to database-design.md
export enum WorkStatus {
  DRAFT = 'draft', // 草稿
  PUBLISHED = 'published', // 已发布
  ARCHIVED = 'archived', // 归档
  DELETED = 'deleted', // 已删除
}

export enum WorkType {
  IMAGE = 'image', // 图片
  VIDEO = 'video', // 视频
}

export enum WorkCategory {
  TEAM_BUILDING = 'team_building', // 团建
  WEDDING_HOST = 'wedding_host', // 婚礼主持
  WEDDING_PLANNING = 'wedding_planning', // 婚礼策划
  WEDDING_PHOTOGRAPHY = 'wedding_photography', // 婚礼摄影
  WEDDING_VIDEOGRAPHY = 'wedding_videography', // 婚礼摄像
}

export enum FileCategory {
  AVATAR = 'avatar',
  COVER = 'cover',
  WORK = 'work',
  OTHER = 'other',
  PROFILE = 'profile',
  FAVICON = 'favicon',
  LOGO = 'logo',
}

// 业务异常
export class AppError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
  }
}
// 时间冲突错误
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
// 400 Bad Request错误
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}
// Redis键前缀
export const CHUNK_UPLOAD_PREFIX = 'chunk_upload_session:';
// 会话过期时间（秒）
export const CHUNK_SESSION_EXPIRE_TIME = 24 * 60 * 60; // 24小时

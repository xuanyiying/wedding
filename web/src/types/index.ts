
export interface SiteSettings {
  theme?: {
    darkMode: boolean;
    colors: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
    };
    fonts: {
      primary: string;
      secondary: string;
    };
    spacing: {
      containerPadding: string;
      sectionPadding: string;
    };
  };
  site?: {
    name: string;
    description: string;
    keywords: string;
    logo: string;
    favicon: string;
  };
  email?: {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    smtp_secure: boolean;
    email_from: string;
    email_from_name: string;
  };
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  workingHours?: string;
  socialMedia?: {
    wechat: string;
    xiaohongshu: string;
    douyin: string;
  };
  seo?: {
    title: string;
    description: string;
    keywords: string;
  };
  // 首页section配置
  homepageSections?: {
    homepageBackgroundImage: string;
    hero: {
      visible: boolean;
      title: string;
      description: string;
      ctaText: string;
      ctaLink: string;
    };
    team: {
      visible: boolean;
      title: string;
      description: string;
      ctaText: string;
      ctaLink: string;
    };
    teamShowcase: {
      visible: boolean;
      title: string;
      description: string;
      ctaText: string;
      ctaLink: string;
    };
    portfolio: {
      visible: boolean;
      title: string;
      description: string;
      ctaText: string;
      ctaLink: string;
    };
    schedule: {
      visible: boolean;
      title: string;
      description: string;
      ctaText: string;
      ctaLink: string;
    };
    contact: {
      visible: boolean;
      title: string;
      description: string;
      ctaText: string;
      ctaLink: string;
    };
  };
}

// 邮件设置接口
export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  enableSSL: boolean;
  fromEmail: string;
  fromName: string;
}

// 主题设置接口
export interface ThemeSettings {
  primaryColor: string;
  borderRadius: number;
  compactMode: boolean;
  darkMode: boolean;
  fontSize: number;
}

export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  DELETED: 'deleted'
} as const;

// 档期状态枚举
export const ScheduleStatus = {
  AVAILABLE: 'available', // 可预约
  BOOKED: 'booked', // 已预订
  CONFIRMED: 'confirmed', // 已确认
  COMPLETED: 'completed', // 已完成
  CANCELLED: 'cancelled', // 已取消
  BUSY: 'busy', // 忙碌
  VACATION: 'vacation' // 休假
} as const;

// 事件类型枚举
export const EventType = {
  WEDDING: 'wedding', // 婚礼
  ENGAGEMENT: 'engagement', // 订婚
  ANNIVERSARY: 'anniversary', // 纪念日
  CONSULTATION: 'consultation', // 咨询
  OTHER: 'other' // 其他
} as const;

// 作品状态枚举
export const WorkStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
} as const;

// 作品类型枚举
export const WorkType = {
  IMAGE: 'image',
  VIDEO: 'video',
} as const;

// 作品分类枚举
export const WorkCategory = {
  WEDDING: 'wedding',
  ENGAGEMENT: 'engagement',
  ANNIVERSARY: 'anniversary',
  TEAM_BUILDING: 'team_building',
  OTHER: 'other'
} as const;

// 文件类型枚举
export const FileType = {
  IMAGE: 'image',
  VIDEO: 'video',
} as const;

// 支付状态枚举
export const PaymentStatus = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid'
} as const;

// 上传状态枚举
export const UploadStatus = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  DONE: 'done',
  ERROR: 'error'
} as const;

// 表单字段类型枚举
export const FormFieldType = {
  INPUT: 'input',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  DATE: 'date',
  UPLOAD: 'upload',
  CHECKBOX: 'checkbox'
} as const;

// 排序顺序枚举
export const SortOrder = {
  ASC: 'asc',
  DESC: 'desc'
} as const;

// 主题模式枚举
export const ThemeMode = {
  LIGHT: 'light',
  DARK: 'dark'
} as const;


// 语言类型枚举
export const Language = {
  ZH: 'zh',
  EN: 'en'
} as const;

// 通知类型枚举
export const NotificationType = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const;

// 视图模式枚举
export const ViewMode = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day'
} as const;

// 设备类型枚举
export const DeviceType = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop'
} as const;

// 对齐方式枚举
export const Alignment = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right'
} as const;

// 媒体类型枚举
export const MediaType = {
  IMAGE: 'image',
  VIDEO: 'video'
} as const;

// 团队状态枚举
export const TeamStatus = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  PENDING: 'pending'
} as const;

// 团队成员状态枚举
export const TeamMemberStatus = {
  ACTIVE: 1,
  INACTIVE: 2,
  PENDING: 3
} as const;

// 团队成员角色枚举
export const TeamMemberRole = {
  MEMBER: 1, // 成员
  ADMIN: 2, // 管理员
  OWNER: 3, // 所有者
} as const;

// 趋势类型枚举
export const TrendType = {
  UP: 'up',
  DOWN: 'down',
  STABLE: 'stable'
} as const;

// 统计类型枚举
export const StatisticType = {
  REVENUE: 'revenue',
  BOOKINGS: 'bookings',
  CUSTOMERS: 'customers',
  SATISFACTION: 'satisfaction'
} as const;

// 预订状态枚举
export const BookingStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];
export type UserStatus = typeof UserStatus[keyof typeof UserStatus];
export type ScheduleStatus = typeof ScheduleStatus[keyof typeof ScheduleStatus];
export type EventType = typeof EventType[keyof typeof EventType];
export type WorkType = typeof WorkType[keyof typeof WorkType];
export type WorkCategory = typeof WorkCategory[keyof typeof WorkCategory];
export type FileType = typeof FileType[keyof typeof FileType];
export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];
export type UploadStatus = typeof UploadStatus[keyof typeof UploadStatus];
export type FormFieldType = typeof FormFieldType[keyof typeof FormFieldType];
export type SortOrder = typeof SortOrder[keyof typeof SortOrder];
export type ThemeMode = typeof ThemeMode[keyof typeof ThemeMode];
export type WorkStatus = typeof WorkStatus[keyof typeof WorkStatus];
export type Language = typeof Language[keyof typeof Language];
export type NotificationType = typeof NotificationType[keyof typeof NotificationType];
export type ViewMode = typeof ViewMode[keyof typeof ViewMode];
export type DeviceType = typeof DeviceType[keyof typeof DeviceType];
export type Alignment = typeof Alignment[keyof typeof Alignment];
export type MediaType = typeof MediaType[keyof typeof MediaType];
export type TeamStatus = typeof TeamStatus[keyof typeof TeamStatus];
export type TeamMemberStatus = typeof TeamMemberStatus[keyof typeof TeamMemberStatus];
export type TeamMemberRole = typeof TeamMemberRole[keyof typeof TeamMemberRole];
export type TrendType = typeof TrendType[keyof typeof TrendType];
export type StatisticType = typeof StatisticType[keyof typeof StatisticType];
export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];

// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  password?: string; // 仅在服务端使用
  salt?: string; // 仅在服务端使用
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  realName?: string;
  nickname?: string;
  bio?: string;
  specialties?: any;
  experienceYears?: number;
  location?: string;
  contactInfo?: any;
  socialLinks?: any;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  isPublic?: boolean;
  mediaFiles?: MediaFile[];
}

// 媒体文件类型

// 媒体文件相关类型
export interface MediaFile {
  id: string;
  userId: string;
  type: FileType;
  filename: string;
  originalName: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  thumbnailPath?: string;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// 档期相关类型
export interface Schedule {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  weddingDate: string; // 前端使用字符串格式
  weddingTime: 'lunch' | 'dinner'; // 前端使用字符串格式
  location?: string | null;
  venueName?: string | null; // 场地名称
  venueAddress?: string | null; // 场地地址
  eventType: EventType;
  status: ScheduleStatus;
  price?: number | null;
  deposit?: number | null; // 定金
  isPaid?: boolean; // 是否已结清
  customerName?: string | null; // 客户姓名
  customerPhone?: string | null;
  requirements?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt?: string | null;
  user?: User;
}

// 作品相关类型
export interface Work {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  type: WorkType;
  category: WorkCategory;
  coverUrl?: string | null;
  contentUrls?: string[] | null;
  tags?: string[] | null;
  location?: string | null;
  weddingDate?: Date | null;
  author?: string | null;
  customer?: string | null; // 客户名称
  downloads?: number;
  isPublic?: boolean; // 前端使用字符串格式
  equipmentInfo?: any | null;
  technicalInfo?: any | null;
  status: WorkStatus;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  sortOrder: number;
  publishedAt?: string | null; // 前端使用字符串格式
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  user?: User;
  files?: FileInfo[];
}

// 文件相关类型
export interface FileInfo {
  id: string;
  workId?: string;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileType: FileType;
  thumbnailPath?: string;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  createdAt: string;
}


// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  timestamp: string;
  requestId: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 分页参数类型
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

// 登录表单类型
export interface LoginForm {
  identifier: string;
  password: string;
  remember?: boolean;
}

// 注册表单类型
export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  realName: string;
  phone?: string;
}

// 联系表单类型
export interface ContactForm {
  id?: string;
  name: string;
  phone: string;
  email: string;
  weddingDate: string;
  weddingTime: string;
  location: string;
  guestCount: number;
  serviceType: 'wedding' | 'engagement' | 'anniversary' | 'other';
  budget: '5000-10000' | '10000-20000' | '20000-50000' | '50000+';
  requirements?: string;
  status?: 'pending' | 'contacted' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}



// 路由类型
export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  exact?: boolean;
  title?: string;
  requireAuth?: boolean;
  roles?: string[];
}

// 菜单项类型
export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  path?: string;
  children?: MenuItem[];
  roles?: string[];
}

// 表格列配置类型
export interface TableColumn {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
  align?: Alignment;
  sorter?: boolean;
  render?: (value: any, record: any, index: number) => React.ReactNode;
}

// 表单字段类型
export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  rules?: any[];
  options?: { label: string; value: any }[];
  placeholder?: string;
}

// 统计数据类型
export interface DashboardStats {
  totalUsers: number;
  totalSchedules: number;
  totalWorks: number;
  monthlyBookings: number;
  monthlyRevenue: number;
  userTrend?: number;
  bookingTrend?: number;
  workTrend?: number;
  revenueTrend?: number;
  scheduleStats: {
    available: number;
    booked: number;
    busy: number;
  };
  workStats: {
    published: number;
    pending: number;
    draft: number;
  };
}

// 日历事件类型
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: any;
  color?: string;
}

// 上传文件类型
export interface UploadFile {
  uid: string;
  name: string;
  status: UploadStatus;
  url?: string;
  thumbUrl?: string;
  response?: any;
}

// 错误类型
export interface AppError {
  code: string;
  message: string;
  details?: any;
}
//  团队成员类型
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  inviterId?: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  team?: Team;
}

// 团队类型
export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  background?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWechat?: string;
  contactQq?: string;
  address?: string;
  serviceAreas?: string[];
  specialties?: string[];
  priceRange?: string;
  ownerId: string;
  memberCount: number;
  status: TeamStatus;
  viewCount: number;
  rating: number;
  completedProjects: number;
  establishedYear?: number;
  businessLicense?: string;
  certifications?: string[];
  equipmentList?: any[];
  servicePackages?: any[];
  workingHours?: any;
  emergencyContact?: string;
  emergencyPhone?: string;
  bankAccount?: string;
  taxNumber?: string;
  legalRepresentative?: string;
  registrationAddress?: string;
  operatingAddress?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  members?: TeamMember[];
}

// 团队统计类型
export interface TeamStats {
  total: number;
  active: number;
  byRole: Record<TeamMemberRole, number>;
  newThisMonth: number;
}

// 预订类型
export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  teamId: string;
  serviceId: string;
  eventDate: string;
  eventTime: string;
  eventAddress: string;
  eventType: EventType;
  status: BookingStatus;
  notes?: string;
  price: number;
  paymentStatus: PaymentStatus;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

// 应用状态类型
export interface AppState {
  user: User | null;
  theme: ThemeMode;
  loading: boolean;
  error: AppError | null;
}
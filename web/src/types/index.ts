
export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
  SUPER_ADMIN: 'super_admin',
} as const;

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  DELETED: 'deleted'
} as const;

// 档期状态枚举
export const ScheduleStatus = {
  AVAILABLE: 'available',
  BOOKED: 'booked',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RESERVE: 'reserve', // 预订留
} as const;

// 文件分类枚举
export const FileCategory = {
  AVATAR: 'avatar',
  COVER: 'cover',
  WORK: 'work',
  OTHER: 'other',
  PROFILE: 'profile',
  FAVICON: 'favicon',
  LOGO: 'logo',
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
  TEAM_BUILDING: 'team_building', // 团建
  WEDDING_HOST: 'wedding_host', // 婚礼主持
  WEDDING_PLANNING: 'wedding_planning', // 婚礼策划
  WEDDING_PHOTOGRAPHY: 'wedding_photography', // 婚礼摄影
  WEDDING_VIDEOGRAPHY: 'wedding_videography', // 婚礼摄像
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
export type WorkType = typeof WorkType[keyof typeof WorkType];
export type WorkCategory = typeof WorkCategory[keyof typeof WorkCategory];
export type FileType = typeof FileType[keyof typeof FileType];
export type FileCategory = typeof FileCategory[keyof typeof FileCategory];
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
  specialties?: string[];
  experienceYears?: number;
  location?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    wechat?: string;
    address?: string;
  };
  socialLinks?: {
    weibo?: { value: string; hidden?: boolean };
    wechat?: { value: string; hidden?: boolean };
    xiaohongshu?: { value: string; hidden?: boolean };
    douyin?: { value: string; hidden?: boolean };
  };
  hideSocialLinks?: boolean; // 控制是否隐藏整个社交媒体部分
  lastLoginAt?: Date;
  lastLoginIp?: string;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  isPublic?: boolean;
  mediaFiles?: MediaFile[];
  priceRange?: string;
  minPrice?: number;
  maxPrice?: number;
}

// 媒体文件类型

export interface FileInfo {
  fileId: string;
  userId: string;
  originalName?: string;
  filename?: string;
  filePath?: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  fileType: FileType;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
  hashMd5?: string;
  hashSha256?: string;
  bucketName?: string;
  downloadCount?: number;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// 媒体文件相关类型
export interface MediaFile {
  id?: string;
  userId?: string;
  fileId: string;
  mediaOrder?: number | null;
  fileType?: FileType;
  originalName?: string;
  filename?: string;
  filePath?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  thumbnailUrl?: string | null;
  hashMd5?: string | null;
  ossType?: string;
  bucketName?: string | null;
  isPublic?: boolean;
  downloadCount?: number | null;
  metadata?: {
    [key: string]: string | number | boolean | null;
  } | null;
  category?: string;
}

// 档期相关类型
export interface Schedule {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  date: string; // 前端使用字符串格式
  timeSlot: 'lunch' | 'dinner'; // 前端使用字符串格式
  location?: string | null;
  venueName?: string | null; // 场地名称
  venueAddress?: string | null; // 场地地址
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
  tags?: string[] | null;
  location?: string | null;
  date?: Date | null;
  author?: string | null;
  customer?: string | null; // 客户名称
  downloads?: number;
  isPublic?: boolean; // 前端使用字符串格式
  equipmentInfo?: {
    cameras?: string[];
    lenses?: string[];
    lighting?: string[];
    audio?: string[];
    other?: string[];
  } | null;
  technicalInfo?: {
    resolution?: string;
    format?: string;
    colorSpace?: string;
    frameRate?: number;
    duration?: number;
    fileSize?: number;
  } | null;
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


// API响应类型
export interface ApiResponse<T = unknown> {
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
  date: string;
  timeSlot: string;
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
  resource?: {
    id?: string;
    type?: string;
    data?: Record<string, unknown>;
  };
  color?: string;
}

// 仪表板档期统计类型
export interface DashboardScheduleStats {
  totalCount: number;
  completedCount: number;
  reserveCount: number;
  totalRevenue: number;
  teamStats: TeamScheduleStats[];
  teamCount: number;
}

// 团队档期统计类型
export interface TeamScheduleStats {
  teamId: string;
  teamName: string;
  totalRevenue: number;
  completedCount: number;
  totalCount: number;
  memberCount: number;
  memberStats: PersonalScheduleStats[];
}

// 个人档期统计类型
export interface PersonalScheduleStats {
  userId: string;
  realName: string;
  avatarUrl?: string;
  scheduleCount: number;
  completedCount: number;
  revenue: number;
}

// 错误类型
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// 错误响应接口
export interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: {
    code: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
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


// 应用状态类型
export interface AppState {
  user: User | null;
  theme: ThemeMode;
  loading: boolean;
  error: AppError | null;
}
// 网站设置接口
export interface SiteSettings {
  name: string;
  description: string;
  keywords: string;
  logo: string;
  favicon: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  icp: string;
  copyright: string;
  // SEO设置合并到网站设置中
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
}

// 首页设置接口
export interface HomepageSettings {
  /** 首页横幅区域设置 */
  hero: {
    /** 标题 */
    title: string;
    /** 副标题 */
    subtitle: string;
    /** 描述 */
    description: string;
    /** 背景图片路径 */
    backgroundImage: string;
    /** 按钮文本 */
    ctaText: string;
    /** 按钮链接 */
    ctaLink: string;
    /** 是否可见 */
    visible: boolean;
  };

  /** 团队介绍区域设置 */
  team: {
    /** 标题 */
    title: string;
    /** 副标题 */
    subtitle: string;
    /** 描述 */
    description: string;
    /** 是否可见 */
    visible: boolean;
  };

  /** 团队风采展示区域设置 */
  teamShowcase: {
    /** 标题 */
    title: string;
    /** 副标题 */
    subtitle: string;
    /** 描述 */
    description: string;
    /** 是否可见 */
    visible: boolean;
  };

  /** 作品展示区域设置 */
  portfolio: {
    /** 标题 */
    title: string;
    /** 副标题 */
    subtitle: string;
    /** 描述 */
    description: string;
    /** 是否可见 */
    visible: boolean;
  };

  /** 档期查询区域设置 */
  schedule: {
    /** 标题 */
    title: string;
    /** 副标题 */
    subtitle: string;
    /** 描述 */
    description: string;
    /** 是否可见 */
    visible: boolean;
  };

  /** 联系我们区域设置 */
  contact: {
    /** 标题 */
    title: string;
    /** 副标题 */
    subtitle: string;
    /** 描述 */
    description: string;
    /** 背景图片路径 */
    backgroundImage: string;
    /** 联系邮箱 */
    email: string;
    /** 联系电话 */
    phone: string;
    /** 联系地址 */
    address: string;
    /** 微信 */
    wechat: string;
    /** 小红书 */
    xiaohongshu: string;
    /** 抖音 */
    douyin: string;
    /** 是否可见 */
    visible: boolean;
  };

  /** 关于我们区域设置（可选） */
  about?: {
    /** 标题 */
    title: string;
    /** 内容 */
    content: string;
    /** 图片路径 */
    image: string;
    /** 是否可见 */
    visible: boolean;
  };
}

// 主题设置接口
export interface ThemeSettings {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
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
  borderRadius: number;
  fontSize: number;
  compactMode: boolean;
  darkMode: boolean;
  clientThemeVariant: string;
}

// 邮件设置接口
export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  emailFrom: string;
  emailFromName: string;
}


export interface AppSettings {
  site: SiteSettings;
  homepage: HomepageSettings;
  theme: ThemeSettings;
  email: EmailSettings;
}
export interface DayAvailability {
  date: string;
  status: 'available' | 'partial' | 'unavailable';
  message?: string;
  availableHosts?: User[];
  bookedEvents?: {
    lunch?: boolean;
    dinner?: boolean;
  };
}
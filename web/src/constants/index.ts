// API 相关常量
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
export const UPLOAD_BASE_URL = import.meta.env.VITE_UPLOAD_BASE_URL || '/uploads';

// 分页常量
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_WORK_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

// 文件上传常量
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// 用户角色常量
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

// 预约状态常量
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

// 日程状态常量
export const SCHEDULE_STATUS = {
  AVAILABLE: 'available',
  BOOKED: 'booked',
  UNAVAILABLE: 'unavailable',
} as const;

// 作品状态常量
export const WORK_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

// 主题模式常量
export const THEME_MODE = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

// 语言常量
export const LANGUAGES = {
  ZH: 'zh',
  EN: 'en',
} as const;

// 通知类型常量
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// 日期格式常量
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  TIME: 'HH:mm:ss',
  DISPLAY_DATE: 'YYYY年MM月DD日',
  DISPLAY_DATETIME: 'YYYY年MM月DD日 HH:mm',
  DISPLAY_TIME: 'HH:mm',
} as const;

// 路由路径常量
export const ROUTES = {
  // 客户端路由
  CLIENT: {
    HOME: '/',
    ABOUT: '/about',
    WORKS: '/works',
    WORK_DETAIL: '/works/:id',
    SCHEDULE: '/schedule',
    BOOKING: '/booking',
    CONTACT: '/contact',
    LOGIN: '/login',
    REGISTER: '/register',
    PROFILE: '/profile',
  },
  // 管理端路由
  ADMIN: {
    DASHBOARD: '/admin',
    USERS: '/admin/users',
    WORKS: '/admin/works',
    WORK_CREATE: '/admin/works/create',
    WORK_EDIT: '/admin/works/:id/edit',
    SCHEDULES: '/admin/schedules',
    BOOKINGS: '/admin/bookings',
    BOOKING_DETAIL: '/admin/bookings/:id',
    SETTINGS: '/admin/settings',
    PROFILE: '/admin/profile',
  },
} as const;

// 本地存储键名常量
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
} as const;

// 表单验证常量
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 20,
  USERNAME_MIN_LENGTH: 2,
  USERNAME_MAX_LENGTH: 20,
  PHONE_PATTERN: /^1[3-9]\d{9}$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ID_CARD_PATTERN: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
} as const;

// 错误消息常量
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  SERVER_ERROR: '服务器错误，请稍后重试',
  UNAUTHORIZED: '登录已过期，请重新登录',
  FORBIDDEN: '权限不足，无法访问',
  NOT_FOUND: '请求的资源不存在',
  VALIDATION_ERROR: '数据验证失败',
  UPLOAD_ERROR: '文件上传失败',
  UNKNOWN_ERROR: '未知错误，请联系管理员',
} as const;

// 成功消息常量
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: '登录成功',
  LOGOUT_SUCCESS: '退出成功',
  REGISTER_SUCCESS: '注册成功',
  UPDATE_SUCCESS: '更新成功',
  DELETE_SUCCESS: '删除成功',
  CREATE_SUCCESS: '创建成功',
  UPLOAD_SUCCESS: '上传成功',
  SAVE_SUCCESS: '保存成功',
  SEND_SUCCESS: '发送成功',
} as const;

// 作品分类常量
export const WORK_CATEGORIES = [
  '婚礼主持',
  '商务主持',
  '庆典主持',
  '年会主持',
  '生日主持',
  '其他活动',
] as const;

// 时间段常量
export const TIME_SLOTS = [
  { value: '09:00', label: '上午 9:00' },
  { value: '10:00', label: '上午 10:00' },
  { value: '11:00', label: '上午 11:00' },
  { value: '14:00', label: '下午 2:00' },
  { value: '15:00', label: '下午 3:00' },
  { value: '16:00', label: '下午 4:00' },
  { value: '17:00', label: '下午 5:00' },
  { value: '18:00', label: '下午 6:00' },
  { value: '19:00', label: '下午 7:00' },
] as const;

// 价格区间常量
export const PRICE_RANGES = [
  { min: 0, max: 500, label: '500元以下' },
  { min: 500, max: 1000, label: '500-1000元' },
  { min: 1000, max: 2000, label: '1000-2000元' },
  { min: 2000, max: 3000, label: '2000-3000元' },
  { min: 3000, max: 5000, label: '3000-5000元' },
  { min: 5000, max: 99999, label: '5000元以上' },
] as const;
export const PRICE_RANGE_OPTIONS = PRICE_RANGES.map((range) => ({
  value: `${range.min}-${range.max}`,
  label: range.label,
}));
// 动画持续时间常量
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
} as const;

// 防抖延迟常量
export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  RESIZE: 100,
  SCROLL: 50,
} as const;

// 缓存时间常量（毫秒）
export const CACHE_TIME = {
  SHORT: 5 * 60 * 1000, // 5分钟
  MEDIUM: 30 * 60 * 1000, // 30分钟
  LONG: 24 * 60 * 60 * 1000, // 24小时
} as const;

// 响应式断点常量
export const BREAKPOINTS = {
  XS: 480,
  SM: 576,
  MD: 768,
  LG: 992,
  XL: 1200,
  XXL: 1600,
} as const;

// 颜色常量
export const COLORS = {
  PRIMARY: 'var(--primary-color, #1890ff)',
  SUCCESS: 'var(--success-color, #52c41a)',
  WARNING: 'var(--warning-color, #faad14)',
  ERROR: 'var(--error-color, #f5222d)',
  INFO: 'var(--info-color, #1890ff)',
  TEXT_PRIMARY: 'var(--text-primary, #262626)',
  TEXT_SECONDARY: 'var(--text-secondary, #8c8c8c)',
  BORDER: 'var(--border-color, #d9d9d9)',
  BACKGROUND: 'var(--bg-layout, #f0f2f5)',
} as const;
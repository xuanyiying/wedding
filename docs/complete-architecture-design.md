# 婚礼主持俱乐部官方网站 - 完整架构设计

## 1. 项目概述

### 1.1 项目背景
婚礼主持俱乐部需要一个现代化的官方网站，包含前台展示系统、后台管理系统和个人中心，为团队成员提供档期管理、作品展示功能，为客户提供便捷的浏览和咨询体验。

### 1.2 核心功能
- **前台展示**: 团队介绍、成员展示、作品画廊、档期查看
- **后台管理**: 成员管理、档期管理、作品审核、系统配置
- **个人中心**: 个人档期管理、作品发布、个人信息维护
- **在线咨询**: 客户咨询、预约服务、联系表单

## 2. 系统架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层 (Client Layer)                    │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   前台展示系统    │   后台管理系统    │        移动端适配             │
│                │                │                             │
│  React 18 SPA  │  React 18 SPA  │    响应式设计 + PWA          │
│  TypeScript    │  TypeScript    │    移动端优化                │
│  Ant Design    │  Ant Design    │                             │
│  Vite 构建     │  Vite 构建     │                             │
└─────────────────┴─────────────────┴─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      网关层 (Gateway Layer)                      │
├─────────────────────────────────────────────────────────────────┤
│                        Nginx 反向代理                           │
│  • 负载均衡          • SSL 终端        • 静态资源服务           │
│  • 请求路由          • 压缩优化        • 缓存控制               │
│  • 限流防护          • 安全防护        • CDN 集成               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      应用层 (Application Layer)                  │
├─────────────────────────────────────────────────────────────────┤
│                      Node.js + Express.js                      │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │  认证服务   │  │  用户服务   │  │  档期服务   │  │ 文件服务│ │
│  │             │  │             │  │             │  │         │ │
│  │ JWT + Auth  │  │ User CRUD   │  │ Schedule    │  │ Upload  │ │
│  │ Passport.js │  │ Profile     │  │ Management  │  │ Storage │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │  作品服务   │  │  统计服务   │  │  通知服务   │  │ 日志服务│ │
│  │             │  │             │  │             │  │         │ │
│  │ Works CRUD  │  │ Analytics   │  │ Email/SMS   │  │ Winston │ │
│  │ Media Proc  │  │ Reports     │  │ WebSocket   │  │ Audit   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      数据层 (Data Layer)                        │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   主数据库      │    缓存层       │        文件存储              │
│                │                │                             │
│  MySQL 8.0     │   Redis 7.0    │    本地存储 / 云存储         │
│  • 用户数据    │   • 会话缓存    │    • 图片/视频文件           │
│  • 档期数据    │   • 数据缓存    │    • 文档文件               │
│  • 作品数据    │   • 限流计数    │    • 缩略图生成             │
│  • 系统配置    │   • 热点数据    │    • CDN 分发               │
│  • 操作日志    │                │                             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### 2.2 技术栈详细说明

#### 前端技术栈
```typescript
// 核心框架
React 18.2.0          // 用户界面框架
TypeScript 5.0+       // 类型安全的 JavaScript
Vite 4.0+            // 现代化构建工具

// UI 组件库
Ant Design 5.12+     // 企业级 UI 组件库
@ant-design/icons    // 图标库
@ant-design/charts   // 图表组件

// 状态管理
Zustand 4.4+         // 轻量级状态管理
// 或 Redux Toolkit    // 复杂状态管理备选

// 路由管理
React Router 6.8+    // 客户端路由

// HTTP 客户端
Axios 1.6+           // HTTP 请求库
React Query 4.0+     // 服务端状态管理

// 表单处理
React Hook Form 7.0+ // 高性能表单库

// 样式处理
Tailwind CSS 3.3+    // 原子化 CSS 框架
Styled Components    // CSS-in-JS (可选)

// 工具库
Dayjs 1.11+          // 日期处理
Lodash-es 4.17+      // 工具函数库
React-beautiful-dnd  // 拖拽功能
```

#### 后端技术栈
```typescript
// 运行时环境
Node.js 18.18+       // JavaScript 运行时
TypeScript 5.0+      // 类型安全

// Web 框架
Express.js 4.18+     // Web 应用框架
Helmet               // 安全中间件
Cors                 // 跨域处理
Compression          // 响应压缩

// 数据库 ORM
Sequelize 6.35+      // MySQL ORM
Sequelize-CLI        // 数据库迁移工具

// 认证授权
Jsonwebtoken 9.0+    // JWT 令牌
Passport.js 0.7+     // 认证中间件
Bcryptjs 2.4+        // 密码加密

// 缓存
Ioredis 5.3+         // Redis 客户端

// 文件处理
Multer 1.4+          // 文件上传
Sharp 0.32+          // 图片处理
Ffmpeg               // 视频处理

// 验证
Joi 17.11+           // 数据验证
Express-validator    // 请求验证

// 日志
Winston 3.11+        // 日志记录
Morgan 1.10+         // HTTP 请求日志

// 任务队列
Bull 4.12+           // Redis 任务队列

// 测试
Jest 29.7+           // 测试框架
Supertest 6.3+       // HTTP 测试

// 开发工具
Nodemon 3.0+         // 开发热重载
ESLint 8.54+         // 代码检查
Prettier 3.1+        // 代码格式化
```

#### 数据库技术栈
```sql
-- 主数据库
MySQL 8.0.35+        -- 关系型数据库

-- 缓存数据库
Redis 7.2+           -- 内存数据库

-- 数据库连接
mysql2 3.6+          -- MySQL 驱动
connection-pool      -- 连接池管理
```

#### 基础设施
```yaml
# 容器化
Docker 24.0+         # 容器技术
Docker Compose 2.0+  # 容器编排

# Web 服务器
Nginx 1.24+          # 反向代理

# 进程管理
PM2 5.3+             # Node.js 进程管理

# 监控
Prometheus           # 指标收集
Grafana              # 数据可视化
```

## 3. 模块设计

### 3.1 前端模块架构

```
src/
├── components/                 # 公共组件
│   ├── common/                # 通用组件
│   │   ├── Loading/           # 加载组件
│   │   ├── ErrorBoundary/     # 错误边界
│   │   ├── ImageViewer/       # 图片查看器
│   │   ├── VideoPlayer/       # 视频播放器
│   │   └── ConfirmModal/      # 确认对话框
│   ├── layout/                # 布局组件
│   │   ├── Header/            # 页面头部
│   │   ├── Footer/            # 页面底部
│   │   ├── Sidebar/           # 侧边栏
│   │   └── AdminLayout/       # 管理后台布局
│   └── business/              # 业务组件
│       ├── UserCard/          # 用户卡片
│       ├── ScheduleCalendar/  # 档期日历
│       ├── WorkGallery/       # 作品画廊
│       └── ContactForm/       # 联系表单
├── pages/                     # 页面组件
│   ├── home/                  # 首页
│   │   ├── HomePage.tsx
│   │   ├── HeroSection.tsx
│   │   ├── TeamShowcase.tsx
│   │   └── WorksShowcase.tsx
│   ├── team/                  # 团队页面
│   │   ├── TeamPage.tsx
│   │   ├── MemberList.tsx
│   │   └── MemberDetail.tsx
│   ├── works/                 # 作品展示
│   │   ├── WorksPage.tsx
│   │   ├── WorksList.tsx
│   │   ├── WorkDetail.tsx
│   │   └── WorkFilter.tsx
│   ├── schedule/              # 档期页面
│   │   ├── SchedulePage.tsx
│   │   ├── ScheduleCalendar.tsx
│   │   └── ScheduleDetail.tsx
│   ├── contact/               # 联系页面
│   │   ├── ContactPage.tsx
│   │   ├── ContactForm.tsx
│   │   └── ContactInfo.tsx
│   ├── admin/                 # 后台管理
│   │   ├── Dashboard/         # 仪表板
│   │   ├── UserManagement/    # 用户管理
│   │   ├── ScheduleManagement/# 档期管理
│   │   ├── WorksManagement/   # 作品管理
│   │   ├── FileManagement/    # 文件管理
│   │   └── SystemSettings/    # 系统设置
│   └── profile/               # 个人中心
│       ├── ProfilePage.tsx
│       ├── PersonalInfo.tsx
│       ├── MySchedules.tsx
│       ├── MyWorks.tsx
│       └── AccountSettings.tsx
├── hooks/                     # 自定义 Hooks
│   ├── useAuth.ts            # 认证相关
│   ├── useApi.ts             # API 请求
│   ├── useLocalStorage.ts    # 本地存储
│   ├── useDebounce.ts        # 防抖
│   └── useInfiniteScroll.ts  # 无限滚动
├── services/                  # API 服务
│   ├── api.ts                # API 基础配置
│   ├── auth.ts               # 认证服务
│   ├── user.ts               # 用户服务
│   ├── schedule.ts           # 档期服务
│   ├── works.ts              # 作品服务
│   └── file.ts               # 文件服务
├── stores/                    # 状态管理
│   ├── authStore.ts          # 认证状态
│   ├── userStore.ts          # 用户状态
│   ├── scheduleStore.ts      # 档期状态
│   └── globalStore.ts        # 全局状态
├── utils/                     # 工具函数
│   ├── request.ts            # 请求封装
│   ├── storage.ts            # 存储工具
│   ├── format.ts             # 格式化工具
│   ├── validation.ts         # 验证工具
│   └── constants.ts          # 常量定义
├── types/                     # 类型定义
│   ├── api.ts                # API 类型
│   ├── user.ts               # 用户类型
│   ├── schedule.ts           # 档期类型
│   └── common.ts             # 通用类型
├── styles/                    # 样式文件
│   ├── globals.css           # 全局样式
│   ├── variables.css         # CSS 变量
│   └── components.css        # 组件样式
└── assets/                    # 静态资源
    ├── images/               # 图片资源
    ├── icons/                # 图标资源
    └── fonts/                # 字体资源
```

### 3.2 后端模块架构

```
src/
├── controllers/               # 控制器层
│   ├── auth.controller.ts    # 认证控制器
│   ├── user.controller.ts    # 用户控制器
│   ├── schedule.controller.ts# 档期控制器
│   ├── work.controller.ts    # 作品控制器
│   ├── file.controller.ts    # 文件控制器
│   └── admin.controller.ts   # 管理控制器
├── services/                  # 服务层
│   ├── auth.service.ts       # 认证服务
│   ├── user.service.ts       # 用户服务
│   ├── schedule.service.ts   # 档期服务
│   ├── work.service.ts       # 作品服务
│   ├── file.service.ts       # 文件服务
│   ├── email.service.ts      # 邮件服务
│   └── cache.service.ts      # 缓存服务
├── models/                    # 数据模型
│   ├── User.ts               # 用户模型
│   ├── Schedule.ts           # 档期模型
│   ├── Work.ts               # 作品模型
│   ├── File.ts               # 文件模型
│   ├── TeamMaterial.ts       # 团建资料模型
│   └── OperationLog.ts       # 操作日志模型
├── middlewares/               # 中间件
│   ├── auth.middleware.ts    # 认证中间件
│   ├── permission.middleware.ts # 权限中间件
│   ├── validation.middleware.ts # 验证中间件
│   ├── rateLimit.middleware.ts  # 限流中间件
│   ├── upload.middleware.ts  # 上传中间件
│   └── error.middleware.ts   # 错误处理中间件
├── routes/                    # 路由定义
│   ├── auth.routes.ts        # 认证路由
│   ├── user.routes.ts        # 用户路由
│   ├── schedule.routes.ts    # 档期路由
│   ├── work.routes.ts        # 作品路由
│   ├── file.routes.ts        # 文件路由
│   └── admin.routes.ts       # 管理路由
├── utils/                     # 工具函数
│   ├── jwt.ts                # JWT 工具
│   ├── bcrypt.ts             # 密码加密
│   ├── upload.ts             # 文件上传
│   ├── email.ts              # 邮件工具
│   ├── validation.ts         # 验证工具
│   └── logger.ts             # 日志工具
├── config/                    # 配置文件
│   ├── database.ts           # 数据库配置
│   ├── redis.ts              # Redis 配置
│   ├── jwt.ts                # JWT 配置
│   ├── upload.ts             # 上传配置
│   └── email.ts              # 邮件配置
├── types/                     # 类型定义
│   ├── express.d.ts          # Express 类型扩展
│   ├── user.types.ts         # 用户类型
│   ├── schedule.types.ts     # 档期类型
│   └── common.types.ts       # 通用类型
├── database/                  # 数据库相关
│   ├── migrations/           # 数据库迁移
│   ├── seeders/              # 数据填充
│   └── connection.ts         # 数据库连接
└── tests/                     # 测试文件
    ├── unit/                 # 单元测试
    ├── integration/          # 集成测试
    └── e2e/                  # 端到端测试
```

## 4. API 设计

### 4.1 API 规范

#### 基础规范
- **协议**: HTTPS
- **格式**: JSON
- **编码**: UTF-8
- **版本**: /api/v1
- **认证**: JWT Bearer Token

#### 响应格式
```typescript
interface ApiResponse<T = any> {
  code: number;           // 状态码
  message: string;        // 响应消息
  data?: T;              // 响应数据
  timestamp: string;      // 时间戳
  requestId: string;      // 请求ID
  pagination?: {          // 分页信息
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

#### 状态码规范
```typescript
enum StatusCode {
  SUCCESS = 200,          // 成功
  CREATED = 201,          // 创建成功
  NO_CONTENT = 204,       // 无内容
  BAD_REQUEST = 400,      // 请求错误
  UNAUTHORIZED = 401,     // 未授权
  FORBIDDEN = 403,        // 禁止访问
  NOT_FOUND = 404,        // 资源不存在
  CONFLICT = 409,         // 冲突
  VALIDATION_ERROR = 422, // 验证错误
  INTERNAL_ERROR = 500,   // 服务器错误
}
```

### 4.2 核心 API 接口

#### 认证模块 API
```typescript
// 用户登录
POST /api/v1/auth/login
Request: {
  username: string;
  password: string;
  captcha?: string;
}
Response: {
  user: UserInfo;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 用户注册
POST /api/v1/auth/register
Request: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  inviteCode?: string;
}

// 刷新令牌
POST /api/v1/auth/refresh
Request: {
  refreshToken: string;
}

// 用户登出
POST /api/v1/auth/logout
Headers: Authorization: Bearer {token}

// 获取用户信息
GET /api/v1/auth/profile
Headers: Authorization: Bearer {token}

// 修改密码
PUT /api/v1/auth/password
Request: {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
```

#### 用户模块 API
```typescript
// 获取用户列表
GET /api/v1/users
Query: {
  page?: number;
  pageSize?: number;
  role?: string;
  status?: string;
  search?: string;
}

// 获取用户详情
GET /api/v1/users/:id

// 创建用户
POST /api/v1/users
Request: {
  username: string;
  email: string;
  password: string;
  role: string;
  realName?: string;
  phone?: string;
}

// 更新用户信息
PUT /api/v1/users/:id
Request: {
  realName?: string;
  nickname?: string;
  bio?: string;
  avatar?: string;
  phone?: string;
  location?: string;
  specialties?: string[];
  experienceYears?: number;
}

// 删除用户
DELETE /api/v1/users/:id

// 更新用户状态
PUT /api/v1/users/:id/status
Request: {
  status: 'active' | 'inactive' | 'suspended';
}
```

#### 档期模块 API
```typescript
// 获取档期列表
GET /api/v1/schedules
Query: {
  page?: number;
  pageSize?: number;
  userId?: number;
  status?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  isPublic?: boolean;
}

// 获取档期详情
GET /api/v1/schedules/:id

// 创建档期
POST /api/v1/schedules
Request: {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  eventType: string;
  location?: string;
  venueName?: string;
  venueAddress?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  price?: number;
  isPublic?: boolean;
}

// 更新档期
PUT /api/v1/schedules/:id

// 删除档期
DELETE /api/v1/schedules/:id

// 确认档期
PUT /api/v1/schedules/:id/confirm
Request: {
  status: 'confirmed';
  notes?: string;
}

// 检查档期冲突
POST /api/v1/schedules/check-conflict
Request: {
  userId: number;
  startTime: string;
  endTime: string;
  excludeId?: number;
}

// 获取用户档期日历
GET /api/v1/schedules/calendar/:userId
Query: {
  year: number;
  month: number;
}
```

#### 作品模块 API
```typescript
// 获取作品列表
GET /api/v1/works
Query: {
  page?: number;
  pageSize?: number;
  userId?: number;
  type?: string;
  category?: string;
  status?: string;
  isFeatured?: boolean;
  tags?: string[];
}

// 获取作品详情
GET /api/v1/works/:id

// 创建作品
POST /api/v1/works
Request: {
  title: string;
  description?: string;
  type: 'image' | 'video' | 'album';
  category: string;
  coverUrl?: string;
  contentUrls: string[];
  tags?: string[];
  location?: string;
  shootDate?: string;
}

// 更新作品
PUT /api/v1/works/:id

// 删除作品
DELETE /api/v1/works/:id

// 发布作品
PUT /api/v1/works/:id/publish
Request: {
  status: 'published';
}

// 作品点赞
POST /api/v1/works/:id/like

// 取消点赞
DELETE /api/v1/works/:id/like

// 增加浏览量
POST /api/v1/works/:id/view
```

#### 文件模块 API
```typescript
// 上传文件
POST /api/v1/files/upload
Content-Type: multipart/form-data
Request: {
  file: File;
  type?: string;
  category?: string;
}
Response: {
  id: number;
  filename: string;
  originalName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType: string;
}

// 批量上传
POST /api/v1/files/batch-upload

// 获取文件列表
GET /api/v1/files
Query: {
  page?: number;
  pageSize?: number;
  type?: string;
  userId?: number;
}

// 删除文件
DELETE /api/v1/files/:id

// 获取上传令牌
GET /api/v1/files/upload-token
Query: {
  filename: string;
  fileSize: number;
}
```

### 4.3 错误处理

#### 错误响应格式
```typescript
interface ErrorResponse {
  code: number;
  message: string;
  error?: string;
  details?: any;
  timestamp: string;
  requestId: string;
  path: string;
}
```

#### 常见错误码
```typescript
// 业务错误码
enum BusinessErrorCode {
  USER_NOT_FOUND = 10001,
  USER_ALREADY_EXISTS = 10002,
  INVALID_CREDENTIALS = 10003,
  SCHEDULE_CONFLICT = 20001,
  SCHEDULE_NOT_FOUND = 20002,
  WORK_NOT_FOUND = 30001,
  FILE_TOO_LARGE = 40001,
  INVALID_FILE_TYPE = 40002,
  PERMISSION_DENIED = 50001,
}
```

## 5. 数据库设计优化

### 5.1 索引优化策略

```sql
-- 用户表索引优化
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_users_email_verified ON users(email, email_verified_at);
CREATE INDEX idx_users_last_login ON users(last_login_at DESC);

-- 档期表索引优化
CREATE INDEX idx_schedules_user_time_status ON schedules(user_id, start_time, end_time, status);
CREATE INDEX idx_schedules_public_time ON schedules(is_public, start_time) WHERE is_public = true;
CREATE INDEX idx_schedules_event_type_time ON schedules(event_type, start_time);

-- 作品表索引优化
CREATE INDEX idx_works_category_status_featured ON works(category, status, is_featured, published_at);
CREATE INDEX idx_works_user_published ON works(user_id, published_at) WHERE status = 'published';
CREATE INDEX idx_works_view_count ON works(view_count DESC) WHERE status = 'published';

-- 文件表索引优化
CREATE INDEX idx_files_user_type_created ON files(user_id, file_type, created_at);
CREATE INDEX idx_files_hash_size ON files(hash_md5, file_size);
```

### 5.2 查询优化

```sql
-- 优化的档期查询
SELECT 
    s.id, s.title, s.start_time, s.end_time, s.status,
    u.username, u.real_name, u.avatar_url
FROM schedules s
INNER JOIN users u ON s.user_id = u.id
WHERE s.is_public = true 
    AND s.status IN ('available', 'booked')
    AND s.start_time >= CURDATE()
    AND s.deleted_at IS NULL
    AND u.status = 'active'
ORDER BY s.start_time ASC
LIMIT 20;

-- 优化的作品查询
SELECT 
    w.id, w.title, w.cover_url, w.view_count, w.like_count,
    u.username, u.real_name
FROM works w
INNER JOIN users u ON w.user_id = u.id
WHERE w.status = 'published'
    AND w.category = ?
    AND w.deleted_at IS NULL
    AND u.status = 'active'
ORDER BY w.is_featured DESC, w.published_at DESC
LIMIT 20 OFFSET ?;
```

### 5.3 缓存策略

```typescript
// Redis 缓存键设计
const CacheKeys = {
  // 用户相关
  USER_INFO: (id: number) => `user:info:${id}`,
  USER_PERMISSIONS: (id: number) => `user:permissions:${id}`,
  USER_SESSION: (token: string) => `session:${token}`,
  
  // 档期相关
  USER_SCHEDULES: (userId: number, date: string) => `schedules:user:${userId}:${date}`,
  PUBLIC_SCHEDULES: (date: string) => `schedules:public:${date}`,
  SCHEDULE_CONFLICTS: (userId: number) => `conflicts:${userId}`,
  
  // 作品相关
  FEATURED_WORKS: (category: string) => `works:featured:${category}`,
  USER_WORKS: (userId: number) => `works:user:${userId}`,
  WORK_STATS: (id: number) => `work:stats:${id}`,
  
  // 系统相关
  SYSTEM_CONFIG: 'system:config',
  SITE_STATS: 'site:stats',
  
  // 限流相关
  RATE_LIMIT: (ip: string, endpoint: string) => `rate:${ip}:${endpoint}`,
};

// 缓存过期时间
const CacheTTL = {
  USER_INFO: 3600,        // 1小时
  USER_SESSION: 7200,     // 2小时
  SCHEDULES: 1800,        // 30分钟
  WORKS: 3600,            // 1小时
  SYSTEM_CONFIG: 86400,   // 24小时
  RATE_LIMIT: 3600,       // 1小时
};
```

## 6. 安全设计

### 6.1 认证安全

```typescript
// JWT 配置
const jwtConfig = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: '2h',
    algorithm: 'HS256'
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '7d',
    algorithm: 'HS256'
  }
};

// 密码安全策略
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15分钟
};

// 会话管理
class SessionManager {
  // 创建会话
  async createSession(userId: number, deviceInfo: any) {
    const sessionId = generateUUID();
    const sessionData = {
      userId,
      deviceInfo,
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    
    await redis.setex(
      CacheKeys.USER_SESSION(sessionId),
      CacheTTL.USER_SESSION,
      JSON.stringify(sessionData)
    );
    
    return sessionId;
  }
  
  // 验证会话
  async validateSession(sessionId: string) {
    const sessionData = await redis.get(CacheKeys.USER_SESSION(sessionId));
    if (!sessionData) {
      throw new Error('Session expired');
    }
    
    // 更新最后活动时间
    const session = JSON.parse(sessionData);
    session.lastActivity = new Date();
    
    await redis.setex(
      CacheKeys.USER_SESSION(sessionId),
      CacheTTL.USER_SESSION,
      JSON.stringify(session)
    );
    
    return session;
  }
}
```

### 6.2 数据安全

```typescript
// 输入验证中间件
const validateInput = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(422).json({
        code: 422,
        message: 'Validation error',
        details: error.details
      });
    }
    req.body = value;
    next();
  };
};

// SQL 注入防护
const safeQuery = async (query: string, params: any[]) => {
  // 使用参数化查询
  return await sequelize.query(query, {
    replacements: params,
    type: QueryTypes.SELECT
  });
};

// XSS 防护
const sanitizeInput = (input: string) => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });
};

// 文件上传安全
const fileUploadSecurity = {
  // 文件类型检查
  checkFileType: (file: Express.Multer.File) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mov', 'video/avi'
    ];
    return allowedTypes.includes(file.mimetype);
  },
  
  // 文件大小检查
  checkFileSize: (file: Express.Multer.File) => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    return file.size <= maxSize;
  },
  
  // 文件内容检查
  scanFile: async (filePath: string) => {
    // 病毒扫描、恶意代码检测
    // 可以集成第三方安全扫描服务
    return true;
  }
};
```

### 6.3 访问控制

```typescript
// 基于角色的访问控制 (RBAC)
class PermissionManager {
  private permissions = {
    admin: [
      'user:create', 'user:read', 'user:update', 'user:delete',
      'schedule:create', 'schedule:read', 'schedule:update', 'schedule:delete',
      'work:create', 'work:read', 'work:update', 'work:delete',
      'system:config', 'system:logs'
    ],
    member: [
      'user:read', 'user:update:own',
      'schedule:create:own', 'schedule:read', 'schedule:update:own', 'schedule:delete:own',
      'work:create:own', 'work:read', 'work:update:own', 'work:delete:own'
    ],
    guest: [
      'user:read:public',
      'schedule:read:public',
      'work:read:public'
    ]
  };
  
  hasPermission(userRole: string, permission: string, resourceOwnerId?: number, userId?: number) {
    const userPermissions = this.permissions[userRole] || [];
    
    // 检查直接权限
    if (userPermissions.includes(permission)) {
      return true;
    }
    
    // 检查所有者权限
    if (permission.endsWith(':own') && resourceOwnerId === userId) {
      const basePermission = permission.replace(':own', '');
      return userPermissions.includes(basePermission + ':own');
    }
    
    return false;
  }
}

// 权限检查中间件
const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ code: 401, message: 'Unauthorized' });
    }
    
    const permissionManager = new PermissionManager();
    const hasPermission = permissionManager.hasPermission(
      user.role,
      permission,
      req.params.userId ? parseInt(req.params.userId) : undefined,
      user.id
    );
    
    if (!hasPermission) {
      return res.status(403).json({ code: 403, message: 'Forbidden' });
    }
    
    next();
  };
};
```

## 7. 性能优化

### 7.1 前端性能优化

```typescript
// 代码分割
const HomePage = lazy(() => import('../pages/home/HomePage'));
const TeamPage = lazy(() => import('../pages/team/TeamPage'));
const WorksPage = lazy(() => import('../pages/works/WorksPage'));
const AdminPage = lazy(() => import('../pages/admin/AdminPage'));

// 图片懒加载
const LazyImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={imgRef} className="lazy-image-container">
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`lazy-image ${isLoaded ? 'loaded' : 'loading'}`}
        />
      )}
    </div>
  );
};

// 虚拟滚动
const VirtualList: React.FC<{
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
}> = ({ items, itemHeight, containerHeight, renderItem }) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(startIndex, endIndex);
  
  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
};

// 防抖 Hook
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};
```

### 7.2 后端性能优化

```typescript
// 数据库连接池优化
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  pool: {
    max: 20,          // 最大连接数
    min: 5,           // 最小连接数
    acquire: 30000,   // 获取连接超时时间
    idle: 10000,      // 连接空闲时间
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

// 查询优化
class OptimizedQuery {
  // 分页查询优化
  static async paginatedQuery<T>(
    model: any,
    options: {
      page: number;
      pageSize: number;
      where?: any;
      include?: any[];
      order?: any[];
    }
  ) {
    const { page, pageSize, where, include, order } = options;
    const offset = (page - 1) * pageSize;
    
    const [rows, count] = await Promise.all([
      model.findAll({
        where,
        include,
        order,
        limit: pageSize,
        offset,
      }),
      model.count({ where })
    ]);
    
    return {
      rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize)
      }
    };
  }
  
  // 批量查询优化
  static async batchQuery<T>(ids: number[], model: any) {
    const cacheKeys = ids.map(id => `${model.name}:${id}`);
    const cached = await redis.mget(cacheKeys);
    
    const missingIds: number[] = [];
    const results: T[] = [];
    
    cached.forEach((item, index) => {
      if (item) {
        results[index] = JSON.parse(item);
      } else {
        missingIds.push(ids[index]);
      }
    });
    
    if (missingIds.length > 0) {
      const freshData = await model.findAll({
        where: { id: { [Op.in]: missingIds } }
      });
      
      // 更新缓存
      const pipeline = redis.pipeline();
      freshData.forEach((item: any) => {
        const cacheKey = `${model.name}:${item.id}`;
        pipeline.setex(cacheKey, 3600, JSON.stringify(item));
        
        const originalIndex = ids.indexOf(item.id);
        results[originalIndex] = item;
      });
      await pipeline.exec();
    }
    
    return results;
  }
}

// 缓存装饰器
function Cache(ttl: number = 3600) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      // 尝试从缓存获取
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // 执行原方法
      const result = await method.apply(this, args);
      
      // 存入缓存
      await redis.setex(cacheKey, ttl, JSON.stringify(result));
      
      return result;
    };
  };
}

// 使用示例
class UserService {
  @Cache(3600)
  async getUserById(id: number) {
    return await User.findByPk(id);
  }
  
  @Cache(1800)
  async getUserSchedules(userId: number, date: string) {
    return await Schedule.findAll({
      where: {
        userId,
        startTime: {
          [Op.gte]: new Date(date),
          [Op.lt]: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });
  }
}
```

## 8. 监控与运维

### 8.1 应用监控

```typescript
// 性能监控中间件
const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, url, ip } = req;
    const { statusCode } = res;
    
    // 记录性能指标
    logger.info('HTTP Request', {
      method,
      url,
      statusCode,
      duration,
      ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    // 慢请求告警
    if (duration > 5000) {
      logger.warn('Slow Request Detected', {
        method,
        url,
        duration,
        ip
      });
    }
  });
  
  next();
};

// 错误监控
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const errorId = generateUUID();
  
  logger.error('Application Error', {
    errorId,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params,
    timestamp: new Date().toISOString()
  });
  
  // 发送错误通知
  if (process.env.NODE_ENV === 'production') {
    notificationService.sendErrorAlert({
      errorId,
      message: err.message,
      url: req.url,
      timestamp: new Date()
    });
  }
  
  res.status(500).json({
    code: 500,
    message: 'Internal Server Error',
    errorId,
    timestamp: new Date().toISOString()
  });
};

// 健康检查
const healthCheck = async (req: Request, res: Response) => {
  const checks = {
    database: false,
    redis: false,
    fileSystem: false,
    memory: false
  };
  
  try {
    // 数据库连接检查
    await sequelize.authenticate();
    checks.database = true;
  } catch (error) {
    logger.error('Database health check failed', error);
  }
  
  try {
    // Redis 连接检查
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    logger.error('Redis health check failed', error);
  }
  
  try {
    // 文件系统检查
    await fs.access('./uploads', fs.constants.W_OK);
    checks.fileSystem = true;
  } catch (error) {
    logger.error('File system health check failed', error);
  }
  
  // 内存使用检查
  const memoryUsage = process.memoryUsage();
  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  checks.memory = memoryUsagePercent < 90;
  
  const isHealthy = Object.values(checks).every(check => check);
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      usage: memoryUsage,
      percentage: memoryUsagePercent
    }
  });
};
```

### 8.2 日志管理

```typescript
// Winston 日志配置
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'wedding-club-api',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // 文件输出
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10
    })
  ]
});

// 操作日志记录
class AuditLogger {
  static async logUserAction(
    userId: number,
    action: string,
    resourceType: string,
    resourceId: number,
    details: any,
    req: Request
  ) {
    try {
      await OperationLog.create({
        userId,
        action,
        resourceType,
        resourceId,
        description: `User ${userId} performed ${action} on ${resourceType} ${resourceId}`,
        requestMethod: req.method,
        requestUrl: req.url,
        requestParams: {
          body: req.body,
          query: req.query,
          params: req.params
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details
      });
    } catch (error) {
      logger.error('Failed to log user action', error);
    }
  }
}
```

## 9. 部署方案

### 9.1 Docker 容器化

```dockerfile
# 前端 Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# 后端 Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 创建必要目录
RUN mkdir -p /app/uploads /app/logs
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["npm", "start"]
```

### 9.2 Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 前端服务
  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    restart: unless-stopped

  # 后端服务
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USERNAME=wedding_user
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_DATABASE=wedding_club
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - mysql
      - redis
    restart: unless-stopped

  # MySQL 数据库
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=wedding_club
      - MYSQL_USER=wedding_user
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/init:/docker-entrypoint-initdb.d
    command: --default-authentication-plugin=mysql_native_password
    restart: unless-stopped

  # Redis 缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

  # 监控服务
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  default:
    driver: bridge
```

### 9.3 Nginx 配置

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # 基础配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # 压缩配置
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # 上游服务器
    upstream backend {
        server backend:3000;
        keepalive 32;
    }
    
    # 限流配置
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;
    
    server {
        listen 80;
        server_name localhost;
        
        # 重定向到 HTTPS
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name localhost;
        
        # SSL 配置
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        
        # 安全头
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
        
        # 静态文件
        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
            
            # 缓存配置
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
        
        # API 代理
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # 超时配置
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # 文件上传
        location /api/v1/files/upload {
            limit_req zone=upload burst=5 nodelay;
            client_max_body_size 100M;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # 上传超时配置
            proxy_connect_timeout 60s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }
        
        # 健康检查
        location /health {
            proxy_pass http://backend/health;
            access_log off;
        }
    }
}
```

## 10. 开发规范

### 10.1 代码规范

```typescript
// ESLint 配置 (.eslintrc.js)
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'prettier',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    // TypeScript 规则
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // React 规则
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // 通用规则
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};

// Prettier 配置 (.prettierrc)
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### 10.2 Git 工作流

```bash
# 分支命名规范
feature/功能名称     # 新功能开发
bugfix/问题描述      # 问题修复
hotfix/紧急修复      # 紧急修复
release/版本号       # 版本发布

# 提交信息规范
feat: 新功能
fix: 修复问题
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建或辅助工具变动

# 示例
git commit -m "feat: 添加用户档期管理功能"
git commit -m "fix: 修复文件上传失败问题"
git commit -m "docs: 更新API文档"
```

### 10.3 测试策略

```typescript
// 单元测试示例
// user.service.test.ts
import { UserService } from '../services/user.service';
import { User } from '../models/User';

describe('UserService', () => {
  let userService: UserService;
  
  beforeEach(() => {
    userService = new UserService();
  });
  
  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const mockUser = { id: 1, ...userData };
      jest.spyOn(User, 'create').mockResolvedValue(mockUser as any);
      
      const result = await userService.createUser(userData);
      
      expect(result).toEqual(mockUser);
      expect(User.create).toHaveBeenCalledWith(userData);
    });
    
    it('should throw error when email already exists', async () => {
      const userData = {
        username: 'testuser',
        email: 'existing@example.com',
        password: 'password123'
      };
      
      jest.spyOn(User, 'findOne').mockResolvedValue({} as any);
      
      await expect(userService.createUser(userData))
        .rejects.toThrow('Email already exists');
    });
  });
});

// 集成测试示例
// auth.integration.test.ts
import request from 'supertest';
import app from '../app';

describe('Auth Integration Tests', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('admin');
    });
    
    it('should return 401 with invalid credentials', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        })
        .expect(401);
    });
  });
});
```

## 11. 总结

本架构设计文档详细规划了婚礼主持俱乐部官方网站的完整技术架构，包括：

### 11.1 核心特性
- **现代化技术栈**: React 18 + TypeScript + Node.js + MySQL + Redis
- **微服务架构**: 模块化设计，易于扩展和维护
- **高性能**: 缓存策略、数据库优化、前端性能优化
- **高安全性**: JWT认证、RBAC权限控制、数据加密
- **可扩展性**: 容器化部署、负载均衡、水平扩展

### 11.2 技术亮点
- **响应式设计**: 支持PC端、平板、手机多端适配
- **实时功能**: WebSocket支持实时通知和消息
- **文件处理**: 图片/视频上传、压缩、缩略图生成
- **搜索功能**: 全文搜索、标签搜索、高级筛选
- **数据分析**: 访问统计、用户行为分析、业务报表

### 11.3 运维保障
- **监控体系**: 应用监控、性能监控、错误追踪
- **日志管理**: 结构化日志、日志聚合、审计日志
- **备份策略**: 数据库备份、文件备份、灾难恢复
- **CI/CD**: 自动化构建、测试、部署流程

### 11.4 开发效率
- **代码规范**: ESLint + Prettier + TypeScript
- **测试覆盖**: 单元测试 + 集成测试 + E2E测试
- **文档完善**: API文档、开发文档、部署文档
- **开发工具**: 热重载、调试工具、性能分析

该架构设计确保了系统的稳定性、安全性、可扩展性和可维护性，为婚礼主持俱乐部提供了一个现代化、专业化的线上平台解决方案。
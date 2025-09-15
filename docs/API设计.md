# 婚礼主持档期管理系统 - API设计文档

## 1. API概述

### 1.1 设计原则
- **RESTful设计**：遵循REST架构风格
- **统一响应格式**：所有接口返回统一的JSON格式
- **版本控制**：通过URL路径进行版本控制
- **安全认证**：使用JWT Token进行身份认证
- **错误处理**：统一的错误码和错误信息

### 1.2 基础信息
- **Base URL**：`https://api.wedding-host.com/v1`
- **Content-Type**：`application/json`
- **字符编码**：`UTF-8`
- **认证方式**：`Bearer Token (JWT)`

### 1.3 统一响应格式
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1640995200000,
  "requestId": "req_123456789"
}
```

### 1.4 状态码说明
- **200**：请求成功
- **400**：请求参数错误
- **401**：未授权访问
- **403**：权限不足
- **404**：资源不存在
- **409**：资源冲突
- **422**：请求参数验证失败
- **500**：服务器内部错误

## 2. 认证授权模块

### 2.1 用户注册
```http
POST /auth/register
```

**请求参数：**
```json
{
  "username": "string",
  "email": "string",
  "phone": "string",
  "password": "string",
  "confirmPassword": "string",
  "userType": "number", // 1-个人，2-团队
  "captcha": "string",
  "captchaKey": "string"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "userId": 123456,
    "username": "testuser",
    "email": "test@example.com",
    "userType": 1
  }
}
```

### 2.2 用户登录
```http
POST /auth/login
```

**请求参数：**
```json
{
  "account": "string", // 用户名/邮箱/手机号
  "password": "string",
  "captcha": "string",
  "captchaKey": "string"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_string",
    "expiresIn": 7200,
    "user": {
      "id": 123456,
      "username": "testuser",
      "email": "test@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "userType": 1
    }
  }
}
```

### 2.3 刷新Token
```http
POST /auth/refresh
```

**请求参数：**
```json
{
  "refreshToken": "string"
}
```

### 2.4 用户登出
```http
POST /auth/logout
```

**请求头：**
```
Authorization: Bearer {token}
```

### 2.5 第三方登录
```http
POST /auth/oauth/{provider}
```

**路径参数：**
- `provider`: 第三方平台 (wechat, qq, weibo)

**请求参数：**
```json
{
  "code": "string", // 授权码
  "state": "string" // 状态参数
}
```

## 3. 用户管理模块

### 3.1 获取用户信息
```http
GET /users/profile
```

**请求头：**
```
Authorization: Bearer {token}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 123456,
    "username": "testuser",
    "email": "test@example.com",
    "phone": "13800138000",
    "avatar": "https://example.com/avatar.jpg",
    "realName": "张三",
    "gender": 1,
    "birthday": "1990-01-01",
    "location": "北京市",
    "bio": "专业婚礼主持人",
    "userType": 1,
    "verified": true,
    "profile": {
      "professionalTitle": "高级婚礼主持人",
      "experienceYears": 5,
      "serviceCount": 100,
      "rating": 4.8,
      "ratingCount": 50,
      "priceRangeMin": 1000,
      "priceRangeMax": 5000,
      "serviceAreas": ["北京市", "天津市"],
      "specialties": ["中式婚礼", "西式婚礼", "户外婚礼"],
      "contactPhone": "13800138000",
      "contactWechat": "wechat123",
      "viewCount": 1000
    }
  }
}
```

### 3.2 更新用户信息
```http
PUT /users/profile
```

**请求参数：**
```json
{
  "realName": "string",
  "gender": "number",
  "birthday": "string",
  "location": "string",
  "bio": "string",
  "avatar": "string"
}
```

### 3.3 更新用户档案
```http
PUT /users/profile/professional
```

**请求参数：**
```json
{
  "professionalTitle": "string",
  "experienceYears": "number",
  "priceRangeMin": "number",
  "priceRangeMax": "number",
  "serviceAreas": ["string"],
  "specialties": ["string"],
  "contactPhone": "string",
  "contactWechat": "string",
  "contactQq": "string"
}
```

### 3.4 修改密码
```http
PUT /users/password
```

**请求参数：**
```json
{
  "oldPassword": "string",
  "newPassword": "string",
  "confirmPassword": "string"
}
```

### 3.5 获取用户公开信息
```http
GET /users/{userId}/public
```

**路径参数：**
- `userId`: 用户ID

### 3.6 搜索主持人
```http
GET /users/hosts/search
```

**查询参数：**
- `keyword`: 关键词
- `location`: 地区
- `priceMin`: 最低价格
- `priceMax`: 最高价格
- `rating`: 最低评分
- `sortBy`: 排序方式 (rating, price, serviceCount)
- `page`: 页码
- `limit`: 每页数量

## 4. 团队管理模块

### 4.1 创建团队
```http
POST /teams
```

**请求参数：**
```json
{
  "name": "string",
  "description": "string",
  "logo": "string"
}
```

### 4.2 获取团队列表
```http
GET /teams
```

**查询参数：**
- `page`: 页码
- `limit`: 每页数量

### 4.3 获取团队详情
```http
GET /teams/{teamId}
```

### 4.4 更新团队信息
```http
PUT /teams/{teamId}
```

### 4.5 删除团队
```http
DELETE /teams/{teamId}
```

### 4.6 邀请成员
```http
POST /teams/{teamId}/members/invite
```

**请求参数：**
```json
{
  "userId": "number",
  "role": "string", // admin, member
  "permissions": ["string"]
}
```

### 4.7 获取团队成员
```http
GET /teams/{teamId}/members
```

### 4.8 更新成员角色
```http
PUT /teams/{teamId}/members/{userId}
```

### 4.9 移除成员
```http
DELETE /teams/{teamId}/members/{userId}
```

## 5. 档期管理模块

### 5.1 获取档期列表
```http
GET /schedules
```

**查询参数：**
- `startDate`: 开始日期
- `endDate`: 结束日期
- `status`: 状态
- `page`: 页码
- `limit`: 每页数量

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "date": "2024-01-15",
        "timeSlots": [
          {
            "start": "09:00",
            "end": "12:00",
            "status": "available"
          },
          {
            "start": "14:00",
            "end": "18:00",
            "status": "booked"
          }
        ],
        "status": "available",
        "price": 2000,
        "location": "北京市朝阳区",
        "notes": "备注信息"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### 5.2 创建档期
```http
POST /schedules
```

**请求参数：**
```json
{
  "date": "string",
  "timeSlots": [
    {
      "start": "string",
      "end": "string",
      "status": "string"
    }
  ],
  "price": "number",
  "location": "string",
  "notes": "string"
}
```

### 5.3 批量创建档期
```http
POST /schedules/batch
```

**请求参数：**
```json
{
  "startDate": "string",
  "endDate": "string",
  "timeSlots": [
    {
      "start": "string",
      "end": "string",
      "status": "string"
    }
  ],
  "price": "number",
  "location": "string",
  "excludeDates": ["string"] // 排除的日期
}
```

### 5.4 更新档期
```http
PUT /schedules/{scheduleId}
```

### 5.5 删除档期
```http
DELETE /schedules/{scheduleId}
```

### 5.6 获取主持人档期
```http
GET /schedules/host/{hostId}
```

**查询参数：**
- `startDate`: 开始日期
- `endDate`: 结束日期
- `status`: 状态

## 6. 预约管理模块

### 6.1 创建预约
```http
POST /bookings
```

**请求参数：**
```json
{
  "hostId": "number",
  "scheduleId": "number",
  "weddingDate": "string",
  "weddingTime": "string",
  "weddingLocation": "string",
  "contactName": "string",
  "contactPhone": "string",
  "guestCount": "number",
  "budget": "number",
  "requirements": "string"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "预约创建成功",
  "data": {
    "id": 123,
    "bookingNo": "BK202401150001",
    "status": "pending",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### 6.2 获取预约列表
```http
GET /bookings
```

**查询参数：**
- `status`: 状态
- `startDate`: 开始日期
- `endDate`: 结束日期
- `page`: 页码
- `limit`: 每页数量

### 6.3 获取预约详情
```http
GET /bookings/{bookingId}
```

### 6.4 确认预约
```http
PUT /bookings/{bookingId}/confirm
```

### 6.5 取消预约
```http
PUT /bookings/{bookingId}/cancel
```

**请求参数：**
```json
{
  "reason": "string"
}
```

### 6.6 完成预约
```http
PUT /bookings/{bookingId}/complete
```

## 7. 作品管理模块

### 7.1 获取作品列表
```http
GET /works
```

**查询参数：**
- `userId`: 用户ID
- `type`: 作品类型
- `category`: 分类
- `page`: 页码
- `limit`: 每页数量

### 7.2 创建作品
```http
POST /works
```

**请求参数：**
```json
{
  "title": "string",
  "description": "string",
  "type": "string", // image, video
  "coverUrl": "string",
  "mediaUrls": ["string"],
  "tags": ["string"],
  "category": "string"
}
```

### 7.3 更新作品
```http
PUT /works/{workId}
```

### 7.4 删除作品
```http
DELETE /works/{workId}
```

### 7.5 获取作品详情
```http
GET /works/{workId}
```

## 8. 动态管理模块

### 8.1 发布动态
```http
POST /posts
```

**请求参数：**
```json
{
  "content": "string",
  "images": ["string"],
  "videoUrl": "string",
  "location": "string"
}
```

### 8.2 获取动态列表
```http
GET /posts
```

**查询参数：**
- `userId`: 用户ID
- `page`: 页码
- `limit`: 每页数量

### 8.3 获取动态详情
```http
GET /posts/{postId}
```

### 8.4 更新动态
```http
PUT /posts/{postId}
```

### 8.5 删除动态
```http
DELETE /posts/{postId}
```

### 8.6 点赞动态
```http
POST /posts/{postId}/like
```

### 8.7 取消点赞
```http
DELETE /posts/{postId}/like
```

## 9. 评论管理模块

### 9.1 创建评论
```http
POST /comments
```

**请求参数：**
```json
{
  "targetType": "string", // work, post, booking
  "targetId": "number",
  "parentId": "number", // 可选，回复评论时使用
  "content": "string",
  "rating": "number" // 可选，评分
}
```

### 9.2 获取评论列表
```http
GET /comments
```

**查询参数：**
- `targetType`: 目标类型
- `targetId`: 目标ID
- `page`: 页码
- `limit`: 每页数量

### 9.3 删除评论
```http
DELETE /comments/{commentId}
```

### 9.4 点赞评论
```http
POST /comments/{commentId}/like
```

## 10. 消息通知模块

### 10.1 获取消息列表
```http
GET /messages
```

**查询参数：**
- `type`: 消息类型
- `isRead`: 是否已读
- `page`: 页码
- `limit`: 每页数量

### 10.2 标记消息已读
```http
PUT /messages/{messageId}/read
```

### 10.3 批量标记已读
```http
PUT /messages/read-all
```

**请求参数：**
```json
{
  "messageIds": ["number"] // 可选，不传则标记全部
}
```

### 10.4 删除消息
```http
DELETE /messages/{messageId}
```

### 10.5 获取未读消息数量
```http
GET /messages/unread-count
```

## 11. 文件上传模块

### 11.1 上传图片
```http
POST /upload/image
```

**请求参数：**
- Content-Type: `multipart/form-data`
- file: 图片文件

**响应示例：**
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "https://cdn.example.com/images/123456.jpg",
    "filename": "123456.jpg",
    "size": 1024000,
    "mimeType": "image/jpeg"
  }
}
```

### 11.2 上传视频
```http
POST /upload/video
```

### 11.3 批量上传
```http
POST /upload/batch
```

### 11.4 获取上传凭证
```http
GET /upload/token
```

**查询参数：**
- `type`: 文件类型 (image, video, document)

## 12. 搜索模块

### 12.1 综合搜索
```http
GET /search
```

**查询参数：**
- `keyword`: 搜索关键词
- `type`: 搜索类型 (host, work, post)
- `location`: 地区
- `page`: 页码
- `limit`: 每页数量

### 12.2 搜索建议
```http
GET /search/suggestions
```

**查询参数：**
- `keyword`: 关键词
- `limit`: 建议数量

### 12.3 热门搜索
```http
GET /search/hot-keywords
```

## 13. 统计分析模块

### 13.1 获取用户统计
```http
GET /statistics/user
```

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "viewCount": 1000,
    "bookingCount": 50,
    "completedCount": 45,
    "rating": 4.8,
    "revenue": 100000,
    "monthlyData": [
      {
        "month": "2024-01",
        "bookings": 10,
        "revenue": 20000
      }
    ]
  }
}
```

### 13.2 获取预约统计
```http
GET /statistics/bookings
```

**查询参数：**
- `startDate`: 开始日期
- `endDate`: 结束日期
- `groupBy`: 分组方式 (day, week, month)

### 13.3 获取收入统计
```http
GET /statistics/revenue
```

## 14. 系统配置模块

### 14.1 获取系统配置
```http
GET /system/configs
```

### 14.2 获取地区列表
```http
GET /system/regions
```

### 14.3 获取分类列表
```http
GET /system/categories
```

### 14.4 获取标签列表
```http
GET /system/tags
```

## 15. 错误码说明

### 15.1 通用错误码
- **10001**：参数错误
- **10002**：参数缺失
- **10003**：参数格式错误
- **10004**：参数值超出范围

### 15.2 认证错误码
- **20001**：Token无效
- **20002**：Token过期
- **20003**：权限不足
- **20004**：账号被禁用
- **20005**：登录失败

### 15.3 业务错误码
- **30001**：用户不存在
- **30002**：用户名已存在
- **30003**：邮箱已存在
- **30004**：手机号已存在
- **30005**：密码错误
- **30006**：验证码错误
- **30007**：验证码过期

### 15.4 档期错误码
- **40001**：档期不存在
- **40002**：档期已被预订
- **40003**：档期时间冲突
- **40004**：档期状态错误

### 15.5 预约错误码
- **50001**：预约不存在
- **50002**：预约状态错误
- **50003**：预约时间冲突
- **50004**：预约已取消
- **50005**：预约已完成

## 16. 接口限流

### 16.1 限流策略
- **登录接口**：每分钟最多5次
- **注册接口**：每分钟最多3次
- **发送验证码**：每分钟最多1次
- **上传文件**：每分钟最多10次
- **其他接口**：每分钟最多100次

### 16.2 限流响应
```json
{
  "code": 429,
  "message": "请求过于频繁，请稍后再试",
  "data": {
    "retryAfter": 60
  }
}
```

## 17. 接口版本控制

### 17.1 版本策略
- **v1**：当前稳定版本
- **v2**：下一个主要版本（开发中）

### 17.2 版本兼容性
- 向后兼容：新版本保持对旧版本的兼容
- 废弃通知：废弃的接口会提前3个月通知
- 迁移指南：提供详细的版本迁移文档

## 18. 接口测试

### 18.1 测试环境
- **开发环境**：`https://dev-api.wedding-host.com/v1`
- **测试环境**：`https://test-api.wedding-host.com/v1`
- **生产环境**：`https://api.wedding-host.com/v1`

### 18.2 测试工具
- **Postman**：提供完整的API测试集合
- **Swagger**：在线API文档和测试界面
- **单元测试**：Jest + Supertest

### 18.3 性能指标
- **响应时间**：P99 < 500ms
- **并发处理**：支持1000+ QPS
- **可用性**：99.9%以上
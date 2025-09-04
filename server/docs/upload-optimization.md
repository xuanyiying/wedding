# 上传系统优化功能说明

## 概述

本文档描述了上传系统的优化功能，包括自定义超时配置、增强重试机制、文件上传模式选择和断点续传等功能。

## 主要功能

### 1. 自定义超时配置

系统支持多种超时配置，可以根据需要进行自定义：

#### 超时类型
- `upload`: 文件上传超时时间（默认5分钟）
- `presignedUrl`: 预签名URL生成超时时间（默认30秒）
- `confirmation`: 上传确认超时时间（默认1分钟）
- `chunkUpload`: 分片上传超时时间（默认2分钟）
- `fileValidation`: 文件验证超时时间（默认30秒）
- `ossOperation`: OSS操作超时时间（默认1分钟）

#### 使用方法
```javascript
// 初始化上传时自定义超时
const response = await fetch('/api/upload/initialize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'example.mp4',
    fileSize: 104857600, // 100MB
    contentType: 'video/mp4',
    fileType: 'video',
    customTimeout: 600000, // 10分钟自定义超时
    customRetryAttempts: 5,
    customRetryDelay: 2000
  })
});
```

### 2. 增强重试机制

#### 重试策略
- `linear`: 线性增长延迟
- `exponential`: 指数增长延迟
- `fixed`: 固定延迟时间

#### 熔断器功能
- 自动检测连续失败
- 开启熔断保护
- 半开状态恢复检测
- 手动重置熔断器

#### 抖动机制
- 避免雷群效应
- 随机化重试时间
- 提高系统稳定性

### 3. 文件上传模式

#### 上传模式类型
- `DIRECT`: 直传OSS（适合小文件）
- `SERVER`: 服务端上传（适合大文件）
- `AUTO`: 自动选择（根据文件大小）

#### 模式选择逻辑
```javascript
// 自动模式选择规则
if (fileSize > autoModeThreshold) {
  return UploadMode.SERVER; // 大文件使用服务端上传
} else {
  return UploadMode.DIRECT; // 小文件使用直传
}
```

#### 配置参数
- `enableDirectUpload`: 是否启用直传OSS
- `forceServerUpload`: 是否强制服务端上传
- `directUploadSizeLimit`: 直传文件大小限制（100MB）
- `serverUploadSizeLimit`: 服务端上传大小限制（1GB）
- `autoModeThreshold`: 自动模式切换阈值（10MB）

### 4. 断点续传功能

#### 功能特性
- 支持分片上传断点续传
- 自动检测已上传分片
- 智能恢复上传进度
- 预估剩余时间

#### 使用方法
```javascript
// 恢复上传
const response = await fetch('/api/upload/resume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uploadSessionId: 'session-id-here'
  })
});

// 获取详细进度
const progress = await fetch('/api/upload/progress-detail/session-id-here');
const data = await progress.json();
console.log('上传进度:', data.data.progress);
console.log('预估剩余时间:', data.data.estimatedTimeRemaining);
```

## API 接口

### 上传会话管理

#### 初始化上传会话
```
POST /api/upload/initialize
```

参数：
```json
{
  "fileName": "example.mp4",
  "fileSize": 104857600,
  "contentType": "video/mp4",
  "fileType": "video",
  "category": "wedding",
  "uploadMode": "auto",
  "enableChunking": true,
  "expires": 3600,
  "customTimeout": 300000,
  "customRetryAttempts": 3,
  "customRetryDelay": 1000
}
```

#### 确认上传完成
```
POST /api/upload/confirm
```

#### 重试上传
```
POST /api/upload/retry
```

#### 恢复上传
```
POST /api/upload/resume
```

#### 取消上传
```
POST /api/upload/cancel
```

### 文件上传

#### 服务端完整文件上传
```
POST /api/upload/server
Content-Type: multipart/form-data
```

#### 服务端分片上传
```
POST /api/upload/server/chunk
Content-Type: multipart/form-data
```

### 进度查询

#### 获取上传进度
```
GET /api/upload/progress/:uploadSessionId
```

#### 获取详细进度
```
GET /api/upload/progress-detail/:uploadSessionId
```

#### 批量查询状态
```
POST /api/upload/batch-status
```

### 配置管理

#### 获取上传配置
```
GET /api/upload/config
```

#### 验证上传参数
```
POST /api/upload/validate
```

#### 获取重试统计
```
GET /api/upload/retry-stats/:operationName
```

#### 重置熔断器
```
POST /api/upload/reset-circuit-breaker
```

## 配置说明

### 环境变量配置

```bash
# 超时配置
UPLOAD_TIMEOUT=300000                    # 上传超时时间
UPLOAD_PRESIGNED_TIMEOUT=30000          # 预签名URL超时
UPLOAD_CONFIRM_TIMEOUT=60000            # 确认超时
UPLOAD_CHUNK_TIMEOUT=120000             # 分片上传超时
UPLOAD_VALIDATION_TIMEOUT=30000         # 验证超时
UPLOAD_OSS_TIMEOUT=60000                # OSS操作超时
UPLOAD_TIMEOUT_CUSTOMIZABLE=true        # 允许自定义超时

# 重试配置
UPLOAD_RETRY_ATTEMPTS=3                 # 重试次数
UPLOAD_RETRY_DELAY=1000                 # 重试延迟
UPLOAD_RETRY_BACKOFF=exponential        # 退避策略
UPLOAD_RETRY_MAX_DELAY=30000            # 最大延迟
UPLOAD_RETRY_CUSTOMIZABLE=true          # 允许自定义重试
UPLOAD_ENABLE_CIRCUIT_BREAKER=true      # 启用熔断器
UPLOAD_CIRCUIT_BREAKER_THRESHOLD=5      # 熔断器阈值
UPLOAD_CIRCUIT_BREAKER_TIMEOUT=60000    # 熔断器超时

# 上传模式配置
UPLOAD_ENABLE_DIRECT=true               # 启用直传
UPLOAD_FORCE_SERVER=false               # 强制服务端上传
UPLOAD_CHUNK_SIZE=5242880               # 分片大小(5MB)
UPLOAD_ENABLE_CHUNK=true                # 启用分片上传
UPLOAD_MAX_CONCURRENT_CHUNKS=3          # 最大并发分片
UPLOAD_AUTO_MODE_THRESHOLD=10485760     # 自动模式阈值(10MB)
UPLOAD_ENABLE_RESUME=true               # 启用断点续传
UPLOAD_DIRECT_SIZE_LIMIT=104857600      # 直传大小限制(100MB)
UPLOAD_SERVER_SIZE_LIMIT=1073741824     # 服务端上传限制(1GB)
```

### 动态配置管理

系统支持运行时动态调整配置：

```javascript
import { ConfigManager } from '../utils/config-manager.util';

// 应用动态配置
const result = ConfigManager.applyDynamicConfig({
  timeout: {
    upload: 600000, // 10分钟
    chunkUpload: 180000 // 3分钟
  },
  retry: {
    attempts: 5,
    delay: 2000,
    backoff: 'exponential'
  },
  mode: {
    chunkSize: 10 * 1024 * 1024, // 10MB
    maxConcurrentChunks: 5
  }
}, '性能优化调整');

// 获取当前有效配置
const config = ConfigManager.getEffectiveConfig();

// 重置动态配置
ConfigManager.resetDynamicConfig('恢复默认设置');
```

## 错误处理

### 常见错误类型

1. **超时错误**
   - 上传超时
   - 网络超时
   - OSS操作超时

2. **重试失败**
   - 达到最大重试次数
   - 熔断器开启
   - 不满足重试条件

3. **配置错误**
   - 参数超出允许范围
   - 不支持的配置选项
   - 权限不足

### 错误处理策略

```javascript
try {
  const result = await uploadFile(fileData);
} catch (error) {
  if (error.message.includes('熔断器开启')) {
    // 等待熔断器恢复或手动重置
    await resetCircuitBreaker('upload-operation');
  } else if (error.message.includes('超时')) {
    // 调整超时配置或使用更稳定的网络
    retryWithLongerTimeout();
  } else {
    // 其他错误处理
    handleGenericError(error);
  }
}
```

## 性能优化建议

### 1. 文件大小优化
- 小文件（< 10MB）：使用直传模式
- 中等文件（10MB - 100MB）：使用分片上传
- 大文件（> 100MB）：使用服务端上传

### 2. 网络优化
- 启用断点续传
- 调整分片大小
- 合理设置并发数

### 3. 重试策略优化
- 使用指数退避
- 启用抖动机制
- 配置熔断器

### 4. 监控和调试
- 监控重试统计
- 查看熔断器状态
- 分析上传性能

## 最佳实践

1. **根据网络环境调整配置**
   - 稳定网络：较短超时时间
   - 不稳定网络：较长超时时间和更多重试

2. **合理选择上传模式**
   - 考虑文件大小
   - 考虑网络带宽
   - 考虑服务器负载

3. **监控系统健康**
   - 定期检查熔断器状态
   - 监控重试成功率
   - 分析上传失败原因

4. **优化用户体验**
   - 提供详细进度信息
   - 支持断点续传
   - 合理的错误提示
# 直传OSS上传解决方案

## 概述

本方案实现了前端直接上传文件到OSS的功能，避免文件通过服务器中转，有效解决大文件上传超时问题。

## 架构设计

### 上传流程

```
1. 前端请求预签名URL
   ↓
2. 后端生成OSS预签名URL
   ↓
3. 前端直接上传到OSS
   ↓
4. 上传完成后通知后端
   ↓
5. 后端更新数据库记录
```

### 技术优势

- **避免超时**: 文件直接上传到OSS，不经过服务器
- **减少服务器负载**: 服务器只处理元数据，不处理文件流
- **提高上传速度**: 利用OSS的CDN加速
- **支持大文件**: 不受服务器内存和超时限制
- **断点续传**: 可扩展支持分片上传

## 后端实现

### 1. OSS服务接口扩展

#### 文件: `src/services/oss/oss.service.ts`

```typescript
export interface OssService {
  // 原有方法...
  
  // 新增预签名URL方法
  getPresignedUploadUrl(key: string, expires: number, contentType?: string): Promise<string>;
  getPresignedDownloadUrl(key: string, expires: number): Promise<string>;
}
```

### 2. MinIO服务实现

#### 文件: `src/services/oss/minio.service.ts`

- 实现 `getPresignedUploadUrl` 方法
- 实现 `getPresignedDownloadUrl` 方法
- 使用 `@aws-sdk/s3-request-presigner` 生成签名URL

### 3. 阿里云OSS服务实现

#### 文件: `src/services/oss/aliyun-oss.service.ts`

- 实现 `getPresignedUploadUrl` 方法
- 实现 `getPresignedDownloadUrl` 方法
- 使用 `this.ossClient.signatureUrl` 生成签名URL

### 4. 直传上传路由

#### 文件: `src/routes/direct-upload.ts`

**主要接口:**

- `POST /direct-upload/presigned-url` - 获取预签名URL
- `POST /direct-upload/confirm` - 确认上传完成
- `DELETE /direct-upload/cancel/:uploadSessionId` - 取消上传
- `GET /direct-upload/progress/:uploadSessionId` - 查询上传进度（可选）

**请求示例:**

```typescript
// 获取预签名URL
POST /direct-upload/presigned-url
{
  "fileName": "video.mp4",
  "fileSize": 104857600,
  "contentType": "video/mp4",
  "fileType": "video",
  "expires": 3600
}

// 确认上传
POST /direct-upload/confirm
{
  "uploadSessionId": "session-123",
  "actualFileSize": 104857600
}
```

### 5. 文件服务扩展

#### 文件: `src/services/file.service.ts`

**新增方法:**

- `createFileRecord` - 创建文件记录
- `generateVideoThumbnailAsync` - 异步生成视频缩略图

## 前端实现

### 1. 直传上传工具类

#### 文件: `src/utils/direct-upload.ts`

**主要类:**

- `DirectUploader` - 单文件直传上传器
- `BatchDirectUploader` - 批量文件直传上传器

**功能特性:**

- 上传进度监控
- 状态管理
- 错误处理
- 取消上传
- 文件验证
- 批量上传

### 2. 使用示例

#### 文件: `src/utils/direct-upload-example.ts`

**示例类:**

- `SingleFileUploadExample` - 单文件上传示例
- `BatchFileUploadExample` - 批量文件上传示例

**支持框架:**

- React Hook 示例
- Vue Composition API 示例
- 原生JavaScript示例

## 配置说明

### 文件类型配置

```typescript
const FILE_TYPE_CONFIG = {
  video: {
    maxSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv']
  },
  work: {
    maxSize: 200 * 1024 * 1024, // 200MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/webm']
  },
  image: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff']
  }
};
```

### 环境变量

```bash
# OSS配置（已有）
OSS_TYPE=minio  # 或 aliyun
OSS_ENDPOINT=http://localhost:9000
OSS_ACCESS_KEY=your-access-key
OSS_SECRET_KEY=your-secret-key
OSS_BUCKET=your-bucket

# 直传上传配置
DIRECT_UPLOAD_EXPIRES=3600  # 预签名URL过期时间（秒）
DIRECT_UPLOAD_MAX_SESSION_TIME=7200  # 上传会话最大时间（秒）
```

## 使用方法

### 1. 单文件上传

```typescript
import { SingleFileUploadExample } from '../utils/direct-upload-example';

// 创建上传器
const uploader = new SingleFileUploadExample({
  onProgress: (progress) => {
    console.log(`上传进度: ${progress.percentage}%`);
  },
  onStatus: (status) => {
    console.log(`状态: ${status}`);
  },
  onSuccess: (result) => {
    console.log('上传成功:', result);
  },
  onError: (error) => {
    console.error('上传失败:', error);
  }
});

// 上传视频
const result = await uploader.uploadVideo(file);
```

### 2. 批量文件上传

```typescript
import { BatchFileUploadExample } from '../utils/direct-upload-example';

// 创建批量上传器
const batchUploader = new BatchFileUploadExample({
  onProgress: (progress) => {
    console.log(`批量上传进度: ${progress.percentage}%`);
  },
  onComplete: (result) => {
    console.log('批量上传完成:', result);
  }
});

// 批量上传图片
const result = await batchUploader.uploadFiles(files, 'image', {
  concurrency: 3 // 并发数
});
```

### 3. React Hook 使用

```typescript
// 在React组件中使用
const {
  uploadFile,
  cancelUpload,
  uploadProgress,
  uploadStatus,
  uploadResult,
  uploadError,
  isUploading
} = useDirectUpload();

// 上传文件
const handleUpload = async (file: File) => {
  try {
    const result = await uploadFile(file, 'video');
    console.log('上传成功:', result);
  } catch (error) {
    console.error('上传失败:', error);
  }
};
```

### 4. Vue Composition API 使用

```typescript
// 在Vue组件中使用
const {
  uploadFile,
  cancelUpload,
  uploadProgress,
  uploadStatus,
  uploadResult,
  uploadError,
  isUploading
} = useDirectUpload();

// 上传文件
const handleUpload = async (file: File) => {
  try {
    const result = await uploadFile(file, 'video');
    console.log('上传成功:', result);
  } catch (error) {
    console.error('上传失败:', error);
  }
};
```

## 错误处理

### 常见错误类型

1. **文件验证失败**
   - 文件类型不支持
   - 文件大小超过限制

2. **预签名URL获取失败**
   - OSS配置错误
   - 网络连接问题

3. **上传到OSS失败**
   - 签名URL过期
   - 网络中断
   - OSS服务异常

4. **确认上传失败**
   - 上传会话过期
   - 文件大小不匹配
   - 数据库操作失败

### 错误处理策略

```typescript
try {
  const result = await uploader.uploadVideo(file);
} catch (error) {
  if (error.message.includes('文件验证失败')) {
    // 处理文件验证错误
    showValidationError(error.message);
  } else if (error.message.includes('网络')) {
    // 处理网络错误
    showNetworkError();
  } else {
    // 处理其他错误
    showGenericError(error.message);
  }
}
```

## 监控和调试

### 1. 上传进度监控

```typescript
const uploader = new DirectUploader(file, {
  onProgress: (progress) => {
    console.log('上传进度:', {
      percentage: progress.percentage,
      loaded: formatFileSize(progress.loaded),
      total: formatFileSize(progress.total),
      speed: formatUploadSpeed(progress.speed),
      remainingTime: formatRemainingTime(progress.remainingTime)
    });
  }
});
```

### 2. 状态跟踪

```typescript
const uploader = new DirectUploader(file, {
  onStatusChange: (status) => {
    console.log('状态变化:', status);
    // pending -> uploading -> completed/failed/cancelled
  }
});
```

### 3. 调试日志

后端会记录详细的上传日志，包括：
- 预签名URL生成
- 上传会话创建
- 文件确认处理
- 错误信息

## 性能优化

### 1. 并发控制

```typescript
// 批量上传时控制并发数
const result = await batchUploader.uploadFiles(files, 'image', {
  concurrency: 3 // 同时最多上传3个文件
});
```

### 2. 文件预处理

```typescript
// 上传前验证文件
const validator = createFileValidator('video');
const validation = validator.validate(file);

if (!validation.valid) {
  throw new Error(`文件验证失败: ${validation.errors.join(', ')}`);
}
```

### 3. 缓存优化

- 预签名URL缓存（短时间内相同文件可复用）
- 上传会话状态缓存
- 文件元数据缓存

## 安全考虑

### 1. 文件验证

- 文件类型白名单
- 文件大小限制
- 文件名安全检查

### 2. 签名URL安全

- 设置合理的过期时间
- 限制上传文件大小
- 验证Content-Type

### 3. 上传会话管理

- 会话超时机制
- 会话状态验证
- 防止重复确认

## 扩展功能

### 1. 分片上传

可扩展支持大文件分片上传：

```typescript
// 未来可扩展的分片上传接口
interface ChunkedUploadConfig {
  chunkSize: number;
  maxConcurrency: number;
  enableResume: boolean;
}
```

### 2. 上传队列

可扩展支持上传队列管理：

```typescript
// 未来可扩展的队列管理
class UploadQueue {
  add(file: File, config: DirectUploadConfig): void;
  pause(): void;
  resume(): void;
  clear(): void;
}
```

### 3. 云存储适配

可扩展支持更多云存储服务：

- 腾讯云COS
- 华为云OBS
- AWS S3
- Google Cloud Storage

## 故障排除

### 1. 上传失败

**问题**: 文件上传到OSS失败

**排查步骤**:
1. 检查预签名URL是否有效
2. 检查网络连接
3. 检查OSS服务状态
4. 检查文件大小是否超限

### 2. 确认失败

**问题**: 上传完成但确认失败

**排查步骤**:
1. 检查上传会话是否过期
2. 检查文件大小是否匹配
3. 检查数据库连接
4. 检查后端日志

### 3. 进度异常

**问题**: 上传进度显示异常

**排查步骤**:
1. 检查进度回调函数
2. 检查文件大小计算
3. 检查网络状况
4. 检查浏览器兼容性

## 总结

直传OSS上传解决方案通过以下方式有效解决了大文件上传超时问题：

1. **架构优化**: 文件直接上传到OSS，避免服务器中转
2. **性能提升**: 利用OSS的CDN加速和并发上传
3. **用户体验**: 实时进度反馈和错误处理
4. **可扩展性**: 支持多种文件类型和批量上传
5. **安全性**: 完善的文件验证和权限控制

该方案已在项目中完整实现，可直接使用。后续可根据业务需求扩展更多功能。
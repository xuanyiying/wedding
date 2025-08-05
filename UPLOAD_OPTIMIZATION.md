# 文件上传超时优化方案

本文档详细说明了针对视频上传超时问题的优化改进方案，包括后端和前端的配置调整、重试机制实现以及使用示例。

## 🎯 优化目标

- 解决大文件（特别是视频文件）上传超时问题
- 提高上传成功率和用户体验
- 增加重试机制和错误处理
- 提供详细的上传进度反馈

## 📋 优化内容概览

### 后端优化 (Server)

1. **配置优化** (`/server/src/config/config.ts`)
   - 增加上传超时配置：5分钟
   - 增加重试配置：最多3次，延迟1秒
   - 提升文件大小限制：100MB

2. **Express应用配置** (`/server/src/app.ts`)
   - 提升请求体大小限制：100MB

3. **Multer中间件优化** (`/server/src/middlewares/upload.ts`)
   - 添加上传超时中间件
   - 实现重试处理机制
   - 增强错误处理

4. **路由层优化** (`/server/src/routes/file.ts`)
   - 集成超时中间件
   - 优化错误处理流程

5. **服务层优化** (`/server/src/services/file.service.ts`)
   - OSS上传重试机制
   - 视频缩略图生成重试

### 前端优化 (Web)

1. **请求配置优化** (`/web/src/utils/request.ts`)
   - 普通请求超时：30秒
   - 文件上传超时：5分钟
   - 实现通用重试机制
   - 专门的上传重试方法

2. **上传工具类** (`/web/src/utils/upload.ts`)
   - 完整的文件上传器类
   - 批量上传管理器
   - 进度监控和状态管理
   - 文件验证和错误处理

3. **使用示例** (`/web/src/examples/upload-example.ts`)
   - 单文件上传示例
   - 批量上传示例
   - React/Vue Hook示例
   - 错误处理示例

## 🔧 详细配置说明

### 后端配置

#### 1. 超时配置

```typescript
// config/config.ts
export const config = {
  upload: {
    timeout: 5 * 60 * 1000, // 5分钟
    retryAttempts: 3,
    retryDelay: 1000,
    maxFileSize: 100 * 1024 * 1024, // 100MB
  }
};
```

#### 2. 中间件配置

```typescript
// middlewares/upload.ts
// 超时中间件
export const uploadWithTimeout = (req, res, next) => {
  const timeout = setTimeout(() => {
    const error = new Error('Upload timeout');
    error.code = 'UPLOAD_TIMEOUT';
    next(error);
  }, config.upload.timeout);
  
  res.on('finish', () => clearTimeout(timeout));
  next();
};

// 重试处理器
export const createRetryHandler = (maxAttempts, delay) => {
  return async (operation, context) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  };
};
```

### 前端配置

#### 1. 请求实例配置

```typescript
// utils/request.ts
// 普通请求实例
const instance = axios.create({
  timeout: 30000, // 30秒
});

// 上传专用实例
const uploadRequest = axios.create({
  timeout: 5 * 60 * 1000, // 5分钟
});
```

#### 2. 重试机制

```typescript
// 重试配置
interface RetryConfig {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  retryCondition?: (error: any) => boolean;
}

// 重试函数
export const withRetry = async <T>(
  operation: () => Promise<T>,
  config: RetryConfig = {},
  context: string = 'operation'
): Promise<T> => {
  // 实现指数退避重试逻辑
};
```

## 🚀 使用方法

### 1. 基础上传

```typescript
import { http } from '@/utils/request';

// 使用内置重试的上传方法
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await http.upload('/api/files/upload', formData, {
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`上传进度: ${progress}%`);
      },
      retryConfig: {
        maxAttempts: 5,
        delay: 2000,
        backoff: true,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('上传失败:', error);
    throw error;
  }
};
```

### 2. 高级上传（推荐）

```typescript
import { FileUploader, createFileValidator } from '@/utils/upload';

// 创建文件验证器
const validator = createFileValidator({
  maxSize: 100 * 1024 * 1024, // 100MB
  allowedTypes: ['video/mp4', 'video/avi', 'image/jpeg'],
});

// 创建上传器
const uploader = new FileUploader(file, {
  url: '/api/files/upload',
  validateFile: validator,
  onProgress: (progress) => {
    console.log(`进度: ${progress.percentage}%`);
    console.log(`速度: ${formatUploadSpeed(progress.speed)}`);
    console.log(`剩余: ${formatRemainingTime(progress.remainingTime)}`);
  },
  onStatusChange: (status) => {
    console.log(`状态: ${status}`);
  },
  onRetry: (attempt, error) => {
    console.warn(`第 ${attempt} 次重试`);
  },
});

// 开始上传
try {
  const result = await uploader.upload();
  console.log('上传成功:', result);
} catch (error) {
  console.error('上传失败:', error);
}
```

### 3. 批量上传

```typescript
import { BatchUploader } from '@/utils/upload';

// 创建批量上传器
const batchUploader = new BatchUploader(
  files, // File[] 数组
  {
    url: '/api/files/upload',
    validateFile: validator,
  },
  {
    concurrency: 3, // 同时上传3个文件
    onBatchProgress: (completed, total, progress) => {
      console.log(`批量进度: ${completed}/${total} (${progress}%)`);
    },
  }
);

// 开始批量上传
const results = await batchUploader.uploadAll();
```

## 📊 错误处理

### 常见错误类型

| 错误类型 | 状态码 | 处理方式 |
|---------|--------|----------|
| 文件过大 | 413 | 提示用户选择较小文件 |
| 文件类型不支持 | 415 | 提示支持的文件类型 |
| 上传超时 | ECONNABORTED | 自动重试 |
| 网络错误 | - | 自动重试 |
| 服务器错误 | 5xx | 自动重试 |

### 错误处理示例

```typescript
import { handleUploadError } from '@/examples/upload-example';

try {
  await uploader.upload();
} catch (error) {
  const message = handleUploadError(error);
  // 显示错误消息给用户
  showErrorMessage(message);
}
```

## 🔍 监控和调试

### 1. 上传进度监控

```typescript
const uploader = new FileUploader(file, {
  onProgress: (progress) => {
    // 更新UI进度条
    updateProgressBar(progress.percentage);
    
    // 显示详细信息
    showUploadInfo({
      loaded: formatFileSize(progress.loaded),
      total: formatFileSize(progress.total),
      speed: formatUploadSpeed(progress.speed),
      remaining: formatRemainingTime(progress.remainingTime),
    });
  },
});
```

### 2. 状态监控

```typescript
const uploader = new FileUploader(file, {
  onStatusChange: (status) => {
    switch (status) {
      case UploadStatus.PENDING:
        showStatus('准备上传');
        break;
      case UploadStatus.UPLOADING:
        showStatus('正在上传');
        break;
      case UploadStatus.SUCCESS:
        showStatus('上传成功');
        break;
      case UploadStatus.ERROR:
        showStatus('上传失败');
        break;
      case UploadStatus.CANCELLED:
        showStatus('上传已取消');
        break;
    }
  },
});
```

## 🎛️ 配置建议

### 根据文件类型调整配置

```typescript
// 图片上传配置
const imageUploadConfig = {
  timeout: 60000, // 1分钟
  retryConfig: { maxAttempts: 3 },
  validateFile: createFileValidator({
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png'],
  }),
};

// 视频上传配置
const videoUploadConfig = {
  timeout: 10 * 60 * 1000, // 10分钟
  retryConfig: { maxAttempts: 5, delay: 3000 },
  validateFile: createFileValidator({
    maxSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: ['video/mp4', 'video/avi'],
  }),
};
```

### 网络环境适配

```typescript
// 检测网络状态
const getNetworkConfig = () => {
  const connection = navigator.connection;
  
  if (connection) {
    // 根据网络类型调整配置
    switch (connection.effectiveType) {
      case 'slow-2g':
      case '2g':
        return { timeout: 15 * 60 * 1000, maxAttempts: 5 };
      case '3g':
        return { timeout: 10 * 60 * 1000, maxAttempts: 4 };
      case '4g':
      default:
        return { timeout: 5 * 60 * 1000, maxAttempts: 3 };
    }
  }
  
  return { timeout: 5 * 60 * 1000, maxAttempts: 3 };
};
```

## 📈 性能优化建议

1. **分片上传**：对于超大文件（>100MB），建议实现分片上传
2. **断点续传**：支持上传中断后从断点继续
3. **压缩优化**：上传前对图片/视频进行适当压缩
4. **CDN加速**：使用CDN上传节点就近上传
5. **并发控制**：批量上传时控制并发数量

## 🔧 故障排查

### 常见问题

1. **上传一直超时**
   - 检查网络连接
   - 确认服务器配置
   - 检查文件大小限制

2. **重试不生效**
   - 检查重试条件配置
   - 确认错误类型是否符合重试条件

3. **进度显示异常**
   - 检查onUploadProgress回调
   - 确认progress事件是否正确触发

### 调试工具

```typescript
// 开启详细日志
const uploader = new FileUploader(file, {
  // ... 其他配置
  onRetry: (attempt, error) => {
    console.log('重试信息:', { attempt, error, timestamp: new Date() });
  },
  onProgress: (progress) => {
    console.log('进度信息:', progress);
  },
});
```

## 📝 总结

通过以上优化方案，我们实现了：

✅ **超时配置优化**：后端5分钟，前端分层配置  
✅ **重试机制**：智能重试，指数退避  
✅ **错误处理**：全面的错误分类和处理  
✅ **进度监控**：实时进度、速度、剩余时间  
✅ **文件验证**：类型、大小、扩展名验证  
✅ **批量上传**：并发控制，批量进度监控  
✅ **取消功能**：支持上传取消  
✅ **状态管理**：完整的上传状态跟踪  

这套方案能够显著提高大文件上传的成功率和用户体验，特别是在网络不稳定的环境下。
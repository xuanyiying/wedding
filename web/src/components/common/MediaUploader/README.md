# MediaUploader 组件

## 概述

MediaUploader 是一个功能完整的媒体文件上传组件，支持图片和视频上传，具备分块上传、进度跟踪、断点续传等高级功能。

## 特性

- 🚀 **前端直传** - 采用 OSS 前端直传方案，减轻服务器压力，提升上传速度
- 📦 **大文件优化** - 支持大文件分片上传，提高上传成功率
- 🔄 **断点续传** - 支持网络中断后继续上传（由 OSS SDK 支持）
- 📊 **实时进度** - 详细的上传进度和速度显示
- 🎯 **智能重试** - 网络错误自动重试，指数退避策略
- 🖼️ **视频封面** - 支持视频文件封面并行上传，提升用户体验
- 📱 **响应式设计** - 适配移动端和桌面端
- 🔧 **灵活配置** - 丰富的配置选项满足不同需求

## 快速开始

### 基础使用

```tsx
import { MediaUploader } from '@/components/common/MediaUploader';

function MyComponent() {
  const handleUploadSuccess = (results) => {
    console.log('上传成功:', results);
  };

  return (
    <MediaUploader
      config={{
        maxCount: 5,
        maxSize: 100 * 1024 * 1024, // 100MB
        category: 'work'
      }}
      onUploadSuccess={handleUploadSuccess}
    />
  );
}
```

### 高级配置

```tsx
import { MediaUploader } from '@/components/common/MediaUploader';

function AdvancedComponent() {
  return (
    <MediaUploader
      config={{
        // 基础配置
        multiple: true,
        maxCount: 10,
        maxSize: 500 * 1024 * 1024, // 500MB
        
        // 图片配置
        imageMaxSize: 50 * 1024 * 1024, // 50MB
        imageCompress: true,
        imageQuality: 0.8,
        
        // 视频配置
        videoMaxSize: 500 * 1024 * 1024, // 500MB
        requireCover: true,
        
        // 上传配置
        category: 'work', // 支持 'other' | 'avatar' | 'work' | 'profile' | 'cover' | 'favicon' | 'logo'
        concurrent: 2 // 并发数
      }}
      onUploadStart={(files) => console.log('开始上传:', files)}
      onUploadProgress={(progress) => console.log('上传进度:', progress)}
      onUploadSuccess={(results) => console.log('上传成功:', results)}
      onUploadError={(error) => console.error('上传失败:', error)}
    />
  );
}
```

## 配置选项

### MediaUploadConfig

```typescript
interface MediaUploadConfig {
  // 基础配置
  accept?: string[];           // 接受的文件类型
  multiple?: boolean;          // 是否支持多文件
  maxCount?: number;           // 最大文件数量
  maxSize?: number;            // 单文件最大大小（字节）
  
  // 图片配置
  imageMaxSize?: number;       // 图片最大大小
  imageCompress?: boolean;     // 是否压缩图片
  imageQuality?: number;       // 图片压缩质量 (0-1)
  
  // 视频配置
  videoMaxSize?: number;       // 视频最大大小
  requireCover?: boolean;      // 是否必须选择封面
  autoExtractCover?: boolean;  // 是否自动提取封面
  
  // 上传配置
  category?: string;           // 文件分类 ('other' | 'avatar' | 'work' | 'profile' | 'cover' | 'favicon' | 'logo')
  concurrent?: number;         // 并发上传数
}
```

## 事件回调

```typescript
interface MediaUploaderCallbacks {
  onUploadStart?: (files: MediaFileItem[]) => void;
  onUploadProgress?: (progress: UploadProgressInfo) => void;
  onFileProgress?: (fileId: string, progress: DirectUploadProgress) => void;
  onUploadSuccess?: (results: DirectUploadResult[]) => void;
  onUploadError?: (error: Error, fileId?: string) => void;
}
```

## 核心功能

### 1. 前端直传方案

- **架构**: 采用客户端直接上传至 OSS（腾讯云 COS）的方式。
- **优势**: 
  - 减少服务器带宽消耗。
  - 提高上传速度，尤其在处理大文件时。
  - 减轻服务器 CPU 和内存压力。

### 2. 视频封面处理

- **并行上传**: 视频文件和封面图片并行上传，缩短总上传时间。
- **自动关联**: 上传完成后自动关联视频和封面 URL。

### 3. 进度跟踪

```typescript
interface UploadProgressInfo {
  total: number;          // 总文件数
  completed: number;      // 已完成数
  failed: number;         // 失败数
  uploading: number;      // 上传中数
  percentage: number;     // 总进度百分比
  speed?: number;         // 上传速度 (bytes/s)
  remainingTime?: number; // 剩余时间 (seconds)
}
```

## 使用 UploadManager

如果需要更多控制，可以直接使用 UploadManager：

```typescript
import { UploadManager } from '@/components/common/MediaUploader';

const uploadManager = new UploadManager({
  config: {
    maxSize: 500 * 1024 * 1024,
    concurrent: 2
  },
  onUploadProgress: (progress) => {
    console.log('上传进度:', progress);
  }
});

// 上传文件
const files = [file1, file2];
const results = await uploadManager.uploadFiles(files);

// 取消上传
uploadManager.cancelUpload();

// 清理资源
uploadManager.cleanup();
```

## 性能优化

### 直传优化

1. **分片上传**: 由 OSS SDK 自动处理大文件分片。
2. **并发控制**: 支持设置并发上传的文件数量，默认为 2。
3. **断点续传**: 支持上传中断后继续上传。
4. **错误恢复**: 智能重试机制，自动处理网络错误。

### 内存优化

1. **及时清理**: 自动清理不再使用的资源和 URL 对象。
2. **进度节流**: 避免频繁的进度更新（100ms 节流）影响 UI 性能。

## 故障排除

### 常见问题

1. **上传失败**
   - 检查网络连接。
   - 检查文件分类（category）是否正确。
   - 检查文件大小是否超过配置限制。

2. **进度显示异常**
   - 确认回调函数正确设置。
   - 检查是否开启了并发限制。

## 更新日志

### v3.1.0 (当前版本)
- 🚀 **架构升级**: 全面切换为前端直传方案，移除所有服务端上传逻辑。
- 🖼️ **封面优化**: 实现视频文件与封面的并行上传，提升效率。
- 📦 **代码清理**: 移除冗余的 `CHUNK_CONFIG`、`UploadSession` 等逻辑。
- 🔧 **增强稳定性**: 采用腾讯云 COS SDK 提供的稳定直传能力。

### v3.0.0
- 🎯 **重大重构**: 合并所有功能到统一的 UploadManager。
- 🚀 **性能提升**: 优化分块上传算法。
- 🔧 **简化API**: 统一接口，减少学习成本。
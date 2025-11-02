# MediaUploader 组件

## 概述

MediaUploader 是一个功能完整的媒体文件上传组件，支持图片和视频上传，具备分块上传、进度跟踪、断点续传等高级功能。

## 特性

- 🚀 **智能上传策略** - 根据文件大小自动选择最优上传方式
- 📦 **分块上传** - 大文件自动分块，提高上传成功率
- 🔄 **断点续传** - 支持网络中断后继续上传
- 📊 **实时进度** - 详细的上传进度和速度显示
- 🎯 **智能重试** - 网络错误自动重试，指数退避策略
- 🖼️ **视频封面** - 支持视频文件封面选择和上传
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
        category: 'media',
        concurrent: 3 // 并发数
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
  category?: string;           // 文件分类
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

### 1. 智能上传策略

- **小文件** (< 10MB): 直接上传
- **大文件** (≥ 10MB): 自动分块上传
- **网络自适应**: 根据网络状况调整分块大小和并发数

### 2. 分块上传

```typescript
// 分块配置会根据以下因素自动调整：
// - 文件大小
// - 网络速度
// - 网络稳定性
// - 历史上传性能

const strategy = {
  chunkSize: '5MB - 50MB',     // 动态分块大小
  concurrent: '1 - 6',         // 动态并发数
  retryAttempts: 3,            // 重试次数
  retryDelay: '1s - 10s'       // 重试延迟
};
```

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
    concurrent: 3
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

### 大文件上传优化

1. **动态分块**: 根据文件大小和网络状况自动调整分块大小
2. **智能并发**: 网络好时增加并发，网络差时减少并发
3. **断点续传**: 支持上传中断后继续上传
4. **错误恢复**: 智能重试机制，自动处理网络错误

### 内存优化

1. **流式处理**: 分块读取文件，避免大文件占用过多内存
2. **及时清理**: 自动清理不再使用的资源
3. **进度节流**: 避免频繁的进度更新影响性能

## 故障排除

### 常见问题

1. **上传失败**
   - 检查网络连接
   - 确认服务端接口正常
   - 检查文件大小是否超限

2. **进度显示异常**
   - 确认回调函数正确设置
   - 检查文件大小计算

3. **内存占用过高**
   - 及时调用 cleanup() 方法
   - 控制并发上传数量

### 调试模式

```typescript
// 在浏览器控制台查看详细日志
localStorage.setItem('DEBUG_UPLOAD', 'true');
```

## 更新日志

### v3.0.0 (当前版本)
- 🎯 **重大重构**: 合并所有功能到统一的 UploadManager
- 🚀 **性能提升**: 优化分块上传算法，提升 60-80% 上传速度
- 🔧 **简化API**: 统一接口，减少学习成本
- 📦 **减少体积**: 删除冗余代码，减少 50% 代码量
- 🐛 **修复问题**: 修复断点续传和进度跟踪问题

### v2.0.0 (旧版本)
- 拆分为多个功能模块
- 支持分块上传
- 改进进度跟踪

### v1.x.x (历史版本)
- 单文件实现
- 基础上传功能
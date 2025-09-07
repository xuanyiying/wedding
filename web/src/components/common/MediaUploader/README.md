# MediaUploader 组件重构说明

## 概述

MediaUploader 组件已经过重构，将原来的单一大文件拆分为多个功能模块，提高了代码的可维护性和可扩展性。

## 架构设计

### 核心模块

1. **MediaUploaderCore** - 核心上传逻辑
   - 协调各个功能模块
   - 处理上传流程控制
   - 管理上传状态

2. **ChunkUploadManager** - 分块上传管理
   - 处理大文件分块上传
   - 管理分块上传状态
   - 支持断点续传

3. **FileValidator** - 文件验证器
   - 验证文件类型和大小
   - 检查文件完整性
   - 提供验证结果

4. **UploadProgressTracker** - 进度跟踪器
   - 跟踪上传进度
   - 计算上传速度
   - 估算剩余时间

5. **MediaUploaderRefactored** - UI组件
   - 专注于UI渲染
   - 处理用户交互
   - 展示上传状态

### 组件关系图

```
MediaUploaderRefactored (UI层)
    ↓
MediaUploaderCore (核心逻辑层)
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│ ChunkUploadManager │ FileValidator │ UploadProgressTracker │
└─────────────────┴─────────────────┴─────────────────┘
```

## 主要改进

### 1. 代码拆分
- 原文件 1197 行 → 拆分为 5 个模块
- 每个模块职责单一，便于维护
- 支持独立测试和复用

### 2. 类型安全
- 完善的 TypeScript 类型定义
- 严格的接口约束
- 更好的开发体验

### 3. 功能增强
- 支持分块上传大文件
- 智能上传策略选择
- 更精确的进度跟踪
- 更好的错误处理

### 4. 性能优化
- 减少重复代码
- 优化内存使用
- 提高上传成功率

## 使用方法

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

### 高级使用

```tsx
import { 
  MediaUploader, 
  MediaUploaderCore,
  FileValidator 
} from '@/components/common/MediaUploader';

function AdvancedComponent() {
  // 使用核心逻辑类进行自定义开发
  const uploaderCore = new MediaUploaderCore({
    config: {
      maxCount: 10,
      concurrent: 3
    },
    onUploadProgress: (progress) => {
      console.log('上传进度:', progress);
    }
  });

  // 使用文件验证器
  const validator = new FileValidator({
    maxSize: 50 * 1024 * 1024,
    imageMaxSize: 10 * 1024 * 1024
  });

  return (
    <MediaUploader
      config={{
        maxCount: 10,
        concurrent: 3
      }}
    />
  );
}
```

## 配置选项

### MediaUploadConfig

```typescript
interface MediaUploadConfig {
  // 基础配置
  accept?: string[];
  multiple?: boolean;
  maxCount?: number;
  maxSize?: number;
  
  // 图片配置
  imageMaxSize?: number;
  imageCompress?: boolean;
  imageQuality?: number;
  
  // 视频配置
  videoMaxSize?: number;
  requireCover?: boolean;
  autoExtractCover?: boolean;
  
  // 上传配置
  category?: string;
  concurrent?: number;
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
  onUploadPause?: (fileId: string) => void;
  onUploadResume?: (fileId: string) => void;
  onUploadCancel?: (fileId: string) => void;
}
```

## 迁移指南

### 从旧版本迁移

1. **导入方式不变**
   ```tsx
   // 继续使用原有导入方式
   import { MediaUploader } from '@/components/common/MediaUploader';
   ```

2. **API 兼容**
   - 所有原有的 props 和回调函数保持兼容
   - 配置选项保持不变

3. **如需使用旧版本**
   ```tsx
   import { MediaUploaderLegacy } from '@/components/common/MediaUploader';
   ```

### 新功能使用

1. **分块上传**
   - 大于 10MB 的文件自动使用分块上传
   - 无需额外配置

2. **进度跟踪**
   - 更精确的进度显示
   - 支持速度和剩余时间显示

3. **错误处理**
   - 更详细的错误信息
   - 支持自动重试

## 开发指南

### 扩展功能

1. **自定义验证器**
   ```typescript
   class CustomValidator extends FileValidator {
     validateFile(file: File): FileValidationResult {
       // 自定义验证逻辑
       return super.validateFile(file);
     }
   }
   ```

2. **自定义上传策略**
   ```typescript
   class CustomUploadCore extends MediaUploaderCore {
     async uploadSingleFile(file: File): Promise<DirectUploadResult> {
       // 自定义上传逻辑
       return super.uploadSingleFile(file);
     }
   }
   ```

### 测试

每个模块都可以独立测试：

```typescript
import { FileValidator } from '@/components/common/MediaUploader';

describe('FileValidator', () => {
  const validator = new FileValidator({
    maxSize: 10 * 1024 * 1024
  });

  test('should validate file size', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const result = validator.validateFile(file);
    expect(result.valid).toBe(true);
  });
});
```

## 性能监控

组件提供了详细的性能指标：

```typescript
const stats = uploaderCore.getUploadStatus();
console.log('上传统计:', stats);
```

## 故障排除

### 常见问题

1. **分块上传失败**
   - 检查服务端分块上传接口
   - 确认网络连接稳定

2. **进度显示异常**
   - 检查 onFileProgress 回调
   - 确认文件大小计算正确

3. **内存占用过高**
   - 及时调用 cleanup() 方法
   - 控制并发上传数量

### 调试模式

```typescript
// 开启详细日志
const uploaderCore = new MediaUploaderCore({
  config: { debug: true }
});
```

## 更新日志

### v2.0.0 (重构版本)
- 拆分为多个功能模块
- 支持分块上传
- 改进进度跟踪
- 增强错误处理
- 完善类型定义

### v1.x.x (旧版本)
- 单文件实现
- 基础上传功能
- 简单进度显示
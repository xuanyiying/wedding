# MediaUploader 组件：设计与实现

MediaUploader 组件是一个为 Web 应用程序处理媒体文件上传而设计的复杂 React 组件。本文将探讨其架构、关键特性和实现细节。

## 概述

MediaUploader 组件是一个功能丰富的媒体上传解决方案，支持图像和视频上传，具备分块上传、进度跟踪和视频封面选择等高级功能。它被设计为高效处理大文件，同时提供流畅的用户体验。

## 架构

该组件采用模块化架构，包含以下几个关键部分：

1. **MediaUploader.tsx** - 主 React 组件，提供 UI 并协调上传过程
2. **UploadManager.ts** - 处理文件上传的核心逻辑，包括分块上传和进度跟踪
3. **VideoCoverModal.tsx** - 用于选择视频封面的专用组件
4. **FileValidator.ts** - 验证上传文件的工具
5. **types.ts** - 整个模块的 TypeScript 类型定义

## 关键特性

### 1. 智能上传策略

组件根据文件大小智能选择最佳上传方式：

- **小文件** (< 10MB): 直接上传以加快处理速度
- **大文件** (≥ 10MB): 分块上传以提高可靠性和可恢复性

### 2. 分块上传实现

对于大文件，UploadManager 实现了复杂的分块上传系统：

```typescript
private async uploadFileWithChunks(
  file: File,
  fileId: string,
  onProgress: (progress: number) => void
): Promise<DirectUploadResult> {
  // 根据文件大小和网络条件计算最佳分块大小
  const { chunkSize, concurrent } = this.calculateChunkStrategy(file.size);
  
  // 创建文件分块
  const chunks = this.createFileChunks(file, chunkSize);
  
  // 初始化分块上传
  const initResponse = await http.post('/files/chunk/init', {
    filename: file.name,
    fileSize: file.size,
    mimeType: file.type,
    category: this.config.category,
    totalChunks: chunks.length
  });

  // 使用信号量控制并发上传分块
  const semaphore = new Semaphore(concurrent);
  const uploadPromises = chunks.map((chunk, index) =>
    semaphore.acquire(async () => {
      await this.uploadChunk(chunk, index, uploadId, file.name);
      // 更新进度
    })
  );

  // 完成上传
  await Promise.all(uploadPromises);
  const completeResponse = await http.post('/files/chunk/complete', { uploadId });
}
```

### 3. 进度跟踪

组件提供详细的进度信息，包括：
- 总体上传进度百分比
- 已完成、失败和正在上传的文件数量
- 上传速度（字节/秒）
- 预计剩余时间

进度跟踪经过优化，使用节流机制防止 UI 性能问题：

```typescript
// 进度节流以避免过度更新
private updateFileProgress(fileId: string, loaded: number, total: number): void {
  // ... 计算进度指标 ...
  
  // 节流更新
  if (this.progressThrottlers.has(fileId)) {
    clearTimeout(this.progressThrottlers.get(fileId)!);
  }

  const timeoutId = setTimeout(() => {
    this.options.onFileProgress?.(fileId, progressData);
    this.updateOverallProgress();
  }, 100);
  
  this.progressThrottlers.set(fileId, timeoutId);
}
```

### 4. 视频封面选择

对于视频文件，组件提供专门的模态框用于选择封面：

1. **帧提取**：自动从视频中提取关键帧
2. **手动捕获**：允许用户在特定时间点捕获帧
3. **上传选项**：用户可以上传自定义图像作为封面

VideoCoverModal 使用 VideoFrameExtractor 工具高效提取帧，而不会使浏览器过载：

```typescript
// 优化的帧提取，带有质量和尺寸控制
const frames = await extractorRef.current.extractFrames(videoFile, {
  frameCount: 8,
  quality: 0.6, // 缩略图的中等质量
  format: 'image/jpeg',
  maxWidth: 200,
  maxHeight: 112, // 16:9 宽高比
  startTime: 0.5, // 跳过开头可能的黑帧
});
```

### 5. 网络适应

UploadManager 通过动态调整来适应网络条件：
- 基于网络速度的分块大小
- 基于稳定性的并发上传数量
- 失败上传的重试策略

```typescript
private calculateChunkStrategy(fileSize: number): { chunkSize: number; concurrent: number } {
  const { speed, stability } = this.networkMetrics;
  
  let chunkSize = CHUNK_CONFIG.DEFAULT_CHUNK_SIZE;
  let concurrent = 3;

  // 根据文件大小调整
  if (fileSize > 100 * 1024 * 1024) { // > 100MB
    chunkSize = Math.min(20 * 1024 * 1024, CHUNK_CONFIG.MAX_CHUNK_SIZE);
    concurrent = 4;
  }

  // 根据网络条件调整
  if (speed > 50 * 1024 * 1024) { // > 50MB/s
    concurrent = Math.min(concurrent + 2, CHUNK_CONFIG.MAX_CONCURRENT);
  } else if (speed < 5 * 1024 * 1024) { // < 5MB/s
    concurrent = Math.max(concurrent - 1, 1);
    chunkSize = Math.max(chunkSize / 2, CHUNK_CONFIG.MIN_CHUNK_SIZE);
  }

  return { chunkSize, concurrent };
}
```

## 实现细节

### 1. React 组件设计

MediaUploader 组件使用 React hooks 进行状态管理：

```typescript
const MediaUploader: React.FC<MediaUploaderProps> = ({
  disabled = false,
  config = {},
  className = '',
  style = {},
  showProgress = true,
  // ... 回调属性
}) => {
  // 状态管理
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgressInfo>({ /* ... */ });
  const [coverModalVisible, setCoverModalVisible] = useState(false);
  
  // 用于管理实例的引用
  const uploadManagerRef = useRef<UploadManager | null>(null);
  
  // 初始化和清理的效果
  useEffect(() => {
    initUploadManager();
    return () => {
      uploadManagerRef.current?.cleanup();
    };
  }, [initUploadManager]);
}
```

### 2. 文件验证

组件实现了全面的文件验证：

```typescript
private validateFile(file: File): { valid: boolean; error?: string } {
  // 大小检查
  if (file.size > this.config.maxSize!) {
    return { valid: false, error: `文件大小超过限制` };
  }

  // 类型检查
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  
  if (!isImage && !isVideo) {
    return { valid: false, error: '不支持的文件类型' };
  }

  // 特定类型大小限制
  if (isImage && file.size > this.config.imageMaxSize!) {
    return { valid: false, error: `图片大小超过限制` };
  }

  return { valid: true };
}
```

### 3. 错误处理和重试

组件实现了具有自动重试功能的健壮错误处理：

```typescript
private async uploadChunk(
  chunk: Blob,
  chunkIndex: number,
  uploadId: string,
  fileName: string,
  retryCount = 0
): Promise<void> {
  try {
    // 上传逻辑
    const response = await http.upload('/files/chunk/upload', formData);
    
    if (!response.success) {
      throw new Error(`分块上传失败`);
    }
  } catch (error) {
    // 指数退避重试逻辑
    if (retryCount < CHUNK_CONFIG.RETRY_ATTEMPTS) {
      await new Promise(resolve => 
        setTimeout(resolve, CHUNK_CONFIG.RETRY_DELAY * (retryCount + 1))
      );
      return this.uploadChunk(chunk, chunkIndex, uploadId, fileName, retryCount + 1);
    }
    throw error;
  }
}
```

## 性能优化

### 1. 内存管理

组件通过以下方式仔细管理内存：
- 不再需要时撤销对象 URL
- 在 useEffect 清理函数中清理资源
- 使用高效的数据结构跟踪进度

### 2. UI 性能

- 进度更新经过节流以防止过度重新渲染
- 大文件集的虚拟化列表
- CSS 动画实现流畅的 UI 过渡

### 3. 网络效率

- 基于网络条件的自适应分块大小
- 并发上传限制以防止网络饱和
- 具有指数退避的智能重试机制

## 使用示例

### 基本使用

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
<MediaUploader
  config={{
    multiple: true,
    maxCount: 10,
    maxSize: 500 * 1024 * 1024, // 500MB
    imageMaxSize: 50 * 1024 * 1024, // 50MB
    videoMaxSize: 500 * 1024 * 1024, // 500MB
    requireCover: true,
    category: 'media',
    concurrent: 3
  }}
  onUploadStart={(files) => console.log('开始上传:', files)}
  onUploadProgress={(progress) => console.log('进度:', progress)}
  onUploadSuccess={(results) => console.log('成功:', results)}
  onUploadError={(error) => console.error('错误:', error)}
/>
```

## 结论

MediaUploader 组件展示了现代 React 开发中的几个最佳实践：

1. **模块化设计**：UI 和业务逻辑之间关注点的清晰分离
2. **性能优化**：高效处理大文件和进度更新
3. **用户体验**：全面的反馈和错误处理
4. **灵活性**：丰富的配置选项和可扩展的架构
5. **健壮性**：全面的错误处理和重试机制

该组件是在 React 应用程序中构建复杂文件上传功能的优秀示例，同时保持了性能和可用性。
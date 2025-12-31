# 直传上传功能详解：从前端到后端的完整实现

在现代Web应用中，文件上传是一个常见但复杂的功能。特别是对于大文件，传统的上传方式可能会遇到性能问题和网络中断的风险。本文将详细介绍我们项目中实现的直传上传功能，该功能允许文件直接上传到对象存储服务（如OSS），从而提高上传效率和可靠性。

## 直传上传概述

直传上传是一种优化的文件上传方式，其工作流程如下：

1. 前端应用向后端服务请求预签名URL
2. 后端服务生成预签名URL并返回给前端
3. 前端应用直接使用该URL将文件上传到对象存储服务
4. 上传完成后，前端通知后端确认上传
5. 后端服务创建文件记录并返回最终结果

这种方式避免了文件通过应用服务器中转，大大提高了上传速度和系统可扩展性。

## 后端实现

### 核心服务类

后端的核心实现位于[DirectUploadService](file:///Users/yiying/dev-app/wedding-client/server/src/services/direct-upload.service.ts#L35-L335)类中，主要包含以下功能：

#### 1. 生成预签名URL

```typescript
static async generatePresignedUrl(request: PresignedUrlRequest) {
  const {
    userId,
    fileName,
    fileSize,
    contentType,
    fileType,
    category = 'other',
    expires = 3600
  } = request;

  // 验证文件类型和大小
  this.validateFile(fileName, fileSize, contentType, fileType);

  // 生成唯一的OSS key
  const ossKey = this.generateOssKey(userId, fileName, fileType, category);

  // 生成预签名URL
  const presignedUrl = await this.ossService.getPresignedUploadUrl(
    ossKey,
    expires,
    contentType
  );

  // 创建上传会话
  const sessionId = uuidv4();
  const session: UploadSession = {
    id: sessionId,
    userId,
    fileName,
    fileSize,
    contentType,
    fileType,
    category,
    ossKey,
    presignedUrl,
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + expires * 1000)
  };

  // 保存会话到Redis
  await this.saveSession(session);

  return {
    presignedUrl,
    uploadSessionId: sessionId,
    ossKey,
    expires
  };
}
```

#### 2. 确认上传完成

```typescript
static async confirmUpload(request: ConfirmUploadRequest) {
  const { uploadSessionId, userId, actualFileSize } = request;

  // 获取上传会话
  const session = await this.getSession(uploadSessionId);
  if (!session) {
    throw new Error('上传会话不存在或已过期');
  }

  // 验证用户权限
  if (session.userId !== userId) {
    throw new Error('无权限操作此上传会话');
  }

  // 验证会话状态
  if (session.status !== 'pending' && session.status !== 'uploading') {
    throw new Error(`上传会话状态异常: ${session.status}`);
  }

  try {
    // 更新会话状态
    session.status = 'uploading';
    await this.saveSession(session);

    // 获取文件的公共访问URL
    const fileAccessUrl = this.ossService.getFileUrl(session.ossKey);

    // 创建文件记录
    const fileRecord = await FileService.createFileRecord({
      userId,
      filename: session.fileName,
      originalName: session.fileName,
      fileSize: actualFileSize || session.fileSize,
      fileType: session.fileType as FileType,
      category: session.category,
      url: fileAccessUrl,
      filePath: session.ossKey,
      mimeType: session.contentType
    });

    // 更新会话状态为完成
    session.status = 'completed';
    await this.saveSession(session);

    return {
      fileId: fileRecord.id,
      filename: fileRecord.filename,
      originalName: fileRecord.originalName,
      fileSize: fileRecord.fileSize,
      url: fileRecord.fileUrl,
      fileType: fileRecord.fileType,
      uploadedAt: fileRecord.createdAt,
      category: session.category
    };
  } catch (error) {
    // 更新会话状态为失败
    session.status = 'failed';
    await this.saveSession(session);
    throw error;
  }
}
```

### 控制器实现

[DirectUploadController](file:///Users/yiying/dev-app/wedding-client/server/src/controllers/direct-upload.controller.ts#L6-L95)类处理HTTP请求：

```typescript
export class DirectUploadController {
  /**
   * 获取预签名上传URL
   */
  static async getPresignedUrl(req: Request, res: Response) : Promise<void> {
    try {
      const { fileName, fileSize, contentType, fileType, expires } = req.body;
      const userId = req.user?.id;

      // 参数校验
      if (!fileName || !fileSize || !contentType || !fileType || !userId) {
        Resp.badRequest(res, '缺少必要参数');
        return;
      }
      
      const result = await DirectUploadService.generatePresignedUrl({
        userId,
        fileName,
        fileSize,
        contentType,
        fileType,
        expires
      });
      Resp.success(res, result);
    } catch (error) {
      logger.error('获取预签名URL失败:', error);
      Resp.internalError(res, '获取预签名URL失败');
    }
  }

  /**
   * 确认上传完成
   */
  static async confirmUpload(req: Request, res: Response): Promise<void> {
    try {
      const { uploadSessionId, actualFileSize } = req.body;
      const userId = req.user?.id;

      // 参数校验
      if (!uploadSessionId || !userId) {
        Resp.badRequest(res, '缺少必要参数');
        return;
      }

      const result = await DirectUploadService.confirmUpload({
        uploadSessionId,
        userId,
        actualFileSize
      });
      Resp.success(res, result);
    } catch (error) {
      logger.error('确认上传失败:', error);
      Resp.internalError(res, '确认上传失败');
    }
  }
}
```

### 路由配置

路由定义在[direct-upload.ts](file:///Users/yiying/dev-app/wedding-client/server/src/routes/direct-upload.ts)文件中：

```typescript
const router = Router();

// 获取预签名上传URL
router.post(
  '/presigned-url',
  uploadRateLimit,
  authMiddleware,
  DirectUploadController.getPresignedUrl
);

// 确认上传完成
router.post(
  '/confirm',
  uploadRateLimit,
  authMiddleware,
  DirectUploadController.confirmUpload
);

// 取消上传
router.post(
  '/cancel',
  authMiddleware,
  DirectUploadController.cancelUpload
);

// 查询上传进度
router.get(
  '/progress/:uploadSessionId',
  authMiddleware,
  DirectUploadController.getUploadProgress
);

export default router;
```

## 前端实现

### 直传上传工具类

前端的核心实现位于[DirectUploader](file:///Users/yiying/dev-app/wedding-client/web/src/utils/direct-upload.ts#L46-L302)类中：

```typescript
export class DirectUploader {
  private file: File;
  private config: DirectUploadConfig;
  private uploadSessionId: string | null = null;
  private uploadUrl: string | null = null;
  private abortController: AbortController | null = null;
  private status: DirectUploadStatusType = DirectUploadStatus.PENDING;
  private startTime: number = 0;
  private processedFile: File | null = null;

  constructor(file: File, config: DirectUploadConfig) {
    this.file = file;
    this.config = {
      retryCount: 3,
      retryDelay: 1000,
      enableCompression: true,
      compressionQuality: 0.8,
      progressUpdateInterval: 500,
      ...config
    };
  }

  /**
   * 开始上传
   */
  async upload(): Promise<DirectUploadResult> {
    try {
      this.updateStatus(DirectUploadStatus.PENDING);

      // 1. 预处理文件（压缩等）
      await this.preprocessFile();

      // 2. 获取预签名URL
      const presignedData = await this.getPresignedUrl();
      this.uploadSessionId = presignedData.uploadSessionId;
      this.uploadUrl = presignedData.presignedUrl;

      // 3. 直接上传到OSS（带重试机制）
      this.updateStatus(DirectUploadStatus.UPLOADING);
      await this.uploadToOssWithRetry();

      // 4. 确认上传完成
      const result = await this.confirmUpload();

      this.updateStatus(DirectUploadStatus.COMPLETED);
      this.config.onSuccess?.(result);

      return result;
    } catch (error) {
      this.updateStatus(DirectUploadStatus.FAILED);
      const uploadError = error instanceof Error ? error : new Error('上传失败');
      this.config.onError?.(uploadError);
      throw uploadError;
    }
  }
}
```

### 服务层封装

[DirectUploadService](file:///Users/yiying/dev-app/wedding-client/web/src/services/direct-upload.ts#L5-L186)类封装了上传逻辑：

```typescript
export class DirectUploadService {
  private progressCallback?: (progress: DirectUploadProgress) => void;
  private activeUploads = new Map<string, DirectUploader>();

  /**
   * 上传单个文件
   */
  async uploadFile(file: File, fileType: FileType, category?: FileCategory): Promise<DirectUploadResult> {
    const config: DirectUploadConfig = {
      fileType: this.mapFileType(fileType),
      category: category || 'other',
      onProgress: this.progressCallback
    };
    const uploader = new DirectUploader(file, config);
    return uploader.upload();
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(files: File[], fileType: FileType, category?: FileCategory): Promise<DirectUploadResult[]> {
    const results: DirectUploadResult[] = [];
    const maxConcurrent = 3; // 最大并发数
    const delay = 500; // 请求间隔（毫秒）

    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (file) => {
        const config: DirectUploadConfig = {
          fileType: this.mapFileType(fileType),
          category: category || 'other',
          onProgress: this.progressCallback
        };
        const uploader = new DirectUploader(file, config);
        return uploader.upload();
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 如果不是最后一批，添加延迟
      if (i + maxConcurrent < files.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return results;
  }
}
```

### React Hook封装

为了在React组件中更方便地使用直传功能，我们提供了[useDirectUpload](file:///Users/yiying/dev-app/wedding-client/web/src/hooks/useDirectUpload.ts#L30-L403) Hook：

```typescript
export function useDirectUpload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: UploadStatus.IDLE,
    progress: null,
    result: null,
    error: null,
    isUploading: false
  });

  /**
   * 上传单个文件
   */
  const uploadFile = useCallback(async (
    file: File,
    fileType: FileType,
    showMessage: boolean = true
  ): Promise<DirectUploadResult | null> => {
    try {
      setUploadState({
        status: UploadStatus.UPLOADING,
        progress: null,
        result: null,
        error: null,
        isUploading: true
      });

      // 设置进度回调
      directUploadService.setProgressCallback(handleProgress);
      const result = await directUploadService.uploadFile(file, fileType);

      setUploadState({
        status: UploadStatus.SUCCESS,
        progress: null,
        result,
        error: null,
        isUploading: false
      });

      if (showMessage) {
        message.success('文件上传成功');
      }

      return result;
    } catch (error) {
      const err = error as Error;
      setUploadState({
        status: UploadStatus.ERROR,
        progress: null,
        result: null,
        error: err,
        isUploading: false
      });

      if (showMessage) {
        message.error(`上传失败: ${err.message}`);
      }

      return null;
    }
  }, [handleProgress]);

  return {
    // 状态
    uploadState,
    isUploading: uploadState.isUploading,
    progress: uploadState.progress,
    result: uploadState.result,
    error: uploadState.error,
    status: uploadState.status,
    
    // 方法
    uploadFile,
    uploadFiles,
    uploadAvatar,
    uploadWorkImages,
    uploadVideo,
    uploadMedia,
    cancelUpload,
    resetUpload
  };
}
```

## 使用示例

### 在React组件中使用

```tsx
import React, { useState } from 'react';
import { useDirectUpload } from '../hooks/useDirectUpload';
import { FileType } from '../types';

const FileUploadComponent: React.FC = () => {
  const { uploadFile, uploadState, progress } = useDirectUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (selectedFile) {
      await uploadFile(selectedFile, FileType.IMAGE, true);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!selectedFile || uploadState.isUploading}>
        {uploadState.isUploading ? '上传中...' : '上传文件'}
      </button>
      
      {progress && (
        <div>
          <p>上传进度: {progress.percentage}%</p>
          <p>速度: {Math.round(progress.speed / 1024)} KB/s</p>
          <p>剩余时间: {Math.round(progress.remainingTime)} 秒</p>
        </div>
      )}
      
      {uploadState.result && (
        <div>
          <p>上传成功!</p>
          <p>文件URL: {uploadState.result.url}</p>
        </div>
      )}
      
      {uploadState.error && (
        <div>
          <p>上传失败: {uploadState.error.message}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploadComponent;
```

## 总结

直传上传功能的实现涉及前后端的紧密配合：

1. **后端**负责生成预签名URL、管理上传会话和创建文件记录
2. **前端**负责文件预处理、直接上传到对象存储和状态管理
3. **安全性**通过用户认证和会话验证来保障
4. **可靠性**通过重试机制和错误处理来提升

这种实现方式不仅提高了上传效率，还减轻了应用服务器的负载，是处理大文件上传的推荐方案。
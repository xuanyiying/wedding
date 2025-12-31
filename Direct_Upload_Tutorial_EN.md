# Direct Upload Implementation: A Complete Guide from Frontend to Backend

In modern web applications, file uploading is a common but complex feature. Especially for large files, traditional upload methods may encounter performance issues and risks of network interruptions. This article will detail the direct upload functionality implemented in our project, which allows files to be uploaded directly to object storage services (such as OSS), thereby improving upload efficiency and reliability.

## Direct Upload Overview

Direct upload is an optimized file upload approach with the following workflow:

1. The frontend application requests a presigned URL from the backend service
2. The backend service generates a presigned URL and returns it to the frontend
3. The frontend application directly uses this URL to upload the file to the object storage service
4. After the upload is complete, the frontend notifies the backend to confirm the upload
5. The backend service creates a file record and returns the final result

This approach avoids file transfer through the application server, significantly improving upload speed and system scalability.

## Backend Implementation

### Core Service Class

The backend core implementation is located in the [DirectUploadService](file:///Users/yiying/dev-app/wedding-client/server/src/services/direct-upload.service.ts#L35-L335) class, which primarily includes the following functionalities:

#### 1. Generating Presigned URLs

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

  // Validate file type and size
  this.validateFile(fileName, fileSize, contentType, fileType);

  // Generate unique OSS key
  const ossKey = this.generateOssKey(userId, fileName, fileType, category);

  // Generate presigned URL
  const presignedUrl = await this.ossService.getPresignedUploadUrl(
    ossKey,
    expires,
    contentType
  );

  // Create upload session
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

  // Save session to Redis
  await this.saveSession(session);

  return {
    presignedUrl,
    uploadSessionId: sessionId,
    ossKey,
    expires
  };
}
```

#### 2. Confirming Upload Completion

```typescript
static async confirmUpload(request: ConfirmUploadRequest) {
  const { uploadSessionId, userId, actualFileSize } = request;

  // Get upload session
  const session = await this.getSession(uploadSessionId);
  if (!session) {
    throw new Error('Upload session does not exist or has expired');
  }

  // Validate user permissions
  if (session.userId !== userId) {
    throw new Error('No permission to operate on this upload session');
  }

  // Validate session status
  if (session.status !== 'pending' && session.status !== 'uploading') {
    throw new Error(`Upload session status abnormal: ${session.status}`);
  }

  try {
    // Update session status
    session.status = 'uploading';
    await this.saveSession(session);

    // Get public access URL for the file
    const fileAccessUrl = this.ossService.getFileUrl(session.ossKey);

    // Create file record
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

    // Update session status to completed
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
    // Update session status to failed
    session.status = 'failed';
    await this.saveSession(session);
    throw error;
  }
}
```

### Controller Implementation

The [DirectUploadController](file:///Users/yiying/dev-app/wedding-client/server/src/controllers/direct-upload.controller.ts#L6-L95) class handles HTTP requests:

```typescript
export class DirectUploadController {
  /**
   * Get presigned upload URL
   */
  static async getPresignedUrl(req: Request, res: Response) : Promise<void> {
    try {
      const { fileName, fileSize, contentType, fileType, expires } = req.body;
      const userId = req.user?.id;

      // Parameter validation
      if (!fileName || !fileSize || !contentType || !fileType || !userId) {
        Resp.badRequest(res, 'Missing required parameters');
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
      logger.error('Failed to get presigned URL:', error);
      Resp.internalError(res, 'Failed to get presigned URL');
    }
  }

  /**
   * Confirm upload completion
   */
  static async confirmUpload(req: Request, res: Response): Promise<void> {
    try {
      const { uploadSessionId, actualFileSize } = req.body;
      const userId = req.user?.id;

      // Parameter validation
      if (!uploadSessionId || !userId) {
        Resp.badRequest(res, 'Missing required parameters');
        return;
      }

      const result = await DirectUploadService.confirmUpload({
        uploadSessionId,
        userId,
        actualFileSize
      });
      Resp.success(res, result);
    } catch (error) {
      logger.error('Failed to confirm upload:', error);
      Resp.internalError(res, 'Failed to confirm upload');
    }
  }
}
```

### Route Configuration

Routes are defined in the [direct-upload.ts](file:///Users/yiying/dev-app/wedding-client/server/src/routes/direct-upload.ts) file:

```typescript
const router = Router();

// Get presigned upload URL
router.post(
  '/presigned-url',
  uploadRateLimit,
  authMiddleware,
  DirectUploadController.getPresignedUrl
);

// Confirm upload completion
router.post(
  '/confirm',
  uploadRateLimit,
  authMiddleware,
  DirectUploadController.confirmUpload
);

// Cancel upload
router.post(
  '/cancel',
  authMiddleware,
  DirectUploadController.cancelUpload
);

// Query upload progress
router.get(
  '/progress/:uploadSessionId',
  authMiddleware,
  DirectUploadController.getUploadProgress
);

export default router;
```

## Frontend Implementation

### Direct Upload Utility Class

The frontend core implementation is located in the [DirectUploader](file:///Users/yiying/dev-app/wedding-client/web/src/utils/direct-upload.ts#L46-L302) class:

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
   * Start upload
   */
  async upload(): Promise<DirectUploadResult> {
    try {
      this.updateStatus(DirectUploadStatus.PENDING);

      // 1. Preprocess file (compression, etc.)
      await this.preprocessFile();

      // 2. Get presigned URL
      const presignedData = await this.getPresignedUrl();
      this.uploadSessionId = presignedData.uploadSessionId;
      this.uploadUrl = presignedData.presignedUrl;

      // 3. Upload directly to OSS (with retry mechanism)
      this.updateStatus(DirectUploadStatus.UPLOADING);
      await this.uploadToOssWithRetry();

      // 4. Confirm upload completion
      const result = await this.confirmUpload();

      this.updateStatus(DirectUploadStatus.COMPLETED);
      this.config.onSuccess?.(result);

      return result;
    } catch (error) {
      this.updateStatus(DirectUploadStatus.FAILED);
      const uploadError = error instanceof Error ? error : new Error('Upload failed');
      this.config.onError?.(uploadError);
      throw uploadError;
    }
  }
}
```

### Service Layer Encapsulation

The [DirectUploadService](file:///Users/yiying/dev-app/wedding-client/web/src/services/direct-upload.ts#L5-L186) class encapsulates the upload logic:

```typescript
export class DirectUploadService {
  private progressCallback?: (progress: DirectUploadProgress) => void;
  private activeUploads = new Map<string, DirectUploader>();

  /**
   * Upload a single file
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
   * Upload multiple files
   */
  async uploadFiles(files: File[], fileType: FileType, category?: FileCategory): Promise<DirectUploadResult[]> {
    const results: DirectUploadResult[] = [];
    const maxConcurrent = 3; // Maximum concurrency
    const delay = 500; // Request interval (milliseconds)

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

      // Add delay if not the last batch
      if (i + maxConcurrent < files.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return results;
  }
}
```

### React Hook Encapsulation

To make it easier to use the direct upload functionality in React components, we provide the [useDirectUpload](file:///Users/yiying/dev-app/wedding-client/web/src/hooks/useDirectUpload.ts#L30-L403) Hook:

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
   * Upload a single file
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

      // Set progress callback
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
        message.success('File uploaded successfully');
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
        message.error(`Upload failed: ${err.message}`);
      }

      return null;
    }
  }, [handleProgress]);

  return {
    // State
    uploadState,
    isUploading: uploadState.isUploading,
    progress: uploadState.progress,
    result: uploadState.result,
    error: uploadState.error,
    status: uploadState.status,
    
    // Methods
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

## Usage Example

### Using in React Components

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
        {uploadState.isUploading ? 'Uploading...' : 'Upload File'}
      </button>
      
      {progress && (
        <div>
          <p>Upload Progress: {progress.percentage}%</p>
          <p>Speed: {Math.round(progress.speed / 1024)} KB/s</p>
          <p>Remaining Time: {Math.round(progress.remainingTime)} seconds</p>
        </div>
      )}
      
      {uploadState.result && (
        <div>
          <p>Upload Successful!</p>
          <p>File URL: {uploadState.result.url}</p>
        </div>
      )}
      
      {uploadState.error && (
        <div>
          <p>Upload Failed: {uploadState.error.message}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploadComponent;
```

## Conclusion

The implementation of the direct upload functionality involves close cooperation between frontend and backend:

1. **Backend** is responsible for generating presigned URLs, managing upload sessions, and creating file records
2. **Frontend** is responsible for file preprocessing, direct upload to object storage, and state management
3. **Security** is ensured through user authentication and session validation
4. **Reliability** is enhanced through retry mechanisms and error handling

This implementation not only improves upload efficiency but also reduces the load on the application server, making it a recommended solution for handling large file uploads.
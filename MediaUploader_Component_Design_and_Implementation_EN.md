# MediaUploader Component: Design and Implementation

The MediaUploader component is a sophisticated React component designed for handling media file uploads in web applications. This article will explore its architecture, key features, and implementation details.

## Overview

The MediaUploader component is a feature-rich media upload solution that supports both image and video uploads with advanced capabilities such as chunked uploading, progress tracking, and video cover selection. It's designed to handle large files efficiently while providing a smooth user experience.

## Architecture

The component follows a modular architecture with several key parts:

1. **MediaUploader.tsx** - The main React component that provides the UI and orchestrates the upload process
2. **UploadManager.ts** - The core logic for handling file uploads, including chunked uploads and progress tracking
3. **VideoCoverModal.tsx** - A specialized component for selecting video covers
4. **FileValidator.ts** - Utility for validating uploaded files
5. **types.ts** - TypeScript type definitions for the entire module

## Key Features

### 1. Smart Upload Strategy

The component intelligently selects the best upload approach based on file size:

- **Small files** (< 10MB): Direct upload for faster processing
- **Large files** (≥ 10MB): Chunked upload for better reliability and resumability

### 2. Chunked Upload Implementation

For large files, the UploadManager implements a sophisticated chunked upload system:

```typescript
private async uploadFileWithChunks(
  file: File,
  fileId: string,
  onProgress: (progress: number) => void
): Promise<DirectUploadResult> {
  // Calculate optimal chunk size based on file size and network conditions
  const { chunkSize, concurrent } = this.calculateChunkStrategy(file.size);
  
  // Create file chunks
  const chunks = this.createFileChunks(file, chunkSize);
  
  // Initialize chunked upload with server
  const initResponse = await http.post('/files/chunk/init', {
    filename: file.name,
    fileSize: file.size,
    mimeType: file.type,
    category: this.config.category,
    totalChunks: chunks.length
  });

  // Upload chunks concurrently with semaphore control
  const semaphore = new Semaphore(concurrent);
  const uploadPromises = chunks.map((chunk, index) =>
    semaphore.acquire(async () => {
      await this.uploadChunk(chunk, index, uploadId, file.name);
      // Update progress
    })
  );

  // Complete upload
  await Promise.all(uploadPromises);
  const completeResponse = await http.post('/files/chunk/complete', { uploadId });
}
```

### 3. Progress Tracking

The component provides detailed progress information including:
- Overall upload progress percentage
- Number of completed, failed, and uploading files
- Upload speed (bytes/second)
- Estimated remaining time

The progress tracking is optimized with throttling to prevent UI performance issues:

```typescript
// Progress throttling to avoid excessive updates
private updateFileProgress(fileId: string, loaded: number, total: number): void {
  // ... calculate progress metrics ...
  
  // Throttle updates
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

### 4. Video Cover Selection

For video files, the component provides a specialized modal for selecting covers:

1. **Frame Extraction**: Automatically extracts key frames from the video
2. **Manual Capture**: Allows users to capture a frame at a specific time
3. **Upload Option**: Users can upload a custom image as the cover

The VideoCoverModal uses a VideoFrameExtractor utility to efficiently extract frames without overloading the browser:

```typescript
// Optimized frame extraction with quality and size controls
const frames = await extractorRef.current.extractFrames(videoFile, {
  frameCount: 8,
  quality: 0.6, // Moderate quality for thumbnails
  format: 'image/jpeg',
  maxWidth: 200,
  maxHeight: 112, // 16:9 aspect ratio
  startTime: 0.5, // Skip potential black frames at start
});
```

### 5. Network Adaptation

The UploadManager adapts to network conditions by dynamically adjusting:
- Chunk size based on network speed
- Concurrent upload count based on stability
- Retry strategies for failed uploads

```typescript
private calculateChunkStrategy(fileSize: number): { chunkSize: number; concurrent: number } {
  const { speed, stability } = this.networkMetrics;
  
  let chunkSize = CHUNK_CONFIG.DEFAULT_CHUNK_SIZE;
  let concurrent = 3;

  // Adjust based on file size
  if (fileSize > 100 * 1024 * 1024) { // > 100MB
    chunkSize = Math.min(20 * 1024 * 1024, CHUNK_CONFIG.MAX_CHUNK_SIZE);
    concurrent = 4;
  }

  // Adjust based on network conditions
  if (speed > 50 * 1024 * 1024) { // > 50MB/s
    concurrent = Math.min(concurrent + 2, CHUNK_CONFIG.MAX_CONCURRENT);
  } else if (speed < 5 * 1024 * 1024) { // < 5MB/s
    concurrent = Math.max(concurrent - 1, 1);
    chunkSize = Math.max(chunkSize / 2, CHUNK_CONFIG.MIN_CHUNK_SIZE);
  }

  return { chunkSize, concurrent };
}
```

## Implementation Details

### 1. React Component Design

The MediaUploader component is built with React hooks for state management:

```typescript
const MediaUploader: React.FC<MediaUploaderProps> = ({
  disabled = false,
  config = {},
  className = '',
  style = {},
  showProgress = true,
  // ... callback props
}) => {
  // State management
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgressInfo>({ /* ... */ });
  const [coverModalVisible, setCoverModalVisible] = useState(false);
  
  // Refs for managing instances
  const uploadManagerRef = useRef<UploadManager | null>(null);
  
  // Effects for initialization and cleanup
  useEffect(() => {
    initUploadManager();
    return () => {
      uploadManagerRef.current?.cleanup();
    };
  }, [initUploadManager]);
}
```

### 2. File Validation

The component implements comprehensive file validation:

```typescript
private validateFile(file: File): { valid: boolean; error?: string } {
  // Size checks
  if (file.size > this.config.maxSize!) {
    return { valid: false, error: `File size exceeds limit` };
  }

  // Type checks
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  
  if (!isImage && !isVideo) {
    return { valid: false, error: 'Unsupported file type' };
  }

  // Specific type size limits
  if (isImage && file.size > this.config.imageMaxSize!) {
    return { valid: false, error: `Image size exceeds limit` };
  }

  return { valid: true };
}
```

### 3. Error Handling and Retries

The component implements robust error handling with automatic retries:

```typescript
private async uploadChunk(
  chunk: Blob,
  chunkIndex: number,
  uploadId: string,
  fileName: string,
  retryCount = 0
): Promise<void> {
  try {
    // Upload logic
    const response = await http.upload('/files/chunk/upload', formData);
    
    if (!response.success) {
      throw new Error(`Chunk upload failed`);
    }
  } catch (error) {
    // Retry logic with exponential backoff
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

## Performance Optimizations

### 1. Memory Management

The component carefully manages memory by:
- Revoking object URLs when no longer needed
- Cleaning up resources in useEffect cleanup functions
- Using efficient data structures for tracking progress

### 2. UI Performance

- Progress updates are throttled to prevent excessive re-renders
- Virtualized lists for large file sets
- CSS animations for smooth UI transitions

### 3. Network Efficiency

- Adaptive chunk sizes based on network conditions
- Concurrent upload limits to prevent network saturation
- Smart retry mechanisms with exponential backoff

## Usage Examples

### Basic Usage

```tsx
import { MediaUploader } from '@/components/common/MediaUploader';

function MyComponent() {
  const handleUploadSuccess = (results) => {
    console.log('Upload successful:', results);
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

### Advanced Configuration

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
  onUploadStart={(files) => console.log('Upload started:', files)}
  onUploadProgress={(progress) => console.log('Progress:', progress)}
  onUploadSuccess={(results) => console.log('Success:', results)}
  onUploadError={(error) => console.error('Error:', error)}
/>
```

## Conclusion

The MediaUploader component demonstrates several best practices in modern React development:

1. **Modular Design**: Clear separation of concerns between UI and business logic
2. **Performance Optimization**: Efficient handling of large files and progress updates
3. **User Experience**: Comprehensive feedback and error handling
4. **Flexibility**: Rich configuration options and extensible architecture
5. **Robustness**: Comprehensive error handling and retry mechanisms

This component serves as an excellent example of how to build sophisticated file upload functionality in React applications while maintaining performance and usability.
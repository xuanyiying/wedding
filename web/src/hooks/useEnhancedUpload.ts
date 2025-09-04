import { useState, useCallback, useRef, useEffect } from 'react';
import { EnhancedUploader } from '../utils/enhanced-uploader';
import { BatchUploader } from '../utils/batch-uploader';
import type {
  EnhancedUploadConfig,
  EnhancedUploadProgress,
  EnhancedUploadResult,
  EnhancedUploadStatusType,
  BatchUploadProgress,
  BatchUploadResult
} from '../types/enhanced-upload.types';

interface UseEnhancedUploadOptions {
  fileType: 'video' | 'image' | 'audio' | 'document' | 'other';
  category?: string;
  enableDirectUpload?: boolean;
  enableResume?: boolean;
  enableCompression?: boolean;
  compressionQuality?: number;
  retryCount?: number;
  timeout?: number;
  onSuccess?: (results: EnhancedUploadResult[]) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: BatchUploadResult) => void;
}

interface UploadItem {
  id: string;
  file: File;
  uploader: EnhancedUploader;
  progress: EnhancedUploadProgress;
  result?: EnhancedUploadResult;
  error?: Error;
  status: EnhancedUploadStatusType;
  retryAttempt: number;
}

interface UseEnhancedUploadResult {
  uploadItems: UploadItem[];
  isUploading: boolean;
  uploadProgress: BatchUploadProgress;
  uploadFile: (file: File) => Promise<EnhancedUploadResult>;
  uploadFiles: (files: File[]) => Promise<BatchUploadResult>;
  cancelUpload: (itemId: string) => Promise<void>;
  cancelAllUploads: () => Promise<void>;
  pauseUpload: (itemId: string) => Promise<void>;
  pauseAllUploads: () => Promise<void>;
  resumeUpload: (itemId: string) => Promise<EnhancedUploadResult>;
  resumeAllUploads: () => Promise<BatchUploadResult>;
  retryUpload: (itemId: string) => Promise<EnhancedUploadResult>;
  clearCompleted: () => void;
  clearFailed: () => void;
  clearAll: () => void;
}

/**
 * 增强上传Hook
 * 提供文件上传、暂停、恢复、取消等功能
 */
export function useEnhancedUpload(options: UseEnhancedUploadOptions): UseEnhancedUploadResult {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<BatchUploadProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    uploading: 0,
    pending: 0,
    percentage: 0
  });

  const batchUploaderRef = useRef<BatchUploader | null>(null);

  // 清理函数
  useEffect(() => {
    return () => {
      // 组件卸载时取消所有上传
      batchUploaderRef.current?.cancelAll().catch(console.error);
    };
  }, []);

  // 创建上传项
  const createUploadItem = useCallback((file: File): UploadItem => {
    const id = `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const config: EnhancedUploadConfig = {
      fileType: options.fileType,
      category: options.category,
      enableDirectUpload: options.enableDirectUpload,
      enableResume: options.enableResume,
      enableCompression: options.enableCompression,
      compressionQuality: options.compressionQuality,
      retryCount: options.retryCount,
      timeout: options.timeout,
      onProgress: (progress) => {
        setUploadItems(prev => prev.map(item =>
          item.id === id ? { ...item, progress } : item
        ));
      },
      onStatusChange: (status) => {
        setUploadItems(prev => prev.map(item =>
          item.id === id ? { ...item, status } : item
        ));
        updateBatchProgress();
      },
      onRetry: (attempt, error) => {
        setUploadItems(prev => prev.map(item =>
          item.id === id ? { ...item, retryAttempt: attempt, error } : item
        ));
      },
      onSuccess: (result) => {
        setUploadItems(prev => prev.map(item =>
          item.id === id ? { ...item, result, error: undefined } : item
        ));
        updateBatchProgress();
      },
      onError: (error) => {
        setUploadItems(prev => prev.map(item =>
          item.id === id ? { ...item, error } : item
        ));
        updateBatchProgress();
      }
    };

    const uploader = new EnhancedUploader(file, config);

    return {
      id,
      file,
      uploader,
      progress: {
        loaded: 0,
        total: file.size,
        percentage: 0,
        speed: 0,
        remainingTime: 0,
        status: 'pending'
      },
      status: 'pending',
      retryAttempt: 0
    };
  }, [options]);

  // 更新批量上传进度
  const updateBatchProgress = useCallback(() => {
    const total = uploadItems.length;
    const completed = uploadItems.filter(item => item.status === 'completed').length;
    const failed = uploadItems.filter(item => item.status === 'failed').length;
    const uploading = uploadItems.filter(item =>
      item.status === 'uploading' || item.status === 'preparing'
    ).length;
    const pending = total - completed - failed - uploading;

    const progress: BatchUploadProgress = {
      total,
      completed,
      failed,
      uploading,
      pending,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };

    setUploadProgress(progress);

    // 如果没有正在上传的文件，设置isUploading为false
    if (uploading === 0) {
      setIsUploading(false);
    }
  }, [uploadItems]);

  // 上传单个文件
  const uploadFile = useCallback(async (file: File): Promise<EnhancedUploadResult> => {
    const item = createUploadItem(file);

    setUploadItems(prev => [...prev, item]);
    setIsUploading(true);

    try {
      const result = await item.uploader.upload();
      return result;
    } catch (error) {
      throw error;
    }
  }, [createUploadItem]);

  // 上传多个文件
  const uploadFiles = useCallback(async (files: File[]): Promise<BatchUploadResult> => {
    if (files.length === 0) {
      return {
        successful: [],
        failed: [],
        total: 0,
        successCount: 0,
        failureCount: 0
      };
    }

    const newItems = files.map(createUploadItem);
    setUploadItems(prev => [...prev, ...newItems]);
    setIsUploading(true);

    const batchUploader = new BatchUploader(
      files,
      {
        fileType: options.fileType,
        category: options.category,
        enableDirectUpload: options.enableDirectUpload,
        enableResume: options.enableResume,
        enableCompression: options.enableCompression,
        compressionQuality: options.compressionQuality,
        retryCount: options.retryCount,
        timeout: options.timeout
      },
      {
        onBatchProgress: (progress) => {
          setUploadProgress(progress);
        },
        onBatchComplete: (result) => {
          setIsUploading(false);
          options.onComplete?.(result);

          if (result.successCount > 0) {
            options.onSuccess?.(result.successful);
          }

          if (result.failureCount > 0 && result.failed.length > 0) {
            options.onError?.(result.failed[0]);
          }
        }
      }
    );

    batchUploaderRef.current = batchUploader;

    try {
      const result = await batchUploader.upload();
      return result;
    } finally {
      batchUploaderRef.current = null;
    }
  }, [createUploadItem, options]);

  // 取消上传
  const cancelUpload = useCallback(async (itemId: string): Promise<void> => {
    const item = uploadItems.find(item => item.id === itemId);
    if (!item) return;

    await item.uploader.cancel();

    setUploadItems(prev => prev.filter(item => item.id !== itemId));
    updateBatchProgress();
  }, [uploadItems, updateBatchProgress]);

  // 取消所有上传
  const cancelAllUploads = useCallback(async (): Promise<void> => {
    if (batchUploaderRef.current) {
      await batchUploaderRef.current.cancelAll();
    } else {
      const cancelPromises = uploadItems.map(item => item.uploader.cancel());
      await Promise.allSettled(cancelPromises);
    }

    setUploadItems([]);
    setIsUploading(false);
    updateBatchProgress();
  }, [uploadItems, updateBatchProgress]);

  // 暂停上传
  const pauseUpload = useCallback(async (itemId: string): Promise<void> => {
    const item = uploadItems.find(item => item.id === itemId);
    if (!item) return;

    await item.uploader.pause();
    updateBatchProgress();
  }, [uploadItems, updateBatchProgress]);

  // 暂停所有上传
  const pauseAllUploads = useCallback(async (): Promise<void> => {
    if (batchUploaderRef.current) {
      await batchUploaderRef.current.pauseAll();
    } else {
      const pausePromises = uploadItems
        .filter(item => item.status === 'uploading')
        .map(item => item.uploader.pause());
      await Promise.allSettled(pausePromises);
    }

    updateBatchProgress();
  }, [uploadItems, updateBatchProgress]);

  // 恢复上传
  const resumeUpload = useCallback(async (itemId: string): Promise<EnhancedUploadResult> => {
    const item = uploadItems.find(item => item.id === itemId);
    if (!item) {
      throw new Error('上传项不存在');
    }

    setIsUploading(true);

    try {
      const result = await item.uploader.resume();
      return result;
    } catch (error) {
      throw error;
    }
  }, [uploadItems]);

  // 恢复所有上传
  const resumeAllUploads = useCallback(async (): Promise<BatchUploadResult> => {
    setIsUploading(true);

    if (batchUploaderRef.current) {
      return await batchUploaderRef.current.resumeAll();
    } else {
      const pausedItems = uploadItems.filter(item => item.status === 'paused');

      if (pausedItems.length === 0) {
        return {
          successful: [],
          failed: [],
          total: 0,
          successCount: 0,
          failureCount: 0
        };
      }

      const resumePromises = pausedItems.map(async (item) => {
        try {
          const result = await item.uploader.resume();
          return { success: true, result, error: null };
        } catch (error) {
          return { success: false, result: null, error };
        }
      });

      const results = await Promise.all(resumePromises);

      const successful = results
        .filter(r => r.success && r.result)
        .map(r => r.result as EnhancedUploadResult);

      const failed = results
        .filter(r => !r.success && r.error)
        .map(r => r.error as Error);

      return {
        successful,
        failed,
        total: pausedItems.length,
        successCount: successful.length,
        failureCount: failed.length
      };
    }
  }, [uploadItems]);

  // 重试上传
  const retryUpload = useCallback(async (itemId: string): Promise<EnhancedUploadResult> => {
    const item = uploadItems.find(item => item.id === itemId);
    if (!item) {
      throw new Error('上传项不存在');
    }

    setIsUploading(true);

    // 重置状态
    setUploadItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, status: 'pending', error: undefined } : i
    ));

    try {
      const result = await item.uploader.upload();
      return result;
    } catch (error) {
      throw error;
    }
  }, [uploadItems]);

  // 清除已完成的上传
  const clearCompleted = useCallback(() => {
    setUploadItems(prev => prev.filter(item => item.status !== 'completed'));
    updateBatchProgress();
  }, [updateBatchProgress]);

  // 清除失败的上传
  const clearFailed = useCallback(() => {
    setUploadItems(prev => prev.filter(item => item.status !== 'failed'));
    updateBatchProgress();
  }, [updateBatchProgress]);

  // 清除所有上传
  const clearAll = useCallback(() => {
    // 只清除非上传中的项目
    setUploadItems(prev => prev.filter(item =>
      item.status === 'uploading' || item.status === 'preparing'
    ));
    updateBatchProgress();
  }, [updateBatchProgress]);

  return {
    uploadItems,
    isUploading,
    uploadProgress,
    uploadFile,
    uploadFiles,
    cancelUpload,
    cancelAllUploads,
    pauseUpload,
    pauseAllUploads,
    resumeUpload,
    resumeAllUploads,
    retryUpload,
    clearCompleted,
    clearFailed,
    clearAll
  };
}
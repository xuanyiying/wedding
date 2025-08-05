import { useState, useCallback, useRef } from 'react';
import { message } from 'antd';
import { type DirectUploadResult, type DirectUploadProgress } from '../utils/direct-upload';
import { directUploadService } from '../services/direct-upload';
import { FileType } from '../types';

// 定义上传状态枚举
export const UploadStatus = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error',
  CANCELLED: 'cancelled'
} as const;

export type UploadStatus = typeof UploadStatus[keyof typeof UploadStatus];


/**
 * 上传状态接口
 */
export interface UploadState {
  status: UploadStatus;
  progress: DirectUploadProgress | null;
  result: DirectUploadResult | null;
  error: Error | null;
  isUploading: boolean;
}

/**
 * 直传上传Hook
 * 提供文件上传的状态管理和进度跟踪
 */
export function useDirectUpload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: UploadStatus.IDLE,
    progress: null,
    result: null,
    error: null,
    isUploading: false
  });

  const uploadIdRef = useRef<string | null>(null);

  /**
   * 重置上传状态
   */
  const resetUpload = useCallback(() => {
    setUploadState({
      status: UploadStatus.IDLE,
      progress: null,
      result: null,
      error: null,
      isUploading: false
    });
    uploadIdRef.current = null;
  }, []);

  /**
   * 进度回调
   */
  const handleProgress = useCallback((progress: DirectUploadProgress) => {
    setUploadState(prev => ({
      ...prev,
      progress,
      status: UploadStatus.UPLOADING
    }));
  }, []);

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

  /**
   * 批量上传文件
   */
  const uploadFiles = useCallback(async (
    files: File[],
    fileType: FileType,
    showMessage: boolean = true,
    _concurrency: number = 3
  ): Promise<DirectUploadResult[]> => {
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
      const results = await directUploadService.uploadFiles(files, fileType);

      setUploadState({
        status: UploadStatus.SUCCESS,
        progress: null,
        result: null, // 批量上传不设置单个result
        error: null,
        isUploading: false
      });

      if (showMessage) {
        message.success(`成功上传 ${results.length} 个文件`);
      }

      return results;
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
        message.error(`批量上传失败: ${err.message}`);
      }

      return [];
    }
  }, [handleProgress]);

  /**
   * 上传头像
   */
  const uploadAvatar = useCallback(async (
    file: File,
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
      const result = await directUploadService.uploadAvatar(file);

      setUploadState({
        status: UploadStatus.SUCCESS,
        progress: null,
        result,
        error: null,
        isUploading: false
      });

      if (showMessage) {
        message.success('头像上传成功');
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
        message.error(`头像上传失败: ${err.message}`);
      }

      return null;
    }
  }, [handleProgress]);

  /**
   * 上传作品图片
   */
  const uploadWorkImages = useCallback(async (
    files: File[],
    showMessage: boolean = true
  ): Promise<DirectUploadResult[]> => {
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
      const results = await directUploadService.uploadWorkImages(files);

      setUploadState({
        status: UploadStatus.SUCCESS,
        progress: null,
        result: null,
        error: null,
        isUploading: false
      });

      if (showMessage) {
        message.success(`成功上传 ${results.length} 张作品图片`);
      }

      return results;
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
        message.error(`作品图片上传失败: ${err.message}`);
      }

      return [];
    }
  }, [handleProgress]);

  /**
   * 上传视频
   */
  const uploadVideo = useCallback(async (
    file: File,
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
      const result = await directUploadService.uploadVideo(file);

      setUploadState({
        status: UploadStatus.SUCCESS,
        progress: null,
        result,
        error: null,
        isUploading: false
      });

      if (showMessage) {
        message.success('视频上传成功');
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
        message.error(`视频上传失败: ${err.message}`);
      }

      return null;
    }
  }, [handleProgress]);

  /**
   * 上传媒体文件（自动识别图片或视频）
   */
  const uploadMedia = useCallback(async (
    file: File,
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
      const results = await directUploadService.uploadMedia([file]);
      const result = results.length > 0 ? results[0] : null;

      setUploadState({
        status: UploadStatus.SUCCESS,
        progress: null,
        result,
        error: null,
        isUploading: false
      });

      if (showMessage) {
        const fileType = file.type.startsWith('video/') ? '视频' : '图片';
        message.success(`${fileType}上传成功`);
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
        message.error(`媒体文件上传失败: ${err.message}`);
      }

      return null;
    }
  }, [handleProgress]);

  /**
   * 取消上传
   */
  const cancelUpload = useCallback(async () => {
    try {
      setUploadState(prev => ({
        ...prev,
        status: UploadStatus.CANCELLED,
        isUploading: false
      }));
      message.info('上传已取消');
    } catch (error) {
      console.error('取消上传失败:', error);
    }
  }, []);

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

/**
 * 批量上传Hook
 * 专门用于处理多文件上传场景
 */
export function useBatchUpload() {
  const [uploadStates, setUploadStates] = useState<Map<string, UploadState>>(new Map());
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  /**
   * 批量上传文件
   */
  const batchUpload = useCallback(async (
    files: File[],
    fileType: FileType,
    concurrency: number = 3
  ): Promise<DirectUploadResult[]> => {
    setIsUploading(true);
    const results: DirectUploadResult[] = [];
    const totalFiles = files.length;
    let completedFiles = 0;

    try {
      // 初始化每个文件的状态
      const newStates = new Map<string, UploadState>();
      files.forEach((_, index) => {
        newStates.set(`file-${index}`, {
          status: UploadStatus.IDLE,
          progress: null,
          result: null,
          error: null,
          isUploading: false
        });
      });
      setUploadStates(newStates);

      // 分批上传
      const chunks = [];
      for (let i = 0; i < files.length; i += concurrency) {
        chunks.push(files.slice(i, i + concurrency));
      }

      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (file) => {
          const fileIndex = files.indexOf(file);
          const fileKey = `file-${fileIndex}`;

          try {
            // 更新文件状态为上传中
            setUploadStates(prev => {
              const newMap = new Map(prev);
              newMap.set(fileKey, {
                ...newMap.get(fileKey)!,
                status: UploadStatus.UPLOADING,
                isUploading: true
              });
              return newMap;
            });

            // 设置进度回调
            directUploadService.setProgressCallback((progress) => {
              setUploadStates(prev => {
                const newMap = new Map(prev);
                newMap.set(fileKey, {
                  ...newMap.get(fileKey)!,
                  progress
                });
                return newMap;
              });
            });
            
            // 上传文件
            const result = await directUploadService.uploadFile(file, fileType);

            // 更新文件状态为成功
            setUploadStates(prev => {
              const newMap = new Map(prev);
              newMap.set(fileKey, {
                status: UploadStatus.SUCCESS,
                progress: null,
                result,
                error: null,
                isUploading: false
              });
              return newMap;
            });

            completedFiles++;
            setOverallProgress((completedFiles / totalFiles) * 100);

            return result;
          } catch (error) {
            // 更新文件状态为失败
            setUploadStates(prev => {
              const newMap = new Map(prev);
              newMap.set(fileKey, {
                status: UploadStatus.ERROR,
                progress: null,
                result: null,
                error: error as Error,
                isUploading: false
              });
              return newMap;
            });

            completedFiles++;
            setOverallProgress((completedFiles / totalFiles) * 100);

            throw error;
          }
        });

        const chunkResults = await Promise.allSettled(chunkPromises);
        chunkResults.forEach(result => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          }
        });
      }

      return results;
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * 重置批量上传状态
   */
  const resetBatchUpload = useCallback(() => {
    setUploadStates(new Map());
    setOverallProgress(0);
    setIsUploading(false);
  }, []);

  return {
    uploadStates,
    overallProgress,
    isUploading,
    batchUpload,
    resetBatchUpload
  };
}
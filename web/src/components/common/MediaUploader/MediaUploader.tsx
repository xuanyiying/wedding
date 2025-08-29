import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Upload, Button, Progress, message, Alert } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

import { DirectUploader } from '../../../utils/direct-upload';
import type { DirectUploadResult, DirectUploadProgress } from '../../../utils/direct-upload';
import VideoCoverModal from './VideoCoverModal';
import type {
  MediaFileItem,
  MediaUploadConfig,
  UploadProgressInfo,
  VideoCoverSelection,
  FileValidationResult
} from './types';
import { UploadStatus } from './types';
import { useAppSelector } from '../../../store/hooks';

import './MediaUploader.scss';
import { fileService } from '../../../services';

const { Dragger } = Upload;

// 默认配置
const DEFAULT_CONFIG: MediaUploadConfig = {
  multiple: true,
  maxCount: 10,
  maxSize: 100 * 1024 * 1024, // 100MB
  imageMaxSize: 10 * 1024 * 1024, // 10MB
  videoMaxSize: 100 * 1024 * 1024, // 100MB
  imageCompress: true,
  imageQuality: 0.8,
  requireCover: true,
  autoExtractCover: false,
  category: 'other' as 'avatar' | 'work' | 'event' | 'profile' | 'cover' | 'favicon' | 'logo' | 'other',
  concurrent: 1 // 降低并发数以避免速率限制
};

// 支持的文件类型
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'];

interface SimpleMediaUploaderProps {
  disabled?: boolean;
  config?: Partial<MediaUploadConfig>;
  className?: string;
  style?: React.CSSProperties;
  showProgress?: boolean;
  onUploadStart?: (files: MediaFileItem[]) => void;
  onUploadProgress?: (progress: UploadProgressInfo) => void;
  onFileProgress?: (fileId: string, progress: DirectUploadProgress) => void;
  onUploadSuccess?: (results: DirectUploadResult[]) => void;
  onUploadError?: (error: Error, fileId?: string) => void;
}

const MediaUploader: React.FC<SimpleMediaUploaderProps> = ({
  disabled = false,
  config = {},
  className = '',
  style = {},
  showProgress = true,
  onUploadStart,
  onUploadProgress,
  onFileProgress,
  onUploadSuccess,
  onUploadError
}) => {
  // 合并配置
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  // 从Redux获取认证状态
  const user = useAppSelector(state => state.auth.user);

  // 状态管理
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgressInfo>({
    total: 0,
    completed: 0,
    failed: 0,
    uploading: 0,
    percentage: 0
  });
  const [coverModalVisible, setCoverModalVisible] = useState(false);
  const [currentVideoFile, setCurrentVideoFile] = useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // 防止重复上传的引用
  const uploadingRef = useRef(false);
  const lastUploadTimeRef = useRef(0);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 文件验证
  const validateFile = useCallback((file: File): FileValidationResult => {
    const { maxSize, imageMaxSize, videoMaxSize } = finalConfig;

    // 检查文件类型
    const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
    const isVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return {
        valid: false,
        error: `不支持的文件类型: ${file.type}`
      };
    }

    // 检查文件大小
    const maxFileSize = isImage ? (imageMaxSize || maxSize!) : (videoMaxSize || maxSize!);
    if (file.size > maxFileSize) {
      const sizeMB = Math.round(maxFileSize / 1024 / 1024);
      return {
        valid: false,
        error: `文件大小超过限制 (${sizeMB}MB)`
      };
    }

    return { valid: true };
  }, [finalConfig]);

  // 创建媒体文件项
  const createMediaFileItem = useCallback((file: File): MediaFileItem => {
    const isVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);

    return {
      id: Math.random().toString(36).substr(2, 9),
      file,
      type: isVideo ? 'video' : 'image',
      status: UploadStatus.PENDING,
      progress: 0,
      preview: URL.createObjectURL(file)
    };
  }, []);
  // 移除handleVideoFrameExtraction函数，VideoCoverModal内部会处理帧提取
  // 防抖处理文件选择
  const debouncedFileSelect = useCallback((files: File[]) => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 防止重复上传
    if (uploadingRef.current) {
      console.warn('Upload already in progress, ignoring new file selection');
      return;
    }

    // 防抖延迟
    debounceTimerRef.current = setTimeout(() => {
      handleFileSelectInternal(files);
    }, 300);
  }, []);

  // 处理文件选择的内部逻辑
  const handleFileSelectInternal = useCallback(async (files: File[]) => {
    // 防止短时间内重复调用
    const now = Date.now();
    if (now - lastUploadTimeRef.current < 1000) {
      console.warn('File selection too frequent, ignoring');
      return;
    }
    lastUploadTimeRef.current = now;

    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (errors.length > 0) {
      message.error(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      // 检查是否有视频文件需要选择封面
      const videoFiles = validFiles.filter(file => SUPPORTED_VIDEO_TYPES.includes(file.type));

      if (videoFiles.length > 0 && finalConfig.requireCover) {
        // 如果有视频文件且需要封面，先处理第一个视频文件
        setCurrentVideoFile(videoFiles[0]);
        setPendingFiles(validFiles);
        // VideoCoverModal会自动处理视频帧提取
        setCoverModalVisible(true);
        return;
      }

      // 直接开始上传
      await startUpload(validFiles);
    }
  }, [validateFile, finalConfig.requireCover]);



  // 处理视频封面选择
  const handleCoverSelection = useCallback(async (selection: VideoCoverSelection) => {
    setCoverModalVisible(false);

    if (!currentVideoFile || pendingFiles.length === 0) return;

    try {
      // 开始上传所有文件（包括封面信息）
      await startUpload(pendingFiles, {
        videoFile: currentVideoFile,
        coverSelection: selection
      });
    } catch (error: any) {
      console.error('Upload failed after cover selection:', error);
      setGlobalError(error instanceof Error ? error.message : '上传失败');

    } finally {
      setCurrentVideoFile(null);
      setPendingFiles([]);
    }
  }, [currentVideoFile, pendingFiles]);

  // 取消上传
  const cancelUpload = useCallback(() => {
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
    }
    uploadingRef.current = false;
    setUploading(false);
    setProgress({
      total: 0,
      completed: 0,
      failed: 0,
      uploading: 0,
      percentage: 0
    });
    message.info('已取消上传');
  }, []);

  // 指数退避重试函数
  const exponentialBackoff = useCallback((attempt: number, baseDelay: number = 1000): number => {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // 最大30秒
  }, []);

  // 更新进度信息
  const updateProgress = useCallback((completed: number, failed: number, uploading: number, total: number) => {
    const progressInfo: UploadProgressInfo = {
      total,
      completed,
      failed,
      uploading,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };

    setProgress(progressInfo);
    onUploadProgress?.(progressInfo);
  }, [onUploadProgress]);

  // 处理上传封面文件
  const uploadCoverFile = useCallback(async (file: File, videoFileId: string): Promise<void> => {
    try {
      await fileService.uploadVedioCover(file, videoFileId)
    } catch (coverError: any) {
      console.error('Cover upload failed:', coverError);
      setGlobalError(`封面上传失败: ${coverError instanceof Error ? coverError.message : '未知错误'}`);
      throw coverError;
    }
  }, []);

  // 处理视频帧封面
  const processVideoFrameCover = useCallback(async (
    file: File,
    selectedFrame: { dataUrl: string },
    videoFileId: string
  ): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new window.Image();

      img.onload = async () => {
        try {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          canvas.toBlob(async (blob) => {
            if (blob) {
              const coverFile = new File([blob], `${file.name}_cover.jpg`, {
                type: 'image/jpeg'
              });

              try {
                await uploadCoverFile(coverFile, videoFileId);
              } catch (coverError: any) {
                console.error('Frame cover upload failed:', coverError);
                setGlobalError(`视频帧封面上传失败: ${coverError instanceof Error ? coverError.message : '未知错误'}`);
              }
            }
            resolve();
          }, 'image/jpeg', 0.8);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = reject;
      img.src = selectedFrame.dataUrl;
    });
  }, [uploadCoverFile]);

  // 处理视频封面上传
  const handleVideoCoverUpload = useCallback(async (
    videoFileId: string,
    file: File,
    videoCoverInfo: { videoFile: File; coverSelection: VideoCoverSelection },
  ): Promise<void> => {
    if (file !== videoCoverInfo.videoFile) return;

    const { coverSelection } = videoCoverInfo;

    if (coverSelection.coverType === 'upload' && coverSelection.coverFile) {
      await uploadCoverFile(coverSelection.coverFile, videoFileId);
    } else if (coverSelection.coverType === 'frame' && coverSelection.selectedFrame) {
      await processVideoFrameCover(file, coverSelection.selectedFrame, videoFileId);
    }
  }, [uploadCoverFile, processVideoFrameCover]);

  // 处理上传错误和重试逻辑
  const handleUploadError = useCallback(async (
    error: any,
    file: File,
    retryCount: number,
    maxRetries: number
  ): Promise<{ shouldRetry: boolean; delay: number }> => {
    console.error(`Upload attempt ${retryCount + 1} failed:`, error);
    if (retryCount < maxRetries - 1) {
      // 检测429错误并使用指数退避
      const is429Error = error && (
        (error as any).status === 429 ||
        (error as any).statusCode === 429 ||
        (error instanceof Error && error.message.includes('429')) ||
        (error instanceof Error && error.message.includes('Too Many Requests'))
      );

      const delay = is429Error
        ? exponentialBackoff(retryCount + 1)
        : 1000 * (retryCount + 1);

      const warningMessage = is429Error
        ? `${file.name} 请求过于频繁，等待 ${Math.round(delay / 1000)}s 后重试 (${retryCount + 1}/${maxRetries})`
        : `${file.name} 上传失败，正在重试 (${retryCount + 1}/${maxRetries})`;

      message.warning(warningMessage);
      return { shouldRetry: true, delay };
    }

    // 达到最大重试次数，抛出错误
    const errorMessage = error instanceof Error ? error.message : '上传失败';
    message.error(`${file.name} 上传失败: ${errorMessage}`);
    throw error;
  }, [exponentialBackoff]);

  // 单个文件上传逻辑
  const uploadSingleFile = useCallback(async (
    file: File,
    fileItem: MediaFileItem,
    videoCoverInfo?: { videoFile: File; coverSelection: VideoCoverSelection }
  ): Promise<DirectUploadResult> => {
    const maxRetries = 5;
    let retryCount = 0;

    const attemptUpload = async (): Promise<DirectUploadResult> => {
      try {
        // 在上传前验证认证状态
        if (!user) {
          console.warn('⚠️ 认证状态可能无效，但继续尝试上传');
        }

        const onProgress = (progress: DirectUploadProgress) => {
          onFileProgress?.(fileItem.id, progress);
        };

        // 上传主文件
        const fileType = SUPPORTED_VIDEO_TYPES.includes(file.type) ? 'video' : 'image';
        const uploader = new DirectUploader(file, {
          fileType,
          category: finalConfig.category!,
          onProgress
        });
        const result = await uploader.upload();

        // 如果是视频文件且有封面信息，上传封面
        if (videoCoverInfo) {
          await handleVideoCoverUpload(result.fileId, file, videoCoverInfo);
        }

        message.success(`${file.name} 上传成功`);
        return result;

      } catch (error: any) {
        const { shouldRetry, delay } = await handleUploadError(error, file, retryCount, maxRetries);

        if (shouldRetry) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptUpload();
        }

        throw error;
      }
    };

    return attemptUpload();
  }, [finalConfig.category, onFileProgress, handleVideoCoverUpload, handleUploadError]);

  // 批量上传处理
  const processBatchUpload = useCallback(async (
    batch: File[],
    fileItems: MediaFileItem[],
    videoCoverInfo?: { videoFile: File; coverSelection: VideoCoverSelection }
  ): Promise<DirectUploadResult[]> => {
    const batchPromises = batch.map(async (file) => {
      const fileItem = fileItems.find(item => item.file === file)!;
      return uploadSingleFile(file, fileItem, videoCoverInfo);
    });

    const batchResults = await Promise.allSettled(batchPromises);
    const successResults = batchResults
      .filter((r): r is PromiseFulfilledResult<DirectUploadResult> => r.status === 'fulfilled')
      .map(r => r.value);

    return successResults;
  }, [uploadSingleFile]);

  // 初始化上传状态
  const initializeUploadState = useCallback((_files: File[]) => {
    // 防止重复上传
    if (uploadingRef.current) {
      console.warn('Upload already in progress, ignoring new upload request');
      return false;
    }

    // 取消之前的上传
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
    }

    // 创建新的取消控制器
    uploadAbortControllerRef.current = new AbortController();

    uploadingRef.current = true;
    setUploading(true);
    setGlobalError(null);

    return true;
  }, []);

  // 清理上传状态
  const cleanupUploadState = useCallback(() => {
    uploadingRef.current = false;
    uploadAbortControllerRef.current = null;
    setUploading(false);
  }, []);

  // 主上传方法
  const startUpload = useCallback(async (
    files: File[],
    videoCoverInfo?: { videoFile: File; coverSelection: VideoCoverSelection }
  ) => {
    if (files.length === 0) return;

    // 初始化上传状态
    if (!initializeUploadState(files)) return;

    try {
      const fileItems = files.map(createMediaFileItem);
      const concurrentLimit = finalConfig.concurrent || 1;
      const results: DirectUploadResult[] = [];
      let completed = 0;
      let failed = 0;

      onUploadStart?.(fileItems);

      // 分批处理文件上传
      for (let i = 0; i < files.length; i += concurrentLimit) {
        const batch = files.slice(i, i + concurrentLimit);
        updateProgress(completed, failed, batch.length, files.length);

        try {
          const batchResults = await processBatchUpload(batch, fileItems, videoCoverInfo);
          results.push(...batchResults);
          completed += batchResults.length;
          failed += batch.length - batchResults.length;

          // 批次间添加延迟以避免速率限制
          if (i + concurrentLimit < files.length) {
            const delay = Math.max(2000, 500 * batch.length);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          console.error('Batch upload error:', error);
          failed += batch.length;
        }

        updateProgress(completed, failed, 0, files.length);
      }

      if (results.length > 0) {
        onUploadSuccess?.(results);
      }
    } catch (error: any) {
      console.error('Upload process failed:', error);
      onUploadError?.(error instanceof Error ? error : new Error('上传过程失败'));
    } finally {
      cleanupUploadState();
    }
  }, [
    initializeUploadState,
    createMediaFileItem,
    finalConfig.concurrent,
    onUploadStart,
    updateProgress,
    processBatchUpload,
    onUploadSuccess,
    onUploadError,
    cleanupUploadState
  ]);

  // 清除全局错误
  const clearGlobalError = useCallback(() => {
    setGlobalError(null);
  }, []);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      // 清理定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 取消正在进行的上传
      if (uploadAbortControllerRef.current) {
        uploadAbortControllerRef.current.abort();
      }

      // 重置状态
      uploadingRef.current = false;
    };
  }, []);

  // Upload组件属性
  const uploadProps: UploadProps = {
    multiple: finalConfig.multiple,
    accept: finalConfig.accept?.join(',') || [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES].join(','),
    beforeUpload: () => false, // 阻止自动上传
    onChange: (info) => {
      // 只处理新增的文件，避免重复处理
      const newFiles = info.fileList
        .filter(f => f.status === 'done' || f.status === undefined)
        .map(f => f.originFileObj!)
        .filter(Boolean);

      if (newFiles.length > 0 && !uploadingRef.current) {
        debouncedFileSelect(newFiles);
      }
    },
    showUploadList: false,
    disabled: disabled || uploading,
    fileList: [] // 清空文件列表，防止重复显示
  };

  return (
    <div className={`media-uploader ${className}`} style={style}>
      {globalError && (
        <Alert
          message="上传错误"
          description={globalError}
          type="error"
          showIcon
          closable
          onClose={clearGlobalError}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={clearGlobalError}>
              知道了
            </Button>
          }
        />
      )}

      {/* 上传区域 */}
      <Dragger {...uploadProps} className="media-uploader__dragger">
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">
          点击或拖拽文件到此区域上传
        </p>
        <p className="ant-upload-hint">
          支持图片和视频文件，单个文件不超过 {Math.round((finalConfig.maxSize || 0) / 1024 / 1024)}MB
        </p>
      </Dragger>

      {/* 上传进度 */}
      {showProgress && uploading && (
        <div className="media-uploader__progress">
          <div className="progress-header">
            <Progress
              percent={progress.percentage}
              status={progress.failed > 0 ? 'exception' : 'active'}
              format={() => `${progress.completed}/${progress.total}`}
            />
            <Button
              type="text"
              size="small"
              onClick={cancelUpload}
              style={{ marginLeft: 8 }}
            >
              取消上传
            </Button>
          </div>
          <div className="progress-info">
            <span>已完成: {progress.completed}</span>
            <span>失败: {progress.failed}</span>
            <span>上传中: {progress.uploading}</span>
          </div>
        </div>
      )}

      {/* 视频封面选择弹窗 */}
      <VideoCoverModal
        visible={coverModalVisible}
        videoFile={currentVideoFile}
        onCancel={() => {
          setCoverModalVisible(false);
          setCurrentVideoFile(null);
          setPendingFiles([]);
        }}
        onConfirm={handleCoverSelection}
      />
    </div>
  );
};

export default MediaUploader;
import React, { useState, useCallback, useMemo } from 'react';
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

import './MediaUploader.scss';

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
  category: 'other',
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
  // 移除未使用的videoFrames状态，VideoCoverModal内部会自己提取帧
  
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
  // 处理文件选择
  const handleFileSelect = useCallback(async (files: File[]) => {
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
    
    // 开始上传所有文件（包括封面信息）
    await startUpload(pendingFiles, {
      videoFile: currentVideoFile,
      coverSelection: selection
    });
    
    setCurrentVideoFile(null);
    setPendingFiles([]);
  }, [currentVideoFile, pendingFiles]);
  
  // 开始上传
  const startUpload = useCallback(async (
    files: File[], 
    videoCoverInfo?: { videoFile: File; coverSelection: VideoCoverSelection }
  ) => {
    if (files.length === 0) return;
    
    setUploading(true);
    setGlobalError(null);
    
    const fileItems = files.map(createMediaFileItem);
    
    // 更新进度信息
    const updateProgress = (completed: number, failed: number, uploading: number) => {
      const total = files.length;
      const progressInfo: UploadProgressInfo = {
        total,
        completed,
        failed,
        uploading,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
      };
      
      setProgress(progressInfo);
      onUploadProgress?.(progressInfo);
    };
    
    onUploadStart?.(fileItems);
    
    // 使用并发控制的上传逻辑
    const concurrentLimit = finalConfig.concurrent || 1; // 默认单文件上传
    const results: DirectUploadResult[] = [];
    let completed = 0;
    let failed = 0;
    
    // 指数退避重试函数
    const exponentialBackoff = (attempt: number, baseDelay: number = 1000): number => {
      return Math.min(baseDelay * Math.pow(2, attempt), 30000); // 最大30秒
    };
    
    for (let i = 0; i < files.length; i += concurrentLimit) {
      const batch = files.slice(i, i + concurrentLimit);
      
      const batchPromises = batch.map(async (file) => {
        const fileItem = fileItems.find(item => item.file === file)!;
        const maxRetries = 5; // 增加重试次数
        let retryCount = 0;
        
        const attemptUpload = async (): Promise<DirectUploadResult> => {
          try {
            updateProgress(completed, failed, batch.length);
            
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
            if (videoCoverInfo && file === videoCoverInfo.videoFile) {
              const { coverSelection } = videoCoverInfo;
              
              if (coverSelection.coverType === 'upload' && coverSelection.coverFile) {
                try {
                  const coverUploader = new DirectUploader(coverSelection.coverFile, {
                    fileType: 'image',
                    category: finalConfig.category!,
                    onProgress: () => {}
                  });
                  await coverUploader.upload();
                } catch (coverError) {
                  console.error('Cover upload failed:', coverError);
                  setGlobalError(`封面上传失败: ${coverError instanceof Error ? coverError.message : '未知错误'}`);
                }
              } else if (coverSelection.coverType === 'frame' && coverSelection.selectedFrame) {
                // 处理视频帧封面
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;
                const img = new window.Image();
                
                await new Promise<void>((resolve, reject) => {
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
                            const coverUploader = new DirectUploader(coverFile, {
                              fileType: 'image',
                              category: finalConfig.category!,
                              onProgress: () => {}
                            });
                            await coverUploader.upload();
                          } catch (coverError) {
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
                  img.src = coverSelection.selectedFrame?.dataUrl || '';
                });
              }
            }
            
            message.success(`${file.name} 上传成功`);
            completed++;
            return result;
            
          } catch (error) {
            console.error(`Upload attempt ${retryCount + 1} failed:`, error);
            
            if (retryCount < maxRetries - 1) {
              retryCount++;
              
              // 检测429错误并使用指数退避
              const is429Error = error && (
                (error as any).status === 429 ||
                (error as any).statusCode === 429 ||
                (error instanceof Error && error.message.includes('429')) ||
                (error instanceof Error && error.message.includes('Too Many Requests'))
              );
              
              if (is429Error) {
                // 对429错误使用指数退避算法
                const exponentialDelay = exponentialBackoff(retryCount);
                message.warning(`${file.name} 请求过于频繁，等待 ${Math.round(exponentialDelay/1000)}s 后重试 (${retryCount}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, exponentialDelay));
              } else {
                // 对其他错误使用固定延迟
                message.warning(`${file.name} 上传失败，正在重试 (${retryCount}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              }
              
              return attemptUpload();
            } else {
              const errorMessage = error instanceof Error ? error.message : '上传失败';
              onUploadError?.(error instanceof Error ? error : new Error(errorMessage), fileItem.id);
              message.error(`${file.name} 上传失败: ${errorMessage}`);
              failed++;
              throw error;
            }
          }
        };
        
        return attemptUpload();
      });
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        const successResults = batchResults
          .filter((r): r is PromiseFulfilledResult<DirectUploadResult> => r.status === 'fulfilled')
          .map(r => r.value);
        
        results.push(...successResults);
        
        // 批次间添加更长延迟以避免速率限制
        if (i + concurrentLimit < files.length) {
          const delay = Math.max(2000, 500 * batch.length); // 至少2秒，根据批次大小调整
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error('Batch upload error:', error);
      }
      
      updateProgress(completed, failed, 0);
    }
    
    if (results.length > 0) {
      onUploadSuccess?.(results);
    }
    
    setUploading(false);
  }, [createMediaFileItem, finalConfig.category, finalConfig.concurrent, onUploadStart, onUploadProgress, onFileProgress, onUploadSuccess, onUploadError]);
  
  // 清除全局错误
  const clearGlobalError = useCallback(() => {
    setGlobalError(null);
  }, []);
  
  // Upload组件属性
  const uploadProps: UploadProps = {
    multiple: finalConfig.multiple,
    accept: finalConfig.accept?.join(',') || [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES].join(','),
    beforeUpload: () => false, // 阻止自动上传
    onChange: (info) => {
      const files = info.fileList.map(f => f.originFileObj!).filter(Boolean);
      if (files.length > 0) {
        handleFileSelect(files);
      }
    },
    showUploadList: false,
    disabled: disabled || uploading
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
          <Progress 
            percent={progress.percentage} 
            status={progress.failed > 0 ? 'exception' : 'active'}
            format={() => `${progress.completed}/${progress.total}`}
          />
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
       
      {/* 移除重复的VideoCoverModal实例 */}
    </div>
  );
};

export default MediaUploader;
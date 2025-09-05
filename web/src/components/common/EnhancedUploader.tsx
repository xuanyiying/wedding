import React, { useState, useCallback, useRef } from 'react';
import { DirectUploader } from '../../utils/direct-upload';
import type { DirectUploadConfig, DirectUploadProgress, DirectUploadResult } from '../../utils/direct-upload';
import { formatFileSize, formatUploadSpeed, formatRemainingTime } from '../../utils/direct-upload';

interface EnhancedUploaderProps {
  fileType: 'video' | 'image';
  category?: 'avatar' | 'work' | 'event' | 'profile' | 'cover' | 'favicon'|'logo' | 'other';
  maxFileSize?: number;
  multiple?: boolean;
  accept?: string;
  enableCompression?: boolean;
  compressionQuality?: number;
  retryCount?: number;
  onUploadSuccess?: (results: DirectUploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
  children?: React.ReactNode;
}

interface UploadItem {
  id: string;
  file: File;
  uploader: DirectUploader;
  progress: DirectUploadProgress;
  result?: DirectUploadResult;
  error?: Error;
  retryAttempt: number;
}

export const EnhancedUploader: React.FC<EnhancedUploaderProps> = ({
  fileType,
  category = 'other',
  maxFileSize,
  multiple = false,
  accept,
  enableCompression = true,
  compressionQuality = 0.8,
  retryCount = 3,
  onUploadSuccess,
  onUploadError,
  className = '',
  children
}) => {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createUploadItem = useCallback((file: File): UploadItem => {
    const id = `${file.name}-${Date.now()}-${Math.random()}`;
    
    const config: DirectUploadConfig = {
      fileType,
      category,
      maxFileSize,
      enableCompression,
      compressionQuality,
      retryCount,
      onProgress: (progress) => {
        setUploadItems(prev => prev.map(item => 
          item.id === id ? { ...item, progress } : item
        ));
      },
      onRetry: (attempt, error) => {
        setUploadItems(prev => prev.map(item => 
          item.id === id ? { ...item, retryAttempt: attempt, error } : item
        ));
      }
    };

    const uploader = new DirectUploader(file, config);
    
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
      retryAttempt: 0
    };
  }, [fileType, category, maxFileSize, enableCompression, compressionQuality, retryCount]);

  const handleFileSelect = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    const newItems = fileArray.map(createUploadItem);
    
    setUploadItems(prev => [...prev, ...newItems]);

    // 开始上传
    const uploadPromises = newItems.map(async (item) => {
      try {
        const result = await item.uploader.upload();
        setUploadItems(prev => prev.map(prevItem => 
          prevItem.id === item.id ? { ...prevItem, result } : prevItem
        ));
        return result;
      } catch (error) {
        const uploadError = error instanceof Error ? error : new Error('上传失败');
        setUploadItems(prev => prev.map(prevItem => 
          prevItem.id === item.id ? { ...prevItem, error: uploadError } : prevItem
        ));
        throw uploadError;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      onUploadSuccess?.(results);
    } catch (error) {
      onUploadError?.(error instanceof Error ? error : new Error('上传失败'));
    }
  }, [createUploadItem, onUploadSuccess, onUploadError]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // 清空input值，允许重复选择同一文件
    event.target.value = '';
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRetry = useCallback(async (item: UploadItem) => {
    try {
      const result = await item.uploader.upload();
      setUploadItems(prev => prev.map(prevItem => 
        prevItem.id === item.id ? { ...prevItem, result, error: undefined } : prevItem
      ));
    } catch (error) {
      const uploadError = error instanceof Error ? error : new Error('重试失败');
      setUploadItems(prev => prev.map(prevItem => 
        prevItem.id === item.id ? { ...prevItem, error: uploadError } : prevItem
      ));
    }
  }, []);

  const handleCancel = useCallback(async (item: UploadItem) => {
    await item.uploader.cancel();
    setUploadItems(prev => prev.filter(prevItem => prevItem.id !== item.id));
  }, []);

  const clearCompleted = useCallback(() => {
    setUploadItems(prev => prev.filter(item => 
      item.progress.status !== 'completed' && !item.result
    ));
  }, []);

  return (
    <div className={`enhanced-uploader ${className}`}>
      {/* 上传区域 */}
      <div
        className={`upload-zone ${
          isDragging ? 'dragging' : ''
        } cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors hover:border-blue-400`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
        
        {children || (
          <div className="space-y-2">
            <div className="text-4xl text-gray-400">📁</div>
            <div className="text-lg font-medium text-gray-700">
              点击或拖拽文件到此处上传
            </div>
            <div className="text-sm text-gray-500">
              支持 {fileType === 'image' ? '图片' : '视频'} 格式
              {maxFileSize && `, 最大 ${formatFileSize(maxFileSize)}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedUploader;
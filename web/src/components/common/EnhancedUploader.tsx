import React, { useState, useCallback, useRef } from 'react';
import { useEnhancedUpload } from '../../hooks/useEnhancedUpload';
import type { EnhancedUploadResult } from '../../types/enhanced-upload.types';
import { formatFileSize, formatUploadSpeed, formatRemainingTime } from '../../utils/upload-utils';

interface EnhancedUploaderProps {
  fileType: 'video' | 'image' | 'audio' | 'document' | 'other';
  category?: string;
  maxFileSize?: number;
  multiple?: boolean;
  accept?: string;
  enableDirectUpload?: boolean;
  enableResume?: boolean;
  enableCompression?: boolean;
  compressionQuality?: number;
  retryCount?: number;
  timeout?: number;
  onUploadSuccess?: (results: EnhancedUploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
  children?: React.ReactNode;
}

export const EnhancedUploader: React.FC<EnhancedUploaderProps> = ({
  fileType,
  category = 'other',
  maxFileSize,
  multiple = false,
  accept,
  enableDirectUpload = true,
  enableResume = true,
  enableCompression = true,
  compressionQuality = 0.8,
  retryCount = 3,
  timeout,
  onUploadSuccess,
  onUploadError,
  className = '',
  children
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploadItems,
    isUploading,
    uploadProgress,
    uploadFiles,
    cancelUpload,
    pauseUpload,
    resumeUpload,
    retryUpload,
    clearCompleted
  } = useEnhancedUpload({
    fileType,
    category,
    enableDirectUpload,
    enableResume,
    enableCompression,
    compressionQuality,
    retryCount,
    timeout,
    onSuccess: onUploadSuccess,
    onError: onUploadError
  });

  const handleFileSelect = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);

    // 如果设置了最大文件大小，过滤掉超过大小的文件
    const validFiles = maxFileSize
      ? fileArray.filter(file => file.size <= maxFileSize)
      : fileArray;

    // 如果有文件被过滤掉，显示警告
    if (validFiles.length < fileArray.length) {
      console.warn(`${fileArray.length - validFiles.length} 个文件超过了大小限制 (${formatFileSize(maxFileSize || 0)})`);
    }

    if (validFiles.length > 0) {
      try {
        await uploadFiles(validFiles);
      } catch (error) {
        console.error('上传文件失败:', error);
      }
    }
  }, [maxFileSize, uploadFiles]);

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

  const handleRetry = useCallback(async (itemId: string) => {
    try {
      await retryUpload(itemId);
    } catch (error) {
      console.error('重试上传失败:', error);
    }
  }, [retryUpload]);

  const handleCancel = useCallback(async (itemId: string) => {
    try {
      await cancelUpload(itemId);
    } catch (error) {
      console.error('取消上传失败:', error);
    }
  }, [cancelUpload]);

  const handlePause = useCallback(async (itemId: string) => {
    try {
      await pauseUpload(itemId);
    } catch (error) {
      console.error('暂停上传失败:', error);
    }
  }, [pauseUpload]);

  const handleResume = useCallback(async (itemId: string) => {
    try {
      await resumeUpload(itemId);
    } catch (error) {
      console.error('恢复上传失败:', error);
    }
  }, [resumeUpload]);

  return (
    <div className={`enhanced-uploader ${className}`}>
      {/* 上传区域 */}
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''
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
              支持 {fileType === 'image' ? '图片' : fileType === 'video' ? '视频' : fileType === 'audio' ? '音频' : fileType === 'document' ? '文档' : '多种'} 格式
              {maxFileSize && `, 最大 ${formatFileSize(maxFileSize)}`}
            </div>
            {enableDirectUpload && (
              <div className="text-xs text-gray-500">
                已启用直传模式，上传速度更快
              </div>
            )}
            {enableResume && (
              <div className="text-xs text-gray-500">
                已启用断点续传，支持暂停/恢复上传
              </div>
            )}
          </div>
        )}
      </div>

      {/* 上传进度总览 */}
      {isUploading && uploadProgress.total > 0 && (
        <div className="upload-progress mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">总进度: {uploadProgress.percentage}%</span>
            <span className="text-sm text-gray-600">
              {uploadProgress.completed}/{uploadProgress.total} 完成
              {uploadProgress.failed > 0 && `, ${uploadProgress.failed} 失败`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-blue-500"
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* 上传列表 */}
      {uploadItems.length > 0 && (
        <div className="upload-list mt-4 space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">上传列表</h3>
            <button
              onClick={clearCompleted}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              清除已完成
            </button>
          </div>

          {uploadItems.map((item) => (
            <div key={item.id} className="upload-item border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.file.name}</div>
                  <div className="text-sm text-gray-500">
                    {formatFileSize(item.file.size)}
                  </div>
                </div>

                <div className="flex space-x-2">
                  {item.error && (
                    <button
                      onClick={() => handleRetry(item.id)}
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      重试
                    </button>
                  )}

                  {item.status === 'uploading' && (
                    <>
                      <button
                        onClick={() => handlePause(item.id)}
                        className="text-sm bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                      >
                        暂停
                      </button>
                      <button
                        onClick={() => handleCancel(item.id)}
                        className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        取消
                      </button>
                    </>
                  )}

                  {item.status === 'paused' && (
                    <>
                      <button
                        onClick={() => handleResume(item.id)}
                        className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                      >
                        恢复
                      </button>
                      <button
                        onClick={() => handleCancel(item.id)}
                        className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        取消
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 进度条 */}
              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>进度: {item.progress.percentage}%</span>
                  {item.progress.speed > 0 && (
                    <span>{formatUploadSpeed(item.progress.speed)}</span>
                  )}
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${item.error ? 'bg-red-500' :
                        item.status === 'completed' ? 'bg-green-500' :
                          item.status === 'paused' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                    style={{ width: `${item.progress.percentage}%` }}
                  />
                </div>
              </div>

              {/* 状态信息 */}
              <div className="text-sm">
                {item.error && (
                  <div className="text-red-600">
                    ❌ {item.error.message}
                    {item.retryAttempt > 0 && ` (重试 ${item.retryAttempt}/${retryCount})`}
                  </div>
                )}

                {item.status === 'completed' && (
                  <div className="text-green-600">
                    ✅ 上传成功
                  </div>
                )}

                {item.status === 'uploading' && !item.error && (
                  <div className="text-blue-600">
                    ⏳ 上传中...
                    {item.progress.remainingTime > 0 && item.progress.remainingTime !== Infinity && (
                      <span className="ml-2">
                        剩余时间: {formatRemainingTime(item.progress.remainingTime)}
                      </span>
                    )}
                  </div>
                )}

                {item.status === 'pending' && (
                  <div className="text-gray-600">
                    ⏸️ 等待上传...
                  </div>
                )}

                {item.status === 'paused' && (
                  <div className="text-yellow-600">
                    ⏸️ 已暂停
                  </div>
                )}

                {item.status === 'preparing' && (
                  <div className="text-blue-600">
                    🔄 准备中...
                  </div>
                )}

                {item.status === 'processing' && (
                  <div className="text-blue-600">
                    ⚙️ 处理中...
                  </div>
                )}

                {/* 分片上传信息 */}
                {item.progress.chunks && (
                  <div className="text-gray-600 mt-1">
                    分片: {item.progress.chunks.completed}/{item.progress.chunks.total} 完成
                    {item.progress.chunks.failed > 0 && `, ${item.progress.chunks.failed} 失败`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnhancedUploader;
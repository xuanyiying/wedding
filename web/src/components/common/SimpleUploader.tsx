import React, { useState, useCallback, useRef } from 'react';
import { UploadOutlined, LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Button, Progress, App } from 'antd';
import styled from 'styled-components';
import { FileType, FileCategory } from '../../types';
import { fileService } from '../../services';

interface SimpleUploaderProps {
    fileType:  FileType;
    category?: FileCategory;
    maxFileSize?: number;
    accept?: string;
    onUploadSuccess?: (result: any) => void;
    onUploadError?: (error: Error) => void;
    className?: string;
    children?: React.ReactNode;
    showPreview?: boolean;
    previewUrl?: string;
    previewText?: string;
}

const UploadContainer = styled.div`
  width: 100%;
  
  .upload-area {
    border: 2px dashed var(--admin-border-color);
    border-radius: 8px;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: var(--admin-bg-container);
    
    &:hover {
      border-color: var(--admin-primary-color);
      background-color: var(--admin-interaction-hover);
    }
    
    &.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
  
  .upload-icon {
    font-size: 48px;
    color: var(--admin-text-secondary);
    margin-bottom: 16px;
  }
  
  .upload-text {
    color: var(--admin-text-primary);
    font-size: 16px;
    margin-bottom: 8px;
  }
  
  .upload-hint {
    color: var(--admin-text-secondary);
    font-size: 12px;
  }
  
  .preview-container {
    position: relative;
    width: 100%;
    margin-top: 16px;
    
    img {
      width: 100%;
      height: 150px;
      object-fit: cover;
      border-radius: 8px;
    }
    
    .preview-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      opacity: 0;
      transition: opacity 0.3s ease;
      
      &:hover {
        opacity: 1;
      }
    }
  }
  
  .upload-status {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 16px;
    gap: 8px;
    
    .anticon {
      font-size: 16px;
    }
    
    &.success {
      color: var(--admin-success-color);
    }
    
    &.error {
      color: var(--admin-error-color);
    }
  }
`;

export const SimpleUploader: React.FC<SimpleUploaderProps> = ({
    fileType,
    category = 'other',
    maxFileSize,
    accept,
    onUploadSuccess,
    onUploadError,
    className = '',
    children,
    showPreview = false,
    previewUrl,
    previewText = '点击或拖拽上传文件'
}) => {
    const { message } = App.useApp();
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(async (files: FileList) => {
        if (files.length === 0) return;

        const file = files[0];

        // 验证文件大小
        if (maxFileSize && file.size > maxFileSize) {
            const error = new Error(`文件大小超出限制，最大支持 ${maxFileSize / 1024 / 1024}MB`);
            message.error(error.message);
            onUploadError?.(error);
            setUploadStatus('error');
            return;
        }

        setUploading(true);
        setUploadStatus('uploading');
        setUploadProgress(0);

        try {
            // 模拟上传进度
            const interval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(interval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 200);

            // 转换文件类型
            const mappedFileType = fileType === 'image' ? FileType.IMAGE : FileType.VIDEO;

            // 上传文件
            const result = await fileService.uploadFile(file, {
                fileType: mappedFileType,
                category
            });

            clearInterval(interval);
            setUploadProgress(100);
            setUploadStatus('success');
            setUploadedUrl(result.data?.fileUrl || '');

            message.success('上传成功');
            onUploadSuccess?.(result);
        } catch (error) {
            const uploadError = error instanceof Error ? error : new Error('上传失败');
            message.error(uploadError.message);
            onUploadError?.(uploadError);
            setUploadStatus('error');
        } finally {
            setUploading(false);
            setTimeout(() => {
                if (uploadStatus === 'success') {
                    setUploadStatus('idle');
                }
            }, 3000);
        }
    }, [fileType, category, maxFileSize, onUploadSuccess, onUploadError, uploadStatus, message]);

    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files);
        }
        // 清空input值，允许重复选择同一文件
        if (event.target) {
            event.target.value = '';
        }
    }, [handleFileSelect]);

    const handleClick = useCallback(() => {
        if (!uploading) {
            fileInputRef.current?.click();
        }
    }, [uploading]);

    const renderUploadIcon = () => {
        if (uploadStatus === 'uploading') {
            return <LoadingOutlined className="upload-icon" />;
        } else if (uploadStatus === 'success') {
            return <CheckCircleOutlined className="upload-icon" style={{ color: '#52c41a' }} />;
        } else if (uploadStatus === 'error') {
            return <CloseCircleOutlined className="upload-icon" style={{ color: '#ff4d4f' }} />;
        }
        return <UploadOutlined className="upload-icon" />;
    };

    const renderStatusText = () => {
        if (uploadStatus === 'uploading') {
            return '上传中...';
        } else if (uploadStatus === 'success') {
            return '上传成功';
        } else if (uploadStatus === 'error') {
            return '上传失败';
        }
        return previewText;
    };

    const displayPreviewUrl = uploadedUrl || previewUrl;

    return (
        <UploadContainer className={`simple-uploader ${className}`}>
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleInputChange}
                className="hidden"
                disabled={uploading}
            />

            {children ? (
                <div onClick={handleClick}>
                    {children}
                </div>
            ) : (
                <div
                    className={`upload-area ${uploading ? 'disabled' : ''}`}
                    onClick={handleClick}
                >
                    {renderUploadIcon()}
                    <div className="upload-text">{renderStatusText()}</div>
                    {maxFileSize && (
                        <div className="upload-hint">
                            最大支持 {(maxFileSize / 1024 / 1024).toFixed(1)}MB
                        </div>
                    )}

                    {uploadStatus === 'uploading' && (
                        <div style={{ marginTop: 16 }}>
                            <Progress percent={uploadProgress} showInfo={false} />
                        </div>
                    )}
                </div>
            )}

            {showPreview && displayPreviewUrl && (
                <div className="preview-container">
                    <img src={displayPreviewUrl} alt="Preview" />
                    <div className="preview-overlay" onClick={handleClick}>
                        <Button type="primary" icon={<UploadOutlined />}>
                            重新上传
                        </Button>
                    </div>
                </div>
            )}

            {uploadStatus !== 'idle' && uploadStatus !== 'uploading' && (
                <div className={`upload-status ${uploadStatus}`}>
                    {uploadStatus === 'success' && <CheckCircleOutlined />}
                    {uploadStatus === 'error' && <CloseCircleOutlined />}
                    <span>{renderStatusText()}</span>
                </div>
            )}
        </UploadContainer>
    );
};

export default SimpleUploader;
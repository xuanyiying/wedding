import React, { useState, useCallback, useRef } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import { FileType } from '../../types';
import { fileService } from '../../services';

interface SimpleUploaderProps {
    fileType: 'image' | 'video';
    category?: 'avatar' | 'work' | 'event' | 'profile' | 'cover' | 'favicon' | 'logo' | 'other';
    maxFileSize?: number;
    accept?: string;
    onUploadSuccess?: (result: any) => void;
    onUploadError?: (error: Error) => void;
    className?: string;
    children?: React.ReactNode;
}

export const SimpleUploader: React.FC<SimpleUploaderProps> = ({
    fileType,
    category = 'other',
    maxFileSize,
    accept,
    onUploadSuccess,
    onUploadError,
    className = '',
    children
}) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(async (files: FileList) => {
        if (files.length === 0) return;

        const file = files[0];

        // 验证文件大小
        if (maxFileSize && file.size > maxFileSize) {
            const error = new Error(`文件大小超出限制，最大支持 ${maxFileSize / 1024 / 1024}MB`);
            message.error(error.message);
            onUploadError?.(error);
            return;
        }

        setUploading(true);

        try {
            // 转换文件类型
            const mappedFileType = fileType === 'image' ? FileType.IMAGE : FileType.VIDEO;

            // 上传文件
            const result = await fileService.uploadFile(file, {
                fileType: mappedFileType,
                category
            });

            message.success('上传成功');
            onUploadSuccess?.(result);
        } catch (error) {
            const uploadError = error instanceof Error ? error : new Error('上传失败');
            message.error(uploadError.message);
            onUploadError?.(uploadError);
        } finally {
            setUploading(false);
        }
    }, [fileType, category, maxFileSize, onUploadSuccess, onUploadError]);

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
        fileInputRef.current?.click();
    }, []);

    return (
        <div className={`simple-uploader ${className}`}>
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
                <Button
                    icon={<UploadOutlined />}
                    onClick={handleClick}
                    loading={uploading}
                    disabled={uploading}
                >
                    {uploading ? '上传中...' : '选择文件'}
                </Button>
            )}
        </div>
    );
};

export default SimpleUploader;
import React, { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Upload, message } from 'antd';
import type { GetProp, UploadProps } from 'antd';
import { fileService } from '../services';
import { FileType as Type } from '../types';

type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

interface AvatarUploaderProps {
  value?: string;
  onChange?: (url: string) => void;
  size?: number;
  shape?: 'circle' | 'square';
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  category: 'avatar' | 'work' | 'event' | 'other';
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  value,
  onChange,
  size = 128,
  disabled = false,
  style,
  category,
}) => {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(value || '');

  React.useEffect(() => {
    setImageUrl(value || '');
  }, [value]);

  const beforeUpload = (file: FileType) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp';
    if (!isJpgOrPng) {
      message.error('只能上传 JPG/PNG/WEBP 格式的图片!');
      return false;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片大小不能超过 2MB!');
      return false;
    }
    return true;
  };

  const handleChange: UploadProps['onChange'] = async (info) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (info.file.status === 'done') {
      // Get this url from response in real world.
      const url = info.file.response?.data?.fileUrl || info.file.response?.url;
      if (url) {
        setImageUrl(url);
        onChange?.(url);
      }
      setLoading(false);
    }
    if (info.file.status === 'error') {
      message.error('上传失败');
      setLoading(false);
    }
  };

  const customRequest = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;
    
    try {
      setLoading(true);
      
      // 模拟上传进度
      onProgress?.({ percent: 10 });
      
      const response = await fileService.uploadFile(file, { fileType: Type.IMAGE, category });
      
      onProgress?.({ percent: 90 });
      
      if (response.success && response.data && response.data.fileUrl) {
        const url = response.data.fileUrl;
        setImageUrl(url);
        onChange?.(url);
        onSuccess?.(response.data);
        onProgress?.({ percent: 100 });
        message.success('头像上传成功');
      } else {
        throw new Error(response.message || '上传失败，请重试');
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      onError?.(error);
      
      // 提供更详细的错误信息
      const errorMessage = error?.response?.data?.message || error?.message || '头像上传失败，请检查网络连接后重试';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const uploadButton = (
    <button 
      style={{ 
        border: 0, 
        background: 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1
      }} 
      type="button"
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <div className="loading-spinner" style={{ 
            width: 16, 
            height: 16, 
            border: '2px solid #f3f3f3', 
            borderTop: '2px solid #1890ff', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite' 
          }} />
          <div style={{ marginTop: 8 }}>上传中...</div>
        </>
      ) : (
        <>
          <PlusOutlined />
          <div style={{ marginTop: 8 }}>上传头像</div>
        </>
      )}
    </button>
  );

  return (
    <div style={{ position: 'relative' }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <Upload
        name="avatar"
        listType="picture-circle"
        className="avatar-uploader"
        showUploadList={false}
        beforeUpload={beforeUpload}
        onChange={handleChange}
        customRequest={customRequest}
        disabled={disabled || loading}
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{
          width: size,
          height: size,
          ...style,
        }}
      >
        {imageUrl ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img 
              src={imageUrl} 
              alt="avatar" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 0.3s'
              }} 
            />
            {loading && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#1890ff',
                fontSize: '16px'
              }}>
                <div className="loading-spinner" style={{ 
                  width: 20, 
                  height: 20, 
                  border: '2px solid #f3f3f3', 
                  borderTop: '2px solid #1890ff', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }} />
              </div>
            )}
          </div>
        ) : (
          uploadButton
        )}
      </Upload>
    </div>
  );
};

export default AvatarUploader;
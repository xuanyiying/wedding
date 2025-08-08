import React, { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Upload, message } from 'antd';
import type { GetProp, UploadProps } from 'antd';
import { fileService } from '../services';

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
    const { file, onSuccess, onError } = options;
    
    try {
      setLoading(true);
      const response = await fileService.uploadFile(file, { type: 'image', category });
      
      if (response.success && response.data) {
        const url = response.data.fileUrl;
        setImageUrl(url);
        onChange?.(url);
        onSuccess?.(response.data);
        message.success('上传成功');
      } else {
        throw new Error(response.message || '上传失败');
      }
    } catch (error) {
      console.error('Upload error:', error);
      onError?.(error);
      message.error('上传失败');
    } finally {
      setLoading(false);
    }
  };

  const uploadButton = (
    <button style={{ border: 0, background: 'none' }} type="button">
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传头像</div>
    </button>
  );

  return (
  
    <Upload
      name="avatar"
      listType="picture-circle"
      className="avatar-uploader"
      showUploadList={false}
      beforeUpload={beforeUpload}
      onChange={handleChange}
      customRequest={customRequest}
      disabled={disabled || loading}
      style={{
        width: size,
        height: size,
        ...style,
      }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        uploadButton
      )}
    </Upload>
  );
};

export default AvatarUploader;
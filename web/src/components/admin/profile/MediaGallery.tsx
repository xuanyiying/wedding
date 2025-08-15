import React, { useState, useCallback } from 'react';
import {
  message,
  Upload,
  Popconfirm,
  Modal,
  Button,
  Space,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  DragOutlined,
  ScissorOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import { directUploadService, profileService } from '../../../services';
import type { MediaFile } from '../../../types';

interface MediaGalleryProps {
  mediaFiles: MediaFile[];
  onMediaFilesChange: (files: MediaFile[]) => void;
  onPreview: (url: string) => void;
  uploading: boolean;
  onUploadingChange: (uploading: boolean) => void;
}

const MediaGalleryContainer = styled.div`
  .media-gallery {
    .media-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin-top: 0;
      
      .media-row {
          display: flex;
          align-items: flex-start;
          background: transparent;
          padding: 0;
          transition: all 0.3s;
          border: none;
          margin: 0;
        
        &:hover {
          background: transparent;
          
          .media-actions {
            opacity: 1;
          }
          
          .drag-handle {
            opacity: 1;
          }
        }
        
        &.dragging {
          background: transparent;
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
        }
        
        .drag-handle {
          position: absolute;
          top: 8px;
          left: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          cursor: grab;
          color: #999;
          opacity: 0;
          transition: all 0.3s;
          z-index: 10;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 4px;
          
          &:hover {
            color: #1890ff;
            background: white;
          }
          
          &:active {
            cursor: grabbing;
          }
        }
        
        .media-preview {
          position: relative;
          width: 100%;
          height: auto;
          overflow: visible;
          margin: 0;
          padding: 0;
          cursor: pointer;
          display: block;
          
          img {
            width: 100%;
            height: auto;
            object-fit: contain;
            display: block;
            margin: 0;
            padding: 0;
          }
          
          .video-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 20px;
            z-index: 2;
          }
          
          .video-bg {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.3);
            z-index: 1;
          }
        }
        
        .media-info {
          display: none;
        }
        
        .media-actions {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.3s;
          z-index: 10;
          
          .action-btn {
            width: 32px;
            height: 32px;
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid #d9d9d9;
            border-radius: 6px;
            color: #666;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            
            &:hover {
              border-color: #1890ff;
              color: #1890ff;
              background: white;
            }
            
            &.delete-btn:hover {
              border-color: #ff4d4f;
              color: #ff4d4f;
              background: #fff2f0;
            }
          }
        }
      }
    }
    
    .upload-area {
      border: 2px dashed #d9d9d9;
      padding: 32px 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 16px;
      
      &:hover {
        border-color: #1890ff;
        background: #f6f8ff;
      }
      
      .upload-icon {
        font-size: 32px;
        color: #d9d9d9;
        margin-bottom: 12px;
        display: flex;
        justify-content: center;
      }
      
      .upload-text {
        color: #666;
        
        p {
          margin: 0;
          
          &:first-child {
            font-size: 16px;
            margin-bottom: 4px;
          }
          
          &:last-child {
            font-size: 14px;
            opacity: 0.8;
          }
        }
      }
    }
  }
`;

const MediaGallery: React.FC<MediaGalleryProps> = ({
  mediaFiles,
  onMediaFilesChange,
  onPreview,
  uploading,
  onUploadingChange
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [videoCoverModalVisible, setVideoCoverModalVisible] = useState(false);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [extractingCover, setExtractingCover] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');

  // 从视频中提取封面
  const extractCoverFromVideo = useCallback((videoFile: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        video.currentTime = 1; // 截取第1秒的画面
      };
      
      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const coverFile = new File([blob], `${videoFile.name}_cover.jpg`, {
                type: 'image/jpeg'
              });
              resolve(coverFile);
            } else {
              reject(new Error('无法生成封面图片'));
            }
          }, 'image/jpeg', 0.8);
        }
      };
      
      video.onerror = () => {
        reject(new Error('视频加载失败'));
      };
      
      video.src = URL.createObjectURL(videoFile);
    });
  }, []);

  // 处理视频文件上传（带封面）
  const handleVideoUpload = useCallback(async (videoFile: File, coverFile?: File) => {
    try {
      onUploadingChange(true);
      
      // 验证视频文件
      if (videoFile.size > 100 * 1024 * 1024) { // 100MB for video
        message.error(`视频文件 ${videoFile.name} 大小超过限制（最大100MB）`);
        return;
      }
      
      // 验证封面文件
      if (coverFile && coverFile.size > 10 * 1024 * 1024) { // 10MB for cover
        message.error(`封面图片 ${coverFile.name} 大小超过限制（最大10MB）`);
        return;
      }
      
      // 上传视频文件
      const videoUploadResult = await directUploadService.uploadMedia([videoFile], 'profile');
      
      let coverUrl = '';
      if (coverFile) {
        // 上传封面文件
        const coverUploadResult = await directUploadService.uploadMedia([coverFile], 'profile');
        coverUrl = coverUploadResult[0].url;
      }
      
      // 创建媒体文件数据
      const newMediaFile: MediaFile = {
        id: videoUploadResult[0].fileId,
        userId: '', // 将由后端设置
        fileId: videoUploadResult[0].fileId,
        fileType: 'video' as const,
        mediaOrder: mediaFiles.length,
      };
      
      onMediaFilesChange([...mediaFiles, newMediaFile]);
      message.success('视频上传成功');
    } catch (error: any) {
      console.error('Upload error:', error);
      
      // 处理不同类型的错误
      if (error?.response?.status === 401) {
        message.error('登录已过期，请重新登录');
        // 可以在这里触发重新登录逻辑
      } else if (error?.response?.status === 429) {
        message.error('上传请求过于频繁，请稍后重试');
      } else if (error?.response?.status === 413) {
        message.error('文件过大，请选择较小的文件');
      } else {
        message.error(error?.message || '上传失败，请重试');
      }
    } finally {
      onUploadingChange(false);
    }
  }, [mediaFiles, onMediaFilesChange, onUploadingChange]);

  // 处理封面选择完成
  const handleCoverSelected = useCallback((coverFile?: File) => {
    if (pendingVideoFile) {
      handleVideoUpload(pendingVideoFile, coverFile);
    }
    
    // 清理状态
    setPendingVideoFile(null);
    setVideoPreviewUrl('');
    setVideoCoverModalVisible(false);
  }, [pendingVideoFile, handleVideoUpload]);

  // 处理从视频提取封面
  const handleExtractCover = useCallback(async () => {
    if (!pendingVideoFile) return;
    
    try {
      setExtractingCover(true);
      
      // 检查文件大小和类型
      if (pendingVideoFile.size > 100 * 1024 * 1024) {
        message.error('视频文件过大，无法提取封面');
        return;
      }
      
      if (!pendingVideoFile.type.startsWith('video/')) {
        message.error('文件格式不正确，请选择视频文件');
        return;
      }
      
      const coverFile = await extractCoverFromVideo(pendingVideoFile);
      handleCoverSelected(coverFile);
    } catch (error) {
      console.error('Extract cover error:', error);
      message.error('封面提取失败，请检查视频文件是否损坏');
    } finally {
      setExtractingCover(false);
    }
  }, [pendingVideoFile, extractCoverFromVideo, handleCoverSelected]);

  // 处理上传自定义封面
  const handleUploadCover = useCallback((file: File) => {
    handleCoverSelected(file);
    return false; // 阻止默认上传行为
  }, [handleCoverSelected]);

  // 处理取消封面选择
  const handleCancelCoverSelection = useCallback(() => {
    setPendingVideoFile(null);
    setVideoPreviewUrl('');
    setVideoCoverModalVisible(false);
  }, []);

  // 处理图片文件上传
  const handleImageUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    
    // 处理纯图片上传
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB for images
      
      if (!isValidType) {
        message.error(`文件 ${file.name} 格式不支持，只支持图片格式`);
        return false;
      }
      
      if (!isValidSize) {
        message.error(`文件 ${file.name} 大小超过限制（最大10MB）`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    try {
      onUploadingChange(true);
      
      // 使用直接上传服务批量上传图片文件
      const uploadResults = await directUploadService.uploadMedia(validFiles, 'profile');
      
      // 创建媒体文件数据
      const newMediaFiles: MediaFile[] = uploadResults.map((result, index) => ({
        fileId: result.fileId,
        fileType: 'image' as const,
        mediaOrder: index,
      }));
      
      onMediaFilesChange([...mediaFiles, ...newMediaFiles]);
      message.success(`成功上传 ${validFiles.length} 个图片文件`);
    } catch (error: any) {
      console.error('Upload error:', error);
      
      // 处理不同类型的错误
      if (error?.response?.status === 401) {
        message.error('登录已过期，请重新登录');
      } else if (error?.response?.status === 429) {
        message.error('上传请求过于频繁，请稍后重试');
      } else if (error?.response?.status === 413) {
        message.error('文件过大，请选择较小的文件');
      } else {
        message.error(error?.message || '上传失败，请重试');
      }
    } finally {
      onUploadingChange(false);
    }
  }, [mediaFiles, onMediaFilesChange, onUploadingChange]);

  // 处理媒体文件删除
  const handleDelete = useCallback(async (mediaFile: MediaFile) => {
    try {
      await profileService.deleteMediaProfile(mediaFile.fileId);
      const updatedFiles = mediaFiles.filter(file => file.fileId !== mediaFile.fileId);
      onMediaFilesChange(updatedFiles);
      message.success('删除成功');
    } catch (error) {
      console.error('Delete error:', error);
      message.error('删除失败，请重试');
    }
  }, [mediaFiles, onMediaFilesChange]);

  // 处理拖拽开始
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  // 处理拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  // 处理拖拽放置
  const handleDrop = useCallback((targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    
    const newFiles = [...mediaFiles];
    const draggedFile = newFiles[draggedIndex];
    
    // 移除拖拽的文件
    newFiles.splice(draggedIndex, 1);
    
    // 插入到目标位置
    newFiles.splice(targetIndex, 0, draggedFile);
    
    // 更新顺序
    const updatedFiles = newFiles.map((file, index) => ({
      ...file,
      mediaOrder: index
    }));
    
    onMediaFilesChange(updatedFiles);
    setDraggedIndex(null);
  }, [draggedIndex, mediaFiles, onMediaFilesChange]);

  // 文件上传前的处理
  const beforeUpload = useCallback((file: File, fileList: File[]) => {
    // 检查是否为视频文件
    if (file.type.startsWith('video/')) {
      // 限制每次只能上传一个视频
      if (fileList.length > 1) {
        message.error('每次只能上传一个视频文件');
        return false;
      }
      
      // 设置待处理的视频文件
      setPendingVideoFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
      setVideoCoverModalVisible(true);
      
      // 阻止自动上传
      return false;
    } else {
      // 处理图片文件
      handleImageUpload([file]);
      return false;
    }
  }, [handleImageUpload]);

  return (
    <MediaGalleryContainer>
      <div className="media-gallery">
        {mediaFiles.length > 0 && (
          <div className="media-list">
            {mediaFiles.map((mediaFile, index) => (
              <div
                key={mediaFile.id}
                className={`media-row ${draggedIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
              >
                <div className="drag-handle">
                  <DragOutlined />
                </div>
                
                <div 
                  className="media-preview"
                  onClick={() => onPreview(mediaFile.fileId)}
                >
                  <img 
                    src={mediaFile.thumbnailUrl || mediaFile.fileUrl} 
                    alt="Media preview" 
                  />
                  {mediaFile.fileType === 'video' && (
                    <>
                      <div className="video-bg" />
                      <div className="video-overlay">
                        <PlayCircleOutlined />
                      </div>
                    </>
                  )}
                </div>
                
                <div className="media-actions">
                  <Popconfirm
                    title="确定要删除这个媒体文件吗？"
                    onConfirm={() => handleDelete(mediaFile)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <div className="action-btn delete-btn">
                      <DeleteOutlined />
                    </div>
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <Upload
          multiple
          accept="image/*,video/*"
          showUploadList={false}
          beforeUpload={beforeUpload}
          disabled={uploading}
        >
          <div className="upload-area">
            <div className="upload-icon">
              <PlusOutlined />
            </div>
            <div className="upload-text">
              <p>点击或拖拽文件到此区域上传</p>
              <p>支持图片和视频格式，图片最大10MB，视频最大100MB</p>
            </div>
          </div>
        </Upload>
      </div>

      {/* 视频封面选择模态框 */}
      <Modal
        title="选择视频封面"
        open={videoCoverModalVisible}
        onCancel={handleCancelCoverSelection}
        footer={null}
        width={600}
      >
        <div style={{ textAlign: 'center' }}>
          {videoPreviewUrl && (
            <video
              src={videoPreviewUrl}
              controls
              style={{ width: '100%', maxHeight: '300px', marginBottom: '16px' }}
            />
          )}
          
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<ScissorOutlined />}
              loading={extractingCover}
              onClick={handleExtractCover}
              block
            >
              从视频中提取封面
            </Button>
            
            <Divider>或</Divider>
            
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={handleUploadCover}
            >
              <Button icon={<UploadOutlined />} block>
                上传自定义封面图片
              </Button>
            </Upload>
            
            <Divider>或</Divider>
            
            <Button
              onClick={() => handleCoverSelected()}
              block
            >
              跳过，不设置封面
            </Button>
          </Space>
        </div>
      </Modal>
    </MediaGalleryContainer>
  );
};

export default MediaGallery;
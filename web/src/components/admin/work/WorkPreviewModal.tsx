import React, { useState } from 'react';
import { Modal, Row, Col, Tag, Space, Image, Typography, Divider, Button } from 'antd';
import { EyeOutlined, HeartOutlined, DownloadOutlined, PlayCircleOutlined, PauseOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { Work } from './WorkCard';

const { Title, Text, Paragraph } = Typography;

interface WorkPreviewModalProps {
  visible: boolean;
  work: Work | null;
  onClose: () => void;
}

const PreviewContainer = styled.div`
  .ant-modal-body {
    padding: 12px;
  }
`;

const InfoSection = styled.div`
  margin-bottom: 24px;
  
  .section-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--admin-text-primary);
  }
  
  .info-item {
    margin-bottom: 8px;
    
    .label {
      color: var(--admin-text-secondary);
      margin-right: 8px;
      min-width: 80px;
      display: inline-block;
    }
    
    .value {
      color: var(--admin-text-primary);
    }
  }
`;

const StatsContainer = styled.div`
  display: flex;
  gap: 24px;
  margin: 16px 0;
  
  .stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--admin-text-secondary);
    
    .anticon {
      font-size: 16px;
    }
  }
`;

const MediaContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
  max-height: 600px;
  overflow-y: auto;
  
  .media-item {
    position: relative;
    width: 100%;
    height: 400px;
    border-radius: 12px;
    overflow: hidden;
    background: #000;
    
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      cursor: pointer;
    }
    
    .video-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
      padding: 20px 16px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      
      .play-pause-btn {
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        
        &:hover {
          background: white;
          transform: scale(1.1);
        }
        
        .anticon {
          font-size: 16px;
          color: #333;
        }
      }
      
      .progress-bar {
        flex: 1;
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        cursor: pointer;
        
        .progress-fill {
          height: 100%;
          background: #1890ff;
          border-radius: 2px;
          transition: width 0.1s ease;
        }
      }
      
      .time-display {
        color: white;
        font-size: 12px;
        min-width: 80px;
        text-align: right;
      }
    }
    
    .media-info {
      position: absolute;
      top: 16px;
      left: 16px;
      right: 16px;
      color: white;
      
      .media-title {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 4px;
      }
      
      .media-type {
        font-size: 12px;
        opacity: 0.8;
      }
    }
  }
`;

const WorkPreviewModal: React.FC<WorkPreviewModalProps> = ({
  visible,
  work,
  onClose,
}) => {
  const [previewImage, setPreviewImage] = useState<string>('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [playingVideos, setPlayingVideos] = useState<Set<number>>(new Set());
  const [videoDurations, setVideoDurations] = useState<Map<number, number>>(new Map());
  const [videoCurrentTimes, setVideoCurrentTimes] = useState<Map<number, number>>(new Map());

  if (!work) return null;

  const handleImagePreview = (url: string) => {
    setPreviewImage(url);
    setPreviewVisible(true);
  };

  const getFileType = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    return videoExtensions.includes(extension || '') ? 'video' : 'image';
  };

  const handleVideoPlay = (index: number) => {
    const video = document.getElementById(`video-${index}`) as HTMLVideoElement;
    if (video) {
      if (playingVideos.has(index)) {
        video.pause();
        setPlayingVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      } else {
        video.play();
        setPlayingVideos(prev => new Set(prev).add(index));
      }
    }
  };

  const handleVideoTimeUpdate = (index: number, currentTime: number) => {
    setVideoCurrentTimes(prev => new Map(prev).set(index, currentTime));
  };

  const handleVideoLoadedMetadata = (index: number, duration: number) => {
    setVideoDurations(prev => new Map(prev).set(index, duration));
  };

  const handleProgressClick = (index: number, event: React.MouseEvent<HTMLDivElement>) => {
    const video = document.getElementById(`video-${index}`) as HTMLVideoElement;
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const duration = videoDurations.get(index) || 0;
    
    if (video && duration > 0) {
      video.currentTime = duration * percentage;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMediaItem = (url: string, index: number) => {
    const fileType = getFileType(url);
    const isPlaying = playingVideos.has(index);
    const currentTime = videoCurrentTimes.get(index) || 0;
    const duration = videoDurations.get(index) || 0;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    if (fileType === 'video') {
      return (
        <div key={index} className="media-item">
          <video
            id={`video-${index}`}
            src={url}
            onTimeUpdate={(e) => handleVideoTimeUpdate(index, e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => handleVideoLoadedMetadata(index, e.currentTarget.duration)}
            onEnded={() => setPlayingVideos(prev => {
              const newSet = new Set(prev);
              newSet.delete(index);
              return newSet;
            })}
          />
          
          <div className="media-info">
            <div className="media-title">{work.title}</div>
          </div>
          
          <div className="video-controls">
            <button 
              className="play-pause-btn"
              onClick={() => handleVideoPlay(index)}
            >
              {isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
            </button>
            
            <div 
              className="progress-bar"
              onClick={(e) => handleProgressClick(index, e)}
            >
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div key={index} className="media-item">
        <img 
          src={url} 
          alt={`作品图片 ${index + 1}`}
          onClick={() => handleImagePreview(url)}
        />
        
        <div className="media-info">
          <div className="media-title">{work.title}</div>
          <div className="media-description">{work.description}</div>
        </div>
      </div>
    );
  };

  return (
    <PreviewContainer>
      <Modal
        title="作品预览"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
        ]}
        width={800}
        centered
      >
        <Row gutter={24}>
          <Col span={24}>
            <Title level={3} style={{ marginBottom: 8 }}>
              {work.title}
            </Title>
            
            <Space wrap style={{ marginBottom: 16 }}>
              <Tag color="blue">{work.category}</Tag>
              <Tag color={work.type === 'photo' ? 'green' : 'orange'}>
                {work.type === 'photo' ? '图片' : '视频'}
              </Tag>
              {work.isFeatured && <Tag color="gold">精选</Tag>}
              {!work.isPublic && <Tag color="red">私有</Tag>}
            </Space>
            
            <StatsContainer>
              <div className="stat-item">
                <EyeOutlined />
                <span>{work.views || 0} 浏览</span>
              </div>
              <div className="stat-item">
                <HeartOutlined />
                <span>{work.likes || 0} 点赞</span>
              </div>
              <div className="stat-item">
                <DownloadOutlined />
                <span>{work.downloads || 0} 下载</span>
              </div>
            </StatsContainer>
            
            <Divider />
            
            <InfoSection>
              <div className="section-title">作品信息</div>
              
              <div className="info-item">
                <span className="label">描述:</span>
                <span className="value">
                  <Paragraph ellipsis={{ rows: 3, expandable: true }}>
                    {work.description}
                  </Paragraph>
                </span>
              </div>
              
              {work.tags && work.tags.length > 0 && (
                <div className="info-item">
                  <span className="label">标签:</span>
                  <span className="value">
                    <Space wrap>
                      {work.tags.map((tag, index) => (
                        <Tag key={index}>{tag}</Tag>
                      ))}
                    </Space>
                  </span>
                </div>
              )}
              
              <div className="info-item">
                <span className="label">作者:</span>
                <span className="value">{work.author || '未知'}</span>
              </div>
              
              {work.customer && (
                <div className="info-item">
                  <span className="label">客户:</span>
                  <span className="value">{work.customer}</span>
                </div>
              )}
              
            
              <div className="info-item">
                <span className="label">婚礼日期:</span>
                <span className="value">{work.weddingDate?.toLocaleDateString() || '未知'}</span>
              </div>
              
              <div className="info-item">
                <span className="label">创建时间:</span>
                <span className="value">{work.createdAt}</span>
              </div>
            </InfoSection>
            
            <Divider />
            
            <InfoSection>
              <div className="section-title">
                作品内容 ({work.contentUrls?.length || 0} 个文件)
              </div>
              
              {work.contentUrls && work.contentUrls.length > 0 ? (
                <MediaContainer>
                  {work.contentUrls.map((url, index) => renderMediaItem(url, index))}
                </MediaContainer>
              ) : (
                <Text type="secondary">暂无作品文件</Text>
              )}
            </InfoSection>
          </Col>
        </Row>
      </Modal>
      
      <Image
        width={200}
        style={{ display: 'none' }}
        src={previewImage}
        preview={{
          visible: previewVisible,
          src: previewImage,
          onVisibleChange: (vis) => setPreviewVisible(vis),
        }}
      />
    </PreviewContainer>
  );
};

export default WorkPreviewModal;
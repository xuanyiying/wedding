import React from 'react';
import { Modal, Tag, Typography, Avatar } from 'antd';
import { EyeOutlined, HeartOutlined, MessageOutlined, CalendarOutlined, UserOutlined, PlayCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { type Work } from '../../types';
import { formatDate } from '../../utils';
import ImageCarousel from './ImageCarousel';

const { Paragraph, Text } = Typography;

const DetailModal = styled(Modal)`
  .ant-modal-content {
    border-radius: var(--client-border-radius-lg);
    background: var(--client-bg-container);
  }

  .ant-modal-header {
    border-radius: var(--client-border-radius-lg) var(--client-border-radius-lg) 0 0;
    background: var(--client-bg-container);
    border-bottom: 1px solid var(--client-border-color);
  }

  .ant-modal-title {
    color: var(--client-text-primary);
  }
`;

const DetailImage = styled.div`
  width: 100%;
  height: 400px;
  background: var(--client-bg-layout);
  border-radius: var(--client-border-radius);
  overflow: hidden;
  margin-bottom: 24px;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const VideoOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.5);
  }

  .play-icon {
    font-size: 48px;
    color: white;
    opacity: 0.9;
    transition: all 0.2s ease;

    &:hover {
      opacity: 1;
      transform: scale(1.1);
    }
  }
`;

const MetaInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  color: var(--client-text-secondary);
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const AuthorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
`;

interface WorkDetailModalProps {
  work: Work | null;
  visible: boolean;
  onClose: () => void;
}

const WorkDetailModal: React.FC<WorkDetailModalProps> = ({ work, visible, onClose }) => {
  if (!work) return null;

  // 判断是否为视频类型
  const isVideo = work.type === 'video' || (work.contentUrls && work.contentUrls.some(url => {
    const extension = url.split('.').pop()?.toLowerCase();
    return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '');
  }));

  // 获取图片URLs
  const imageUrls = work.contentUrls?.filter(url => {
    const extension = url.split('.').pop()?.toLowerCase();
    return !['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '');
  }) || [];

  // 获取视频URLs
  const videoUrls = work.contentUrls?.filter(url => {
    const extension = url.split('.').pop()?.toLowerCase();
    return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '');
  }) || [];

  // 如果没有contentUrls，使用coverUrl作为fallback
  const displayImages = imageUrls.length > 0 ? imageUrls : (work.coverUrl ? [work.coverUrl] : []);

  const handleVideoPlay = (videoUrl: string) => {
    // 可以在这里添加视频播放逻辑，比如打开视频播放器
    window.open(videoUrl, '_blank');
  };

  return (
    <DetailModal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      title={work.title}
    >
      <DetailImage>
        {isVideo ? (
          // 视频类型：显示封面图和播放按钮
          <>
            <img src={work.coverUrl ?? ''} alt={work.title} />
            <VideoOverlay onClick={() => videoUrls[0] && handleVideoPlay(videoUrls[0])}>
              <PlayCircleOutlined className="play-icon" />
            </VideoOverlay>
          </>
        ) : (
          // 图片类型：使用轮播组件
          <ImageCarousel 
            images={displayImages}
            height="400px"
            showDots={displayImages.length > 1}
            showArrows={displayImages.length > 1}
            autoPlay={false}
          />
        )}
      </DetailImage>

      <Paragraph>{work.description}</Paragraph>

      <MetaInfo>
        <MetaItem>
          <HeartOutlined /> {work.likeCount}
        </MetaItem>
        <MetaItem>
          <MessageOutlined /> {work.shareCount}
        </MetaItem>
        <MetaItem>
          <EyeOutlined /> {work.viewCount}
        </MetaItem>
        {work.weddingDate && (
          <MetaItem>
            <CalendarOutlined /> {formatDate(work.weddingDate)}
          </MetaItem>
        )}
      </MetaInfo>

      <div>
        {(work.tags ?? []).map(tag => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>

      {work.user && (
        <AuthorInfo>
          <Avatar src={work.user.avatarUrl} icon={<UserOutlined />} />
          <Text strong>{work.user.realName ?? work.user.username}</Text>
        </AuthorInfo>
      )}
    </DetailModal>
  );
};

export default WorkDetailModal;
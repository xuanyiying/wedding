import React from 'react';
import { Modal, Tag, Typography, Avatar } from 'antd';
import { EyeOutlined, HeartOutlined, MessageOutlined, CalendarOutlined, UserOutlined, PlayCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { type Work } from '../../types';
import { formatDate } from '../../utils';
import ImageCarousel from './ImageCarousel';
import { usePlayStats } from '../../hooks/usePageView';

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
  background: var(--client-bg-layout);
  border-radius: var(--client-border-radius);
  overflow: hidden;
  margin-bottom: 24px;
  position: relative;
  padding-bottom: 75%; /* 4:3 aspect ratio */
  height: 0;

  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  video {
    position: absolute;
    top: 0;
    left: 0;
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
  const { recordPlay, playStats } = usePlayStats(work?.id || '');
  
  if (!work) return null;

  // 判断是否为视频类型
  const isVideo = work.type === 'video' || (work.files && work.files.some(f => {
    const extension = f.fileUrl?.split('.').pop()?.toLowerCase();
    return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '');
  }));

  // 获取图片URLs
  const imageUrls = work.files?.filter(f => {
    const extension = f.fileUrl?.split('.').pop()?.toLowerCase();
    return !['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '');
  }).map(f => f.fileUrl).filter(url => url) as string[] || [];

  // 获取视频URLs
  const videoUrls = work.files?.filter(f => {
    const extension = f.fileUrl?.split('.').pop()?.toLowerCase();
    return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '');
  }).map(f => f.fileUrl).filter(url => url) as string[] || [];

  // 如果没有files，使用第一个文件的URL作为fallback
  const displayImages = imageUrls.length > 0 ? imageUrls : (work.files?.[0]?.fileUrl ? [work.files[0].fileUrl] : []);

  const handleVideoPlay = (videoUrl: string) => {
    // 记录播放行为
    recordPlay();
    // 打开视频播放器
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
            <img src={work.files?.[0]?.thumbnailUrl ?? ''} alt={work.title} />
            <VideoOverlay onClick={() => videoUrls[0] && handleVideoPlay(videoUrls[0])}>
              <PlayCircleOutlined className="play-icon" />
            </VideoOverlay>
          </>
        ) : (
          // 图片类型：使用轮播组件
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <ImageCarousel 
              images={displayImages}
              height="100%"
              showDots={displayImages.length > 1}
              showArrows={displayImages.length > 1}
              autoPlay={false}
            />
          </div>
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
        {isVideo && (
          <MetaItem>
            <PlayCircleOutlined /> {playStats?.totalPlays || 0}
          </MetaItem>
        )}
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
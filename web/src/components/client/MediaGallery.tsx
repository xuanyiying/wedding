import React, { useState, useEffect, useRef } from 'react';
import { Spin, Empty, Image } from 'antd';
import { PlayCircleOutlined, CloseOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { type MediaFile, FileType } from '../../types';
import { PlayButton } from './WorkCardStyles';

interface MediaGalleryProps {
  mediaProfiles: MediaFile[];
  loading: boolean;
  emptyDescription?: string;
}

const DetailSection = styled.div`
  margin-bottom: 24px;
  
  h4 {
    color: var(--client-text-primary);
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
  }
`;

const WorkItem = styled.div`
  position: relative;
  overflow: hidden;
  aspect-ratio: 1;
  cursor: pointer;
  
  .ant-image {
    width: 100%;
    height: 100%;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
`;

// 视频播放器容器
const VideoPlayerContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const VideoPlayer = styled.video`
  max-width: 90%;
  max-height: 80%;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const CloseButton = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: background 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const VideoControls = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  padding: 10px 20px;
  border-radius: 20px;
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const MediaGallery: React.FC<MediaGalleryProps> = ({
  mediaProfiles,
  loading,
  emptyDescription = "暂无公开案例"
}) => {
  const [playingVideo, setPlayingVideo] = useState<MediaFile | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 处理视频播放
  const handleVideoPlay = (media: MediaFile) => {
    if (media.fileType === FileType.VIDEO && media.fileUrl) {
      setPlayingVideo(media);
      setIsPaused(false);
    }
  };

  // 关闭视频播放
  const handleCloseVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setPlayingVideo(null);
    setIsPaused(false);
  };

  // 处理视频容器点击（暂停/播放）
  const handleVideoContainerClick = (e: React.MouseEvent) => {
    // 避免点击视频控制按钮时触发
    if ((e.target as HTMLElement).tagName !== 'VIDEO') {
      if (videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play();
          setIsPaused(false);
        } else {
          videoRef.current.pause();
          setIsPaused(true);
        }
      }
    }
  };

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (playingVideo) {
        if (e.key === 'Escape') {
          handleCloseVideo();
        } else if (e.key === ' ') {
          e.preventDefault();
          handleVideoContainerClick(e as any);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [playingVideo]);

  return (
    <>
      <DetailSection>
        {loading ? (
          <LoadingContainer>
            <Spin size="small" />
          </LoadingContainer>
        ) : mediaProfiles.length > 0 ?
          mediaProfiles.map((m) => (
            <WorkItem key={m.id} onClick={() => m.fileType === FileType.VIDEO && handleVideoPlay(m)}>
              {m.fileType === FileType.VIDEO && m.thumbnailUrl && m.fileUrl ?
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                  <img
                    src={m.thumbnailUrl}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <PlayButton>
                    <PlayCircleOutlined />
                  </PlayButton>
                </div> :
                <Image preview={false}
                  src={m.fileUrl}
                />}
            </WorkItem>
          )) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={emptyDescription}
              style={{ margin: '20px 0' }}
            />
          )}
      </DetailSection>

      {/* 视频播放器 */}
      {playingVideo && (
        <VideoPlayerContainer onClick={handleVideoContainerClick}>
          <CloseButton onClick={handleCloseVideo}>
            <CloseOutlined />
          </CloseButton>
          <VideoPlayer
            ref={videoRef}
            src={playingVideo.fileUrl}
            autoPlay
            controls={false}
            onClick={(e) => e.stopPropagation()}
          />
          <VideoControls>
            {isPaused ? '点击播放' : '点击暂停'} | 按ESC或点击关闭按钮退出
          </VideoControls>
        </VideoPlayerContainer>
      )}
    </>
  );
};

export default MediaGallery;
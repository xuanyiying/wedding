import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Spin, Empty, Image } from 'antd';
import { PlayCircleOutlined, CloseOutlined, DragOutlined } from '@ant-design/icons';
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

// 视频播放器背景遮罩
const VideoPlayerOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
`;

// 视频播放器容器（可拖动）
const VideoPlayerContainer = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  left: ${props => props.$x}px;
  top: ${props => props.$y}px;
  z-index: 1001;
  background: rgba(0, 0, 0, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
`;

// 拖动手柄
const DragHandle = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  cursor: move;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  
  .drag-icon {
    color: rgba(255, 255, 255, 0.6);
    font-size: 16px;
  }
`;

const VideoPlayer = styled.video`
  width: 100%;
  height: auto;
  max-width: 90vw;
  max-height: calc(90vh - 100px);
  display: block;
`;

const CloseButton = styled.div`
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const VideoControls = styled.div`
  background: rgba(0, 0, 0, 0.6);
  padding: 12px 20px;
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const MediaGallery: React.FC<MediaGalleryProps> = ({
  mediaProfiles,
  loading,
  emptyDescription = "暂无公开案例"
}) => {
  const [playingVideo, setPlayingVideo] = useState<MediaFile | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理视频播放
  const handleVideoPlay = (media: MediaFile) => {
    if (media.fileType === FileType.VIDEO && media.fileUrl) {
      setPlayingVideo(media);
      setIsPaused(false);
      // 居中显示
      centerVideoPlayer();
    }
  };

  // 居中视频播放器
  const centerVideoPlayer = () => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const playerWidth = Math.min(windowWidth * 0.9, 1200);
    const playerHeight = Math.min(windowHeight * 0.9, 800);

    setPosition({
      x: (windowWidth - playerWidth) / 2,
      y: (windowHeight - playerHeight) / 2
    });
  };

  // 关闭视频播放
  const handleCloseVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setPlayingVideo(null);
    setIsPaused(false);
  };

  // 处理视频点击（暂停/播放）
  const handleVideoClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  // 开始拖动
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // 拖动中
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // 限制在窗口范围内
      const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 0);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  }, [isDragging, dragStart.x, dragStart.y]);

  // 结束拖动
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (playingVideo) {
        if (e.key === 'Escape') {
          handleCloseVideo();
        } else if (e.key === ' ') {
          e.preventDefault();
          handleVideoClick();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [playingVideo]);

  // 拖动事件处理
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // 窗口大小变化时重新居中
  useEffect(() => {
    if (playingVideo) {
      const handleResize = () => centerVideoPlayer();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
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
        <>
          <VideoPlayerOverlay onClick={handleCloseVideo} />
          <VideoPlayerContainer
            ref={containerRef}
            $x={position.x}
            $y={position.y}
          >
            <DragHandle onMouseDown={handleDragStart}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.8)' }}>
                <DragOutlined className="drag-icon" />
                <span style={{ fontSize: '14px' }}>拖动移动窗口</span>
              </div>
              <CloseButton onClick={handleCloseVideo}>
                <CloseOutlined />
              </CloseButton>
            </DragHandle>
            <VideoPlayer
              ref={videoRef}
              src={playingVideo.fileUrl}
              autoPlay
              controls={false}
              onClick={handleVideoClick}
            />
            <VideoControls>
              {isPaused ? '点击播放' : '点击暂停'} | 按空格键切换 | 按ESC退出
            </VideoControls>
          </VideoPlayerContainer>
        </>
      )}
    </>
  );
};

export default MediaGallery;
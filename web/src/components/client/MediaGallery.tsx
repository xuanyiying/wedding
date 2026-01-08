import React, { useState, useCallback, useRef } from 'react';
import { Spin, Empty, Image } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }
`;

const WorkItem = styled.div`
  position: relative;
  overflow: hidden;
  aspect-ratio: 1;
  cursor: pointer;
  background: #f5f5f5;
  border-radius: 8px;
  
  .ant-image {
    width: 100%;
    height: 100%;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  grid-column: 1 / -1;
`;

const MediaGallery: React.FC<MediaGalleryProps> = ({
  mediaProfiles,
  loading,
  emptyDescription = "暂无公开案例"
}) => {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoPlay = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPlayingVideoId(id);
  }, []);

  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

  return (
    <DetailSection>
      {loading ? (
        <LoadingContainer>
          <Spin size="small" />
        </LoadingContainer>
      ) : mediaProfiles.length > 0 ?
        mediaProfiles.map((m) => {
          const isPlaying = playingVideoId === m.id;
          const isVideo = m.fileType === FileType.VIDEO;

          return (
            <WorkItem 
              key={m.id} 
              onClick={(e) => isVideo && !isPlaying && handleVideoPlay(e, m.id || '')}
            >
              {isVideo ? (
                isPlaying ? (
                  <video
                    ref={videoRef}
                    src={m.fileUrl}
                    autoPlay
                    controls
                    playsInline
                    onClick={handleVideoClick}
                  />
                ) : (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    <img
                      src={m.thumbnailUrl || m.fileUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <PlayButton>
                      <PlayCircleOutlined />
                    </PlayButton>
                  </div>
                )
              ) : (
                <Image 
                  preview={true}
                  src={m.fileUrl}
                />
              )}
            </WorkItem>
          );
        }) : (
          <div style={{ gridColumn: '1 / -1' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={emptyDescription}
              style={{ margin: '20px 0' }}
            />
          </div>
        )}
    </DetailSection>
  );
};

export default MediaGallery;

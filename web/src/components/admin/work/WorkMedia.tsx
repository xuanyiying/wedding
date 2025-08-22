import React from 'react';
import { PlayCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import ImageCarousel from '../../client/ImageCarousel';
import { FileType } from '../../../types';

const WorkMediaContainer = styled.div`
  position: relative;
  width: 100%;
  overflow: hidden;
  background: var(--admin-bg-layout);
  border-radius: 8px;
`;

const MediaWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PlayButton = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: translate(-50%, -50%) scale(1.1);
  }
`;

const FeaturedBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: linear-gradient(45deg, #ff6b6b, #ffa500);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  z-index: 2;
`;

const AspectRatioContainer = styled.div`
  padding-bottom: 75%; /* 4:3 宽高比 */
  position: relative;
  height: 0;
`;

const AbsoluteContent = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

interface WorkMediaProps {
  files: WorkFile[];
  isFeatured?: boolean;
  title: string;
  onClick?: () => void;
}

const WorkMedia: React.FC<WorkMediaProps> = ({ 
  files, 
  isFeatured = false, 
  title,
  onClick 
}) => {
  // 判断是否为视频类型
  const hasVideo = files.some(file => file.fileType === FileType.VIDEO);
  
  // 获取视频缩略图
  const videoThumbnail = files.find(file => 
    file.fileType === FileType.VIDEO && file.thumbnailUrl
  )?.thumbnailUrl;
  
  // 获取图片URLs
  const imageUrls = files
    .filter(file => file.fileType === FileType.IMAGE && file.fileUrl)
    .map(file => file.fileUrl!)
    .filter(Boolean);

  // 如果没有文件，显示占位符
  if (!files || files.length === 0) {
    return (
      <WorkMediaContainer>
        <AspectRatioContainer>
          <AbsoluteContent>
            <div 
              style={{ 
                width: '100%', 
                height: '100%', 
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: '14px'
              }}
            >
              暂无媒体文件
            </div>
          </AbsoluteContent>
        </AspectRatioContainer>
      </WorkMediaContainer>
    );
  }

  return (
    <WorkMediaContainer onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <AspectRatioContainer>
        <AbsoluteContent>
          <MediaWrapper>
            {hasVideo ? (
              // 视频类型：显示缩略图并添加播放按钮
              <>
                <img 
                  src={videoThumbnail || '/placeholder.svg?height=300&width=400'} 
                  alt={title}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg?height=300&width=400';
                  }}
                />
                <PlayButton>
                  <PlayCircleOutlined />
                </PlayButton>
              </>
            ) : (
              // 图片类型：使用轮播组件展示多张图片
              <ImageCarousel 
                images={imageUrls}
                height="100%"
                showDots={imageUrls.length > 1}
                showArrows={imageUrls.length > 1}
                autoPlay={false}
              />
            )}
            {isFeatured && <FeaturedBadge>精选</FeaturedBadge>}
          </MediaWrapper>
        </AbsoluteContent>
      </AspectRatioContainer>
    </WorkMediaContainer>
  );
};

export default WorkMedia;
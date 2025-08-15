import React from 'react';
import { EyeOutlined, HeartOutlined, MessageOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { type Work } from '../../types';
import ImageCarousel from './ImageCarousel';
import {
  DouyinWorkCard,
  DouyinTag,
  FeaturedBadge,
  MetaItem,
  PlayButton,
  WorkDescription,
  WorkInfo,
  WorkMedia,
  WorkMediaContainer,
  WorkMetaInfo,
  WorkTagsContainer,
  WorkTitle
} from './WorkCardStyles';

interface WorkCardProps {
  work: Work;
  onClick: (work: Work) => void;
}

const WorkCard: React.FC<WorkCardProps> = ({ work, onClick }) => {
  // 判断是否为视频类型
  const isVideo = work.type === 'video' || (work.files?.[0] && work.files?.some(f => {
    const extension = f.fileUrl?.split('.').pop()?.toLowerCase();
    return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '');
  }));

  // 获取图片URLs
  const imageUrls = work.files?.filter(f => {
    const extension = f.fileUrl?.split('.').pop()?.toLowerCase();
    return !['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '');
  }).map(f => f.fileUrl).filter(url => url) as string[] || [];

  // 如果没有contentUrls，使用coverUrl作为fallback
  const displayImages = imageUrls.length > 0 ? imageUrls : (work.files?.[0]?.fileUrl ? [work.files[0].fileUrl] : []);

  return (
    <DouyinWorkCard onClick={() => onClick(work)}>
      <WorkMediaContainer>
        <WorkMedia>
          {isVideo ? (
            // 视频类型：4:3宽高比响应式布局
            <div style={{ paddingBottom: '75%', position: 'relative', height: 0 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <img 
                  src={work.files?.[0]?.thumbnailUrl ?? ''} 
                  alt={work.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <PlayButton>
                  <PlayCircleOutlined />
                </PlayButton>
              </div>
            </div>
          ) : (
            // 图片类型：使用轮播组件，4:3宽高比
            <div style={{ paddingBottom: '75%', position: 'relative', height: 0 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <ImageCarousel 
                  images={displayImages}
                  height="100%"
                  showDots={displayImages.length > 1}
                  showArrows={displayImages.length > 1}
                  autoPlay={false}
                />
              </div>
            </div>
          )}
          {work.isFeatured && <FeaturedBadge>精选</FeaturedBadge>}
        </WorkMedia>
      </WorkMediaContainer>
      <WorkInfo>
        <WorkTitle>{work.title}</WorkTitle>
        <WorkDescription>{work.description}</WorkDescription>
        <WorkMetaInfo>
          <MetaItem>
                        <HeartOutlined /> {work.likeCount}
          </MetaItem>
          <MetaItem>
                        <MessageOutlined /> {work.shareCount}
          </MetaItem>
          <MetaItem>
                        <EyeOutlined /> {work.viewCount}
          </MetaItem>
        </WorkMetaInfo>
        <WorkTagsContainer>
                              {(work.tags ?? []).map((tag: string) => (
            <DouyinTag key={tag}>{tag}</DouyinTag>
          ))}
        </WorkTagsContainer>
      </WorkInfo>
    </DouyinWorkCard>
  );
};

export default WorkCard;
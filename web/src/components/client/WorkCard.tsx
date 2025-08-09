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
  const isVideo = work.type === 'video' || (work.contentUrls && work.contentUrls.some(url => {
    const extension = url.split('.').pop()?.toLowerCase();
    return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '');
  }));

  // 获取图片URLs
  const imageUrls = work.contentUrls?.filter(url => {
    const extension = url.split('.').pop()?.toLowerCase();
    return !['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '');
  }) || [];

  // 如果没有contentUrls，使用coverUrl作为fallback
  const displayImages = imageUrls.length > 0 ? imageUrls : (work.coverUrl ? [work.coverUrl] : []);

  return (
    <DouyinWorkCard onClick={() => onClick(work)}>
      <WorkMediaContainer>
        <WorkMedia>
          {isVideo ? (
            // 视频类型：保持原有样式
            <>
              <img src={work.coverUrl ?? ''} alt={work.title} />
              <PlayButton>
                <PlayCircleOutlined />
              </PlayButton>
            </>
          ) : (
            // 图片类型：使用轮播组件
            <ImageCarousel 
              images={displayImages}
              height="200px"
              showDots={displayImages.length > 1}
              showArrows={displayImages.length > 1}
              autoPlay={false}
            />
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
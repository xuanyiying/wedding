import React from 'react';
import { EyeOutlined, HeartOutlined, MessageOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { type Work } from '../../types';
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
  return (
    <DouyinWorkCard onClick={() => onClick(work)}>
      <WorkMediaContainer>
        <WorkMedia>
                    <img src={work.coverUrl ?? ''} alt={work.title} />
          <PlayButton>
            <PlayCircleOutlined />
          </PlayButton>
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
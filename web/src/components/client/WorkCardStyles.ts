import styled from 'styled-components';

export const DouyinWorkCard = styled.div`
  background: var(--client-bg-container);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--client-shadow-sm);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--client-shadow-lg);
  }
`;

export const WorkMediaContainer = styled.div`
  position: relative;
  width: 100%;
  overflow: hidden;
`;

export const WorkMedia = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  
  &:hover img {
    transform: scale(1.05);
  }
`;

export const PlayButton = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--client-text-inverse);
  font-size: 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
  
  ${WorkMedia}:hover & {
    opacity: 1;
  }
`;

export const FeaturedBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--client-gradient-accent);
  color: var(--client-text-inverse);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: var(--client-shadow-sm);
`;

export const WorkInfo = styled.div`
  padding: 12px;
`;

export const WorkTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: var(--client-text-primary);
  margin: 0 0 6px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const WorkDescription = styled.p`
  font-size: 12px;
  color: var(--client-text-secondary);
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const WorkMetaInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

export const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--client-text-secondary);
  
  .anticon {
    font-size: 12px;
  }
`;

export const WorkTagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

export const DouyinTag = styled.span`
  font-size: 11px;
  color: var(--client-primary-color);
  background: rgba(var(--client-primary-color-rgb), 0.1);
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 500;
`;
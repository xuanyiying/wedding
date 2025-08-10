import React from 'react';
import styled from 'styled-components';

const StyledContentCard = styled.div`
  background: var(--admin-card-bg);
  border-radius: var(--admin-border-radius);
  margin-bottom: 24px;
  box-shadow: var(--admin-card-shadow);
`;

interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const ContentCard: React.FC<ContentCardProps> = ({ children, className, style }) => {
  return (
    <StyledContentCard className={className} style={style}>
      {children}
    </StyledContentCard>
  );
};

export default ContentCard;
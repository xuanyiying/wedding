import React from 'react';
import { Typography } from 'antd';
import styled from 'styled-components';

const { Title, Paragraph } = Typography;

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

const HeaderContainer = styled.div`
  text-align: center;
  margin-bottom: 72px;
`;

const PageTitle = styled(Title)`
  &&& {
    font-size: 2.8rem;
    color: var(--text-primary);
    font-weight: 200;
    letter-spacing: -0.02em;
    position: relative;
    line-height: 1.2;
    margin-bottom: 24px;

    &::after {
      content: '';
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 3px;
      background: var(--gradient-accent);
      border-radius: var(--border-radius-medium);
    }

    @media (max-width: 768px) {
      font-size: 2.2rem;
    }
  }
`;

const PageDescription = styled(Paragraph)`
  &&& {
    font-size: 1.1rem;
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }
`;

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  className
}) => {
  return (
    <HeaderContainer className={className}>
      <PageTitle level={1}>{title}</PageTitle>
      {description && (
        <PageDescription>{description}</PageDescription>
      )}
    </HeaderContainer>
  );
};

export default PageHeader;
export type { PageHeaderProps };
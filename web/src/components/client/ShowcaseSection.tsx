import React from 'react';
import { Typography, Button } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const { Title } = Typography;

interface ShowcaseSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  moreLink?: string;
  moreText?: string;
  id?: string;
}

const SectionContainer = styled.section`
  padding: 80px 0;
  
  &.team-showcase {
    background: var(--background-secondary);
  }
  
  &.portfolio-showcase {
    background: var(--background-primary);
  }
  
  &.works-showcase {
    background: var(--background-secondary);
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`;

const SectionTitle = styled(Title)`
  &&& {
    text-align: center;
    font-size: 2.8rem;
    color: var(--client-text-primary);
    font-weight: 200;
    letter-spacing: -0.02em;
    position: relative;
    line-height: 1.2;
    margin-bottom: 72px;

    &::after {
      content: '';
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 3px;
      background: var(--client-gradient-accent);
      border-radius: var(--client-border-radius);
    }

    @media (max-width: 768px) {
      font-size: 2.2rem;
    }
  }
`;

const MoreButtonContainer = styled.div`
  text-align: center;
  margin-top: 40px;
`;

const ShowcaseSection: React.FC<ShowcaseSectionProps> = ({
  title,
  children,
  className,
  moreLink,
  moreText = '查看更多',
  id
}) => {
  return (
    <SectionContainer className={className} id={id}>
      <Container>
        <SectionTitle level={2}>{title}</SectionTitle>
        {children}
        {moreLink && (
          <MoreButtonContainer>
            <Link to={moreLink}>
              <Button type="default" size="large" icon={<ArrowRightOutlined />}>
                {moreText}
              </Button>
            </Link>
          </MoreButtonContainer>
        )}
      </Container>
    </SectionContainer>
  );
};

export default ShowcaseSection;
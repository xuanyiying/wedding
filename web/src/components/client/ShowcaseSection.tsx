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
    font-size: 2.4rem;
    margin-bottom: 48px;
    color: var(--text-primary);
    font-weight: 300;
    letter-spacing: -0.02em;
    line-height: 1.3;
    position: relative;

    &::before,
    &::after {
      content: '♦';
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      color: var(--primary-main);
      font-size: 1.2rem;
      opacity: 0.6;
    }

    &::before {
      left: calc(50% - 120px);
    }

    &::after {
      right: calc(50% - 120px);
    }

    @media (max-width: 768px) {
      font-size: 2rem;
      
      &::before,
      &::after {
        display: none;
      }
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
import React from 'react';
import { Button, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const { Title, Paragraph } = Typography;

interface HeroSectionProps {
  title: string;
  description: string;
  ctaText?: string;
  ctaLink?: string;
  className?: string;
  backgroundImage?: string;
}

// Hero Section Styles
const HeroContainer = styled.section<{
  backgroundImage?: string;
}>`
  background: ${({ backgroundImage }) => (backgroundImage ? `url(${backgroundImage})` : 'var(--client-gradient-hero)')};
  background-size: cover;
  background-position: center;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--client-text-primary);
  position: relative;
  padding: 120px 32px 80px;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: var(--client-gradient-overlay1);
    animation: float 20s ease-in-out infinite;
  }

  &::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: var(--client-gradient-overlay2);
    animation: float 25s ease-in-out infinite reverse;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(5deg); }
  }

  @media (max-width: 768px) {
    padding: 100px 16px 60px;
  }
`;

const HeroContent = styled.div`
  margin-bottom: 80px;
  position: relative;
  z-index: 2;
  max-width: 800px;
`;

const HeroTitle = styled(Title)`
  &&& {
    font-size: 3.2rem;
    margin-bottom: 32px;
    font-weight: 300;
    letter-spacing: -0.02em;
    line-height: 1.2;
    color: var(--client-text-primary);
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: -16px;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 2px;
      background: var(--client-gradient-accent);
      border-radius: var(--client-border-radius);
    }

    @media (max-width: 768px) {
      font-size: 2.4rem;
    }
  }
`;

const HeroDescription = styled(Paragraph)`
  &&& {
    font-size: 1.1rem;
    margin-bottom: 40px;
    color: var(--client-text-secondary);
    line-height: 1.6;
    font-weight: 400;

    @media (max-width: 768px) {
      font-size: 1rem;
    }
  }
`;

const CTAButton = styled(Button)`
  &&& {
    padding: 14px 36px;
    height: auto;
    background: var(--client-gradient-primary);
    border: 1px solid var(--client-primary-color);
    border-radius: var(--client-border-radius-lg);
    font-weight: 500;
    font-size: 1rem;
    box-shadow: var(--client-shadow-lg);
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    color: var(--client-text-inverse);

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: var(--client-gradient-shine);
      transition: left 0.5s ease;
    }

    &:hover {
      background: var(--client-gradient-primaryHover);
      border-color: var(--client-state-primaryHover);
      transform: translateY(-2px);
      box-shadow: var(--client-shadow-large);
      color: var(--client-text-inverse);

      &::before {
        left: 100%;
      }
    }
  }
`;

const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  description,
  ctaText = '立即咨询',
  ctaLink = '/contact',
  className,
  backgroundImage
}) => {
  return (
    <HeroContainer className={className} id="hero" backgroundImage={backgroundImage}>
      <HeroContent>
        <HeroTitle level={1}>{title}</HeroTitle>
        <HeroDescription>
          {description}
        </HeroDescription>
        {ctaLink && (
          <Link to={ctaLink}>
            <CTAButton type="primary" size="large" icon={<ArrowRightOutlined />}>
              {ctaText}
            </CTAButton>
          </Link>
        )}
      </HeroContent>
    </HeroContainer>
  );
};

export default HeroSection;
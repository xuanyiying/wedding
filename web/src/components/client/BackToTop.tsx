import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { VerticalAlignTopOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { scrollToTop } from '../../utils/scroll';

interface BackToTopProps {
  visibilityHeight?: number;
  className?: string;
}

const BackToTopButton = styled(Button)<{ visible: boolean }>`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--client-primary-color);
  border: none;
  box-shadow: var(--client-shadow-medium);
  transition: all 0.3s ease;
  opacity: ${props => props.visible ? 1 : 0};
  visibility: ${props => props.visible ? 'visible' : 'hidden'};
  transform: ${props => props.visible ? 'translateY(0)' : 'translateY(10px)'};

  &:hover {
    background: var(--client-primary-color-hover);
    transform: translateY(-2px);
    box-shadow: var(--client-shadow-large);
  }

  &:active {
    transform: translateY(0);
  }

  .anticon {
    color: white;
    font-size: 18px;
  }

  @media (max-width: 768px) {
    bottom: 20px;
    right: 20px;
    width: 44px;
    height: 44px;
    
    .anticon {
      font-size: 16px;
    }
  }
`;

const BackToTop: React.FC<BackToTopProps> = ({ 
  visibilityHeight = 300,
  className 
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setVisible(scrollTop > visibilityHeight);
    };

    // 节流处理
    let timeoutId: NodeJS.Timeout;
    const throttledHandleScroll = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(handleScroll, 16); // ~60fps
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    
    // 初始检查
    handleScroll();

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [visibilityHeight]);

  const handleClick = () => {
    scrollToTop();
  };

  return (
    <BackToTopButton
      visible={visible}
      onClick={handleClick}
      className={className}
      icon={<VerticalAlignTopOutlined />}
      title="返回顶部"
    />
  );
};

export default BackToTop;
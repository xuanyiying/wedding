import React, { useState, useRef, useEffect } from 'react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import styled from 'styled-components';

interface ImageCarouselProps {
  images: string[];
  className?: string;
  height?: string;
  showDots?: boolean;
  showArrows?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const CarouselContainer = styled.div<{ height: string }>`
  position: relative;
  width: 100%;
  height: ${props => props.height};
  overflow: hidden;
  border-radius: var(--client-border-radius);
  background: var(--client-bg-layout);
`;

const ImageContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'translateX'
})<{ translateX: number }>`
  display: flex;
  width: 100%;
  height: 100%;
  transform: translateX(${props => props.translateX}%);
  transition: transform 0.3s ease-in-out;
`;

const ImageItem = styled.div`
  flex: 0 0 100%;
  height: 100%;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
  }
`;

const ArrowButton = styled.button<{ direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${props => props.direction}: 12px;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  transition: all 0.2s ease;
  opacity: 0;
  
  &:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: translateY(-50%) scale(1.1);
  }
  
  .anticon {
    color: white;
    font-size: 16px;
  }
`;

const DotsContainer = styled.div`
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 2;
`;

const Dot = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'active'
})<{ active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: ${props => props.active ? 'white' : 'rgba(255, 255, 255, 0.5)'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: white;
    transform: scale(1.2);
  }
`;

const CarouselWrapper = styled.div`
  &:hover {
    ${ArrowButton} {
      opacity: 1;
    }
  }
`;

const ImageCount = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  z-index: 2;
`;

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  className,
  height = '300px',
  showDots = true,
  showArrows = true,
  autoPlay = false,
  autoPlayInterval = 3000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // 如果只有一张图片或没有图片，不显示轮播功能
  if (!images || images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return (
      <CarouselContainer height={height} className={className}>
        <ImageItem>
          <img src={images[0]} alt="作品图片" />
        </ImageItem>
      </CarouselContainer>
    );
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // 自动播放逻辑
  useEffect(() => {
    if (autoPlay && !isHovered) {
      autoPlayRef.current = setInterval(() => {
        goToNext();
      }, autoPlayInterval);
    } else {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [autoPlay, isHovered, autoPlayInterval, currentIndex]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <CarouselWrapper 
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CarouselContainer height={height}>
        <ImageContainer translateX={-currentIndex * 100}>
          {images.map((image, index) => (
            <ImageItem key={index}>
              <img src={image} alt={`作品图片 ${index + 1}`} />
            </ImageItem>
          ))}
        </ImageContainer>

        {showArrows && (
          <>
            <ArrowButton direction="left" onClick={goToPrevious}>
              <LeftOutlined />
            </ArrowButton>
            <ArrowButton direction="right" onClick={goToNext}>
              <RightOutlined />
            </ArrowButton>
          </>
        )}

        {showDots && (
          <DotsContainer>
            {images.map((_, index) => (
              <Dot
                key={index}
                active={index === currentIndex}
                onClick={() => goToSlide(index)}
              />
            ))}
          </DotsContainer>
        )}

        <ImageCount>
          {currentIndex + 1} / {images.length}
        </ImageCount>
      </CarouselContainer>
    </CarouselWrapper>
  );
};

export default ImageCarousel;
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  display: flex;
  flex-direction: column;
`;

const ImageContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'translateX'
}) <{ translateX: number }>`
  display: flex;
  width: 100%;
  flex: 1;
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

const ThumbnailsContainer = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 0;
  justify-content: center;
  background: var(--client-bg-layout);
  overflow-x: auto;
  overflow-y: visible;
  flex-wrap: nowrap;
  
  /* 隐藏滚动条但保持可滚动 */
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }
`;

const Thumbnail = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'active'
}) <{ active: boolean; image: string }>`
  width: 60px;
  height: 40px;
  border-radius: 4px;
  border: ${props => props.active ? '2px solid var(--client-primary-color)' : '2px solid transparent'};
  background-image: url(${props => props.image});
  background-size: cover;
  background-position: center;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  
  &:hover {
    transform: scale(1.1);
  }
`;

const CarouselWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  &:hover {
    ${ArrowButton} {
      opacity: 1;
    }
  }
  
  > div {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
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

  const goToSlide = useCallback((index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(index);
  }, []);

  const goToPrevious = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // 自动播放逻辑
  useEffect(() => {
    if (autoPlay && !isHovered && images && images.length > 1) {
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
  }, [autoPlay, isHovered, autoPlayInterval, currentIndex, images, goToNext]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 如果没有图片，返回null
  if (!images || images.length === 0) {
    return null;
  }

  // 如果只有一张图片，显示简单版本
  if (images.length === 1) {
    return (
      <CarouselContainer height={height} className={className}>
        <ImageItem>
          <img src={images[0]} alt="作品图片" />
        </ImageItem>
      </CarouselContainer>
    );
  }

  return (
    <CarouselWrapper
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleContainerClick}
    >
      <div>
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

          <ImageCount>
            {currentIndex + 1} / {images.length}
          </ImageCount>
        </CarouselContainer>

        {showDots && (
          <ThumbnailsContainer>
            {images.map((image, index) => (
              <Thumbnail
                key={index}
                active={index === currentIndex}
                image={image}
                onClick={(e) => goToSlide(index, e)}
              />
            ))}
          </ThumbnailsContainer>
        )}
      </div>
    </CarouselWrapper>
  );
};

export default ImageCarousel;
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Button, Popconfirm } from 'antd';
import { EyeOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';
import { type MediaFile, FileType } from '../../../types';
import { useResponsive, useTouchDevice } from '../../../hooks/useResponsive';

interface MediaGalleryProps {
  mediaFiles: MediaFile[];
  onPreview: (file: MediaFile) => void;
  onDelete: (fileId: string) => void;
  loading?: boolean;
}

// 动画定义
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const scaleIn = keyframes`
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

// 响应式媒体容器 - 单行居中布局
const MediaGalleryContainer = styled.div<{ $isMobile: boolean; $isTablet: boolean }>`
  width: 100%;
  padding: 0;
  margin: 0;
  
  .media-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    width: 100%;
    padding: 0;
    
    /* 清除默认内外边距 */
    margin: 0;
    list-style: none;
    
    /* 确保完全居中 */
    min-height: 200px;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: ${props => props.$isMobile ? '40px 20px' : '60px 20px'};
    color: #999;
    font-size: ${props => props.$isMobile ? '14px' : '16px'};
    animation: ${fadeIn} 0.3s ease-out;
    min-height: 200px;
    
    .empty-icon {
      font-size: ${props => props.$isMobile ? '32px' : '48px'};
      margin-bottom: 16px;
      opacity: 0.5;
    }
  }
`;

// 媒体项容器 - 单行居中显示
const MediaItem = styled.div<{ $isMobile: boolean; $isTouchDevice: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* 响应式尺寸 */
  width: ${props => props.$isMobile ? '90%' : '80%'};
  max-width: ${props => props.$isMobile ? '350px' : '500px'};
  
  /* 保持媒体比例 - 可根据内容调整 */
  aspect-ratio: ${props => props.$isMobile ? '4/3' : '16/10'};
  
  border-radius: 0;
  overflow: hidden;
  cursor: pointer;
  background: #f5f5f5;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${scaleIn} 0.4s ease-out;
  
  /* 阴影效果 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  
  /* 悬停效果 - 仅在非触摸设备上启用 */
  ${props => !props.$isTouchDevice && `
    &:hover {
      transform: translateY(-6px) scale(1.03);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
      
      .media-overlay {
        opacity: 1;
      }
      
      .media-actions {
        opacity: 1;
        transform: translateY(0);
      }
      
      .media-image {
        transform: scale(1.05);
      }
    }
  `}
  
  /* 触摸设备优化 */
  ${props => props.$isTouchDevice && `
    &:active {
      transform: scale(0.97);
    }
    
    .media-actions {
      opacity: 1;
      transform: translateY(0);
    }
  `}
  
  /* 移动设备特殊处理 */
  ${props => props.$isMobile && `
    &:hover {
      transform: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  `}
`;

// 媒体内容容器
const MediaContent = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  
  .media-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
    user-select: none;
    -webkit-user-drag: none;
  }
  
  .video-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 32px;
    z-index: 2;
    transition: all 0.3s ease;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    
    @media (max-width: 768px) {
      font-size: 24px;
    }
    
    @media (max-width: 480px) {
      font-size: 20px;
    }
  }
  
  .video-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 1;
    transition: background 0.3s ease;
  }
`;

// 媒体遮罩层
const MediaOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.1) 50%,
    rgba(0, 0, 0, 0.3) 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;
`;

// 操作按钮容器
const MediaActions = styled.div<{ $isMobile: boolean }>`
  position: absolute;
  top: ${props => props.$isMobile ? '8px' : '12px'};
  right: ${props => props.$isMobile ? '8px' : '12px'};
  display: flex;
  gap: ${props => props.$isMobile ? '6px' : '8px'};
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 3;
  
  .action-button {
    width: ${props => props.$isMobile ? '32px' : '36px'};
    height: ${props => props.$isMobile ? '32px' : '36px'};
    border-radius: ${props => props.$isMobile ? '6px' : '8px'};
    background: rgba(255, 255, 255, 0.95);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    font-size: ${props => props.$isMobile ? '14px' : '16px'};
    
    &:hover {
      background: white;
      transform: scale(1.1);
    }
    
    &.delete-button:hover {
      background: #ff4d4f;
      color: white;
    }
    
    /* 触摸设备优化 */
    @media (hover: none) {
      &:active {
        transform: scale(0.95);
      }
    }
  }
`;

// 加载占位符
const LoadingPlaceholder = styled.div<{ $isMobile: boolean }>`
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 0;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 24px;
    height: 24px;
    border: 2px solid #d0d0d0;
    border-top: 2px solid #999;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }
`;

// 错误占位符
const ErrorPlaceholder = styled.div<{ $isMobile: boolean }>`
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: ${props => props.$isMobile ? '12px' : '14px'};
  
  .error-icon {
    font-size: ${props => props.$isMobile ? '20px' : '24px'};
    margin-bottom: 8px;
    opacity: 0.5;
  }
`;

const MediaGallery: React.FC<MediaGalleryProps> = ({
  mediaFiles,
  onPreview,
  onDelete,
  loading = false
}) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 响应式信息
  const responsive = useResponsive();
  const isTouchDevice = useTouchDevice();
  
  // 计算响应式属性
  const responsiveProps = useMemo(() => ({
    isMobile: responsive.isMobile,
    isTablet: responsive.isTablet,
    isDesktop: responsive.isDesktop,
    isTouchDevice,
  }), [responsive.isMobile, responsive.isTablet, responsive.isDesktop, isTouchDevice]);

  // 图片加载完成处理
  const handleImageLoad = useCallback((fileId: string) => {
    setLoadedImages(prev => new Set([...prev, fileId]));
    setErrorImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  }, []);

  // 图片加载错误处理
  const handleImageError = useCallback((fileId: string) => {
    setErrorImages(prev => new Set([...prev, fileId]));
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  }, []);

  // 触摸开始处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ 
      x: touch.clientX, 
      y: touch.clientY, 
      time: Date.now() 
    });
  }, []);

  // 触摸结束处理
  const handleTouchEnd = useCallback((e: React.TouchEvent, file: MediaFile) => {
    if (!touchStart) return;
    
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStart.x);
    const deltaY = Math.abs(touch.clientY - touchStart.y);
    const deltaTime = Date.now() - touchStart.time;
    
    // 如果移动距离很小且时间很短，认为是点击
    if (deltaX < 10 && deltaY < 10 && deltaTime < 500) {
      onPreview(file);
    }
    
    setTouchStart(null);
  }, [touchStart, onPreview]);

  // 渲染媒体项
  const renderMediaItem = useCallback((file: MediaFile) => {
    const fileId = file.id || '';
    const isLoaded = loadedImages.has(fileId);
    const hasError = errorImages.has(fileId);
    const isVideo = file.fileType === FileType.VIDEO;
    
    return (
      <MediaItem
        key={fileId}
        $isMobile={responsiveProps.isMobile}
        $isTouchDevice={responsiveProps.isTouchDevice}
        onClick={() => onPreview(file)}
        onTouchStart={handleTouchStart}
        onTouchEnd={(e) => handleTouchEnd(e, file)}
      >
        <MediaContent>
          {!isLoaded && !hasError && (
            <LoadingPlaceholder $isMobile={responsiveProps.isMobile} />
          )}
          
          {hasError && (
            <ErrorPlaceholder $isMobile={responsiveProps.isMobile}>
              <div className="error-icon">📷</div>
              <div>加载失败</div>
            </ErrorPlaceholder>
          )}
          
          {isVideo && file.thumbnailUrl ? (
            <>
              <img
                className="media-image"
                src={file.thumbnailUrl}
                alt="视频缩略图"
                onLoad={() => handleImageLoad(fileId)}
                onError={() => handleImageError(fileId)}
                style={{ display: isLoaded ? 'block' : 'none' }}
              />
              <div className="video-background" />
              <div className="video-overlay">
                <PlayCircleOutlined />
              </div>
            </>
          ) : (
            <img
              className="media-image"
              src={file.fileUrl}
              alt="媒体文件"
              onLoad={() => handleImageLoad(fileId)}
              onError={() => handleImageError(fileId)}
              style={{ display: isLoaded ? 'block' : 'none' }}
            />
          )}
        </MediaContent>
        
        <MediaOverlay className="media-overlay" />
        
        <MediaActions 
          className="media-actions"
          $isMobile={responsiveProps.isMobile}
        >
          <Button
            className="action-button"
            icon={<EyeOutlined />}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(file);
            }}
          />
          <Popconfirm
            title="确定要删除这个文件吗？"
            onConfirm={(e) => {
              e?.stopPropagation();
              onDelete(fileId);
            }}
            okText="确定"
            cancelText="取消"
          >
            <Button
              className="action-button delete-button"
              icon={<DeleteOutlined />}
              size="small"
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </MediaActions>
      </MediaItem>
    );
  }, [
    loadedImages, 
    errorImages, 
    responsiveProps, 
    handleImageLoad, 
    handleImageError, 
    handleTouchStart, 
    handleTouchEnd, 
    onPreview, 
    onDelete
  ]);

  // 过滤有效的媒体文件
  const validMediaFiles = useMemo(() => {
    return mediaFiles.filter(file => file && file.id && file.fileUrl);
  }, [mediaFiles]);

  // 如果正在加载，显示加载占位符
  if (loading) {
    const placeholderCount = responsiveProps.isMobile ? 2 : 3;
    
    return (
      <MediaGalleryContainer 
        ref={containerRef}
        $isMobile={responsiveProps.isMobile}
        $isTablet={responsiveProps.isTablet}
      >
        <div className="media-list">
          {Array.from({ length: placeholderCount }).map((_, index) => (
            <MediaItem
              key={index}
              $isMobile={responsiveProps.isMobile}
              $isTouchDevice={responsiveProps.isTouchDevice}
            >
              <LoadingPlaceholder $isMobile={responsiveProps.isMobile} />
            </MediaItem>
          ))}
        </div>
      </MediaGalleryContainer>
    );
  }

  return (
    <MediaGalleryContainer 
      ref={containerRef}
      $isMobile={responsiveProps.isMobile}
      $isTablet={responsiveProps.isTablet}
    >
      {validMediaFiles.length > 0 ? (
        <div className="media-list">
          {validMediaFiles.map(renderMediaItem)}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📷</div>
          <div>暂无媒体文件</div>
        </div>
      )}
    </MediaGalleryContainer>
  );
};

export default MediaGallery;
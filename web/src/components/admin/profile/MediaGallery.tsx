import React, { useState, useCallback, useMemo } from "react";
import { Button, Popconfirm } from "antd";
import {
  EyeOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  UpOutlined,
  DownOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import { type MediaFile, FileType } from "../../../types";
import { useResponsive, useTouchDevice } from "../../../hooks/useResponsive";

interface MediaGalleryProps {
  mediaFiles: MediaFile[];
  onPreview: (file: MediaFile) => void;
  onDelete: (fileId: string) => void;
  onReorder?: (newOrder: MediaFile[]) => void;
  loading?: boolean;
}

// 响应式媒体容器 - 单列纵向布局，无间距
const MediaGalleryContainer = styled.div<{
  $isMobile: boolean;
  $isTablet: boolean;
}>`
  width: 100%;
  padding: 0;
  margin: 0;

  .media-list {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0;
    margin: 0;
    list-style: none;
    gap: 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: ${(props) => (props.$isMobile ? "40px 20px" : "60px 20px")};
    color: #999;
    font-size: ${(props) => (props.$isMobile ? "14px" : "16px")};
    min-height: 200px;

    .empty-icon {
      font-size: ${(props) => (props.$isMobile ? "32px" : "48px")};
      margin-bottom: 16px;
      opacity: 0.5;
    }
  }
`;

// 媒体项容器 - 单列纵向布局，无圆角，无间距
const MediaItem = styled.div<{
  $isMobile: boolean;
  $isTouchDevice: boolean;
}>`
  position: relative;
  display: block;
  width: 100%;
  border: none;
  border-radius: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background: transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  ${(props) =>
    !props.$isTouchDevice &&
    `
    &:hover {
      .media-overlay {
        opacity: 1;
      }
      
      .media-actions {
        opacity: 1;
        transform: translateY(0);
      }

      .order-controls {
        opacity: 1;
      }
    }
  `}
`;

const MediaContent = styled.div`
  position: relative;
  width: 100%;
  background: #f0f0f0;
  overflow: hidden;

  .media-image {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  .video-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
    pointer-events: none;
  }

  .video-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #333;
    font-size: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
  }
`;

const MediaOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
`;

const MediaActions = styled.div<{ $isMobile: boolean }>`
  position: absolute;
  bottom: ${(props) => (props.$isMobile ? "10px" : "20px")};
  right: ${(props) => (props.$isMobile ? "10px" : "20px")};
  display: flex;
  gap: 8px;
  opacity: ${(props) => (props.$isMobile ? "1" : "0")};
  transform: ${(props) => (props.$isMobile ? "translateY(0)" : "translateY(10px)")};
  transition: all 0.3s ease;
  z-index: 10;

  .action-button {
    background: rgba(255, 255, 255, 0.9);
    border: none;
    backdrop-filter: blur(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    
    &:hover {
      background: #fff;
      transform: translateY(-2px);
    }

    &.delete-button:hover {
      color: #ff4d4f;
    }
  }
`;

const OrderControls = styled.div<{ $isMobile: boolean }>`
  position: absolute;
  top: ${(props) => (props.$isMobile ? "10px" : "20px")};
  left: ${(props) => (props.$isMobile ? "10px" : "20px")};
  display: flex;
  flex-direction: column;
  gap: 4px;
  opacity: ${(props) => (props.$isMobile ? "1" : "0")};
  transition: opacity 0.3s ease;
  z-index: 10;

  .order-button {
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #666;
    transition: all 0.2s ease;

    &:hover {
      background: #fff;
      color: #1890ff;
    }
  }
`;

const LoadingPlaceholder = styled.div<{ $isMobile: boolean }>`
  width: 100%;
  aspect-ratio: 16/9;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: "";
    width: 24px;
    height: 24px;
    border: 2px solid #d0d0d0;
    border-top: 2px solid #999;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorPlaceholder = styled.div<{ $isMobile: boolean }>`
  width: 100%;
  aspect-ratio: 16/9;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
`;

const MediaGallery: React.FC<MediaGalleryProps> = ({
  mediaFiles,
  onPreview,
  onDelete,
  onReorder,
  loading = false,
}) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const responsive = useResponsive();
  const isTouchDevice = useTouchDevice();

  const responsiveProps = useMemo(() => ({
    isMobile: responsive.isMobile,
    isTablet: responsive.isTablet,
    isTouchDevice,
  }), [responsive.isMobile, responsive.isTablet, isTouchDevice]);

  const sortedMediaFiles = useMemo(() => {
    return [...mediaFiles].sort((a, b) => (a.mediaOrder ?? 0) - (b.mediaOrder ?? 0));
  }, [mediaFiles]);

  const handleImageLoad = useCallback((id: string) => {
    setLoadedImages(prev => new Set(prev).add(id));
  }, []);

  const handleImageError = useCallback((id: string) => {
    setErrorImages(prev => new Set(prev).add(id));
  }, []);

  const handlePreview = useCallback((file: MediaFile) => {
    if (file.fileType === FileType.VIDEO && file.fileUrl) {
      setPlayingVideoId(file.id ?? null);
    } else {
      onPreview(file);
    }
  }, [onPreview]);

  const handleMoveUp = useCallback((file: MediaFile) => {
    if (!onReorder) return;
    const currentIndex = sortedMediaFiles.findIndex(f => f.id === file.id);
    if (currentIndex === -1) return;

    let newFiles: MediaFile[];
    if (currentIndex === 0) {
      const maxOrder = Math.max(...sortedMediaFiles.map(f => f.mediaOrder ?? 0));
      newFiles = sortedMediaFiles.map(f => f.id === file.id ? { ...f, mediaOrder: maxOrder + 1 } : f);
    } else {
      const targetFile = sortedMediaFiles[currentIndex - 1];
      const currentOrder = file.mediaOrder ?? currentIndex;
      const targetOrder = targetFile.mediaOrder ?? currentIndex - 1;
      newFiles = sortedMediaFiles.map(f => {
        if (f.id === file.id) return { ...f, mediaOrder: targetOrder };
        if (f.id === targetFile.id) return { ...f, mediaOrder: currentOrder };
        return f;
      });
    }
    onReorder(newFiles);
  }, [sortedMediaFiles, onReorder]);

  const handleMoveDown = useCallback((file: MediaFile) => {
    if (!onReorder) return;
    const currentIndex = sortedMediaFiles.findIndex(f => f.id === file.id);
    if (currentIndex === -1) return;

    let newFiles: MediaFile[];
    if (currentIndex === sortedMediaFiles.length - 1) {
      const minOrder = Math.min(...sortedMediaFiles.map(f => f.mediaOrder ?? 0));
      newFiles = sortedMediaFiles.map(f => f.id === file.id ? { ...f, mediaOrder: minOrder - 1 } : f);
    } else {
      const targetFile = sortedMediaFiles[currentIndex + 1];
      const currentOrder = file.mediaOrder ?? currentIndex;
      const targetOrder = targetFile.mediaOrder ?? currentIndex + 1;
      newFiles = sortedMediaFiles.map(f => {
        if (f.id === file.id) return { ...f, mediaOrder: targetOrder };
        if (f.id === targetFile.id) return { ...f, mediaOrder: currentOrder };
        return f;
      });
    }
    onReorder(newFiles);
  }, [sortedMediaFiles, onReorder]);

  const renderMediaItem = useCallback((file: MediaFile) => {
    const id = file.id;
    if (!id) return null;
    
    const isVideo = file.fileType === FileType.VIDEO;
    const isLoaded = loadedImages.has(id);
    const hasError = errorImages.has(id);
    const isPlaying = playingVideoId === id;

    return (
      <MediaItem
        key={id}
        $isMobile={responsiveProps.isMobile}
        $isTouchDevice={responsiveProps.isTouchDevice}
        onClick={() => handlePreview(file)}
      >
        <MediaContent>
          {!isLoaded && !hasError && !isPlaying && (
            <LoadingPlaceholder $isMobile={responsiveProps.isMobile} />
          )}

          {hasError && (
            <ErrorPlaceholder $isMobile={responsiveProps.isMobile}>
              <div>加载失败</div>
            </ErrorPlaceholder>
          )}

          {isVideo ? (
            isPlaying ? (
              <video
                src={file.fileUrl}
                autoPlay
                controls
                playsInline
                style={{ width: "100%", display: "block" }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                {file.thumbnailUrl ? (
                  <img
                    className="media-image"
                    src={file.thumbnailUrl}
                    alt=""
                    onLoad={() => handleImageLoad(id)}
                    onError={() => handleImageError(id)}
                    style={{ display: isLoaded ? "block" : "none" }}
                  />
                ) : (
                  <div style={{ background: "#2a2a2a", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <VideoCameraOutlined style={{ fontSize: "32px", color: "rgba(255,255,255,0.4)" }} />
                  </div>
                )}
                <div className="video-background" />
                <div className="video-overlay">
                  <PlayCircleOutlined />
                </div>
              </>
            )
          ) : (
            <img
              className="media-image"
              src={file.fileUrl}
              alt=""
              onLoad={() => handleImageLoad(id)}
              onError={() => handleImageError(id)}
              style={{ display: isLoaded ? "block" : "none" }}
            />
          )}
        </MediaContent>

        <MediaOverlay className="media-overlay" />

        <OrderControls className="order-controls" $isMobile={responsiveProps.isMobile}>
          <button className="order-button" onClick={(e) => { e.stopPropagation(); handleMoveUp(file); }}><UpOutlined /></button>
          <button className="order-button" onClick={(e) => { e.stopPropagation(); handleMoveDown(file); }}><DownOutlined /></button>
        </OrderControls>

        <MediaActions className="media-actions" $isMobile={responsiveProps.isMobile}>
          <Button
            className="action-button"
            icon={<EyeOutlined />}
            size="small"
            onClick={(e) => { e.stopPropagation(); handlePreview(file); }}
          />
          <Popconfirm
            title="确定要删除？"
            onConfirm={(e) => { e?.stopPropagation(); onDelete(id); }}
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
  }, [loadedImages, errorImages, playingVideoId, responsiveProps, sortedMediaFiles, handleImageLoad, handleImageError, handlePreview, handleMoveUp, handleMoveDown, onDelete]);

  const validMediaFiles = useMemo(() => {
    return sortedMediaFiles.filter((file) => file && file.id && file.fileUrl);
  }, [sortedMediaFiles]);

  return (
    <MediaGalleryContainer $isMobile={responsiveProps.isMobile} $isTablet={responsiveProps.isTablet}>
      {loading ? (
        <div className="media-list">
          <LoadingPlaceholder $isMobile={responsiveProps.isMobile} />
        </div>
      ) : (
        <div className="media-list">
          {validMediaFiles.length > 0 ? (
            validMediaFiles.map((file) => renderMediaItem(file))
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><VideoCameraOutlined /></div>
              <div>暂无媒体文件</div>
            </div>
          )}
        </div>
      )}
    </MediaGalleryContainer>
  );
};

export default MediaGallery;

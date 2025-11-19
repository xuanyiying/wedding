import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Button, Popconfirm } from "antd";
import {
  EyeOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  UpOutlined,
  DownOutlined,
  CloseOutlined,
  DragOutlined,
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
    /* 移除所有间距，实现无缝拼接 */
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

  /* 移除固定宽高比，让图片决定高度 */
  /* 移除所有边框、圆角、间距 */
  border: none;
  border-radius: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background: transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  /* 悬停效果 - 仅在非触摸设备上启用 */
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
    }
  `}

  /* 触摸设备优化 */
  ${(props) =>
    props.$isTouchDevice &&
    `
    .media-actions {
      opacity: 1;
      transform: translateY(0);
    }
  `}
  
  /* 顺序控制按钮始终可见 */
  .order-controls {
    opacity: 1 !important;
  }
`;

// 媒体内容容器
const MediaContent = styled.div`
  position: relative;
  width: 100%;
  display: block;
  overflow: hidden;
  /* 移除圆角 */
  border-radius: 0;
  /* 移除所有间距 */
  margin: 0;
  padding: 0;

  .media-image {
    width: 100%;
    height: auto;
    display: block;
    /* 保持图片原始比例，宽度填满容器 */
    object-fit: cover;
    transition: transform 0.3s ease;
    user-select: none;
    -webkit-user-drag: none;
    /* 移除图片间距 */
    margin: 0;
    padding: 0;
    vertical-align: top;
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

// 顺序控制按钮容器
const OrderControls = styled.div<{ $isMobile: boolean }>`
  position: absolute;
  left: ${(props) => (props.$isMobile ? "8px" : "12px")};
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: ${(props) => (props.$isMobile ? "4px" : "6px")};
  opacity: 1;
  transition: all 0.3s ease;
  z-index: 4;

  .order-button {
    width: ${(props) => (props.$isMobile ? "28px" : "32px")};
    height: ${(props) => (props.$isMobile ? "28px" : "32px")};
    border-radius: 0;
    background: rgba(255, 255, 255, 0.95);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    font-size: ${(props) => (props.$isMobile ? "12px" : "14px")};
    color: #666;

    &:hover {
      background: white;
      transform: scale(1.1);
      color: #1890ff;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;

      &:hover {
        transform: none;
        color: #666;
      }
    }

    /* 触摸设备优化 */
    @media (hover: none) {
      &:active {
        transform: scale(0.95);
      }
    }
  }
`;

// 操作按钮容器
const MediaActions = styled.div<{ $isMobile: boolean }>`
  position: absolute;
  top: ${(props) => (props.$isMobile ? "8px" : "12px")};
  right: ${(props) => (props.$isMobile ? "8px" : "12px")};
  display: flex;
  gap: ${(props) => (props.$isMobile ? "6px" : "8px")};
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 3;

  .action-button {
    width: ${(props) => (props.$isMobile ? "32px" : "36px")};
    height: ${(props) => (props.$isMobile ? "32px" : "36px")};
    border-radius: 0;
    background: rgba(255, 255, 255, 0.95);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    font-size: ${(props) => (props.$isMobile ? "14px" : "16px")};

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
  height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 0;
  position: relative;

  &::after {
    content: "";
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
    0% {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    100% {
      transform: translate(-50%, -50%) rotate(360deg);
    }
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
  font-size: ${(props) => (props.$isMobile ? "12px" : "14px")};

  .error-icon {
    font-size: ${(props) => (props.$isMobile ? "20px" : "24px")};
    margin-bottom: 8px;
    opacity: 0.5;
  }
`;

// 视频播放器背景遮罩
const VideoPlayerOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
`;

// 视频播放器容器（可拖动）
const VideoPlayerContainer = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  left: ${props => props.$x}px;
  top: ${props => props.$y}px;
  z-index: 1001;
  background: rgba(0, 0, 0, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
`;

// 拖动手柄
const DragHandle = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  cursor: move;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  
  .drag-icon {
    color: rgba(255, 255, 255, 0.6);
    font-size: 16px;
  }
`;

const VideoPlayerElement = styled.video`
  width: 100%;
  height: auto;
  max-width: 90vw;
  max-height: calc(90vh - 100px);
  display: block;
`;

const VideoCloseButton = styled.div`
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const VideoControls = styled.div`
  background: rgba(0, 0, 0, 0.6);
  padding: 12px 20px;
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
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
  const [touchStart, setTouchStart] = useState<{
    x: number;
    y: number;
    time: number;
  } | null>(null);
  const [playingVideo, setPlayingVideo] = useState<MediaFile | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // 响应式信息
  const responsive = useResponsive();
  const isTouchDevice = useTouchDevice();

  // 计算响应式属性
  const responsiveProps = useMemo(
    () => ({
      isMobile: responsive.isMobile,
      isTablet: responsive.isTablet,
      isDesktop: responsive.isDesktop,
      isTouchDevice,
    }),
    [
      responsive.isMobile,
      responsive.isTablet,
      responsive.isDesktop,
      isTouchDevice,
    ],
  );

  // 根据mediaOrder属性排序媒体文件
  const sortedMediaFiles = useMemo(() => {
    return [...mediaFiles].sort((a, b) => {
      const orderA = a.mediaOrder ?? 0;
      const orderB = b.mediaOrder ?? 0;
      return orderA - orderB;
    });
  }, [mediaFiles]);

  // 图片加载完成处理
  const handleImageLoad = useCallback((fileId: string) => {
    setLoadedImages((prev) => new Set([...prev, fileId]));
    setErrorImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  }, []);

  // 图片加载错误处理
  const handleImageError = useCallback((fileId: string) => {
    setErrorImages((prev) => new Set([...prev, fileId]));
    setLoadedImages((prev) => {
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
      time: Date.now(),
    });
  }, []);

  // 居中视频播放器
  const centerVideoPlayer = useCallback(() => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const playerWidth = Math.min(windowWidth * 0.9, 1200);
    const playerHeight = Math.min(windowHeight * 0.9, 800);

    setPosition({
      x: (windowWidth - playerWidth) / 2,
      y: (windowHeight - playerHeight) / 2
    });
  }, []);

  // 处理预览 - 视频播放或图片预览
  const handlePreview = useCallback((file: MediaFile) => {
    if (file.fileType === FileType.VIDEO && file.fileUrl) {
      setPlayingVideo(file);
      setIsPaused(false);
      centerVideoPlayer();
    } else {
      onPreview(file);
    }
  }, [centerVideoPlayer, onPreview]);

  // 触摸结束处理
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent, file: MediaFile) => {
      if (!touchStart) return;

      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStart.x);
      const deltaY = Math.abs(touch.clientY - touchStart.y);
      const deltaTime = Date.now() - touchStart.time;

      // 如果移动距离很小且时间很短，认为是点击
      if (deltaX < 10 && deltaY < 10 && deltaTime < 500) {
        handlePreview(file);
      }

      setTouchStart(null);
    },
    [touchStart, handlePreview],
  );

  // 关闭视频播放
  const handleCloseVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setPlayingVideo(null);
    setIsPaused(false);
  }, []);

  // 处理视频点击（暂停/播放）
  const handleVideoClick = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  }, []);

  // 开始拖动
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position.x, position.y]);

  // 拖动中
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // 限制在窗口范围内
      const maxX = window.innerWidth - (videoContainerRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (videoContainerRef.current?.offsetHeight || 0);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  }, [isDragging, dragStart.x, dragStart.y]);

  // 结束拖动
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (playingVideo) {
        if (e.key === 'Escape') {
          handleCloseVideo();
        } else if (e.key === ' ') {
          e.preventDefault();
          handleVideoClick();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [playingVideo, handleCloseVideo, handleVideoClick]);

  // 拖动事件处理
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // 窗口大小变化时重新居中
  useEffect(() => {
    if (playingVideo) {
      const handleResize = () => centerVideoPlayer();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [playingVideo, centerVideoPlayer]);

  /**
   * 顺序调整核心逻辑 - 上移操作
   * 处理媒体文件的上移操作，确保mediaOrder值的连续性和唯一性
   */
  const handleMoveUp = useCallback(
    (file: MediaFile) => {
      if (!onReorder) {
        console.log("🔼 onReorder回调不存在");
        return;
      }

      console.log("🔼 开始上移操作:", {
        id: file.id,
        currentOrder: file.mediaOrder,
        sortedFiles: sortedMediaFiles.map((f) => ({
          id: f.id,
          order: f.mediaOrder,
        })),
      });

      const currentIndex = sortedMediaFiles.findIndex((f) => f.id === file.id);

      if (currentIndex === -1) {
        console.error("🔼 找不到当前文件");
        return;
      }

      let newFiles: MediaFile[];

      // 边界情况：如果是第一个文件，移动到末尾
      if (currentIndex === 0) {
        console.log("🔼 边界情况：移动到末尾");
        // 获取最大的mediaOrder值
        const maxOrder = Math.max(
          ...sortedMediaFiles.map((f) => f.mediaOrder ?? 0),
        );
        newFiles = sortedMediaFiles.map((f) =>
          f.id === file.id ? { ...f, mediaOrder: maxOrder + 1 } : f,
        );
      } else {
        console.log("🔼 正常情况：与上一个文件交换");
        // 正常情况：与上一个文件交换位置
        const targetFile = sortedMediaFiles[currentIndex - 1];
        const currentOrder = file.mediaOrder ?? currentIndex;
        const targetOrder = targetFile.mediaOrder ?? currentIndex - 1;

        newFiles = sortedMediaFiles.map((f) => {
          if (f.id === file.id) {
            return { ...f, mediaOrder: targetOrder };
          }
          if (f.id === targetFile.id) {
            return { ...f, mediaOrder: currentOrder };
          }
          return f;
        });
      }

      console.log(
        "🔼 新的文件顺序:",
        newFiles.map((f) => ({ id: f.id, order: f.mediaOrder })),
      );

      // 直接调用onReorder
      onReorder(newFiles);
    },
    [sortedMediaFiles, onReorder],
  );

  /**
   * 顺序调整核心逻辑 - 下移操作
   * 处理媒体文件的下移操作，确保mediaOrder值的连续性和唯一性
   */
  const handleMoveDown = useCallback(
    (file: MediaFile) => {
      if (!onReorder) {
        console.log("🔽 onReorder回调不存在");
        return;
      }

      console.log("🔽 开始下移操作:", {
        id: file.id,
        currentOrder: file.mediaOrder,
        sortedFiles: sortedMediaFiles.map((f) => ({
          id: f.id,
          order: f.mediaOrder,
        })),
      });

      const currentIndex = sortedMediaFiles.findIndex((f) => f.id === file.id);

      if (currentIndex === -1) {
        console.error("🔽 找不到当前文件");
        return;
      }

      let newFiles: MediaFile[];

      // 边界情况：如果是最后一个文件，移动到开头
      if (currentIndex === sortedMediaFiles.length - 1) {
        console.log("🔽 边界情况：移动到开头");
        // 将当前文件设为0，其他文件的mediaOrder+1
        const minOrder = Math.min(
          ...sortedMediaFiles.map((f) => f.mediaOrder ?? 0),
        );
        newFiles = sortedMediaFiles.map((f) =>
          f.id === file.id ? { ...f, mediaOrder: minOrder - 1 } : f,
        );
      } else {
        console.log("🔽 正常情况：与下一个文件交换");
        // 正常情况：与下一个文件交换位置
        const targetFile = sortedMediaFiles[currentIndex + 1];
        const currentOrder = file.mediaOrder ?? currentIndex;
        const targetOrder = targetFile.mediaOrder ?? currentIndex + 1;

        newFiles = sortedMediaFiles.map((f) => {
          if (f.id === file.id) {
            return { ...f, mediaOrder: targetOrder };
          }
          if (f.id === targetFile.id) {
            return { ...f, mediaOrder: currentOrder };
          }
          return f;
        });
      }

      console.log(
        "🔽 新的文件顺序:",
        newFiles.map((f) => ({ id: f.id, order: f.mediaOrder })),
      );

      // 直接调用onReorder
      onReorder(newFiles);
    },
    [sortedMediaFiles, onReorder],
  );

  // 渲染媒体项
  const renderMediaItem = useCallback(
    (file: MediaFile, index: number) => {
      const id = file.id || "";
      const isLoaded = loadedImages.has(id);
      const hasError = errorImages.has(id);
      const isVideo = file.fileType === FileType.VIDEO;
      const isFirst = index === 0;
      const isLast = index === sortedMediaFiles.length - 1;

      return (
        <MediaItem
          key={id}
          $isMobile={responsiveProps.isMobile}
          $isTouchDevice={responsiveProps.isTouchDevice}
          onClick={() => handlePreview(file)}
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
                  onLoad={() => handleImageLoad(id)}
                  onError={() => handleImageError(id)}
                  style={{ display: isLoaded ? "block" : "none" }}
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
                onLoad={() => handleImageLoad(id)}
                onError={() => handleImageError(id)}
                style={{ display: isLoaded ? "block" : "none" }}
              />
            )}
          </MediaContent>

          <MediaOverlay className="media-overlay" />

          {/* 顺序控制按钮 */}
          <OrderControls
            className="order-controls"
            $isMobile={responsiveProps.isMobile}
          >
            <button
              className="order-button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("🔼 按钮点击事件触发", {
                  id: file.id,
                  currentOrder: file.mediaOrder,
                });
                handleMoveUp(file);
              }}
              title={isFirst ? "移至末尾" : "上移"}
              type="button"
            >
              <UpOutlined />
            </button>
            <button
              className="order-button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("🔽 按钮点击事件触发", {
                  id: file.id,
                  currentOrder: file.mediaOrder,
                });
                handleMoveDown(file);
              }}
              title={isLast ? "移至开头" : "下移"}
              type="button"
            >
              <DownOutlined />
            </button>
          </OrderControls>

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
                handlePreview(file);
              }}
            />
            <Popconfirm
              title="确定要删除这个文件吗？"
              onConfirm={(e) => {
                e?.stopPropagation();
                onDelete(id);
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
    },
    [
      loadedImages,
      errorImages,
      responsiveProps,
      sortedMediaFiles,
      handleImageLoad,
      handleImageError,
      handleTouchStart,
      handleTouchEnd,
      handleMoveUp,
      handleMoveDown,
      handlePreview,
      onDelete,
    ],
  );

  // 过滤有效的媒体文件（使用排序后的文件列表）
  const validMediaFiles = useMemo(() => {
    return sortedMediaFiles.filter((file) => file && file.id && file.fileUrl);
  }, [sortedMediaFiles]);

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
    <>
      <MediaGalleryContainer
        ref={containerRef}
        $isMobile={responsiveProps.isMobile}
        $isTablet={responsiveProps.isTablet}
      >
        {validMediaFiles.length > 0 ? (
          <div className="media-list">
            {validMediaFiles.map((file, index) => renderMediaItem(file, index))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📷</div>
            <div>暂无媒体文件</div>
          </div>
        )}
      </MediaGalleryContainer>

      {/* 视频播放器 */}
      {playingVideo && (
        <>
          <VideoPlayerOverlay onClick={handleCloseVideo} />
          <VideoPlayerContainer
            ref={videoContainerRef}
            $x={position.x}
            $y={position.y}
          >
            <DragHandle onMouseDown={handleDragStart}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.8)' }}>
                <DragOutlined className="drag-icon" />
                <span style={{ fontSize: '14px' }}>拖动移动窗口</span>
              </div>
              <VideoCloseButton onClick={handleCloseVideo}>
                <CloseOutlined />
              </VideoCloseButton>
            </DragHandle>
            <VideoPlayerElement
              ref={videoRef}
              src={playingVideo.fileUrl}
              autoPlay
              controls={false}
              onClick={handleVideoClick}
            />
            <VideoControls>
              {isPaused ? '点击播放' : '点击暂停'} | 按空格键切换 | 按ESC退出
            </VideoControls>
          </VideoPlayerContainer>
        </>
      )}
    </>
  );
};

export default MediaGallery;

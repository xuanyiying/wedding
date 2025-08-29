import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Button, Upload, Slider, message, Spin, Alert } from 'antd';
import { UploadOutlined, PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, DragOutlined, ExclamationCircleOutlined, CameraOutlined } from '@ant-design/icons';
import type { VideoCoverSelection } from './types';
import { VideoFrameExtractor, type VideoFrame } from '../../../utils/video-frame-extractor';
import './VideoCoverModal.scss';
import { useAppSelector } from '../../../store/hooks';
import { selectIsAuthenticated } from '../../../store/slices/authSlice';
interface VideoCoverModalProps {
  visible: boolean;
  videoFile: File | null;
  onCancel: () => void;
  onConfirm: (selection: VideoCoverSelection) => void;
}

const VideoCoverModal: React.FC<VideoCoverModalProps> = ({
  visible,
  videoFile,
  onCancel,
  onConfirm
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [selectedCover, setSelectedCover] = useState<{ type: 'frame' | 'upload', data: VideoFrame | File } | null>(null);
  const [uploadedCoverUrl, setUploadedCoverUrl] = useState<string>('');
  const [extractedFrames, setExtractedFrames] = useState<VideoFrame[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const extractorRef = useRef<VideoFrameExtractor | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // 初始化视频和清理资源
  useEffect(() => {
    if (videoFile && visible) {
      initializeVideo();
    }

    return () => {
      cleanupResources();
    };
  }, [videoFile, visible]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  const initializeVideo = async () => {
    try {
      setError(null);
      setLoading(true);

      // 清理之前的资源
      cleanupResources();

      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();

      // 创建视频 URL
      const url = URL.createObjectURL(videoFile!);
      blobUrlsRef.current.add(url);
      setVideoUrl(url);

      // 初始化提取器
      await initializeExtractor();

    } catch (error) {
      console.error('视频初始化失败:', error);
      setError(error instanceof Error ? error.message : '视频初始化失败');
      message.error('视频初始化失败');
    } finally {
      setLoading(false);
    }
  };

  const initializeExtractor = async () => {
    if (!videoFile) return;

    try {
      // 销毁旧的提取器
      if (extractorRef.current) {
        extractorRef.current.destroy();
      }

      // 创建新的提取器
      extractorRef.current = new VideoFrameExtractor();

    } catch (error) {
      console.error('提取器初始化失败:', error);
      throw new Error('视频帧提取器初始化失败');
    }
  };

  const cleanupResources = () => {
    // 取消正在进行的操作
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 清理视频 URL
    blobUrlsRef.current.forEach(url => {
      URL.revokeObjectURL(url);
    });
    blobUrlsRef.current.clear();

    // 清理提取器
    if (extractorRef.current) {
      extractorRef.current.destroy();
      extractorRef.current = null;
    }

    // 清理已提取的帧
    extractedFrames.forEach(frame => {
      if ((frame as any).dispose) {
        (frame as any).dispose();
      }
    });

    // 清理上传的封面 URL
    if (uploadedCoverUrl) {
      URL.revokeObjectURL(uploadedCoverUrl);
    }
  };

  // 视频加载完成
  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setCurrentTime(0);
      // 自动提取关键帧
      extractKeyFrames();
    }
  };

  // 提取关键帧（优化版本 - 快速生成缩略图）
  const extractKeyFrames = async () => {
    if (!videoFile || !extractorRef.current) return;

    setIsExtracting(true);
    setError(null);

    try {
      // 检查是否被取消
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('操作已取消');
      }

      // 清理之前的帧
      extractedFrames.forEach(frame => {
        if ((frame as any).dispose) {
          (frame as any).dispose();
        }
      });
      setExtractedFrames([]);

      // 优化参数：生成8个关键帧，小尺寸快速加载
      const frames = await extractorRef.current.extractFrames(videoFile, {
        frameCount: 8,
        quality: 0.6, // 适中质量保证清晰度
        format: 'image/jpeg',
        maxWidth: 200, // 增加尺寸提升清晰度
        maxHeight: 112, // 16:9 比例
        startTime: 0.5, // 跳过开头可能的黑屏
        endTime: undefined // 使用完整视频长度
      });

      if (frames.length === 0) {
        throw new Error('未能提取到任何视频帧');
      }

      setExtractedFrames(frames);
      // 默认选择中间的帧
      const middleIndex = Math.floor(frames.length / 2);
      handleFrameSelect(frames[middleIndex]);

      setRetryCount(0);
      message.success(`成功生成 ${frames.length} 个缩略图`);

    } catch (error) {
      console.error('提取视频帧失败:', error);
      const errorMessage = error instanceof Error ? error.message : '提取视频帧失败';
      setError(errorMessage);
      message.error(`生成缩略图失败: ${errorMessage}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // 播放/暂停
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // 时间滑块变化
  const handleTimeChange = (value: number) => {
    setCurrentTime(value);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current || !videoRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;

    setCurrentTime(newTime);
    videoRef.current.currentTime = newTime;
  }, [isDragging, duration]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!sliderRef.current || !videoRef.current) return;

        const rect = sliderRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const newTime = percentage * duration;

        setCurrentTime(newTime);
        videoRef.current.currentTime = newTime;
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, duration]);

  // 捕获当前帧（优化版本）
  const captureCurrentFrame = async () => {
    if (!videoFile || !extractorRef.current) {
      message.error('视频未准备就绪');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 检查是否被取消
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('操作已取消');
      }

      const frame = await extractorRef.current.extractSingleFrame(videoFile, currentTime, {
        quality: 0.6,
        format: 'image/jpeg',
        maxWidth: 200,
        maxHeight: 112
      });

      handleFrameSelect(frame);
      message.success(`已捕获 ${formatTime(currentTime)} 时刻的帧`);

    } catch (error) {
      console.error('捕获当前帧失败:', error);
      const errorMessage = error instanceof Error ? error.message : '捕获当前帧失败';
      setError(errorMessage);
      message.error(`捕获当前帧失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFrameSelect = (frame: VideoFrame) => {
    setSelectedCover({ type: 'frame', data: frame });
    message.success('已选择视频帧作为封面');
  };

  // 上传封面图片
  const handleCoverUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setUploadedCoverUrl(url);
    setSelectedCover({ type: 'upload', data: file });
    setShowUploadModal(false);
    message.success('已选择上传的图片作为封面');
    return false; // 阻止自动上传
  };

  // 打开相册选择
  const handleOpenAlbum = () => {
    setShowUploadModal(true);
  };

  // 确认选择（优化版本）
  const handleConfirm = async () => {
    try {
      if (!selectedCover) {
        message.warning('请选择一个封面');
        return;
      }

      // 验证认证状态
      if (!isAuthenticated) {
        console.warn('⚠️ 认证状态可能无效，但继续尝试操作');
      }

      if (selectedCover.type === 'frame') {
        const frame = selectedCover.data as VideoFrame;
        // 验证选中的帧
        if (!frame.blob || frame.blob.size === 0) {
          message.error('选中的视频帧无效，请重新选择');
          return;
        }

        // 将VideoFrame转换为File
        const coverFile = new File([frame.blob], `cover_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        const selection: VideoCoverSelection = {
          videoFile: videoFile!,
          coverType: 'frame',
          coverFile,
          selectedFrame: frame,
          frameTime: frame.time
        };

        onConfirm(selection);

      } else if (selectedCover.type === 'upload') {
        const file = selectedCover.data as File;
        // 验证上传的封面
        if (file.size === 0) {
          message.error('上传的封面文件无效，请重新上传');
          return;
        }

        const selection: VideoCoverSelection = {
          videoFile: videoFile!,
          coverType: 'upload',
          coverFile: file
        };

        onConfirm(selection);
      }
    } catch (error: any) {
      console.error('确认选择时出错:', error);

      // 检查是否是认证相关错误
      if (error?.response?.status === 401) {
        console.log('🔐 检测到401错误，使用认证管理器处理');
      }

      // 其他错误
      const errorMessage = error?.message || error?.response?.data?.message || '确认选择失败，请重试';
      message.error(errorMessage);
    }
  };

  // 重置状态和清理资源
  const handleCancel = () => {
    // 停止视频播放
    if (videoRef.current) {
      videoRef.current.pause();
    }

    // 清理资源
    cleanupResources();

    // 重置状态
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectedCover(null);
    setUploadedCoverUrl('');
    setExtractedFrames([]);
    setError(null);
    setRetryCount(0);
    setLoading(false);
    setIsExtracting(false);
    setShowUploadModal(false);

    onCancel();
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Modal
        title="选择视频封面"
        open={visible}
        onCancel={handleCancel}
        onOk={handleConfirm}
        width={800}
        className="video-cover-modal"
        okText="确认选择"
        cancelText="取消"
        confirmLoading={loading || isExtracting}
        okButtonProps={{
          disabled: !selectedCover || loading || isExtracting || !!error
        }}
        cancelButtonProps={{
          disabled: loading || isExtracting
        }}
        maskClosable={false}
        keyboard={false}
        destroyOnClose={true}
      >
        <div className="video-cover-content">
          {/* 错误提示 */}
          {error && (
            <Alert
              message="操作失败"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{ marginBottom: 16 }}
              action={
                <Button size="small" onClick={() => {
                  setError(null);
                  if (extractedFrames.length === 0) {
                    extractKeyFrames();
                  }
                }}>
                  重试
                </Button>
              }
            />
          )}

          {/* 加载状态 */}
          {loading && !isExtracting && (
            <div className="loading-state">
              <Spin size="large" />
              <div className="loading-text">正在处理视频...</div>
            </div>
          )}

          {/* 视频播放器 */}
          {videoUrl && !loading && (
            <div className="video-player">
              <video
                ref={videoRef}
                src={videoUrl}
                onLoadedMetadata={handleVideoLoaded}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onError={(e) => {
                  console.error('视频加载错误:', e);
                  setError('视频加载失败，请检查文件格式');
                }}
                style={{ width: '100%', maxHeight: '300px' }}
              />
              <div className="video-controls">
                <Button
                  type="text"
                  icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={togglePlay}
                  size="large"
                  disabled={duration === 0}
                />
                <div
                  className={`time-slider ${isDragging ? 'dragging' : ''}`}
                  ref={sliderRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  <Slider
                    min={0}
                    max={duration}
                    step={0.1}
                    value={currentTime}
                    onChange={handleTimeChange}
                    tooltip={{ formatter: (value) => formatTime(value || 0) }}
                    disabled={duration === 0}
                  />
                  {isDragging && (
                    <div className="drag-indicator">
                      <DragOutlined />
                    </div>
                  )}
                </div>
                <span className="time-display">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <Button
                  onClick={captureCurrentFrame}
                  loading={loading}
                  disabled={duration === 0 || isExtracting}
                >
                  捕获当前帧
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={extractKeyFrames}
                  loading={isExtracting}
                  disabled={loading}
                >
                  {extractedFrames.length > 0 ? '重新提取帧' : '提取关键帧'}
                </Button>
              </div>
            </div>
          )}

          {/* 提取的帧和相册选择按钮 */}
          <div className="extracted-frames">
            <h4>选择视频帧作为封面：</h4>
            {isExtracting ? (
              <div className="extracting-loading">
                <Spin size="large" />
                <p>正在生成缩略图...{retryCount > 0 && ` (重试 ${retryCount}/3)`}</p>
              </div>
            ) : (
              <div className="frames-grid-container">
                {/* 优化后的水平布局 */}
                <div className="frames-horizontal-layout">
                  {/* 视频帧缩略图 */}
                  <div className="frames-thumbnails">
                    {extractedFrames.map((frame, index) => (
                      <div
                        key={index}
                        className={`frame-thumbnail ${selectedCover?.type === 'frame' && (selectedCover.data as VideoFrame).time === frame.time ? 'selected' : ''
                          }`}
                        onClick={() => handleFrameSelect(frame)}
                      >
                        <div className="thumbnail-image-wrapper">
                          <img
                            src={frame.dataUrl}
                            alt={`Frame ${index + 1}`}
                            onError={(e) => {
                              console.error('帧图片加载失败:', e);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          {selectedCover?.type === 'frame' && (selectedCover.data as VideoFrame).time === frame.time && (
                            <div className="selected-overlay">
                              <div className="selected-icon">✓</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 从相册选择按钮 */}
                  {extractedFrames.length > 0 && (
                    <div className="album-select-wrapper">
                      <div
                        className={`album-select-button ${selectedCover?.type === 'upload' ? 'selected' : ''
                          }`}
                        onClick={handleOpenAlbum}
                      >
                        <div className="album-button-content">
                          {selectedCover?.type === 'upload' && uploadedCoverUrl ? (
                            <>
                              <img
                                src={uploadedCoverUrl}
                                alt="Uploaded cover"
                                onError={(e) => {
                                  console.error('封面图片加载失败:', e);
                                  setError('封面图片加载失败');
                                }}
                              />
                              <div className="selected-overlay">
                                <div className="selected-icon">✓</div>
                              </div>
                            </>
                          ) : (
                            <div className="album-placeholder">
                              <CameraOutlined className="album-icon" />
                              <div className="album-text">从相册选择</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 空状态 */}
                {extractedFrames.length === 0 && !loading && !error && videoUrl && (
                  <div className="empty-state">
                    <ExclamationCircleOutlined className="empty-icon" />
                    <div className="empty-message">暂无提取的视频帧</div>
                    <div className="empty-text">点击"提取关键帧"按钮开始提取</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 选中的封面预览 */}
          {selectedCover && (
            <div className="selected-cover">
              <h4>已选择的封面：</h4>
              <div className="cover-preview-container">
                {selectedCover.type === 'frame' ? (
                  <>
                    <img
                      className="cover-preview"
                      src={(selectedCover.data as VideoFrame).dataUrl}
                      alt="Selected frame"
                    />
                    <div className="cover-info">
                      时间: {Math.floor((selectedCover.data as VideoFrame).time / 60)}:{Math.floor((selectedCover.data as VideoFrame).time % 60).toString().padStart(2, '0')} |
                      尺寸: {(selectedCover.data as VideoFrame).width} × {(selectedCover.data as VideoFrame).height}
                    </div>
                  </>
                ) : (
                  <>
                    <img
                      className="cover-preview"
                      src={uploadedCoverUrl}
                      alt="Uploaded cover"
                    />
                    <div className="cover-info">
                      文件名: {(selectedCover.data as File).name} ({((selectedCover.data as File).size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 相册选择弹窗 */}
      <Modal
        title="从相册选择封面"
        open={showUploadModal}
        onCancel={() => setShowUploadModal(false)}
        footer={null}
        width={500}
        className="album-select-modal"
      >
        <Upload.Dragger
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          beforeUpload={(file) => {
            try {
              // 验证文件类型
              const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
              if (!validTypes.includes(file.type)) {
                message.error('不支持的文件格式，请上传 JPG、PNG、GIF 或 WebP 格式的图片');
                return false;
              }

              // 验证文件大小（最大 10MB）
              const maxSize = 10 * 1024 * 1024;
              if (file.size > maxSize) {
                message.error('图片文件大小不能超过 10MB');
                return false;
              }

              return handleCoverUpload(file);
            } catch (error) {
              console.error('文件验证失败:', error);
              setError('文件验证失败，请重试');
              return false;
            }
          }}
          showUploadList={false}
          multiple={false}
          disabled={loading}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽图片到此区域上传</p>
          <p className="ant-upload-hint">支持 JPG、PNG、GIF、WebP 格式，最大 10MB</p>
        </Upload.Dragger>
      </Modal>

      {/* 隐藏的canvas用于帧提取 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </>
  );
};

export default VideoCoverModal;
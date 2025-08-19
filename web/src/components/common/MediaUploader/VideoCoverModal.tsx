import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Button, Upload, Tabs, Slider, Image, message, Spin, Row, Col } from 'antd';
import { UploadOutlined, PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, DragOutlined } from '@ant-design/icons';
import type { VideoCoverSelection } from './types';
import { VideoFrameExtractor, type VideoFrame } from '../../../utils/video-frame-extractor';
import './VideoCoverModal.scss';

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
  const [activeTab, setActiveTab] = useState<'frame' | 'upload'>('frame');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [selectedFrame, setSelectedFrame] = useState<VideoFrame | null>(null);
  const [uploadedCover, setUploadedCover] = useState<File | null>(null);
  const [uploadedCoverUrl, setUploadedCoverUrl] = useState<string>('');
  const [extractedFrames, setExtractedFrames] = useState<VideoFrame[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFrameDragging, setIsFrameDragging] = useState(false);
  const [dragStartFrame, setDragStartFrame] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const extractorRef = useRef<VideoFrameExtractor | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const framesGridRef = useRef<HTMLDivElement>(null);

  // 初始化视频
  useEffect(() => {
    if (videoFile && visible) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      initializeExtractor();
      
      return () => {
        URL.revokeObjectURL(url);
        if (extractorRef.current) {
          extractorRef.current.destroy();
          extractorRef.current = null;
        }
      };
    }
  }, [videoFile, visible]);

  const initializeExtractor = async () => {
    if (!videoFile) return;
    
    try {
      if (!extractorRef.current) {
        extractorRef.current = new VideoFrameExtractor();
      }
      const metadata = await extractorRef.current.getVideoMetadata(videoFile);
      // setVideoMetadata(metadata);
    } catch (error) {
      console.error('Failed to get video metadata:', error);
      message.error('获取视频信息失败');
    }
  };

  // 视频加载完成
  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setCurrentTime(0);
      // 自动提取一些关键帧
      extractKeyFrames();
    }
  };

  // 提取关键帧
  const extractKeyFrames = async () => {
    if (!videoFile) return;
    
    setIsExtracting(true);
    try {
      if (!extractorRef.current) {
        extractorRef.current = new VideoFrameExtractor();
      }
      
      const frames = await extractorRef.current.extractFrames(videoFile, {
        frameCount: 8,
        quality: 0.8,
        format: 'image/jpeg',
        maxWidth: 160,
        maxHeight: 90,
      });
      
      setExtractedFrames(frames);
      if (frames.length > 0) {
        setSelectedFrame(frames[0]);
      }
    } catch (error) {
      console.error('提取视频帧失败:', error);
      message.error('提取视频帧失败');
    } finally {
      setIsExtracting(false);
    }
  };

  // 跳转到指定时间

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
    // setDragStartTime(currentTime);
    e.preventDefault();
  }, [currentTime]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current || !videoRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;
    
    setCurrentTime(newTime);
    videoRef.current.currentTime = newTime;
  }, [isDragging, duration]);

  // 帧拖拽处理
  const handleFrameMouseDown = useCallback((e: React.MouseEvent, frameIndex: number) => {
    setIsFrameDragging(true);
    setDragStartFrame(frameIndex);
    e.preventDefault();
  }, []);

  const handleFrameMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isFrameDragging || !framesGridRef.current || dragStartFrame === null) return;
    
    const target = e.target as HTMLElement;
    const frameElement = target.closest('.frame-item');
    if (frameElement) {
      const frameIndex = parseInt(frameElement.getAttribute('data-frame-index') || '0');
      if (frameIndex !== dragStartFrame) {
        // 可以在这里添加视觉反馈，比如高亮显示拖拽路径上的帧
      }
    }
  }, [isFrameDragging, dragStartFrame]);

  const handleFrameMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isFrameDragging || dragStartFrame === null) return;
    
    const target = e.target as HTMLElement;
    const frameElement = target.closest('.frame-item');
    if (frameElement) {
      const frameIndex = parseInt(frameElement.getAttribute('data-frame-index') || '0');
      if (frameIndex < extractedFrames.length) {
        setSelectedFrame(extractedFrames[frameIndex]);
        message.success('已选择视频帧作为封面');
      }
    }
    
    setIsFrameDragging(false);
    setDragStartFrame(null);
  }, [isFrameDragging, dragStartFrame, extractedFrames]);

  useEffect(() => {
    if (isFrameDragging) {
      const handleGlobalFrameMouseMove = (e: MouseEvent) => {
        if (!framesGridRef.current || dragStartFrame === null) return;
        
        const target = e.target as HTMLElement;
        const frameElement = target.closest('.frame-item');
        if (frameElement) {
          const frameIndex = parseInt(frameElement.getAttribute('data-frame-index') || '0');
          // 添加视觉反馈
          document.querySelectorAll('.frame-item').forEach((item, index) => {
            const element = item as HTMLElement;
            if (index >= Math.min(dragStartFrame, frameIndex) && index <= Math.max(dragStartFrame, frameIndex)) {
              element.classList.add('drag-selected');
            } else {
              element.classList.remove('drag-selected');
            }
          });
        }
      };

      const handleGlobalFrameMouseUp = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const frameElement = target.closest('.frame-item');
        if (frameElement) {
          const frameIndex = parseInt(frameElement.getAttribute('data-frame-index') || '0');
          if (frameIndex < extractedFrames.length) {
            setSelectedFrame(extractedFrames[frameIndex]);
            message.success('已选择视频帧作为封面');
          }
        }
        
        // 清除所有拖拽选择状态
        document.querySelectorAll('.frame-item').forEach(item => {
          item.classList.remove('drag-selected');
        });
        
        setIsFrameDragging(false);
        setDragStartFrame(null);
      };

      document.addEventListener('mousemove', handleGlobalFrameMouseMove);
      document.addEventListener('mouseup', handleGlobalFrameMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalFrameMouseMove);
        document.removeEventListener('mouseup', handleGlobalFrameMouseUp);
      };
    }
  }, [isFrameDragging, dragStartFrame, extractedFrames]);

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

  // 捕获当前帧
  const captureCurrentFrame = async () => {
    if (!videoFile || !extractorRef.current) return;
    
    setLoading(true);
    try {
      const frame = await extractorRef.current.extractFrameAtTime(
        currentTime,
        0.8,
        'image/jpeg'
      );
      setSelectedFrame(frame);
      message.success('已捕获当前帧');
    } catch (error) {
      console.error('Failed to capture current frame:', error);
      message.error('捕获当前帧失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFrameSelect = (frame: VideoFrame) => {
    setSelectedFrame(frame);
  };

  // 上传封面图片
  const handleCoverUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setUploadedCover(file);
    setUploadedCoverUrl(url);
    return false; // 阻止自动上传
  };

  // 确认选择
  const handleConfirm = () => {
    if (activeTab === 'frame' && selectedFrame) {
      // 将VideoFrame转换为File
      const coverFile = new File([selectedFrame.blob], `cover_${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      
      onConfirm({
        videoFile: videoFile!,
        coverType: 'frame',
        coverFile,
        frameTime: selectedFrame.time
      });
    } else if (activeTab === 'upload' && uploadedCover) {
      onConfirm({
        videoFile: videoFile!,
        coverType: 'upload',
        coverFile: uploadedCover
      });
    } else {
      message.warning('请选择封面');
    }
  };

  // 重置状态
  const handleCancel = () => {
    setActiveTab('frame');
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectedFrame(null);
    setUploadedCover(null);
    setUploadedCoverUrl('');
    setExtractedFrames([]);
    onCancel();
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const tabItems = [
    {
      key: 'frame',
      label: '选择视频帧',
      children: (
        <div className="frame-selection">
          <div className="video-player">
            <video
              ref={videoRef}
              src={videoUrl}
              onLoadedMetadata={handleVideoLoaded}
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              style={{ width: '100%', maxHeight: '300px' }}
            />
            <div className="video-controls">
              <Button
                type="text"
                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={togglePlay}
                size="large"
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
              <Button onClick={captureCurrentFrame} loading={loading}>捕获当前帧</Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={extractKeyFrames}
                loading={isExtracting}
              >
                重新提取帧
              </Button>
            </div>
          </div>
          
          <div className="extracted-frames">
            <h4>选择视频帧作为封面：</h4>
            {isExtracting ? (
              <div className="extracting-loading">
                <Spin size="large" />
                <p>正在提取视频帧...</p>
              </div>
            ) : (
              <Row 
                gutter={[8, 8]} 
                className={`frames-grid ${isFrameDragging ? 'dragging' : ''}`}
                ref={framesGridRef}
                onMouseMove={handleFrameMouseMove}
              >
                {extractedFrames.map((frame, index) => (
                  <Col key={index} span={6}>
                    <div
                      className={`frame-item ${
                        selectedFrame?.time === frame.time ? 'selected' : ''
                      }`}
                      data-frame-index={index}
                      onMouseDown={(e) => handleFrameMouseDown(e, index)}
                      onMouseUp={handleFrameMouseUp}
                      onClick={() => {
                        if (!isFrameDragging) {
                          handleFrameSelect(frame);
                        }
                      }}
                    >
                      <img
                        src={frame.dataUrl}
                        alt={`Frame at ${frame.time.toFixed(1)}s`}
                        style={{ width: '100%', height: 'auto' }}
                      />
                      <div className="frame-time">
                        {Math.floor(frame.time / 60)}:{Math.floor(frame.time % 60).toString().padStart(2, '0')}
                      </div>
                      {isFrameDragging && dragStartFrame === index && (
                        <div className="drag-start-indicator">
                          <DragOutlined />
                        </div>
                      )}
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </div>
          
          {selectedFrame && (
            <div className="selected-frame">
              <h4>已选择的封面：</h4>
              <div className="selected-frame-preview">
                <img
                  src={selectedFrame.dataUrl}
                  alt="Selected frame"
                  style={{ maxWidth: '200px', maxHeight: '120px' }}
                />
                <p>时间: {Math.floor(selectedFrame.time / 60)}:{Math.floor(selectedFrame.time % 60).toString().padStart(2, '0')}</p>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'upload',
      label: '上传封面图片',
      children: (
        <div className="cover-upload">
          <Upload.Dragger
            accept="image/*"
            beforeUpload={handleCoverUpload}
            showUploadList={false}
            multiple={false}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽图片到此区域上传</p>
            <p className="ant-upload-hint">支持 JPG、PNG、GIF 格式</p>
          </Upload.Dragger>
          
          {uploadedCoverUrl && (
            <div className="uploaded-cover">
              <h4>已上传的封面：</h4>
              <Image src={uploadedCoverUrl} width={200} />
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <Modal
        title="选择视频封面"
        open={visible}
        onCancel={handleCancel}
        onOk={handleConfirm}
        width={800}
        className="video-cover-modal"
        okText="确认"
        cancelText="取消"
        confirmLoading={isExtracting}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'frame' | 'upload')}
          items={tabItems}
        />
      </Modal>
      
      {/* 隐藏的canvas用于帧提取 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </>
  );
};

export default VideoCoverModal;
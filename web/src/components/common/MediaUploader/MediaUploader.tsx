/**
 * 简化的媒体上传组件
 * 整合所有功能，提供简洁的API
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Button, Progress, message, Alert } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

import { UploadManager } from './UploadManager';
import type { UploadManagerOptions } from './UploadManager';
import VideoCoverModal from './VideoCoverModal';
import type {
  UploadProgressInfo,
  VideoCoverSelection,
  MediaUploaderProps
} from './types';
import { useAppSelector } from '../../../store/hooks';

import './MediaUploader.scss';

const { Dragger } = Upload;

const MediaUploader: React.FC<MediaUploaderProps> = ({
  disabled = false,
  config = {},
  className = '',
  style = {},
  showProgress = true,
  onUploadStart,
  onUploadProgress,
  onFileProgress,
  onUploadSuccess,
  onUploadError
}) => {
  // 从Redux获取认证状态
  const token = useAppSelector(state => state.auth.token);

  // 状态管理
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgressInfo>({
    total: 0,
    completed: 0,
    failed: 0,
    uploading: 0,
    percentage: 0
  });
  const [coverModalVisible, setCoverModalVisible] = useState(false);
  const [currentVideoFile, setCurrentVideoFile] = useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // 上传管理器实例
  const uploadManagerRef = useRef<UploadManager | null>(null);

  // 初始化上传管理器
  const initUploadManager = useCallback(() => {
    const options: UploadManagerOptions = {
      config,
      userToken: token || '',
      directUploadOss: true,
      onUploadStart: (files) => {
        setUploading(true);
        setGlobalError(null);
        onUploadStart?.(files);
      },
      onUploadProgress: (progressInfo) => {
        setProgress(progressInfo);
        onUploadProgress?.(progressInfo);
      },
      onFileProgress,
      onUploadSuccess: (results) => {
        setUploading(false);
        message.success(`成功上传 ${results.length} 个文件`);
        onUploadSuccess?.(results);
      },
      onUploadError: (error, fileId) => {
        setUploading(false);
        setGlobalError(error.message);
        onUploadError?.(error, fileId);
      }
    };

    uploadManagerRef.current = new UploadManager(options);
  }, [config, token, onUploadStart, onUploadProgress, onFileProgress, onUploadSuccess, onUploadError]);

  // 初始化
  useEffect(() => {
    initUploadManager();
    return () => {
      uploadManagerRef.current?.cleanup();
    };
  }, [initUploadManager]);

  // 更新配置
  useEffect(() => {
    if (uploadManagerRef.current) {
      uploadManagerRef.current.updateConfig(config);
    }
  }, [config]);

  // 处理文件选择
  const handleFileSelect = useCallback((files: File[]) => {
    if (!uploadManagerRef.current) {
      message.error('上传组件未初始化');
      return;
    }

    // 检查是否有视频文件需要选择封面
    const videoFiles = files.filter(file => file.type.startsWith('video/'));

    // 获取合并后的配置，确保使用默认值
    const mergedConfig = uploadManagerRef.current.getConfig();
    const requireCover = mergedConfig.requireCover !== false; // 默认要求封面

    if (videoFiles.length > 0 && requireCover) {
      // 如果有视频文件且需要封面，显示封面选择弹窗
      // 提示：优化用户体验，告诉用户视频上传前需要先设置封面
      message.info(`请为视频 "${videoFiles[0].name}" 选择封面图`);
      setCurrentVideoFile(videoFiles[0]);
      setPendingFiles(files);
      setCoverModalVisible(true);
    } else {
      // 直接上传
      startUpload(files);
    }
  }, []);

  // 开始上传
  const startUpload = useCallback(async (files: File[], videoCoverInfo?: { videoFile: File; coverSelection: VideoCoverSelection }) => {
    if (!uploadManagerRef.current) {
      message.error('上传组件未初始化');
      return;
    }

    try {
      await uploadManagerRef.current.uploadFiles(files, videoCoverInfo);
    } catch (error: any) {
      console.error('Upload failed:', error);
      message.error(error.message || '上传失败');
    }
  }, []);

  // 处理封面选择确认
  const handleCoverConfirm = useCallback((selection: VideoCoverSelection) => {
    setCoverModalVisible(false);

    if (currentVideoFile && pendingFiles.length > 0) {
      const videoCoverInfo = {
        videoFile: currentVideoFile,
        coverSelection: selection
      };

      startUpload(pendingFiles, videoCoverInfo);
    }

    setCurrentVideoFile(null);
    setPendingFiles([]);
  }, [currentVideoFile, pendingFiles, startUpload]);

  // 处理封面选择取消
  const handleCoverCancel = useCallback(() => {
    setCoverModalVisible(false);
    setCurrentVideoFile(null);
    setPendingFiles([]);
  }, []);

  // 取消上传
  const handleCancelUpload = useCallback(() => {
    uploadManagerRef.current?.cancelUpload();
    setUploading(false);
  }, []);

  // Upload组件属性
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: config.multiple ?? true,
    disabled: disabled || uploading,
    showUploadList: false,
    beforeUpload: (_, fileList) => {
      handleFileSelect(Array.from(fileList));
      return false; // 阻止默认上传
    },
    accept: config.accept?.join(','),
  };

  // 渲染进度信息
  const renderProgress = () => {
    if (!showProgress || !uploading) return null;

    return (
      <div className="upload-progress">
        <Progress
          percent={progress.percentage}
          status={progress.failed > 0 ? 'exception' : 'active'}
          format={() => `${progress.completed}/${progress.total}`}
        />
        <div className="progress-info">
          <span>已完成: {progress.completed}</span>
          <span>上传中: {progress.uploading}</span>
          {progress.failed > 0 && <span className="failed">失败: {progress.failed}</span>}
          {progress.speed && (
            <span>速度: {formatSpeed(progress.speed)}</span>
          )}
          {progress.remainingTime && (
            <span>剩余: {formatTime(progress.remainingTime)}</span>
          )}
        </div>
      </div>
    );
  };

  // 格式化速度
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';

    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const k = 1024;
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));

    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    if (seconds === 0 || !isFinite(seconds)) return '--';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${secs}秒`;
    }
  };

  return (
    <div className={`media-uploader ${className}`} style={style}>
      {globalError && (
        <Alert
          message="上传错误"
          description={globalError}
          type="error"
          closable
          onClose={() => setGlobalError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Dragger {...uploadProps}>
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">
          点击或拖拽文件到此区域上传
        </p>
        <p className="ant-upload-hint">
          支持单个或批量上传。支持图片和视频文件。
        </p>
      </Dragger>

      {renderProgress()}

      {uploading && (
        <div className="upload-actions">
          <Button onClick={handleCancelUpload} danger>
            取消上传
          </Button>
        </div>
      )}

      <VideoCoverModal
        visible={coverModalVisible}
        videoFile={currentVideoFile}
        onCancel={handleCoverCancel}
        onConfirm={handleCoverConfirm}
      />
    </div>
  );
};

export default MediaUploader;
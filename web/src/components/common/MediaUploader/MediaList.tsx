import React, { useState, useCallback } from 'react';
import { Button, Image, Modal, Tooltip, message } from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  VideoCameraOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import type { MediaFileItem } from './types';
import { UploadStatus } from './types';

import './MediaList.scss';

interface MediaListProps {
  files: MediaFileItem[];
  previewable?: boolean;
  showThumbnails?: boolean;
  onRemove?: (fileId: string) => void;
  onPreview?: (file: MediaFileItem) => void;
  onRetry?: (fileId: string) => void;
  onSelectCover?: (file: MediaFileItem) => void;
  className?: string;
  style?: React.CSSProperties;
}

const MediaList: React.FC<MediaListProps> = ({
  files,
  previewable = true,
  showThumbnails = true,
  onRemove,
  onPreview,
  onRetry,
  onSelectCover,
  className = '',
  style = {}
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<MediaFileItem | null>(null);
  const [retryingFiles, setRetryingFiles] = useState<Set<string>>(new Set());

  // 处理文件删除
  const handleRemove = useCallback((fileId: string) => {
    const fileItem = files.find(f => f.id === fileId);
    if (!fileItem) return;

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除文件 "${fileItem.file.name}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        onRemove?.(fileId);

        // 清理预览URL
        if (fileItem.preview) {
          URL.revokeObjectURL(fileItem.preview);
        }
        if (fileItem.coverPreview) {
          URL.revokeObjectURL(fileItem.coverPreview);
        }

        message.success('文件已删除');
      }
    });
  }, [files, onRemove]);

  // 处理文件预览
  const handlePreview = useCallback((fileItem: MediaFileItem) => {
    setPreviewFile(fileItem);
    setPreviewVisible(true);
    onPreview?.(fileItem);
  }, [onPreview]);

  // 处理重试上传
  const handleRetry = useCallback(async (fileId: string) => {
    setRetryingFiles(prev => new Set([...prev, fileId]));

    try {
      await onRetry?.(fileId);
    } finally {
      setRetryingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  }, [onRetry]);

  // 处理封面选择
  const handleSelectCover = useCallback((fileItem: MediaFileItem) => {
    onSelectCover?.(fileItem);
  }, [onSelectCover]);

  if (files.length === 0) {
    return null;
  }

  return (
    <div className={`media-list ${className}`} style={style}>
      {/* 文件列表 */}
      <div className="media-list__items">
        {files.map((fileItem) => (
          <div key={fileItem.id} className="media-list__item">
            {/* 预览区域 */}
            <div className="item-preview">
              {fileItem.type === 'image' ? (
                <Image
                  src={fileItem.preview}
                  alt={fileItem.file.name}
                  width={100}
                  height={100}
                  style={{ objectFit: 'cover' }}
                  preview={false}
                />
              ) : (
                <div className="video-preview">
                  <VideoCameraOutlined className="video-icon" />
                  {fileItem.coverPreview && (
                    <Image
                      src={fileItem.coverPreview}
                      alt="视频封面"
                      width={100}
                      height={100}
                      style={{ objectFit: 'cover' }}
                      preview={false}
                    />
                  )}
                </div>
              )}
            </div>


            {/* 操作按钮 */}
            <div className="item-actions">
              {fileItem.status === UploadStatus.ERROR && (
                <Tooltip title="重试上传">
                  <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    onClick={() => handleRetry(fileItem.id)}
                    loading={retryingFiles.has(fileItem.id)}
                  />
                </Tooltip>
              )}

              {fileItem.type === 'video' && onSelectCover && (
                <Tooltip title="选择封面">
                  <Button
                    type="text"
                    icon={<VideoCameraOutlined />}
                    onClick={() => handleSelectCover(fileItem)}
                  />
                </Tooltip>
              )}

              {previewable && fileItem.status === UploadStatus.SUCCESS && (
                <Tooltip title="预览">
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => handlePreview(fileItem)}
                  />
                </Tooltip>
              )}

              <Tooltip title="删除">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemove(fileItem.id)}
                />
              </Tooltip>
            </div>
          </div>
        ))}
      </div>

      {/* 缩略图显示 */}
      {showThumbnails && files.length > 0 && (
        <div className="media-list__thumbnails">
          <div className="thumbnails-title">缩略图预览</div>
          <div className="thumbnails-container">
            {files.map((fileItem) => (
              <div
                key={`thumb-${fileItem.id}`}
                className={`thumbnail-item ${fileItem.status}`}
                onClick={() => previewable && handlePreview(fileItem)}
              >
                {fileItem.type === 'image' ? (
                  <Image
                    src={fileItem.preview}
                    alt={fileItem.file.name}
                    width={60}
                    height={60}
                    style={{ objectFit: 'cover' }}
                    preview={false}
                  />
                ) : (
                  <div className="video-thumbnail">
                    <VideoCameraOutlined className="video-icon-small" />
                    {fileItem.coverPreview && (
                      <Image
                        src={fileItem.coverPreview}
                        alt="视频封面"
                        width={60}
                        height={60}
                        style={{ objectFit: 'cover' }}
                        preview={false}
                      />
                    )}
                  </div>
                )}

                {/* 状态指示器 */}
                <div className="thumbnail-status">
                  {fileItem.status === UploadStatus.UPLOADING && (
                    <div className="status-indicator uploading" />
                  )}
                  {fileItem.status === UploadStatus.SUCCESS && (
                    <CheckCircleOutlined className="status-indicator success" />
                  )}
                  {fileItem.status === UploadStatus.ERROR && (
                    <CloseCircleOutlined className="status-indicator error" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 预览弹窗 */}
      <Modal
        open={previewVisible}
        title="文件预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        centered
      >
        {previewFile && (
          <div className="media-preview">
            <div className="preview-header">
              <h4>{previewFile.file.name}</h4>
              <div className="preview-info">
                <span>大小: {Math.round(previewFile.file.size / 1024)} KB</span>
                <span>类型: {previewFile.type}</span>
                {previewFile.uploadedAt && (
                  <span>上传时间: {previewFile.uploadedAt.toLocaleString()}</span>
                )}
              </div>
            </div>

            <div className="preview-content">
              {previewFile.type === 'image' ? (
                <Image
                  src={previewFile.preview}
                  alt={previewFile.file.name}
                  style={{ maxWidth: '100%' }}
                />
              ) : (
                <video
                  src={previewFile.preview}
                  controls
                  style={{ maxWidth: '100%', maxHeight: '500px' }}
                  preload="metadata"
                >
                  您的浏览器不支持视频播放。
                </video>
              )}
            </div>

            {/* 封面预览 */}
            {previewFile.type === 'video' && previewFile.coverPreview && (
              <div className="cover-preview">
                <h5>视频封面</h5>
                <Image
                  src={previewFile.coverPreview}
                  alt="视频封面"
                  width={200}
                  height={150}
                  style={{ objectFit: 'cover' }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MediaList;
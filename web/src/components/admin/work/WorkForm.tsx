import React, { useEffect, useState, useRef } from 'react';
import {
  Form, Input, Select, DatePicker, Switch, Button, Space, Upload, Tag, message, Row,
  Col, Modal, Image, Divider
} from 'antd';
import { PlusOutlined, VideoCameraOutlined, PictureOutlined, ScissorOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Work } from './WorkCard';
import { MediaUploader, MediaList } from '../../common/MediaUploader';
import type { MediaFileItem } from '../../common/MediaUploader/types';
import type { DirectUploadResult } from '../../../utils/direct-upload';
import type { UploadFile, UploadProps } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

interface WorkFormProps {
  initialValues?: Partial<Work>;
  onSubmit: (values: any) => void;
  onCancel: () => void;
  loading?: boolean;
  isEdit?: boolean;
  onUpload?: (file: File) => Promise<string>;
}

const WorkForm: React.FC<WorkFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  isEdit = false,
  onUpload,
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFileItem[]>([]);
  const [coverMediaFiles, setCoverMediaFiles] = useState<MediaFileItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [workType, setWorkType] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // 视频封面选择相关状态
  const [coverSelectionVisible, setCoverSelectionVisible] = useState(false);
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [extractingFrames, setExtractingFrames] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<Array<{file: File, onSuccess?: (response: any) => void, onError?: (error: Error) => void}>>([]);
  const [activeUploads, setActiveUploads] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxConcurrentUploads = 2;

  useEffect(() => {
    if (initialValues) {
      const formValues = {
        ...initialValues,
        weddingDate: initialValues.weddingDate ? dayjs(initialValues.weddingDate) : undefined,
      };
      form.setFieldsValue(formValues);

      if (initialValues.tags) {
        setTags(initialValues.tags);
      }

      if (initialValues.type) {
        setWorkType(initialValues.type);
      }

      if (initialValues.contentUrls) {
        const files = initialValues.contentUrls.map((url, index) => ({
          uid: `${index}`,
          name: `content-${index}`,
          status: 'done' as const,
          url,
        }));
        setFileList(files);
      }

      if (initialValues?.coverImage) {
        const coverFile = {
          uid: 'cover',
          name: 'cover-image',
          status: 'done' as const,
          url: initialValues.coverImage,
        };
        setCoverFileList([coverFile]);
      }
    }
  }, [initialValues, form]);

  // 表单验证函数
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // 验证标题
    const title = form.getFieldValue('title');
    if (!title || title.trim() === '') {
      errors.title = '作品标题不能为空';
    } else if (title.length > 100) {
      errors.title = '标题不能超过100个字符';
    }

    // 验证作品类型
    if (!workType) {
      errors.type = '请选择作品类型';
    }

    // 验证媒体文件
    const totalMediaFiles = mediaFiles.length + fileList.length;
    if (totalMediaFiles === 0) {
      errors.media = '请至少上传一个媒体文件';
    }

    // 视频类型特殊验证
    if (workType === 'video') {
      const hasVideo = mediaFiles.some(f => f.type === 'video') || 
                      fileList.some(f => f.type?.startsWith('video/'));
      if (!hasVideo) {
        errors.video = '视频作品必须包含视频文件';
      }

      const totalCoverFiles = coverMediaFiles.length + coverFileList.length;
      if (totalCoverFiles === 0) {
        errors.cover = '视频作品必须上传封面图片';
      }
    }

    // 验证文件大小
    const allFiles = [...mediaFiles, ...coverMediaFiles];
    for (const file of allFiles) {
      if (file.file.size > 10 * 1024 * 1024) { // 10MB
        errors.fileSize = '文件大小不能超过10MB';
        break;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // MediaUploader回调处理
  const handleMediaUploadSuccess = (results: DirectUploadResult[]) => {
    const newMediaFiles = results.map(result => ({
      id: result.fileId,
      file: new File([], result.originalName, { type: result.fileType }),
      type: result.fileType.startsWith('video/') ? 'video' as const : 'image' as const,
      status: 'success' as const,
      progress: 100,
      result,
      preview: result.url,
      uploadedAt: new Date(result.uploadedAt)
    }));
    setMediaFiles(prev => [...prev, ...newMediaFiles]);
    
    // 同时更新原有的fileList以保持兼容性
    const newFiles = results.map((result, index) => ({
      uid: `media-${Date.now()}-${index}`,
      name: result.originalName,
      status: 'done' as const,
      url: result.url,
      response: result.url,
      type: result.fileType
    }));
    setFileList(prev => [...prev, ...newFiles]);

    // 清除相关错误
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.media;
      return newErrors;
    });
  };

  const handleCoverUploadSuccess = (results: DirectUploadResult[]) => {
    const newCoverFiles = results.map(result => ({
      id: result.fileId,
      file: new File([], result.originalName, { type: result.fileType }),
      type: 'image' as const,
      status: 'success' as const,
      progress: 100,
      result,
      preview: result.url,
      uploadedAt: new Date(result.uploadedAt)
    }));
    setCoverMediaFiles(newCoverFiles);
    
    // 同时更新原有的coverFileList以保持兼容性
    const newFiles = results.map((result, index) => ({
      uid: `cover-${Date.now()}-${index}`,
      name: result.originalName,
      status: 'done' as const,
      url: result.url,
      response: result.url,
      type: result.fileType
    }));
    setCoverFileList(newFiles);

    // 清除封面错误
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.cover;
      return newErrors;
    });
  };

  const handleMediaUploadError = (error: Error) => {
    message.error(`上传失败: ${error.message}`);
  };

  const handleMediaRemove = (fileId: string) => {
    setMediaFiles(prev => prev.filter(file => file.id !== fileId));
    setFileList(prev => prev.filter(file => file.uid !== fileId));
  };

  const handleCoverRemove = (fileId: string) => {
    setCoverMediaFiles(prev => prev.filter(file => file.id !== fileId));
    setCoverFileList(prev => prev.filter(file => file.uid !== fileId));
  };

  const handleSubmit = async () => {
    try {
      // 先进行自定义验证
      if (!validateForm()) {
        message.error('请检查表单中的错误信息');
        return;
      }

      // 然后进行Ant Design表单验证
      const values = await form.validateFields();
      
      // 合并新旧上传方式的URL
      const allContentUrls = [
        ...mediaFiles.map(file => file.result?.url || file.preview).filter(Boolean),
        ...fileList.map(file => file.response || file.url).filter(Boolean)
      ];
      
      const allCoverUrls = [
        ...coverMediaFiles.map(file => file.result?.url || file.preview).filter(Boolean),
        ...coverFileList.map(file => file.response || file.url).filter(Boolean)
      ];
      
      const submitData = {
        ...values,
        weddingDate: values.weddingDate?.format('YYYY-MM-DD'),
        tags,
        contentUrls: allContentUrls,
        coverUrl: workType === 'video' 
          ? (allCoverUrls[0] || '')
          : (allContentUrls[0] || ''),
        // 添加文件信息用于后端处理
        files: [
          ...mediaFiles.map(file => ({
            fileUrl: file.result?.url || file.preview,
            fileType: file.type === 'video' ? 'VIDEO' : 'IMAGE',
            thumbnailUrl: file.type === 'video' ? (allCoverUrls[0] || '') : undefined,
            originalName: file.file.name,
            fileSize: file.file.size,
            mimeType: file.file.type
          })),
          ...fileList.map(file => ({
            fileUrl: file.response || file.url,
            fileType: file.type?.startsWith('video/') ? 'VIDEO' : 'IMAGE',
            thumbnailUrl: file.type?.startsWith('video/') ? (allCoverUrls[0] || '') : undefined,
            originalName: file.name,
            fileSize: file.size || 0,
            mimeType: file.type || ''
          }))
        ]
      };

      // 提交前显示加载状态
      setUploading(true);
      
      await onSubmit(submitData);
      
      // 成功后重置表单（如果不是编辑模式）
      if (!isEdit) {
        form.resetFields();
        setTags([]);
        setMediaFiles([]);
        setCoverMediaFiles([]);
        setFileList([]);
        setCoverFileList([]);
        setWorkType('');
        setFormErrors({});
        message.success('作品创建成功！');
      } else {
        message.success('作品更新成功！');
      }
      
    } catch (error) {
      console.error('表单提交失败:', error);
      if (error instanceof Error) {
        message.error(`提交失败: ${error.message}`);
      } else {
        message.error('提交失败，请重试');
      }
    } finally {
      setUploading(false);
    }
  };

  // 处理上传队列
  const processUploadQueue = async () => {
    if (activeUploads >= maxConcurrentUploads || uploadQueue.length === 0) {
      return;
    }

    const uploadItem = uploadQueue[0];
    setUploadQueue(prev => prev.slice(1));
    setActiveUploads(prev => prev + 1);

    try {
      if (!onUpload) {
        throw new Error('上传功能未配置');
      }

      const url = await onUpload(uploadItem.file);
      uploadItem.onSuccess?.(url);
    } catch (error) {
      uploadItem.onError?.(error as Error);
    } finally {
      setActiveUploads(prev => prev - 1);
      setTimeout(processUploadQueue, 100);
    }
  };

  useEffect(() => {
    if (uploadQueue.length > 0 && activeUploads < maxConcurrentUploads) {
      processUploadQueue();
    }
  }, [uploadQueue, activeUploads]);

  useEffect(() => {
    setUploading(activeUploads > 0 || uploadQueue.length > 0);
  }, [activeUploads, uploadQueue.length]);

  const handleUpload: UploadProps['customRequest'] = ({ file, onSuccess, onError }) => {
    setUploadQueue(prev => [...prev, {
      file: file as File,
      onSuccess,
      onError
    }]);
  };

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const handleCoverChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setCoverFileList(newFileList);
  };

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (workType === 'video') {
      if (!isVideo) {
        message.error('视频作品只能上传视频文件！');
        return false;
      }
    } else {
      if (!isImage && !isVideo) {
        message.error('只能上传图片或视频文件！');
        return false;
      }
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过 10MB！');
      return false;
    }

    return true;
  };

  const beforeCoverUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');

    if (!isImage) {
      message.error('封面只能上传图片文件！');
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过 10MB！');
      return false;
    }

    return true;
  };

  // 从视频中提取帧
  const extractVideoFrames = async (videoFile: File) => {
    return new Promise<string[]>((resolve, reject) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        reject(new Error('视频或画布元素未找到'));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法获取画布上下文'));
        return;
      }

      const url = URL.createObjectURL(videoFile);
      video.src = url;
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error('视频加载超时'));
      }, 15000);

      video.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        reject(new Error('视频加载失败'));
      };
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        if (!duration || duration <= 0) {
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          reject(new Error('无效的视频文件'));
          return;
        }

        const frames: string[] = [];
        let frameIndex = 0;
        const totalFrames = 8;
        const interval = duration / (totalFrames + 1);
        
        const maxWidth = 600;
        const maxHeight = 400;
        let canvasWidth = video.videoWidth;
        let canvasHeight = video.videoHeight;
        
        if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
          const ratio = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight);
          canvasWidth = Math.floor(canvasWidth * ratio);
          canvasHeight = Math.floor(canvasHeight * ratio);
        }
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const captureFrame = () => {
          if (frameIndex >= totalFrames) {
            clearTimeout(timeout);
            URL.revokeObjectURL(url);
            resolve(frames);
            return;
          }

          const currentTime = interval * (frameIndex + 1);
          video.currentTime = Math.min(currentTime, duration - 0.1);
          
          const onSeeked = () => {
            try {
              ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
              frames.push(canvas.toDataURL('image/jpeg', 0.7));
              
              frameIndex++;
              video.removeEventListener('seeked', onSeeked);
              
              requestAnimationFrame(captureFrame);
            } catch (error) {
              clearTimeout(timeout);
              URL.revokeObjectURL(url);
              reject(new Error('帧提取失败: ' + (error as Error).message));
            }
          };

          video.addEventListener('seeked', onSeeked, { once: true });
        };

        captureFrame();
      };
    });
  };

  const openCoverSelection = async () => {
    if (fileList.length === 0 && mediaFiles.length === 0) {
      message.warning('请先上传视频文件');
      return;
    }

    const videoFile = fileList[0]?.originFileObj || mediaFiles[0]?.file;
    if (!videoFile) {
      message.error('无法获取视频文件');
      return;
    }

    setExtractingFrames(true);
    setCoverSelectionVisible(true);
    
    try {
      const frames = await extractVideoFrames(videoFile);
      setVideoFrames(frames);
    } catch (error) {
      message.error('提取视频帧失败');
      console.error('Frame extraction error:', error);
    } finally {
      setExtractingFrames(false);
    }
  };

  const selectVideoFrame = async (frameDataUrl: string) => {
    try {
      const response = await fetch(frameDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'video-frame.jpg', { type: 'image/jpeg' });
      
      if (onUpload) {
        setUploading(true);
        const url = await onUpload(file);
        const coverFile = {
          uid: 'cover-frame',
          name: 'video-frame.jpg',
          status: 'done' as const,
          url,
          response: url,
        };
        setCoverFileList([coverFile]);
        message.success('视频帧封面设置成功');
      }
    } catch (error) {
      message.error('设置封面失败');
      console.error('Cover selection error:', error);
    } finally {
      setUploading(false);
    }
  };

  const selectAlbumImage = async (imageFile: UploadFile) => {
    if (imageFile.url || imageFile.response) {
      const coverFile = {
        uid: 'cover-album',
        name: imageFile.name || 'album-cover.jpg',
        status: 'done' as const,
        url: imageFile.url || imageFile.response,
        response: imageFile.url || imageFile.response,
      };
      setCoverFileList([coverFile]);
      setCoverSelectionVisible(false);
      message.success('相册封面设置成功');
    }
  };

  const addTag = () => {
    if (customTag && !tags.includes(customTag)) {
      setTags([...tags, customTag]);
      setCustomTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传</div>
    </div>
  );

  // 检查表单是否可以提交
  const canSubmit = () => {
    const hasTitle = form.getFieldValue('title')?.trim();
    const hasType = workType;
    const hasMedia = mediaFiles.length > 0 || fileList.length > 0;
    const hasCover = workType === 'video' 
      ? (coverMediaFiles.length > 0 || coverFileList.length > 0)
      : true;
    
    return hasTitle && hasType && hasMedia && hasCover && !uploading;
  };

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        autoComplete="off"
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={12}>
            <Form.Item
              name="title"
              label="作品标题"
              rules={[
                { required: true, message: '请输入作品标题' },
                { max: 100, message: '标题不能超过100个字符' },
              ]}
              validateStatus={formErrors.title ? 'error' : ''}
              help={formErrors.title}
            >
              <Input
                placeholder="请输入作品标题"
                maxLength={100}
                showCount
                onChange={() => {
                  // 清除标题错误
                  setFormErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.title;
                    return newErrors;
                  });
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={12} sm={12}>
            <Form.Item
              name="type"
              label="作品类型"
              rules={[{ required: true, message: '请选择作品类型' }]}
              validateStatus={formErrors.type ? 'error' : ''}
              help={formErrors.type}
            >
              <Select 
                placeholder="请选择作品类型"
                onChange={(value) => {
                  setWorkType(value);
                  // 清除类型错误
                  setFormErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.type;
                    return newErrors;
                  });
                }}
              >
                <Option value="photo">图片</Option>
                <Option value="video">视频</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={12} sm={12}>
            <Form.Item
              name="weddingDate"
              label="婚礼日期"
            >
              <DatePicker
                placeholder="请选择婚礼日期"
                style={{ width: '100%' }}
                disabledDate={(current) => current && current > dayjs().endOf('day')}
              />
            </Form.Item>
          </Col>
          <Col xs={12} sm={12}>
            <Form.Item
              name="customer"
              label="客户姓名"
            >
              <Input
                placeholder="请输入客户姓名"
                maxLength={50}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={24}>
            <Form.Item label="作品标签">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space wrap>
                  {tags.map((tag) => (
                    <Tag
                      key={tag}
                      closable
                      onClose={() => removeTag(tag)}
                    >
                      {tag}
                    </Tag>
                  ))}
                </Space>

                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="输入标签"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onPressEnter={addTag}
                    maxLength={20}
                  />
                  <Button
                    type="primary"
                    onClick={addTag}
                    disabled={!customTag || tags.includes(customTag)}
                  >
                    添加
                  </Button>
                </Space.Compact>
              </Space>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={24}>
            <Form.Item
              name="description"
              label="作品描述"
              rules={[
                { max: 500, message: '描述不能超过500个字符' },
              ]}
            >
              <TextArea
                placeholder="请输入作品描述"
                rows={4}
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Col>
        </Row>

        {workType === 'video' ? (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={24}>
                <Form.Item
                  label="视频文件"
                  required
                  validateStatus={formErrors.media || formErrors.video ? 'error' : ''}
                  help={formErrors.media || formErrors.video}
                >
                  <div className="mb-4">
                    <MediaUploader
                      config={{
                        accept: ['video/*'],
                        multiple: false,
                        maxCount: 1,
                        category: 'work'
                      }}
                      onUploadSuccess={handleMediaUploadSuccess}
                      onUploadError={handleMediaUploadError}
                    />
                  </div>
                  {mediaFiles.length > 0 && (
                    <MediaList
                      files={mediaFiles}
                      onRemove={handleMediaRemove}
                    />
                  )}
                  {fileList.length > 0 && (
                    <Upload
                      listType="picture-card"
                      fileList={fileList}
                      onChange={handleChange}
                      customRequest={handleUpload}
                      beforeUpload={beforeUpload}
                      multiple={false}
                      accept="video/*"
                      showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                    >
                      {fileList.length >= 1 ? null : uploadButton}
                    </Upload>
                  )}
                  <div style={{ color: 'var(--admin-text-secondary)', fontSize: 12, marginTop: 8 }}>
                    支持视频格式，单个文件不超过10MB
                  </div>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={24}>
                <Form.Item
                  label="视频封面图片"
                  required
                  validateStatus={formErrors.cover ? 'error' : ''}
                  help={formErrors.cover}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<ScissorOutlined />}
                        onClick={openCoverSelection}
                        disabled={fileList.length === 0 && mediaFiles.length === 0}
                        loading={extractingFrames}
                      >
                        智能选择封面
                      </Button>
                      <span style={{ color: 'var(--admin-text-secondary)', fontSize: 12 }}>
                        从视频帧或相册图片中选择封面
                      </span>
                    </Space>
                    
                    <div className="mb-4">
                      <MediaUploader
                        config={{
                          accept: ['image/*'],
                          multiple: false,
                          maxCount: 1,
                          category: 'cover'
                        }}
                        onUploadSuccess={handleCoverUploadSuccess}
                        onUploadError={handleMediaUploadError}
                      />
                    </div>
                    {coverMediaFiles.length > 0 && (
                      <MediaList
                        files={coverMediaFiles}
                        onRemove={handleCoverRemove}
                      />
                    )}
                    {coverFileList.length > 0 && (
                      <Upload
                        listType="picture-card"
                        fileList={coverFileList}
                        onChange={handleCoverChange}
                        customRequest={handleUpload}
                        beforeUpload={beforeCoverUpload}
                        multiple={false}
                        accept="image/*"
                        showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                      >
                        {coverFileList.length >= 1 ? null : uploadButton}
                      </Upload>
                    )}
                    
                    <div style={{ color: 'var(--admin-text-secondary)', fontSize: 12 }}>
                      视频作品必须上传封面图片，支持图片格式，单个文件不超过10MB
                    </div>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </>
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24}>
              <Form.Item
                label="作品文件"
                required
                validateStatus={formErrors.media ? 'error' : ''}
                help={formErrors.media}
              >
                <div className="mb-4">
                  <MediaUploader
                    config={{
                      accept: ['image/*', 'video/*'],
                      multiple: true,
                      maxCount: 10,
                      category: 'work'
                    }}
                    onUploadSuccess={handleMediaUploadSuccess}
                    onUploadError={handleMediaUploadError}
                  />
                </div>
                {mediaFiles.length > 0 && (
                  <MediaList
                    files={mediaFiles}
                    onRemove={handleMediaRemove}
                  />
                )}
                <div style={{ color: 'var(--admin-text-secondary)', fontSize: 12, marginTop: 8 }}>
                  支持图片和视频格式，单个文件不超过10MB，最多上传10个文件
                </div>
              </Form.Item>
            </Col>
          </Row>
        )}

        <Row gutter={[16, 16]}>
          <Col xs={12} sm={12}>
            <Form.Item
              name="isPublic"
              label="公开作品"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} sm={12}>
            <Form.Item
              name="isFeatured"
              label="设为精选"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={loading || uploading}
              disabled={!canSubmit()}
            >
              {isEdit ? '更新' : '创建'}
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {/* 隐藏的视频和画布元素用于帧提取 */}
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* 封面选择模态框 */}
      <Modal
        title="选择视频封面"
        open={coverSelectionVisible}
        onCancel={() => setCoverSelectionVisible(false)}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* 视频帧选择 */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <VideoCameraOutlined />
              从视频帧中选择
            </h4>
            {extractingFrames ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Button loading>正在提取视频帧...</Button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                {videoFrames.map((frame, index) => (
                  <div
                    key={index}
                    style={{
                      cursor: 'pointer',
                      border: '2px solid transparent',
                      borderRadius: 8,
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                    }}
                    onClick={() => selectVideoFrame(frame)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#1890ff';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Image
                      src={frame}
                      alt={`Frame ${index + 1}`}
                      style={{ width: '100%', height: 80, objectFit: 'cover' }}
                      preview={false}
                    />
                    <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 12, color: '#666' }}>
                      帧 {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Divider />

          {/* 相册图片选择 */}
          <div>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <PictureOutlined />
              从相册图片中选择
            </h4>
            {fileList.filter(file => file.type?.startsWith('image/')).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                {fileList
                  .filter(file => file.type?.startsWith('image/'))
                  .map((imageFile) => (
                    <div
                      key={imageFile.uid}
                      style={{
                        cursor: 'pointer',
                        border: '2px solid transparent',
                        borderRadius: 8,
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                      }}
                      onClick={() => selectAlbumImage(imageFile)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#1890ff';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Image
                        src={imageFile.url || imageFile.response}
                        alt={imageFile.name}
                        style={{ width: '100%', height: 80, objectFit: 'cover' }}
                        preview={false}
                      />
                      <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 12, color: '#666' }}>
                        {imageFile.name}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                当前作品中没有图片文件
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default WorkForm;

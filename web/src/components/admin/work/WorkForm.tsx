import React, { useEffect, useState } from 'react';
import {
  Form, Input, Select, DatePicker, Switch, Button, Space, Tag, message, Row,
  Col, Image, Alert
} from 'antd';
import { VideoCameraOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Work } from './WorkCard';
import { MediaUploader } from '../../common/MediaUploader';
import type { DirectUploadResult } from '../../../utils/direct-upload';
import { fileService } from '../../../services';
import { FileType, type FileInfo } from '../../../types';
import { useAppSelector } from '../../../store/hooks';
import type { RootState } from '../../../store';
import './WorkForm.scss';

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
}) => {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [workMedias, setWorkMedias] = useState<FileInfo[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [workType, setWorkType] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});
  const user = useAppSelector((state: RootState) => state.auth.user);
  
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

      if (initialValues.files) {
        setWorkMedias(initialValues.files);
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
    const totalMediaFiles = workMedias.length;
    if (totalMediaFiles === 0) {
      errors.media = '请至少上传一个媒体文件';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 获取图片尺寸的函数
  const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        resolve({ width: 120, height: 80 }); // 默认尺寸
      };
      img.src = url;
    });
  };

  // 计算保持宽高比的缩略图尺寸
  const calculateThumbnailSize = (originalWidth: number, originalHeight: number, maxWidth: number = 120, maxHeight: number = 80) => {
    const aspectRatio = originalWidth / originalHeight;
    
    let thumbnailWidth = maxWidth;
    let thumbnailHeight = maxWidth / aspectRatio;
    
    if (thumbnailHeight > maxHeight) {
      thumbnailHeight = maxHeight;
      thumbnailWidth = maxHeight * aspectRatio;
    }
    
    return {
      width: Math.round(thumbnailWidth),
      height: Math.round(thumbnailHeight)
    };
  };

  // MediaUploader回调处理
  const handleMediaUploadSuccess = async (results: DirectUploadResult[]) => {
    if (results.length === 0) {
      return;
    }
    let newWorkMedias: FileInfo[] = [];  
    if (workType === 'video') {
      const file = (await fileService.getFile(results[0].id)).data 
      if (file) {
        newWorkMedias = [{ ...file, fileType: 'video', thumbnailUrl: file.thumbnailUrl }];
      };
    }
   else{
    newWorkMedias = results.map(result => ({
      fileId: result.id, 
      fileType: result.fileType as FileType, 
      thumbnailUrl: result.url,
      fileUrl: result.url,
      userId: user?.id || '',
      createdAt: new Date(result.uploadedAt),
      updatedAt: new Date(result.uploadedAt),
      filename: result.filename,
      fileSize: result.fileSize
   }));}
   
    
    setWorkMedias(prev => [...prev, ...newWorkMedias]);

    // 获取图片尺寸
    const dimensionsPromises = newWorkMedias.map(async (media) => {
      if (media.fileType === 'image') {
        const dimensions = await getImageDimensions(media.fileUrl);
        return { fileId: media.fileId, dimensions };
      } else if (media.fileType === 'video' && media.thumbnailUrl) {
        const dimensions = await getImageDimensions(media.thumbnailUrl);
        return { fileId: media.fileId, dimensions };
      }
      return { fileId: media.fileId, dimensions: { width: 120, height: 80 } };
    });

    const dimensionsResults = await Promise.all(dimensionsPromises);
    const newDimensions: Record<string, { width: number; height: number }> = {};
    
    dimensionsResults.forEach(result => {
      if (result) {
        newDimensions[result.fileId] = result.dimensions;
      }
    });

    setImageDimensions(prev => ({ ...prev, ...newDimensions }));

    // 清除相关错误
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.media;
      return newErrors;
    });
  };

  const handleMediaUploadError = (error: Error) => {
    message.error(`上传失败: ${error.message}`);
  };

  const handleMediaRemove = async (fileId: string) => {
    try {
      setWorkMedias(prev => prev.filter(file => file.fileId !== fileId));
      setImageDimensions(prev => {
        const newDimensions = { ...prev };
        delete newDimensions[fileId];
        return newDimensions;
      });
      await fileService.deleteFile(fileId);
      message.success('文件删除成功');
    } catch (error) {
      console.error('删除文件失败:', error);
      message.error('删除文件失败');
    }
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
      
      const submitData = {
        ...values,
        weddingDate: values.weddingDate?.format('YYYY-MM-DD'),
        tags,
        type: workType,
        files: workMedias, // 包含上传的媒体文件
      };

      // 提交前显示加载状态
      setUploading(true);
      
      await onSubmit(submitData);
      
      // 成功后重置表单（如果不是编辑模式）
      if (!isEdit) {
        form.resetFields();
        setTags([]);
        setWorkMedias([]);
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

  const addTag = () => {
    if (customTag && !tags.includes(customTag)) {
      setTags([...tags, customTag]);
      setCustomTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // 检查表单是否可以提交
  const canSubmit = () => {
    const hasTitle = form.getFieldValue('title')?.trim();
    const hasType = workType;
    const hasMedia = workMedias.length > 0;
    return hasTitle && hasType && hasMedia && !uploading;
  };

  return (
    <>
      {/* 错误提示 */}
      {Object.keys(formErrors).length > 0 && (
        <Alert
          message="表单验证错误"
          description={
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {Object.entries(formErrors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          }
          type="error"
          showIcon
          closable
          onClose={() => setFormErrors({})}
          style={{ marginBottom: 16 }}
        />
      )}

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
                        accept: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv', 'video/*'],
                        multiple: false,
                        maxCount: 1,
                        category: 'work',
                        requireCover: true
                      }}
                      onUploadSuccess={handleMediaUploadSuccess}
                      onUploadError={handleMediaUploadError}
                      onFileRemove={handleMediaRemove}
                    />

                    {/* 视频缩略图预览 - 单行横向排列 */}
                    {workMedias.length > 0 && (
                      <div className="media-thumbnails-container">
                        {workMedias.map((media, index) => (
                          <div key={media.fileId} className="media-thumbnail-item">
                            <div className="thumbnail-wrapper">
                              {media.thumbnailUrl ? (
                                (() => {
                                  const dimensions = imageDimensions[media.fileId];
                                  const thumbnailSize = dimensions 
                                    ? calculateThumbnailSize(dimensions.width, dimensions.height)
                                    : { width: 120, height: 80 };
                                  
                                  return (
                                    <Image
                                      src={media.thumbnailUrl}
                                      alt={`视频封面 ${index + 1}`}
                                      width={thumbnailSize.width}
                                      height={thumbnailSize.height}
                                      style={{ 
                                        objectFit: 'contain',
                                        borderRadius: '6px',
                                        border: '1px solid #d9d9d9',
                                        backgroundColor: '#fff'
                                      }}
                                      preview={{
                                        src: media.fileUrl,
                                        mask: <VideoCameraOutlined style={{ fontSize: '20px' }} />
                                      }}
                                    />
                                  );
                                })()
                              ) : (
                                <div className="video-placeholder-thumbnail">
                                  <VideoCameraOutlined style={{ fontSize: '32px', color: '#999' }} />
                                </div>
                              )}
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                className="delete-button"
                                onClick={() => handleMediaRemove(media.fileId)}
                                size="small"
                              />
                            </div>
                            <div className="thumbnail-info">
                              <div className="file-size">
                                {media.fileSize ? `${(media.fileSize / 1024 / 1024).toFixed(1)}MB` : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                <MediaUploader
                  config={{
                    maxCount: 20,
                    accept: ['image/*'],
                    category: 'work',
                    multiple: true,
                    concurrent: 2
                  }}
                  onUploadSuccess={handleMediaUploadSuccess}
                  onUploadError={handleMediaUploadError}
                  onFileRemove={handleMediaRemove}
                />

                {/* 图片缩略图预览 - 单行横向排列 */}
                {workMedias.length > 0 && (
                  <div className="media-thumbnails-container">
                    {workMedias.map((media, index) => (
                      <div key={media.fileId} className="media-thumbnail-item">
                        <div className="thumbnail-wrapper">
                          {(() => {
                            const dimensions = imageDimensions[media.fileId];
                            const thumbnailSize = dimensions 
                              ? calculateThumbnailSize(dimensions.width, dimensions.height)
                              : { width: 120, height: 80 };
                            
                            return (
                              <Image
                                src={media.fileUrl}
                                alt={`作品图片 ${index + 1}`}
                                width={thumbnailSize.width}
                                height={thumbnailSize.height}
                                style={{ 
                                  objectFit: 'contain',
                                  borderRadius: '6px',
                                  border: '1px solid #d9d9d9',
                                  backgroundColor: '#fff'
                                }}
                                preview={{
                                  src: media.fileUrl
                                }}
                              />
                            );
                          })()}
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            className="delete-button"
                            onClick={() => handleMediaRemove(media.fileId)}
                            size="small"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
    </>
  );
};

export default WorkForm;
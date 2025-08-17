import React, { useEffect, useState, useRef } from 'react';
import {
  Form, Input, Select, DatePicker, Switch, Button, Space, Upload, Tag, message, Row,
  Col, Modal, Image, Divider
} from 'antd';
import { PlusOutlined, VideoCameraOutlined, PictureOutlined, ScissorOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Work } from './WorkCard';
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
  const [tags, setTags] = useState<string[]>([]);
  const [workType, setWorkType] = useState<string>('');
  
  // 视频封面选择相关状态
  const [coverSelectionVisible, setCoverSelectionVisible] = useState(false);
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [extractingFrames, setExtractingFrames] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<Array<{file: File, onSuccess?: (response: any) => void, onError?: (error: Error) => void}>>([]);
  const [activeUploads, setActiveUploads] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxConcurrentUploads = 2; // 限制并发上传数量

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

  const handleSubmit = async () => {
    try {
      // 视频类型必须有视频文件和封面图片的验证
      if (workType === 'video') {
        if (fileList.length === 0) {
          message.error('视频作品必须上传视频文件');
          return;
        }
        if (coverFileList.length === 0) {
          message.error('视频作品必须上传封面图片');
          return;
        }
      } else {
        if (fileList.length === 0) {
          message.error('请上传作品文件');
          return;
        }
      }
      
      const values = await form.validateFields();
      const submitData = {
        ...values,
        shootDate: values.shootDate?.format('YYYY-MM-DD'),
        tags,
        contentUrls: fileList.map(file => file.response || file.url).filter(Boolean),
        coverUrl: workType === 'video' 
          ? (coverFileList[0]?.response || coverFileList[0]?.url || '')
          : (fileList[0]?.response || fileList[0]?.url || ''),
      };
      onSubmit(submitData);
    } catch (error) {
      console.error('表单验证失败:', error);
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
      // 继续处理队列中的下一个文件
      setTimeout(processUploadQueue, 100);
    }
  };

  // 监听上传队列变化
  useEffect(() => {
    if (uploadQueue.length > 0 && activeUploads < maxConcurrentUploads) {
      processUploadQueue();
    }
  }, [uploadQueue, activeUploads]);

  // 监听活跃上传数量变化，更新上传状态
  useEffect(() => {
    setUploading(activeUploads > 0 || uploadQueue.length > 0);
  }, [activeUploads, uploadQueue.length]);

  const handleUpload: UploadProps['customRequest'] = ({ file, onSuccess, onError }) => {
    // 添加到上传队列
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
      // 视频类型只允许上传视频文件
      if (!isVideo) {
        message.error('视频作品只能上传视频文件！');
        return false;
      }
    } else {
      // 图片类型允许上传图片和视频
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

  // 从视频中提取帧（优化版本）
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
      
      // 减少超时时间以提高响应速度
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error('视频加载超时'));
      }, 15000); // 15秒超时

      // 错误处理
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
        const totalFrames = 8; // 增加帧数以提供更多选择
        const interval = duration / (totalFrames + 1);
        
        // 预计算画布尺寸以避免重复计算
        const maxWidth = 600; // 减小尺寸以提高性能
        const maxHeight = 400;
        let canvasWidth = video.videoWidth;
        let canvasHeight = video.videoHeight;
        
        if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
          const ratio = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight);
          canvasWidth = Math.floor(canvasWidth * ratio);
          canvasHeight = Math.floor(canvasHeight * ratio);
        }
        
        // 设置画布尺寸一次
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
              // 使用预计算的尺寸，避免重复计算
              ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
              frames.push(canvas.toDataURL('image/jpeg', 0.7)); // 稍微降低质量以提高速度
              
              frameIndex++;
              video.removeEventListener('seeked', onSeeked);
              
              // 移除延迟，使用requestAnimationFrame优化性能
              requestAnimationFrame(captureFrame);
            } catch (error) {
              clearTimeout(timeout);
              URL.revokeObjectURL(url);
              reject(new Error('帧提取失败: ' + (error as Error).message));
            }
          };

          video.addEventListener('seeked', onSeeked, { once: true }); // 使用once选项自动移除监听器
        };

        captureFrame();
      };
    });
  };

  // 打开封面选择模态框
  const openCoverSelection = async () => {
    if (fileList.length === 0) {
      message.warning('请先上传视频文件');
      return;
    }

    const videoFile = fileList[0];
    if (!videoFile.originFileObj) {
      message.error('无法获取视频文件');
      return;
    }

    setExtractingFrames(true);
    setCoverSelectionVisible(true);
    
    try {
      const frames = await extractVideoFrames(videoFile.originFileObj);
      setVideoFrames(frames);
    } catch (error) {
      message.error('提取视频帧失败');
      console.error('Frame extraction error:', error);
    } finally {
      setExtractingFrames(false);
    }
  };

  // 选择视频帧作为封面
  const selectVideoFrame = async (frameDataUrl: string) => {
    try {
      // 将base64转换为File对象
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
        // 不自动关闭模态框，让用户可以继续选择其他帧
        // setCoverSelectionVisible(false);
        message.success('视频帧封面设置成功，可继续选择其他帧或手动关闭');
      }
    } catch (error) {
      message.error('设置封面失败');
      console.error('Cover selection error:', error);
    } finally {
      setUploading(false);
    }
  };

  // 选择相册图片作为封面
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
          >
            <Input
              placeholder="请输入作品标题"
              maxLength={100}
              showCount
            />
          </Form.Item>
        </Col>
        <Col xs={12} sm={12}>
          <Form.Item
            name="type"
            label="作品类型"
            rules={[{ required: true, message: '请选择作品类型' }]}
          >
            <Select 
              placeholder="请选择作品类型"
              onChange={(value) => setWorkType(value)}
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
            rules={[{  message: '请选择婚礼日期' }]}
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
            rules={[{message: '请输入客户姓名' }]}
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
          <Form.Item
            label="作品标签"
          >
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
              { message: '请输入作品描述' },
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
              >
                <Upload
                  listType="picture-card"
                  fileList={fileList}
                  onChange={handleChange}
                  customRequest={handleUpload}
                  beforeUpload={beforeUpload}
                  multiple={false}
                  accept="video/*"
                >
                  {fileList.length >= 1 ? null : uploadButton}
                </Upload>
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
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    <Button
                      type="primary"
                      icon={<ScissorOutlined />}
                      onClick={openCoverSelection}
                      disabled={fileList.length === 0}
                      loading={extractingFrames}
                    >
                      智能选择封面
                    </Button>
                    <span style={{ color: 'var(--admin-text-secondary)', fontSize: 12 }}>
                      从视频帧或相册图片中选择封面
                    </span>
                  </Space>
                  
                  <Upload
                    listType="picture-card"
                    fileList={coverFileList}
                    onChange={handleCoverChange}
                    customRequest={handleUpload}
                    beforeUpload={beforeCoverUpload}
                    multiple={false}
                    accept="image/*"
                  >
                    {coverFileList.length >= 1 ? null : uploadButton}
                  </Upload>
                  
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
            >
              <Upload
                listType="picture-card"
                fileList={fileList}
                onChange={handleChange}
                customRequest={handleUpload}
                beforeUpload={beforeUpload}
                multiple={true}
                accept="image/*,video/*"
              >
                {fileList.length >= 10 ? null : uploadButton}
              </Upload>
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
            <Switch  />
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
            disabled={
              workType === 'video' 
                ? (fileList.length === 0 || coverFileList.length === 0)
                : fileList.length === 0
            }
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
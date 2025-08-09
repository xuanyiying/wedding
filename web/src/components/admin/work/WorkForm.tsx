import React, { useEffect, useState } from 'react';
import {
  Form, Input, Select, DatePicker, Switch, Button, Space, Upload, Tag, message, Row,
  Col
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
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

  const handleUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    if (!onUpload) {
      onError?.(new Error('上传功能未配置'));
      return;
    }

    try {
      setUploading(true);
      const url = await onUpload(file as File);
      onSuccess?.(url);
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setUploading(false);
    }
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
            rules={[{ required: true, message: '请选择婚礼日期' }]}
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
              { required: true, message: '请输入作品描述' },
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
                <div style={{ color: 'var(--admin-text-secondary)', fontSize: 12, marginTop: 8 }}>
                  视频作品必须上传封面图片，支持图片格式，单个文件不超过10MB
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
  );
};

export default WorkForm;
import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  message,
  Upload,
  Space,
  Typography
} from 'antd';
import {
  UploadOutlined,
  PlusOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import { IssueType, IssuePriority } from '../../../types/issue';
import issueService from '../../../services/issueService';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface CreateIssueModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

interface CreateIssueForm {
  title: string;
  type: IssueType;
  priority: IssuePriority;
  description: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;
  environment: string;
  attachments?: UploadFile[];
}

const CreateIssueModal: React.FC<CreateIssueModalProps> = ({
  visible,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const handleSubmit = async (values: CreateIssueForm) => {
    setLoading(true);
    try {
      await issueService.createIssue({
        ...values,
        stepsToReproduce: values.stepsToReproduce.join('\n')
      });

      message.success('问题创建成功');
      form.resetFields();
      setFileList([]);
      onSuccess();
    } catch (error: any) {
      console.error('创建问题失败:', error);
      message.error(error.message || '创建问题失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setFileList([]);
    onCancel();
  };

  const beforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isText = file.type.startsWith('text/') || file.type === 'application/pdf';
    
    if (!isImage && !isVideo && !isText) {
      message.error('只能上传图片、视频或文本文件');
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过10MB');
      return false;
    }

    return false; // 手动处理上传
  };

  const normFile = (e: any) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  return (
    <Modal
      title="新建问题"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          type: IssueType.BUG,
          priority: IssuePriority.MEDIUM,
          stepsToReproduce: ['']
        }}
      >
        <Form.Item
          name="title"
          label="问题标题"
          rules={[
            { required: true, message: '请输入问题标题' },
            { max: 200, message: '标题长度不能超过200个字符' }
          ]}
        >
          <Input placeholder="请输入问题标题" />
        </Form.Item>

        <Form.Item
          name="type"
          label="问题类型"
          rules={[{ required: true, message: '请选择问题类型' }]}
        >
          <Select>
            <Option value={IssueType.BUG}>缺陷</Option>
            <Option value={IssueType.FEATURE}>功能需求</Option>
            <Option value={IssueType.ENHANCEMENT}>优化建议</Option>
            <Option value={IssueType.DOCUMENTATION}>文档问题</Option>
            <Option value={IssueType.OTHER}>其他</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="priority"
          label="优先级"
          rules={[{ required: true, message: '请选择优先级' }]}
        >
          <Select>
            <Option value={IssuePriority.LOW}>低</Option>
            <Option value={IssuePriority.MEDIUM}>中</Option>
            <Option value={IssuePriority.HIGH}>高</Option>
            <Option value={IssuePriority.CRITICAL}>紧急</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="description"
          label="问题描述"
          rules={[
            { required: true, message: '请输入问题描述' },
            { max: 5000, message: '描述长度不能超过5000个字符' }
          ]}
        >
          <TextArea
            rows={4}
            placeholder="请详细描述您遇到的问题或需求"
            showCount
            maxLength={5000}
          />
        </Form.Item>

        <Form.Item
          name="expectedBehavior"
          label="期望行为"
          rules={[{ max: 1000, message: '期望行为描述不能超过1000个字符' }]}
        >
          <TextArea
            rows={3}
            placeholder="描述您期望的正确行为或结果"
            showCount
            maxLength={1000}
          />
        </Form.Item>

        <Form.Item
          name="actualBehavior"
          label="实际行为"
          rules={[{ max: 1000, message: '实际行为描述不能超过1000个字符' }]}
        >
          <TextArea
            rows={3}
            placeholder="描述实际发生的行为或结果"
            showCount
            maxLength={1000}
          />
        </Form.Item>

        <Form.List name="stepsToReproduce">
          {(fields, { add, remove }) => (
            <Form.Item label="重现步骤">
              {fields.map((field, index) => (
                <Space
                  key={field.key}
                  style={{ display: 'flex', marginBottom: 8 }}
                  align="baseline"
                >
                  <Text strong>{index + 1}.</Text>
                  <Form.Item
                    {...field}
                    noStyle
                    rules={[
                      { max: 500, message: '每个步骤不能超过500个字符' }
                    ]}
                  >
                    <Input
                      placeholder={`步骤 ${index + 1}`}
                      style={{ width: 500 }}
                    />
                  </Form.Item>
                  {fields.length > 1 && (
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  )}
                </Space>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                icon={<PlusOutlined />}
                style={{ width: '100%' }}
              >
                添加步骤
              </Button>
            </Form.Item>
          )}
        </Form.List>

        <Form.Item
          name="environment"
          label="环境信息"
          rules={[{ max: 500, message: '环境信息不能超过500个字符' }]}
        >
          <Input placeholder="例如：Chrome 浏览器 v95.0, Windows 11" />
        </Form.Item>

        <Form.Item
          name="attachments"
          label="附件"
          valuePropName="fileList"
          getValueFromEvent={normFile}
        >
          <Upload
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={({ fileList }) => setFileList(fileList)}
            multiple
            listType="picture"
            maxCount={5}
          >
            <Button icon={<UploadOutlined />}>选择文件</Button>
            <Text type="secondary" style={{ marginLeft: 8 }}>
              支持图片、视频、文本文件，单个文件不超过10MB
            </Text>
          </Upload>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              提交
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export { CreateIssueModal };
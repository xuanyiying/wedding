import React, { useEffect } from 'react';
import { Form, Input, Select, DatePicker, Button, Space } from 'antd';
import { UserOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Schedule } from './ScheduleCard';

const { TextArea } = Input;
const { Option } = Select;

interface TeamMember {
  id: string;
  name: string;
  role: string;
  isAvailable?: boolean;
}

interface ScheduleFormProps {
  initialValues?: Partial<Schedule>;
  teamMembers: TeamMember[];
  onSubmit: (values: any) => void;
  onCancel: () => void;
  loading?: boolean;
  isEdit?: boolean;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({
  initialValues,
  teamMembers,
  onSubmit,
  onCancel,
  loading = false,
  isEdit = false,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      const formValues = {
        ...initialValues,
        weddingDate: initialValues.weddingDate ? dayjs(initialValues.weddingDate) : undefined,
      };
      form.setFieldsValue(formValues);
    }
  }, [initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData = {
        ...values,
        weddingDate: values.weddingDate?.format('YYYY-MM-DD HH:mm:ss'),
      };
      onSubmit(submitData);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const validatePhone = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请输入联系电话'));
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(value)) {
      return Promise.reject(new Error('请输入正确的手机号码'));
    }
    return Promise.resolve();
  };

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      autoComplete="off"
    >
      <Form.Item
        name="title"
        label="档期标题"
        rules={[
          { required: true, message: '请输入档期标题' },
          { max: 100, message: '标题不能超过100个字符' },
        ]}
      >
        <Input
          placeholder="请输入档期标题"
          maxLength={100}
          showCount
        />
      </Form.Item>

      <Form.Item
        name="hostId"
        label="主持人"
        rules={[{ required: true, message: '请选择主持人' }]}
      >
        <Select
          placeholder="请选择主持人"
          showSearch
          filterOption={(input, option) =>
            option?.label?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
          }
        >
          {teamMembers.map((member) => (
            <Option
              key={member.id}
              value={member.id}
              disabled={member.isAvailable === false}
            >
              <Space>
                <UserOutlined />
                {member.name}
                {member.role && `(${member.role})`}
                {member.isAvailable === false && '(不可用)'}
              </Space>
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="clientName"
        label="客户姓名"
        rules={[
          { required: true, message: '请输入客户姓名' },
          { max: 50, message: '姓名不能超过50个字符' },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="请输入客户姓名"
          maxLength={50}
        />
      </Form.Item>

      <Form.Item
        name="clientPhone"
        label="客户电话"
        rules={[{ validator: validatePhone }]}
      >
        <Input
          prefix={<PhoneOutlined />}
          placeholder="请输入客户电话"
          maxLength={11}
        />
      </Form.Item>

      <Form.Item
        name="weddingDate"
        label="婚礼日期时间"
        rules={[{ required: true, message: '请选择婚礼日期时间' }]}
      >
        <DatePicker
          showTime
          format="YYYY-MM-DD HH:mm"
          placeholder="请选择婚礼日期时间"
          style={{ width: '100%' }}
          disabledDate={(current) => current && current < dayjs().startOf('day')}
        />
      </Form.Item>

      <Form.Item
        name="eventType"
        label="活动类型"
        rules={[{ required: true, message: '请选择活动类型' }]}
      >
        <Select placeholder="请选择活动类型">
          <Option value="lunch">午宴</Option>
          <Option value="dinner">晚宴</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="location"
        label="活动地点"
        rules={[
          { required: true, message: '请输入活动地点' },
          { max: 200, message: '地点不能超过200个字符' },
        ]}
      >
        <Input
          prefix={<EnvironmentOutlined />}
          placeholder="请输入活动地点"
          maxLength={200}
        />
      </Form.Item>

      <Form.Item
        name="status"
        label="档期状态"
        rules={[{ required: true, message: '请选择档期状态' }]}
      >
        <Select placeholder="请选择档期状态">
          <Option value="pending">待确认</Option>
          <Option value="confirmed">已确认</Option>
          <Option value="completed">已完成</Option>
          <Option value="cancelled">已取消</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="notes"
        label="备注信息"
      >
        <TextArea
          placeholder="请输入备注信息"
          rows={4}
          maxLength={500}
          showCount
        />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={loading}
          >
            {isEdit ? '更新' : '创建'}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default ScheduleForm;
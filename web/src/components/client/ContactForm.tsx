import React, { useState } from 'react';
import { Form, Input, Button, Card, Row, Col, Typography, message, Select, DatePicker, TimePicker } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { contactService } from '../../services';
import type { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const FormCard = styled(Card)`
  &&& {
    background: var(--client-bg-container);
    border-radius: var(--client-border-radius-lg);
    border: 1px solid var(--client-border-color);
    box-shadow: var(--client-shadow-sm);
    width: 100%;

    .ant-card-body {
      padding: 32px;
    }

    @media (max-width: 768px) {
      .ant-card-body {
        padding: 24px;
      }
    }
  }
`;

const SubmitButton = styled(Button)`
  &&& {
    width: 100%;
    height: 48px;
    background: var(--client-primary-color);
    border-color: var(--client-primary-color);
    font-size: 16px;
    font-weight: 500;
    border-radius: var(--client-border-radius);
    color: var(--client-text-inverse);
    
    &:hover {
      background: var(--client-primary-hover) !important;
      border-color: var(--client-primary-hover) !important;
      color: var(--client-text-inverse) !important;
    }
  }
`;

interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  weddingDate: Dayjs;
  weddingTime: Dayjs;
  location: string;
  guestCount: number;
  serviceType: 'wedding' | 'engagement' | 'anniversary' | 'other';
  budget: '5000-10000' | '10000-20000' | '20000-50000' | '50000+';
  requirements: string;
}

const ContactForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: ContactFormData) => {
    setLoading(true);
    try {
      const formattedValues = {
        ...values,
        weddingDate: values.weddingDate ? values.weddingDate.format('YYYY-MM-DD') : '',
        weddingTime: values.weddingTime ? values.weddingTime.format('HH:mm:ss') : ''
      };
      
      await contactService.submitContact(formattedValues);
      message.success('咨询信息已提交成功！我们会在24小时内与您联系。');
      form.resetFields();
    } catch (error) {
      console.error('提交咨询表单失败:', error);
      message.error('提交失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormCard style={{ margin: '0 auto' }}>
      <Title level={3} style={{ textAlign: 'center', marginBottom: 16 }}>
        <CustomerServiceOutlined style={{ marginRight: 8 }} />
        在线咨询
      </Title>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="您的姓名"
              name="name"
              rules={[{ required: true, message: '请输入您的姓名' }]}
            >
              <Input placeholder="请输入您的姓名" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="联系电话"
              name="phone"
              rules={[
                { required: true, message: '请输入联系电话' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
              ]}
            >
              <Input placeholder="请输入联系电话" size="large" />
            </Form.Item>
          </Col>
        </Row>
        
        
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="婚礼日期"
              name="weddingDate"
              rules={[{ required: true, message: '请选择婚礼日期' }]}
            >
              <DatePicker 
                placeholder="请选择婚礼日期" 
                size="large" 
                style={{ width: '100%' }}
                disabledDate={(current) => current && current.isBefore(new Date(), 'day')}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="婚礼时间"
              name="weddingTime"
              rules={[{ required: true, message: '请选择婚礼时间' }]}
            >
              <TimePicker 
                placeholder="请选择婚礼时间" 
                size="large" 
                style={{ width: '100%' }}
                format="HH:mm"
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="婚礼地点"
              name="location"
              rules={[{ required: true, message: '请输入婚礼地点' }]}
            >
              <Input placeholder="请输入婚礼地点" size="large" />
            </Form.Item>
          </Col>
        
          <Col xs={24} sm={12}>
            <Form.Item
              label="预算范围"
              name="budget"
              rules={[{ required: true, message: '请选择预算范围' }]}
            >
              <Select placeholder="请选择预算范围" size="large">
                <Option value="5000-10000">5,000 - 10,000 元</Option>
                <Option value="10000-20000">10,000 - 20,000 元</Option>
                <Option value="20000-50000">20,000 - 50,000 元</Option>
                <Option value="50000+">50,000 元以上</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item
          label="特殊要求"
          name="requirements"
        >
          <TextArea 
            placeholder="请描述您对婚礼主持的特殊要求或期望..." 
            rows={4}
            size="large"
          />
        </Form.Item>
        
        <Form.Item>
          <SubmitButton 
            type="primary" 
            htmlType="submit" 
            loading={loading}
          >
            {loading ? '提交中...' : '提交咨询'}
          </SubmitButton>
        </Form.Item>
      </Form>
      
      <div style={{ 
        textAlign: 'center', 
        marginTop: '24px', 
        padding: '16px', 
        background: 'var(--client-bg-layout)', 
        borderRadius: 'var(--client-border-radius)' 
      }}>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          提交后我们会在24小时内与您联系，为您提供专业的婚礼主持咨询服务。
          <br />
          您也可以直接拨打咨询热线：<Text strong>400-888-8888</Text>
        </Text>
      </div>
    </FormCard>
  );
};

export default ContactForm;
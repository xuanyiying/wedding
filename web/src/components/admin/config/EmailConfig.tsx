import React, { useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Switch,
  Space,
  Row,
  Col,
  InputNumber,
  message,
} from 'antd';
import {
  SaveOutlined,
  MailOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import { useEmailConfig } from '../../../contexts/ConfigContext';
import { settingsService } from '../../../services';

const SettingSection = styled.div`
  margin-bottom: 40px;
  
  .section-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--admin-text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .section-description {
    color: var(--admin-text-secondary);
    margin-bottom: 24px;
    font-size: 14px;
    line-height: 1.6;
  }
`;

interface EmailSettingsForm {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  enableSSL: boolean;
}

const EmailConfig: React.FC = () => {
  const [form] = Form.useForm();
  const { email, loading, isDirty, updateEmail, saveEmail } = useEmailConfig();

  // 初始化表单数据
  useEffect(() => {
    if (email) {
      const formData: EmailSettingsForm = {
        smtpHost: email.smtpHost || '',
        smtpPort: email.smtpPort || 587,
        smtpUser: email.smtpUser || '',
        smtpPassword: email.smtpPassword || '',
        enableSSL: email.smtpSecure || false,
        fromEmail: email.emailFrom || '',
        fromName: email.emailFromName || '',
      };
      form.setFieldsValue(formData);
    }
  }, [email, form]);

  // 保存邮件设置
  const handleSave = async (values: EmailSettingsForm) => {
    const emailData = {
      smtpHost: values.smtpHost,
      smtpPort: values.smtpPort,
      smtpUser: values.smtpUser,
      smtpPassword: values.smtpPassword,
      smtpSecure: values.enableSSL,
      emailFrom: values.fromEmail,
      emailFromName: values.fromName,
    };

    updateEmail(emailData);
    await saveEmail();
  };

  // 测试邮件发送
  const testEmail = async () => {
    try {
      const emailFormValues = form.getFieldsValue();
      await settingsService.testEmail({
        to: emailFormValues.fromEmail || 'test@example.com',
        subject: '测试邮件',
        content: '这是一封测试邮件，用于验证邮件配置是否正确。'
      });

      message.success('测试邮件发送成功');
    } catch (error) {
      console.error('邮件发送失败:', error);
      message.error('邮件发送失败');
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSave}
    >
      <SettingSection>
        <div className="section-title">
          <MailOutlined />
          SMTP配置
        </div>
        <div className="section-description">配置邮件发送服务器信息</div>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="smtpHost"
              label="SMTP服务器"
              rules={[{ required: true, message: '请输入SMTP服务器' }]}
            >
              <Input placeholder="例如：smtp.qq.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="smtpPort"
              label="端口号"
              rules={[{ required: true, message: '请输入端口号' }]}
            >
              <InputNumber placeholder="例如：587" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="smtpUser"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="请输入SMTP用户名" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="smtpPassword"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入SMTP密码" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="enableSSL" valuePropName="checked">
          <Space>
            <Switch />
            <span>启用SSL加密</span>
          </Space>
        </Form.Item>
      </SettingSection>

      <SettingSection>
        <div className="section-title">发件人信息</div>
        <div className="section-description">配置邮件发送者信息</div>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="fromEmail"
              label="发件人邮箱"
              rules={[
                { required: true, message: '请输入发件人邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input placeholder="请输入发件人邮箱" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="fromName"
              label="发件人姓名"
              rules={[{ required: true, message: '请输入发件人姓名' }]}
            >
              <Input placeholder="请输入发件人姓名" />
            </Form.Item>
          </Col>
        </Row>
      </SettingSection>

      <Form.Item>
        <Space>
          <Button 
            type="primary" 
            htmlType="submit" 
            icon={<SaveOutlined />} 
            loading={loading}
          >
            保存设置
          </Button>
          <Button onClick={testEmail} loading={loading}>
            测试邮件发送
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default EmailConfig;
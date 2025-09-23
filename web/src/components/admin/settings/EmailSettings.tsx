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
import { useAppSettings } from '../../../hooks/useAppSettings';
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

const EmailSettings: React.FC = () => {
  const [form] = Form.useForm();
  const { settings, loading, refetch } = useAppSettings();

  // 初始化表单数据
  useEffect(() => {
    if (settings?.email) {
      const formData: EmailSettingsForm = {
        smtpHost: settings.email.smtpHost || '',
        smtpPort: settings.email.smtpPort || 587,
        smtpUser: settings.email.smtpUser || '',
        smtpPassword: settings.email.smtpPassword || '',
        enableSSL: settings.email.smtpSecure || false,
        fromEmail: settings.email.emailFrom || '',
        fromName: settings.email.emailFromName || '',
      };
      form.setFieldsValue(formData);
    }
  }, [settings, form]);

  // 保存邮件设置
  const handleSave = async (values: EmailSettingsForm) => {
    try {
      console.log('📝 表单提交的值:', values);
      console.log('📝 当前邮件设置状态:', settings?.email);

      const emailData = {
        smtpHost: values.smtpHost || '',
        smtpPort: values.smtpPort || 587,
        smtpUser: values.smtpUser || '',
        smtpPassword: values.smtpPassword || '',
        smtpSecure: values.enableSSL || false,
        emailFrom: values.fromEmail || '',
        emailFromName: values.fromName || '',
      };

      console.log('📝 构建的邮件设置数据:', emailData);

      // 调用API保存邮件设置
      await settingsService.updateEmailSettings(emailData);
      console.log('✅ 邮件设置保存成功');

      // 重新获取设置以更新状态
      await refetch();

      message.success('邮件设置保存成功');
    } catch (error) {
      console.error('❌ 保存邮件设置失败:', error);
      message.error('保存邮件设置失败，请重试');
    }
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
            保存邮件设置
          </Button>
          <Button onClick={testEmail} loading={loading}>
            测试邮件发送
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default EmailSettings;
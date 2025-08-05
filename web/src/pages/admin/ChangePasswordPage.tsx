import React, { useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useChangePasswordMutation } from '../../store/api/authApi';
import { useTheme } from '../../hooks/useTheme';

const { Title, Text } = Typography;



const ChangePasswordContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-gradient-primary);
  padding: 20px;
`;

const ChangePasswordCard = styled(Card)`
  width: 100%;
  max-width: 500px;
  box-shadow: var(--admin-shadow-xl);
  border-radius: 16px;
  border: none;
  
  .ant-card-body {
    padding: 40px;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 32px;
  
  .ant-typography-title {
    color: var(--admin-primary-color);
    margin-bottom: 8px;
  }
  
  .ant-typography {
    color: var(--admin-text-secondary);
    margin: 0;
  }
`;

const BackButton = styled(Button)`
  margin-bottom: 24px;
`;

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const { initTheme } = useTheme();

  useEffect(() => {
    initTheme('admin');
  }, [initTheme]);

  const handleChangePassword = async (values: ChangePasswordForm) => {
    try {
      const response = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      }).unwrap();

      if (response.success) {
        message.success('密码修改成功！');
        form.resetFields();
        // 可以选择跳转到其他页面或保持在当前页面
        navigate('/admin/profile');
      } else {
        throw new Error(response.message || '密码修改失败');
      }
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || '密码修改失败，请稍后重试！';
      message.error(errorMessage);
    }
  };

  const handleBack = () => {
    navigate(-1); // 返回上一页
  };

  return (
    <ChangePasswordContainer>
      <ChangePasswordCard>
        <BackButton
          type="link"
          onClick={handleBack}
          style={{ padding: 0 }}
        >
          ← 返回
        </BackButton>

        <Header>
          <Title level={2}>修改密码</Title>
          <Text>为了您的账户安全，请定期更换密码</Text>
        </Header>

        <Form<ChangePasswordForm>
          form={form}
          name="changePassword"
          onFinish={handleChangePassword}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[
              { required: true, message: '请输入当前密码！' },
              { min: 6, message: '密码至少6个字符！' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入当前密码"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码！' },
              { min: 6, message: '密码至少6个字符！' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
                message: '密码必须包含大小写字母和数字！'
              }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入新密码"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码！' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致！'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请再次输入新密码"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: '32px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
              size="large"
            >
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </ChangePasswordCard>
    </ChangePasswordContainer>
  );
};

export default ChangePasswordPage;
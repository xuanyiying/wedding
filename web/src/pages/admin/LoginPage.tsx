import React, { useEffect } from 'react';
import { Form, Input, Button, Card, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useLoginMutation } from '../../store/api/authApi';
import { loginSuccess, loginFailure, setLoading, clearError } from '../../store/slices/authSlice';
import type { LoginForm } from '../../types';
import { useTheme } from '../../hooks/useTheme';
const LoginContainer = styled.div`
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-gradient-primary);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20px;
  box-sizing: border-box;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 20% 80%, var(--admin-overlay-1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, var(--admin-overlay-2) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, var(--admin-overlay-1) 0%, transparent 50%);
    pointer-events: none;
  }
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 480px;
  min-height: 520px;
  box-shadow: var(--admin-shadow-xl);
  border-radius: var(--admin-border-radius-xl);
  border: 1px solid var(--admin-border-color-light);
  backdrop-filter: blur(20px);
  background: var(--admin-bg-container);
  position: relative;
  z-index: 1;
  
  .ant-card-body {
    padding: 48px;
    background: transparent;
  }
  
  @media (max-width: 768px) {
    max-width: 100%;
    min-height: auto;
    border-radius: var(--admin-border-radius-lg);
    
    .ant-card-body {
      padding: 32px 24px;
    }
  }
  
  @media (max-width: 480px) {
    .ant-card-body {
      padding: 24px 20px;
    }
  }
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 40px;
  
  .logo-icon {
    font-size: 48px;
    color: var(--admin-primary-color);
    margin-bottom: 16px;
    display: block;
  }
  
  h1 {
    font-size: 32px;
    font-weight: 700;
    color: var(--admin-text-primary);
    margin: 0;
    letter-spacing: -0.5px;
  }
  
  p {
    color: var(--admin-text-secondary);
    margin: 12px 0 0 0;
    font-size: 15px;
    font-weight: 400;
  }
  
  @media (max-width: 768px) {
    margin-bottom: 32px;
    
    .logo-icon {
      font-size: 40px;
    }
    
    h1 {
      font-size: 28px;
    }
    
    p {
      font-size: 14px;
    }
  }
`;


const RememberForgot = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  
  a {
    color: var(--admin-primary-color);
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;
    
    &:hover {
      color: var(--admin-primary-hover);
      text-decoration: underline;
    }
  }
  
  .ant-checkbox-wrapper {
    font-weight: 400;
    color: var(--admin-text-primary);
    
    .ant-checkbox-inner {
      border-color: var(--admin-border-color);
      
      &:hover {
        border-color: var(--admin-primary-color);
      }
    }
    
    .ant-checkbox-checked .ant-checkbox-inner {
      background-color: var(--admin-primary-color);
      border-color: var(--admin-primary-color);
    }
  }
`;


const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  const [login, { isLoading }] = useLoginMutation();
  const { isAuthenticated, error } = useAppSelector((state) => state.auth);
  
  // 初始化admin主题
  const { initTheme } = useTheme();
  
  useEffect(() => {
    initTheme('admin');
  }, [initTheme]);

  // 如果已经登录，直接跳转到仪表板
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // 清除错误信息
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleLogin = async (values: LoginForm) => {
    try {
      dispatch(setLoading(true));
      
      console.log('🔐 开始登录流程:', values.identifier);
      
      // 调用登录API
      const response = await login({
        identifier: values.identifier,
        password: values.password
      }).unwrap();
      
      console.log('📊 响应数据结构:', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        user: response.data?.user,
        tokens: response.data?.tokens,
        tokensKeys: response.data?.tokens ? Object.keys(response.data.tokens) : [],
        accessToken: response.data?.tokens?.accessToken
      });
      
      if (response.success && response.data && response.data.tokens) {
        const loginData = {
          user: response.data.user,
          accessToken: response.data.tokens.accessToken
        };
        
        console.log('🔑 Token详情:', {
          accessTokenType: typeof loginData.accessToken,
          accessTokenValue: loginData.accessToken
        });
        
        // 登录成功，更新Redux状态
        dispatch(loginSuccess(loginData));
        
        // 检查localStorage中的值
        setTimeout(() => {
          console.log('💾 localStorage检查:', {
            accessToken: localStorage.getItem('accessToken'),
            user: localStorage.getItem('user')
          });
        }, 100);
        
        message.success('登录成功！');
        
        // 跳转到仪表板
        navigate('/admin/dashboard');
      } else {
        throw new Error(response.message || '登录失败');
      }
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || '登录失败，请稍后重试！';
      dispatch(loginFailure(errorMessage));
      message.error(errorMessage);
    }
  };

  const handleForgotPassword = () => {
    message.info('请联系系统管理员重置密码');
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>
          <SafetyCertificateOutlined className="logo-icon" />
          <h1>管理后台</h1>
          <p>婚礼主持俱乐部管理系统</p>
        </Logo>
        
        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="identifier"
            rules={[
              { required: true, message: '请输入用户名或邮箱！' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名或邮箱"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码！' },
              { min: 6, message: '密码至少6个字符！' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <RememberForgot>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>记住我</Checkbox>
            </Form.Item>
            <a onClick={handleForgotPassword}>忘记密码？</a>
          </RememberForgot>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>
        
        {error && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: '20px', 
            padding: '12px', 
            backgroundColor: 'var(--admin-functional-error-bg)', 
            border: '1px solid var(--admin-error-color)', 
            borderRadius: 'var(--admin-border-radius)', 
            color: 'var(--admin-error-color)', 
            fontSize: '14px' 
          }}>
            {error}
          </div>
        )}
        
        <div style={{ 
          textAlign: 'center', 
          marginTop: '24px', 
          color: 'var(--admin-text-tertiary)', 
          fontSize: '13px',
          fontWeight: '400'
        }}>
          请使用您的用户名或邮箱和密码登录系统
        </div>
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginPage;
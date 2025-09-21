import React from 'react';
import styled from 'styled-components';
import { Card, Row, Col, Typography, Space, Button } from 'antd';
import {
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  WechatOutlined,
  HeartOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import ContactForm from '../../components/client/ContactForm';
import { useAppSettings } from '../../hooks';
import type { HomepageSettings } from '../../types';

const { Title, Paragraph, Text } = Typography;

const ContactContainer = styled.div`
  min-height: 100vh;
  padding: 80px 0;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
`;

const ContactCard = styled(Card)`
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: none;
  overflow: hidden;
  
  .ant-card-body {
    padding: 48px;
  }
  
  @media (max-width: 768px) {
    .ant-card-body {
      padding: 24px;
    }
  }
`;

const ContactInfo = styled.div`
  padding: 24px 0;
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(212, 175, 55, 0.05);
  border-radius: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(212, 175, 55, 0.1);
    transform: translateY(-2px);
  }
  
  .anticon {
    font-size: 24px;
    color: #d4af37;
    margin-right: 16px;
    min-width: 24px;
  }
`;

const SocialButton = styled(Button)`
  border-radius: 50px;
  height: 48px;
  padding: 0 24px;
  font-weight: 500;
  
  &.wechat {
    background: #07c160;
    border-color: #07c160;
    color: white;
    
    &:hover {
      background: #06ad56;
      border-color: #06ad56;
    }
  }
  
  &.xiaohongshu {
    background: #ff2442;
    border-color: #ff2442;
    color: white;
    
    &:hover {
      background: #e6203b;
      border-color: #e6203b;
    }
  }
  
  &.douyin {
    background: #000000;
    border-color: #000000;
    color: white;
    
    &:hover {
      background: #333333;
      border-color: #333333;
    }
  }
`;

const ContactPage: React.FC = () => {
  const { settings, loading } = useAppSettings();

  const contact = settings?.homepage.contact as HomepageSettings['contact'] || {};
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  if (loading) {
    return (
      <ContactContainer>
        <ContentWrapper>
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Text>加载中...</Text>
          </div>
        </ContentWrapper>
      </ContactContainer>
    );
  }

  return (
    <ContactContainer>
      <ContentWrapper>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Title level={1} style={{ textAlign: 'center', marginBottom: 16, color: '#2c3e50' }}>
              {contact.title || '联系我们'}
            </Title>
            <Paragraph style={{ textAlign: 'center', fontSize: 18, color: '#7f8c8d', marginBottom: 48 }}>
              {contact.description || '让我们一起记录您最美好的时刻'}
            </Paragraph>
          </motion.div>

          <Row gutter={[32, 32]}>
            <Col xs={24} lg={12}>
              <motion.div variants={itemVariants}>
                <ContactCard>
                  <Title level={3} style={{ marginBottom: 24, color: '#2c3e50' }}>
                    <HeartOutlined style={{ color: '#d4af37', marginRight: 8 }} />
                    联系方式
                  </Title>

                  <ContactInfo>
                    {contact.address && (
                      <ContactItem>
                        <EnvironmentOutlined />
                        <div>
                          <Text strong>工作室地址</Text>
                          <br />
                          <Text type="secondary">{contact.address}</Text>
                        </div>
                      </ContactItem>
                    )}

                    {contact.phone && (
                      <ContactItem>
                        <PhoneOutlined />
                        <div>
                          <Text strong>联系电话</Text>
                          <br />
                          <Text type="secondary">{contact.phone}</Text>
                        </div>
                      </ContactItem>
                    )}

                    {contact.email && (
                      <ContactItem>
                        <MailOutlined />
                        <div>
                          <Text strong>邮箱地址</Text>
                          <br />
                          <Text type="secondary">{contact.email}</Text>
                        </div>
                      </ContactItem>
                    )}

                    {contact.wechat && (
                      <ContactItem>
                        <WechatOutlined />
                        <div>
                          <Text strong>微信号</Text>
                          <br />
                          <Text type="secondary">{contact.wechat}</Text>
                        </div>
                      </ContactItem>
                    )}
                  </ContactInfo>

                  <Space wrap style={{ marginTop: 24 }}>
                    {contact.wechat && (
                      <SocialButton className="wechat" icon={<WechatOutlined />}>
                        微信咨询
                      </SocialButton>
                    )}
                    {contact.xiaohongshu && (
                      <SocialButton className="xiaohongshu">
                        小红书
                      </SocialButton>
                    )}
                    {contact.douyin && (
                      <SocialButton className="douyin">
                        抖音
                      </SocialButton>
                    )}
                  </Space>
                </ContactCard>
              </motion.div>
            </Col>

            <Col xs={24} lg={12}>
              <motion.div variants={itemVariants}>
                <ContactCard>
                  <Title level={3} style={{ marginBottom: 24, color: '#2c3e50' }}>
                    在线咨询
                  </Title>
                  <ContactForm />
                </ContactCard>
              </motion.div>
            </Col>
          </Row>
        </motion.div>
      </ContentWrapper>
    </ContactContainer>
  );
};

export default ContactPage;
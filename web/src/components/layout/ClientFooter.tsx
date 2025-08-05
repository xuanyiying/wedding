import React from 'react';
import { Layout, Row, Col, Space, Divider } from 'antd';
import { PhoneOutlined, MailOutlined, EnvironmentOutlined, WechatOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const { Footer } = Layout;

const StyledFooter = styled(Footer)`
  background: var(--client-bg-layout);
  color: var(--client-text-secondary);
  padding: 48px 32px 24px;
  border-top: 1px solid var(--client-border-color);
  
  @media (max-width: 768px) {
    padding: 32px 16px 16px;
  }
`;

const FooterContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const FooterSection = styled.div`
  margin-bottom: 24px;
  
  h3 {
    color: var(--client-text-primary);
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
  }
  
  p, a {
    color: var(--client-text-secondary);
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 8px;
    text-decoration: none;
    transition: color 0.2s ease;
    
    &:hover {
      color: var(--client-primary-color);
    }
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  
  .anticon {
    margin-right: 8px;
    color: var(--client-primary-color);
  }
`;

const Copyright = styled.div`
  text-align: center;
  color: var(--client-text-tertiary);
  font-size: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--client-border-color);
`;

const ClientFooter: React.FC = () => {
  return (
    <StyledFooter>
      <FooterContainer>
        <Row gutter={[32, 24]}>
          <Col xs={24} sm={12} md={6}>
            <FooterSection>
              <h3>关于我们</h3>
              <p>陆合·合悦Club是一支专业的婚礼主持团队，致力于为每一对新人打造独特而难忘的婚礼体验。</p>
              <p>我们拥有丰富的主持经验和专业的服务团队，为您的特殊日子增添完美的仪式感。</p>
            </FooterSection>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <FooterSection>
              <h3>服务项目</h3>
              <p><a href="/works">婚礼主持</a></p>
              <p><a href="/works">订婚仪式</a></p>
              <p><a href="/works">周年庆典</a></p>
              <p><a href="/works">特殊活动</a></p>
            </FooterSection>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <FooterSection>
              <h3>快速链接</h3>
              <p><a href="/team">团队介绍</a></p>
              <p><a href="/works">作品展示</a></p>
              <p><a href="/schedule">档期查询</a></p>
              <p><a href="/contact">联系我们</a></p>
            </FooterSection>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <FooterSection>
              <h3>联系方式</h3>
              <ContactItem>
                <PhoneOutlined />
                <span>400-888-8888</span>
              </ContactItem>
              <ContactItem>
                <MailOutlined />
                <span>contact@luheheyue.com</span>
              </ContactItem>
              <ContactItem>
                <EnvironmentOutlined />
                <span>上海市黄浦区南京东路123号</span>
              </ContactItem>
              <ContactItem>
                <WechatOutlined />
                <span>微信：LuHeHeYueClub</span>
              </ContactItem>
            </FooterSection>
          </Col>
        </Row>
        
        <Copyright>
          <p>© 2024 陆合·合悦Club. 保留所有权利. | 沪ICP备12345678号-1</p>
          <Space split={<Divider type="vertical" />}>
            <a href="/privacy">隐私政策</a>
            <a href="/terms">服务条款</a>
            <a href="/sitemap">网站地图</a>
          </Space>
        </Copyright>
      </FooterContainer>
    </StyledFooter>
  );
};

export default ClientFooter;
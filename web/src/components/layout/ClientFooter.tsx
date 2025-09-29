import React from 'react';
import { Layout, Row, Col, Space, Divider } from 'antd';
import styled from 'styled-components';
import useAppSettings from '../../hooks/useAppSettings';
import { Link } from 'react-router-dom';

const { Footer } = Layout;

const StyledFooter = styled(Footer)`
  background: var(--client-bg-layout);
  color: var(--client-text-secondary);
  padding: 48px 0 24px; /* 移除左右内边距 */
  border-top: 1px solid var(--client-border-color);
  
  @media (max-width: 768px) {
    padding: 32px 0 16px; /* 移除移动端左右内边距 */
  }
`;

const FooterContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px; /* 在容器上添加左右内边距 */
  
  @media (max-width: 768px) {
    padding: 0 16px; /* 移动端调整内边距 */
  }
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

// 添加垂直居中容器
const VerticalCenterContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 100%;
`;

const Copyright = styled.div`
  text-align: center;
  color: var(--client-text-tertiary);
  font-size: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--client-border-color);
  
  @media (max-width: 768px) {
    text-align: left; /* 移动端左对齐 */
  }
`;

const ClientFooter: React.FC = () => {
  const { settings } = useAppSettings();

  // 使用配置数据或默认值
  const icp = settings?.site?.icp || '沪ICP备12345678号-1';
  const copyright = settings?.site?.copyright || '© 2024 陆合·合悦Club. 保留所有权利.';

  const teamRef = React.useRef(null);
  const worksRef = React.useRef(null);
  const scheduleRef = React.useRef(null);
  const contactRef = React.useRef(null);

  return (
    <StyledFooter>
      <FooterContainer>
        <Row gutter={[48, 32]} justify="center" align="top">
          <Col xs={24} sm={12} md={8}>
            <VerticalCenterContainer>
              <FooterSection>
                <h3>关于我们</h3>
                <p>陆合·合悦Club是一支专业的婚礼主持团队，致力于为每一对新人打造独特而难忘的婚礼体验。</p>
                <p>我们拥有丰富的主持经验和专业的服务团队，为您的特殊日子增添完美的仪式感。</p>
              </FooterSection>
            </VerticalCenterContainer>
          </Col>
          <Col xs={24} sm={6} md={4}>
            <VerticalCenterContainer>
              <FooterSection>
                <h3>快速链接</h3>
                <p><Link to="/team" ref={teamRef}>团队介绍</Link></p>
                <p><Link to="/works" ref={worksRef}>精选案例</Link></p>
                <p><Link to="/schedule" ref={scheduleRef}>档期查询</Link></p>
                <p><Link to="/contact" ref={contactRef}>联系我们</Link></p>
              </FooterSection>
            </VerticalCenterContainer>
          </Col>
        </Row>

        <Copyright>
          <p>{copyright} | {icp}</p>
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
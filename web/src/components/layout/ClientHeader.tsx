import React, { useState } from 'react';
import { Layout, Menu, Button, Drawer } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MenuOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { ThemeMode } from '../../types';
import { scrollToElement, scrollToTop } from '../../utils/scroll';

const { Header } = Layout;

interface ClientHeaderProps {
  theme: ThemeMode;
  onThemeToggle: () => void;
  activeSection: string;
  siteName?: string;
  logoUrl?: string;
}

const StyledHeader = styled(Header)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 1000;
  background: var(--client-header-bg);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--client-border-color);
  box-shadow: var(--client-shadow-sm);
  padding: 0 32px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
  box-sizing: border-box;

  [data-theme="dark"] & {
    background: var(--client-header-bg-dark);
  }

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  font-size: 22px;
  font-weight: 600;
  color: var(--client-primary-color);
  letter-spacing: -0.02em;
  text-decoration: none;
`;

const LogoIcon = styled.div`
  width: 32px;
  height: 32px;
  margin-right: 12px;
  background: var(--client-gradient-primary);
  border-radius: var(--client-border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--client-text-inverse);
  font-weight: 600;
  font-size: 14px;
  box-shadow: var(--client-shadow-sm);
`;

const LogoImage = styled.img`
  width: 32px;
  height: 32px;
  margin-right: 12px;
  border-radius: var(--client-border-radius);
`;

const NavContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex: 1;
  max-width: 800px;
  margin: 0 auto;

  @media (max-width: 768px) {
    display: none;
  }
`;

const StyledMenu = styled(Menu)`
  background: transparent;
  border: none;
  
  .ant-menu-item {
    color: var(--client-text-primary);
    font-weight: 500;
    transition: all 0.2s ease;
    position: relative;
    padding: 8px 16px;
    border-radius: var(--client-border-radius);
    font-size: 15px;
    
    &:hover {
      color: var(--client-primary-color);
      background: var(--client-interaction-hover);
    }
    
    &.ant-menu-item-selected {
      color: var(--client-text-inverse);
      background: var(--client-primary-color);
    }
  }
`;


const MobileMenuButton = styled(Button)`
  display: none;
  background: transparent;
  border: none;
  color: var(--client-text-primary);
  width: 40px;
  height: 40px;
  
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const ClientHeader: React.FC<ClientHeaderProps> = ({ activeSection, siteName, logoUrl }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

  const menuItems = [
    { key: '/', label: '首页', sectionId: 'hero' },
    { key: '/team', label: '团队', sectionId: 'team' },
    { key: '/works', label: '作品', sectionId: 'portfolio' },
    { key: '/schedule', label: '档期', sectionId: 'schedule' },
    { key: '/contact', label: '联系', sectionId: 'contact' },
  ];

  // 处理菜单点击
  const handleMenuClick = (path: string, sectionId?: string) => {
    // 如果当前在首页且目标section存在，则滚动到对应section
    if (location.pathname === '/' && sectionId) {
      const element = document.getElementById(sectionId);
      if (element) {
        if (sectionId === 'hero') {
          scrollToTop();
        } else {
          scrollToElement(sectionId, 64);
        }
        return;
      }
    }
    
    // 否则导航到对应页面
    if (path !== location.pathname) {
      navigate(path);
    }
  };

  const sectionToPath: Record<string, string> = {
    hero: '/',
    team: '/team',
    portfolio: '/works',
    schedule: '/schedule',
    contact: '/contact',
  };

  // 优化导航高亮逻辑
  const getSelectedKey = () => {
    // 如果在首页且有activeSection，根据section映射到对应的菜单项
    if (location.pathname === '/' && activeSection) {
      const mappedPath = sectionToPath[activeSection];
      return menuItems.find(item => item.key === mappedPath)?.key || '/';
    }
    
    // 非首页或没有activeSection时，使用当前路径
    return menuItems.find(item => item.key === location.pathname)?.key || '/';
  };

  const selectedKey = getSelectedKey();

  return (
    <StyledHeader>
      <NavContainer>
        <Link to="/" style={{ textDecoration: 'none' }}>
        <Logo>
          {logoUrl ? <LogoImage src={logoUrl} alt="site logo" /> : <LogoIcon> </LogoIcon>}
          <span>{siteName || '陆合·合悦Club'}</span>
        </Logo>
      </Link>
        <StyledMenu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={menuItems.map(item => ({
            key: item.key,
            label: (
              <span 
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuClick(item.key, item.sectionId);
                }}
                style={{ cursor: 'pointer' }}
              >
                {item.label}
              </span>
            ),
          }))}
        />
      </NavContainer>

      <MobileMenuButton
        icon={<MenuOutlined />}
        onClick={() => setMobileMenuVisible(true)}
      />

      <Drawer
        title="导航菜单"
        placement="right"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        width={280}
      >
        <Menu
          mode="vertical"
          selectedKeys={[selectedKey]}
          items={menuItems.map(item => ({
            key: item.key,
            label: (
              <span 
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuClick(item.key, item.sectionId);
                  setMobileMenuVisible(false);
                }}
                style={{ cursor: 'pointer' }}
              >
                {item.label}
              </span>
            ),
          }))}
        />
      </Drawer>
    </StyledHeader>
  );
};

export default ClientHeader;
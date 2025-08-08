import React, { useState } from 'react';
import { Layout, Menu, Button, Drawer } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { MenuOutlined, BulbOutlined, BulbFilled } from '@ant-design/icons';
import styled from 'styled-components';
import { ThemeMode } from '../../types';

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

const ThemeToggle = styled(Button)`
  background: var(--client-bg-container);
  border: 1px solid var(--client-border-color);
  border-radius: var(--client-border-radius);
  padding: 8px 12px;
  color: var(--client-text-primary);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  height: 36px;
  
  &:hover {
    background: var(--client-primary-color);
    color: var(--client-text-inverse);
    border-color: var(--client-primary-color);
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

const ClientHeader: React.FC<ClientHeaderProps> = ({ theme, onThemeToggle, activeSection, siteName, logoUrl }) => {
  const location = useLocation();
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

  const menuItems = [
    { key: '/', label: '首页' },
    { key: '/team', label: '团队' },
    { key: '/works', label: '作品' },
    { key: '/schedule', label: '档期' },
    { key: '/contact', label: '联系' },
  ];

  const sectionToPath: Record<string, string> = {
    hero: '/',
    team: '/',
    portfolio: '/works',
    schedule: '/schedule',
    contact: '/contact',
  };

  const activePath = activeSection ? sectionToPath[activeSection] : location.pathname;
  const selectedKey = menuItems.find(item => item.key === activePath)?.key || '/';

  return (
    <StyledHeader>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <Logo>
          {logoUrl ? <LogoImage src={logoUrl} alt="site logo" /> : <LogoIcon>LH</LogoIcon>}
          {siteName || '陆合·合悦Club'}
        </Logo>
      </Link>
      
      <NavContainer>
        <StyledMenu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={menuItems.map(item => ({
            key: item.key,
            label: <Link to={item.key}>{item.label}</Link>,
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
              <Link 
                to={item.key} 
                onClick={() => setMobileMenuVisible(false)}
              >
                {item.label}
              </Link>
            ),
          }))}
        />
        <div style={{ marginTop: 24 }}>
          <ThemeToggle
            icon={theme === ThemeMode.LIGHT ? <BulbOutlined /> : <BulbFilled />}
            onClick={onThemeToggle}
            block
          >
            {theme === ThemeMode.LIGHT ? '切换到深色模式' : '切换到浅色模式'}
          </ThemeToggle>
        </div>
      </Drawer>
    </StyledHeader>
  );
};

export default ClientHeader;
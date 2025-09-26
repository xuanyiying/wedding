import React, { useState, useCallback } from 'react';
import { Layout, Menu, Button, Drawer } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { MenuOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { ThemeMode } from '../../types';
import { scrollToElement, scrollToTop } from '../../utils/scroll';
import useAppSettings from '../../hooks/useAppSettings';

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

const LogoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-right: 24px;
  height: 100%;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.02);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const LogoWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SiteName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: var(--client-text-primary);
  margin-top: 4px;
  text-align: center;
  line-height: 1.2;
`;

const LogoIcon = styled.div`
  width: 32px;
  height: 32px;
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
  height: 100%;

  @media (max-width: 768px) {
    display: flex;
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    background: var(--client-header-bg);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--client-border-color);
    padding: 8px 16px;
    z-index: 999;
    box-shadow: var(--client-shadow-sm);
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    
    &::-webkit-scrollbar {
      display: none;
    }
    
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

const StyledMenu = styled(Menu)`
  background: transparent;
  border: none;
  height: 100%;
  line-height: 64px;
  
  .ant-menu-item {
    color: var(--client-text-primary);
    font-weight: 500;
    transition: all 0.15s ease; /* 减少过渡时间提高响应速度 */
    position: relative;
    padding: 8px 16px;
    border-radius: var(--client-border-radius);
    font-size: 15px;
    height: auto;
    line-height: normal;
    display: flex;
    align-items: center;
    border-bottom: none;
    
    &:hover {
      color: var(--client-primary-color);
      background: var(--client-interaction-hover);
      transform: translateY(-1px); /* 添加微妙的悬停效果 */
    }
    
    &:active {
      transform: translateY(0); /* 点击时的反馈 */
    }
    
    &.ant-menu-item-selected {
      color: var(--client-text-inverse);
      background: var(--client-primary-color);
      border-bottom: none;
      
      &:hover {
        background: var(--client-primary-color);
        opacity: 0.9;
      }
    }
  }

  @media (max-width: 768px) {
    display: flex;
    flex-direction: row;
    min-width: max-content;
    
    .ant-menu-item {
      flex-shrink: 0;
      margin: 0 4px;
      padding: 6px 12px;
      font-size: 14px;
      white-space: nowrap;
      border-bottom: none;
      transition: all 0.1s ease; /* 移动端更快的响应 */
      
      /* 修复移动端文字显示问题 */
      span {
        display: block;
        width: 100%;
        text-align: center;
      }
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
    display: none; /* 保持隐藏状态 */
  }
`;

const ClientHeader: React.FC<ClientHeaderProps> = ({ activeSection, siteName, logoUrl }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const { settings, loading } = useAppSettings();

  // 使用 useCallback 优化性能
  const handleLogoClick = useCallback(() => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50); // 减少延迟时间
    }
  }, [location.pathname, navigate]);

  // 优化菜单点击处理
  const handleMenuClick = useCallback((path: string, sectionId?: string) => {
    // 立即响应，不等待异步操作
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

    // 页面导航
    if (path !== location.pathname) {
      navigate(path);
    }
  }, [location.pathname, navigate]);

  // 处理加载状态
  if (loading) {
    return (
      <StyledHeader>
        <NavContainer>
          <LogoContainer onClick={handleLogoClick}>
            <LogoWrapper>
              {logoUrl ? <LogoImage src={logoUrl} alt="site logo" /> : <LogoIcon> </LogoIcon>}
            </LogoWrapper>
            <SiteName>{siteName || '陆合·合悦'}</SiteName>
          </LogoContainer>
        </NavContainer>
      </StyledHeader>
    );
  }

  // 默认菜单项
  const defaultMenuItems = [
    { key: '/', label: '首页', path: '/', sectionId: 'hero', visible: true, order: 1 },
    { key: '/team', label: '团队', path: '/team', sectionId: 'team', visible: true, order: 2 },
    { key: '/works', label: '作品', path: '/works', sectionId: 'portfolio', visible: true, order: 3 },
    { key: '/schedule', label: '档期', path: '/schedule', sectionId: 'schedule', visible: true, order: 4 },
    { key: '/contact', label: '联系', path: '/contact', sectionId: 'contact', visible: true, order: 5 },
  ];

  // 根据设置过滤菜单项
  const menuItems = defaultMenuItems
    .filter(item => {
      if (settings?.homepage) {
        switch (item.sectionId) {
          case 'hero':
            return settings.homepage.hero?.visible !== false;
          case 'team':
            return settings?.homepage?.team?.visible !== false;
          case 'portfolio':
            return settings?.homepage?.portfolio?.visible !== false;
          case 'schedule':
            return settings?.homepage?.schedule?.visible !== false;
          case 'contact':
            return settings?.homepage?.contact?.visible !== false;
          default:
            return true;
        }
      }
      return item.visible !== false;
    })
    .sort((a, b) => a.order - b.order)
    .map(item => ({
      key: item.path,
      label: item.label,
      sectionId: item.sectionId
    }));

  const sectionToPath: Record<string, string> = {
    hero: '/',
    team: '/team',
    portfolio: '/works',
    schedule: '/schedule',
    contact: '/contact',
  };

  // 优化导航高亮逻辑
  const getSelectedKey = () => {
    if (location.pathname === '/' && activeSection) {
      const mappedPath = sectionToPath[activeSection];
      return menuItems.find(item => item.key === mappedPath)?.key || '/';
    }
    return menuItems.find(item => item.key === location.pathname)?.key || '/';
  };

  const selectedKey = getSelectedKey();

  // 如果没有可见的菜单项，只显示logo
  if (menuItems.length === 0) {
    return (
      <StyledHeader>
        <NavContainer>
          <LogoContainer onClick={handleLogoClick}>
            <LogoWrapper>
              {logoUrl ? <LogoImage src={logoUrl} alt="site logo" /> : <LogoIcon> </LogoIcon>}
            </LogoWrapper>
            <SiteName>{siteName || '陆合·合悦'}</SiteName>
          </LogoContainer>
        </NavContainer>
      </StyledHeader>
    );
  }

  return (
    <StyledHeader>
      <NavContainer>
        <LogoContainer onClick={handleLogoClick}>
          <LogoWrapper>
            {logoUrl ? <LogoImage src={logoUrl} alt="site logo" /> : <LogoIcon> </LogoIcon>}
          </LogoWrapper>
          <SiteName>{siteName || '陆合·合悦'}</SiteName>
        </LogoContainer>

        <StyledMenu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={menuItems.map(item => ({
            key: item.key,
            label: (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleMenuClick(item.key, item.sectionId);
                }}
                style={{ 
                  cursor: 'pointer',
                  display: 'block',
                  width: '100%'
                }}
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
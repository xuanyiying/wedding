import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Layout } from 'antd';
import { useTheme } from '../../hooks/useTheme';
import { useAppSettings } from '../../hooks/useAppSettings';
import ClientHeader from './ClientHeader';
import ClientFooter from './ClientFooter';
import styled from 'styled-components';

const { Content } = Layout;

const StyledLayout = styled(Layout)`
  min-height: 100vh;
  background: var(--client-bg-container);
`;

const StyledContent = styled(Content)`
  margin-top: 64px; /* Header高度 */
  min-height: calc(100vh - 64px - 200px); /* 减去Header和Footer高度 */
`;

const ClientLayout: React.FC = () => {
  const { themeMode, toggleThemeMode, initTheme, applyThemeSettings } = useTheme();
  const [activeSection, setActiveSection] = useState('hero');
  const { settings, loading } = useAppSettings();
  const location = useLocation();

  // 使用SettingsContext中的数据初始化主题
  useEffect(() => {
    if (settings && !loading) {
      try {
        // 应用主题设置
        if (settings.theme?.colors) {
          initTheme('client', settings.theme.darkMode ? 'dark' : 'light');
          applyThemeSettings(settings.theme);
        } else {
          // 如果没有配置，使用默认主题
          initTheme('client', 'light');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        // 出错时使用默认主题
        initTheme('client');
      }
    }
  }, [settings, loading, initTheme, applyThemeSettings]);

  const toggleTheme = () => {
    toggleThemeMode();
  };

  // 使用配置数据或默认值
  const siteName = settings?.site?.name || '婚礼服务平台';
  // 修改默认logo路径为public目录下的路径
  const logoUrl = settings?.site?.logo || '/assets/images/logo.png';

  return (
    <StyledLayout>
      <ClientHeader
        theme={themeMode}
        onThemeToggle={toggleTheme}
        activeSection={location.pathname === '/' ? activeSection : ''}
        siteName={siteName}
        logoUrl={logoUrl}
      />
      <StyledContent>
        <Outlet context={{ setActiveSection }} />
      </StyledContent>
      <ClientFooter />
    </StyledLayout>
  );
};

export default ClientLayout;
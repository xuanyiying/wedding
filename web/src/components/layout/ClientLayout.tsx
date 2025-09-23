import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Layout } from 'antd';
import { useTheme } from '../../hooks/useTheme';
import { settingsService } from '../../services/';
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
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const location = useLocation();

  // 从服务器获取主题设置和网站设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // 获取网站设置
        const siteResponse = await settingsService.getSiteSettings();
        const siteData = siteResponse.data;

        if (siteData) {
          setSiteSettings(siteData);

          // 应用主题设置
          if (siteData.theme?.colors) {
            initTheme('client', siteData.theme.darkMode ? 'dark' : 'light');
            applyThemeSettings(siteData.theme);
          } else {
            // 如果没有配置，使用默认主题
            initTheme('client', 'light');
          }
        } else {
          // 如果没有配置，使用默认主题
          initTheme('client');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        // 出错时使用默认主题
        initTheme('client');
      }
    };

    loadSettings();
  }, [initTheme, applyThemeSettings]);

  const toggleTheme = () => {
    toggleThemeMode();
  };

  // 使用配置数据或默认值
  const siteName = siteSettings?.name || '婚礼服务平台';
  const logoUrl = siteSettings?.logo || './assets/images/logo.png';

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
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
  const [siteName, setSiteName] = useState<string | undefined>(undefined);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const location = useLocation();

  // 从服务器获取主题设置
  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        const response = await settingsService.getSettings();
        const settings = response.data;

        if (settings) {
          setSiteName(settings.site?.name);
          setLogoUrl(settings.site?.logo);

          if (settings.theme?.colors) {
            initTheme('client', settings.theme.darkMode ? 'dark' : 'light');
            applyThemeSettings(settings.theme);
          } else {
            initTheme('client', 'light');
          }
        } else {
          // 如果没有配置，使用默认主题
          initTheme('client');
        }
      } catch (error) {
        console.error('Failed to load theme settings:', error);
        // 出错时使用默认主题
        initTheme('client');
      }
    };
    
    loadThemeSettings();
  }, [initTheme]);

  const toggleTheme = () => {
    toggleThemeMode();
  };

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
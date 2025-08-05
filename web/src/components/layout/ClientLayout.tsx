import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Layout } from 'antd';
import { ThemeMode } from '../../types';
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
  const [theme, setTheme] = useState<ThemeMode>(ThemeMode.LIGHT);
  const [activeSection, setActiveSection] = useState('hero');
  const location = useLocation();

  const toggleTheme = () => {
    setTheme(theme === ThemeMode.LIGHT ? ThemeMode.DARK : ThemeMode.LIGHT);
    document.documentElement.setAttribute('data-theme', theme === ThemeMode.LIGHT ? 'dark' : 'light');
  };

  return (
    <StyledLayout>
      <ClientHeader 
        theme={theme} 
        onThemeToggle={toggleTheme} 
        activeSection={location.pathname === '/' ? activeSection : ''} 
      />
      <StyledContent>
        <Outlet context={{ setActiveSection }} />
      </StyledContent>
      <ClientFooter />
    </StyledLayout>
  );
};

export default ClientLayout;
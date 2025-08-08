import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { Provider } from 'react-redux';
import zhCN from 'antd/locale/zh_CN';

import './App.css';
import { store } from './store';
import { useAuthInit } from './hooks/useAuthInit';
import { setMessageApi } from './utils/request';
import { settingsService } from './services';
import AdminLayout from './components/AdminLayout';
import ClientLayout from './components/layout/ClientLayout';
import LoginPage from './pages/admin/LoginPage';
import ChangePasswordPage from './pages/admin/ChangePasswordPage';
import ContactPage from './pages/client/ContactPage';
import HomePage from './pages/client/HomePage';
import SchedulePage from './pages/client/SchedulePage';
import TeamPage from './pages/client/TeamPage';
import WorksPage from './pages/client/WorksPage';
import WorkDetailPage from './pages/client/WorkDetailPage';
import DashboardPage from './pages/admin/DashboardPage';
import UsersPage from './pages/admin/UsersPage';
import SettingsPage from './pages/admin/SettingsPage';
import AdminSchedulesPage from './pages/admin/SchedulesPage';
import AdminWorksPage from './pages/admin/WorksPage';
import TeamManagePage from './pages/admin/TeamManagePage';
import ProfilePage from './pages/admin/ProfilePage';
import ContactsPage from './pages/admin/ContactsPage';

// Ant Design 主题配置
const theme = {
  token: {
    colorPrimary: 'var(--admin-primary-color)',
    colorSuccess: 'var(--admin-success-color)',
    colorWarning: 'var(--admin-warning-color)',
    colorError: 'var(--admin-error-color)',
    colorInfo: 'var(--admin-info-color)',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  components: {
    Layout: {
      headerBg: 'var(--admin-layout-header)',
      siderBg: 'var(--admin-sidebar-bg)',
    },
    Menu: {
      darkItemBg: 'var(--admin-sidebar-bg)',
      darkItemSelectedBg: 'var(--admin-primary-color)',
    },
  },
};

// 应用初始化组件
function AppInitializer() {
  // 使用认证初始化Hook
  useAuthInit();

  // 应用全局配置
  useEffect(() => {
    const applySiteConfig = async () => {
      try {
        const response = await settingsService.getSiteConfig();
        const config = response.data;
        
        if (config) {
          // 应用网站标题
          if (config.siteName) {
            document.title = config.siteName;
          }
          
          // 应用favicon
          if (config.favicon) {
            const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
            if (favicon) {
              favicon.href = config.favicon;
            } else {
              const newFavicon = document.createElement('link');
              newFavicon.rel = 'icon';
              newFavicon.href = config.favicon;
              document.head.appendChild(newFavicon);
            }
          }
          
          // 应用meta描述
          if (config.siteDescription) {
            let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
            if (metaDescription) {
              metaDescription.content = config.siteDescription;
            } else {
              metaDescription = document.createElement('meta');
              metaDescription.name = 'description';
              metaDescription.content = config.siteDescription;
              document.head.appendChild(metaDescription);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load site config:', error);
      }
    };
    
    applySiteConfig();
  }, []);

  return null;
}

// AppContent组件，用于正确使用useApp hook
function AppContent() {
  const { message } = AntdApp.useApp();
  
  // 设置全局message API
  React.useEffect(() => {
    setMessageApi(message);
  }, [message]);

  return (
    <Router>
      <AppInitializer />
      <Routes>
        {/* 前台展示系统路由 */}
        <Route path="/" element={<ClientLayout />}>
          <Route index element={<HomePage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="works" element={<WorksPage />} />
          <Route path="works/:id" element={<WorkDetailPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="contact" element={<ContactPage />} />
        </Route>
        
        {/* 后台管理系统路由 */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/change-password" element={<ChangePasswordPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="team-manage" element={<TeamManagePage />} />
          <Route path="schedules" element={<AdminSchedulesPage />} />
          <Route path="works" element={<AdminWorksPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        
        {/* 404 重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <ConfigProvider locale={zhCN} theme={theme}>
        <AntdApp>
          <AppContent />
        </AntdApp>
      </ConfigProvider>
    </Provider>
  );
}

export default App;
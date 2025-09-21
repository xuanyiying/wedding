import React, { useState } from 'react';
import { Tabs } from 'antd';
import {
  GlobalOutlined,
  HomeOutlined,
  BgColorsOutlined,
  MailOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import { PageHeader } from '../../components/admin/common';
import { SettingsProvider } from '../../contexts/SettingsContext';
import {
  SiteSettings,
  HomepageSettings,
  ThemeSettings,
  EmailSettings
} from '../../components/admin/settings';

const SettingsContainer = styled.div`
  padding: 24px;
  background: var(--admin-bg-layout);
  min-height: calc(100vh - 64px);
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const TabCard = styled.div`
  background: var(--admin-bg-container);
  border: 1px solid var(--admin-border-color);
  border-radius: 12px;
  box-shadow: var(--admin-shadow-sm);
  padding: 32px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('site');

  return (
    <SettingsProvider>
      <SettingsContainer>
        <PageHeader title="系统设置" />

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'site',
              label: <span><GlobalOutlined />网站设置</span>,
              children: (
                <TabCard>
                  <SiteSettings />
                </TabCard>
              )
            },
            {
              key: 'homepage',
              label: <span><HomeOutlined />首页配置</span>,
              children: (
                <TabCard>
                  <HomepageSettings />
                </TabCard>
              )
            },
            {
              key: 'theme',
              label: <span><BgColorsOutlined />主题设置</span>,
              children: (
                <TabCard>
                  <ThemeSettings />
                </TabCard>
              )
            },
            {
              key: 'email',
              label: <span><MailOutlined />邮件设置</span>,
              children: (
                <TabCard>
                  <EmailSettings />
                </TabCard>
              )
            },
          ]}
        />
      </SettingsContainer>
    </SettingsProvider>
  );
};

export default SettingsPage;
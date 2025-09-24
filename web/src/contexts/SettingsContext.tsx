import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { type AppSettings } from '../types';
import { settingsService } from '../services';

interface SettingsContextType {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitializedRef = useRef(false);

  const fetchSettings = useCallback(async () => {
    // 防止重复请求
    if (isInitializedRef.current && !loading) {
      console.log('SettingsProvider: 跳过重复请求');
      return;
    }

    try {
      console.log('SettingsProvider: 开始获取设置');
      setLoading(true);
      setError(null);

      // 使用新的分离API分别加载各个模块的设置
      const [siteResponse, homepageResponse, themeResponse, emailResponse] = await Promise.all([
        settingsService.getSiteSettings(),
        settingsService.getHomepageSettings(),
        settingsService.getThemeSettings(),
        settingsService.getEmailSettings()
      ]);

      const appSettings: AppSettings = {
        site: siteResponse.data,
        homepage: homepageResponse.data,
        theme: themeResponse.data,
        email: emailResponse.data,
        // 为了向后兼容，将site设置展平到根级别
        ...siteResponse.data
      };
      
      setSettings(appSettings);
      isInitializedRef.current = true;
      console.log('SettingsProvider: 设置获取成功');
    } catch (err) {
      console.error('获取设置失败:', err);
      setError(err instanceof Error ? err.message : '获取设置失败');
    } finally {
      setLoading(false);
    }
  }, []); // 空依赖数组，因为函数内部没有依赖外部变量

  useEffect(() => {
    if (!isInitializedRef.current) {
      fetchSettings();
    }
  }, []); // 只在组件挂载时执行一次

  const refetch = useCallback(async () => {
    try {
      console.log('SettingsProvider: 强制重新获取设置');
      setLoading(true);
      setError(null);

      // 使用新的分离API分别加载各个模块的设置
      const [siteResponse, homepageResponse, themeResponse, emailResponse] = await Promise.all([
        settingsService.getSiteSettings(),
        settingsService.getHomepageSettings(),
        settingsService.getThemeSettings(),
        settingsService.getEmailSettings()
      ]);

      const appSettings: AppSettings = {
        site: siteResponse.data,
        homepage: homepageResponse.data,
        theme: themeResponse.data,
        email: emailResponse.data,
        // 为了向后兼容，将site设置展平到根级别
        ...siteResponse.data
      };
      
      setSettings(appSettings);
      console.log('SettingsProvider: 强制重新获取设置成功');
    } catch (err) {
      console.error('强制重新获取设置失败:', err);
      setError(err instanceof Error ? err.message : '获取设置失败');
    } finally {
      setLoading(false);
    }
  }, []); // 独立的refetch函数，避免依赖fetchSettings

  const value: SettingsContextType = {
    settings,
    loading,
    error,
    refetch
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useAppSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within a SettingsProvider');
  }
  return context;
};

export default useAppSettings;
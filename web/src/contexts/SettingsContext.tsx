import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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

  const fetchSettings = useCallback(async () => {
    try {
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
    } catch (err) {
      console.error('获取设置失败:', err);
      setError(err instanceof Error ? err.message : '获取设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const refetch = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

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
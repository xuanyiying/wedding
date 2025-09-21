import { useState, useEffect } from 'react';
import { type AppSettings } from '../types';
import { settingsService } from '../services';

/**
 * 站点设置钩子函数
 * 用于加载和管理站点设置数据
 * @returns {object} 包含设置数据、加载状态和错误信息的对象
 */
export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);
  const fetchSettings = async () => {
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
        email: emailResponse.data
      };
      setSettings(appSettings);
    } catch (err) {
      console.error('获取设置失败:', err);
      setError(err instanceof Error ? err.message : '获取设置失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重新加载设置
   */
  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      fetchSettings();
    } catch (err) {
      console.error('获取设置失败:', err);
      setError(err instanceof Error ? err.message : '获取设置失败');
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    loading,
    error,
    refetch
  };
};

export default useAppSettings;
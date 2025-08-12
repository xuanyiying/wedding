import { useState, useEffect } from 'react';
import { type SiteSettings } from '../types';
import { settingsService } from '../services';

/**
 * 站点设置钩子函数
 * 用于加载和管理站点设置数据
 * @returns {object} 包含设置数据、加载状态和错误信息的对象
 */
export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await settingsService.getSettings();
        if (response.success && response.data) {
          setSettings(response.data as SiteSettings);
        } else {
          setError('获取设置失败');
        }
      } catch (err) {
        console.error('获取设置失败:', err);
        setError(err instanceof Error ? err.message : '获取设置失败');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  /**
   * 重新加载设置
   */
  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await settingsService.getSettings();
      if (response.success && response.data) {
        setSettings(response.data as SiteSettings);
      } else {
        setError('获取设置失败');
      }
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

export default useSiteSettings;
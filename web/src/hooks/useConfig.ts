import { useState, useEffect, useCallback } from 'react';
import type { SiteSettings } from '../types';
import { configService } from '../services/configService';

export interface UseConfigReturn {
  config: SiteSettings;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateConfig: (category: string, updates: Partial<SiteSettings>) => Promise<void>;
}

/**
 * 配置管理 Hook
 */
export const useConfig = (isAdmin = false): UseConfigReturn => {
  const [config, setConfig] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const configData = isAdmin 
        ? await configService.getAdminConfig()
        : await configService.getPublicConfig();
      
      setConfig(configData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取配置失败';
      setError(errorMessage);
      console.error('获取配置失败:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const updateConfig = useCallback(async (category: string, updates: Partial<SiteSettings>) => {
    try {
      await configService.updateConfig(category, updates);
      await fetchConfig(); // 重新获取配置
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新配置失败';
      setError(errorMessage);
      throw err;
    }
  }, [fetchConfig]);

  const refetch = useCallback(async () => {
    configService.clearCache();
    await fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    error,
    refetch,
    updateConfig
  };
};

/**
 * 获取特定配置项的 Hook
 */
export const useConfigValue = <T = any>(key: string, defaultValue?: T) => {
  const [value, setValue] = useState<T | undefined>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchValue = async () => {
      try {
        const configValue = await configService.getConfigValue<T>(key, defaultValue);
        setValue(configValue);
      } catch (error) {
        console.error(`获取配置项 ${key} 失败:`, error);
        setValue(defaultValue);
      } finally {
        setLoading(false);
      }
    };

    fetchValue();
  }, [key, defaultValue]);

  return { value, loading };
};
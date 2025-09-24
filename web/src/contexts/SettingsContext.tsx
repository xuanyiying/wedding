import React, {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { type AppSettings } from "../types";
import { settingsService } from "../services";

export interface SettingsContextType {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export default SettingsContext;

export interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitializedRef = useRef(false);
  const isLoadingRef = useRef(false);

  const loadSettings = useCallback(async () => {
    // 防止重复请求
    if (isLoadingRef.current) {
      console.log("SettingsProvider: 请求正在进行中，跳过重复请求");
      return;
    }

    try {
      console.log("SettingsProvider: 开始获取设置");
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      // 使用新的分离API分别加载各个模块的设置
      const [siteResponse, homepageResponse, themeResponse, emailResponse] =
        await Promise.all([
          settingsService.getSiteSettings(),
          settingsService.getHomepageSettings(),
          settingsService.getThemeSettings(),
          settingsService.getEmailSettings(),
        ]);

      const appSettings: AppSettings = {
        site: siteResponse.data,
        homepage: homepageResponse.data,
        theme: themeResponse.data,
        email: emailResponse.data,
        // 为了向后兼容，将site设置展平到根级别
        ...siteResponse.data,
      };

      setSettings(appSettings);
      console.log("SettingsProvider: 设置获取成功");
      return appSettings;
    } catch (err) {
      console.error("获取设置失败:", err);
      const errorMessage = err instanceof Error ? err.message : "获取设置失败";
      setError(errorMessage);
      throw err;
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    // 防止重复请求
    if (isInitializedRef.current && !loading) {
      console.log("SettingsProvider: 已初始化且不在加载状态，跳过重复请求");
      return;
    }

    await loadSettings();
    isInitializedRef.current = true;
  }, [loadSettings, loading]);

  useEffect(() => {
    if (!isInitializedRef.current) {
      fetchSettings()
        .then(r => console.log("SettingsProvider: 初始化获取设置成功", r))
        .catch(err => console.error("SettingsProvider: 初始化获取设置失败", err));
    }
  }, [fetchSettings]); // 只在组件挂载时执行一次

  const refetch = useCallback(async () => {
    try {
      console.log("SettingsProvider: 强制重新获取设置");
      await loadSettings();
      console.log("SettingsProvider: 强制重新获取设置成功");
    } catch (err) {
      console.error("强制重新获取设置失败:", err);
    }
  }, [loadSettings]);

  const value: SettingsContextType = {
    settings,
    loading,
    error,
    refetch,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
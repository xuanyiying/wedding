import { useContext } from "react";
import SettingsContext from '../contexts/SettingsContext'
import type { SettingsContextType } from "../contexts/SettingsContext";

export const useAppSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useAppSettings must be used within a SettingsProvider");
  }
  return context;
};

// 添加一个带默认值的hook，用于在没有Provider的情况下提供默认值
export const useAppSettingsWithDefaults = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    // 返回默认值而不是抛出错误
    return {
      settings: null,
      loading: false,
      error: null,
      refetch: async () => {
        console.warn("SettingsProvider not found, refetch is noop");
      }
    };
  }
  return context;
};

export default useAppSettings;
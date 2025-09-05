/**
 * 主题应用工具函数
 */

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface ThemeSettings {
  colors?: ThemeColors;
  borderRadius?: number;
  fontSize?: number;
  compactMode?: boolean;
  darkMode?: boolean;
  clientThemeVariant?: string;
}

/**
 * 应用主题颜色到CSS变量
 */
export const applyThemeColors = (colors: ThemeColors) => {
  const root = document.documentElement;
  
  root.style.setProperty('--client-primary-color', colors.primary);
  root.style.setProperty('--client-secondary-color', colors.secondary);
  root.style.setProperty('--client-accent-color', colors.accent);
  root.style.setProperty('--client-bg-primary', colors.background);
  root.style.setProperty('--client-text-primary', colors.text);
};

/**
 * 应用完整主题设置
 */
export const applyThemeSettings = (settings: ThemeSettings) => {
  const root = document.documentElement;
  
  // 应用颜色设置
  if (settings.colors) {
    const colors = settings.colors;
    root.style.setProperty('--client-primary-color', colors.primary || '#D4A574');
    root.style.setProperty('--client-secondary-color', colors.secondary || '#F5E6D3');
    root.style.setProperty('--client-bg-primary', colors.background || '#FEFCF9');
    root.style.setProperty('--client-text-primary', colors.text || '#5D4E37');
    
    // 如果有accent颜色，也应用它
    if (colors.accent) {
      root.style.setProperty('--client-accent-color', colors.accent);
    }
  }
  
  // 应用边框圆角设置
  if (settings.borderRadius !== undefined) {
    root.style.setProperty('--client-border-radius', `${settings.borderRadius}px`);
  }
  
  // 应用字体大小设置
  if (settings.fontSize !== undefined) {
    root.style.setProperty('--client-font-size-base', `${settings.fontSize}px`);
  }
  
  // 应用紧凑模式
  if (settings.compactMode !== undefined) {
    root.style.setProperty('--client-section-padding', settings.compactMode ? '3rem' : '4rem');
  }
  
  // 应用暗色模式（如果需要）
  if (settings.darkMode !== undefined) {
    root.classList.toggle('dark-mode', settings.darkMode);
  }
  
  // 应用客户端主题变体
  if (settings.clientThemeVariant) {
    root.setAttribute('data-client-theme', settings.clientThemeVariant);
  }
};
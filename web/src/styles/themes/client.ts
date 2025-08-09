// Client主题配色方案 - 优雅亮色主题
export const clientTheme = {
  // 主色调 - 黑白灰
  primary: {
    main: '#000000',
    light: '#333333',
    dark: '#000000',
  },
  
  // 功能色彩
  functional: {
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#1890ff',
    purple: '#722ed1',
    cyan: '#13c2c2',
  },
  
  // 文字颜色
  text: {
    primary: '#000000',
    secondary: '#333333',
    tertiary: '#555555',
    light: '#777777',
  },
  
  // 背景色系
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#E5E5E5',
  },
  
  // 边框和交互
  border: {
    primary: '#E5E5E5',
    light: '#F5F5F5',
    divider: '#E5E5E5',
  },
  
  // 交互色彩
  interaction: {
    hover: '#F5F5F5',
    accent: '#000000',
  },
  
  // 圆角设计
  borderRadius: {
    small: '8px',
    medium: '12px',
    large: '16px',
  },
  
  // 阴影效果
  shadow: {
    small: '0 2px 8px rgba(0, 0, 0, 0.05)',
    medium: '0 6px 16px rgba(0, 0, 0, 0.08)',
    large: '0 12px 32px rgba(0, 0, 0, 0.1)',
  },
  
  // 渐变色彩
  gradient: {
    primary: 'linear-gradient(135deg, #333333 0%, #000000 100%)',
    secondary: 'linear-gradient(135deg, #F5F5F5 0%, #E5E5E5 100%)',
    accent: 'linear-gradient(135deg, #555555 0%, #333333 100%)',
    hero: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
    overlay1: 'linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.05) 100%)',
    overlay2: 'linear-gradient(135deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.01) 100%)',
    shine: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
    primaryHover: 'linear-gradient(135deg, #333333 0%, #000000 100%)',
  },
  
  // 布局相关
  layout: {
    container: '#FFFFFF',
    content: '#FFFFFF',
    header: 'rgba(255, 255, 255, 0.85)',
    headerDark: 'rgba(0, 0, 0, 0.85)',
    footer: '#F5F5F5',
  },
  
  // 特殊状态
  state: {
    inverse: '#FFFFFF',
    primaryHover: '#333333',
  },
};

// 优雅白色主题
export const clientDarkTheme = {
  // 主色调 - 白色系
  primary: {
    main: '#FFFFFF',
    light: '#F8F9FA',
    dark: '#F0F0F0',
  },
  
  // 功能色彩
  functional: {
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#1890ff',
    purple: '#722ed1',
    cyan: '#13c2c2',
  },
  
  // 文字颜色
  text: {
    primary: '#333333',
    secondary: '#666666',
    tertiary: '#999999',
    light: '#CCCCCC',
  },
  
  // 背景色系
  background: {
    primary: '#FFFFFF',
    secondary: '#FAFAFA',
    tertiary: '#F5F5F5',
  },
  
  // 边框和交互
  border: {
    primary: '#E8E8E8',
    light: '#F0F0F0',
    divider: '#E8E8E8',
  },
  
  // 交互色彩
  interaction: {
    hover: '#F8F9FA',
    accent: '#333333',
  },
  
  // 圆角设计
  borderRadius: {
    small: '8px',
    medium: '12px',
    large: '16px',
  },
  
  // 阴影效果
  shadow: {
    small: '0 2px 8px rgba(0, 0, 0, 0.06)',
    medium: '0 6px 16px rgba(0, 0, 0, 0.1)',
    large: '0 12px 32px rgba(0, 0, 0, 0.12)',
  },
  
  // 渐变色彩
  gradient: {
    primary: 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)',
    secondary: 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)',
    accent: 'linear-gradient(135deg, #F8F9FA 0%, #FFFFFF 100%)',
    hero: 'linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 50%, #F8F9FA 100%)',
    overlay1: 'linear-gradient(135deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.01) 100%)',
    overlay2: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)',
    shine: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
    primaryHover: 'linear-gradient(135deg, #F8F9FA 0%, #F0F0F0 100%)',
  },
  
  // 布局相关
  layout: {
    container: '#FFFFFF',
    content: '#FFFFFF',
    header: 'rgba(255, 255, 255, 0.95)',
    headerDark: 'rgba(0, 0, 0, 0.85)',
    footer: '#FAFAFA',
  },
  
  // 特殊状态
  state: {
    inverse: '#333333',
    primaryHover: '#F8F9FA',
  },
};

export type ClientTheme = typeof clientTheme;
export type ClientDarkTheme = typeof clientDarkTheme;
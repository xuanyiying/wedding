/**
 * Favicon 工具函数
 * 用于动态更新网站图标
 */

export interface FaviconOptions {
  url: string;
  type?: string;
  preventCache?: boolean;
}

/**
 * 更新网站favicon
 * @param options favicon配置选项
 */
export const updateFavicon = (options: FaviconOptions): void => {
  const { url, type = 'image/x-icon', preventCache = true } = options;
  
  try {
    // 移除所有现有的favicon链接
    const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
    existingFavicons.forEach(link => link.remove());
    
    // 构建最终URL（可选择添加时间戳防止缓存）
    const finalUrl = preventCache ? `${url}?v=${Date.now()}` : url;
    
    // 创建新的favicon链接
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = type;
    favicon.href = finalUrl;
    document.head.appendChild(favicon);
    
    // 同时添加shortcut icon以兼容更多浏览器
    const shortcutIcon = document.createElement('link');
    shortcutIcon.rel = 'shortcut icon';
    shortcutIcon.type = type;
    shortcutIcon.href = finalUrl;
    document.head.appendChild(shortcutIcon);
    
    // 添加apple-touch-icon以支持移动设备
    if (type.includes('png')) {
      const appleTouchIcon = document.createElement('link');
      appleTouchIcon.rel = 'apple-touch-icon';
      appleTouchIcon.href = finalUrl;
      document.head.appendChild(appleTouchIcon);
    }
    
    console.log('✅ Favicon已成功更新:', finalUrl);
  } catch (error) {
    console.error('❌ 更新Favicon失败:', error);
  }
};
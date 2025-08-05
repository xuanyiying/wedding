import dayjs from 'dayjs';
import { DATE_FORMATS, VALIDATION } from '../constants';
import { DeviceType } from '../types';

/**
 * 格式化日期
 * @param date 日期
 * @param format 格式
 * @returns 格式化后的日期字符串
 */
export const formatDate = (date: string | Date | number, format: string = DATE_FORMATS.DATE): string => {
  return dayjs(date).format(format);
};

/**
 * 获取相对时间
 * @param date 日期
 * @returns 相对时间字符串
 */
export const getRelativeTime = (date: string | Date | number): string => {
  const now = dayjs();
  const target = dayjs(date);
  const diff = now.diff(target, 'minute');
  
  if (diff < 1) {
    return '刚刚';
  } else if (diff < 60) {
    return `${diff}分钟前`;
  } else if (diff < 1440) {
    return `${Math.floor(diff / 60)}小时前`;
  } else if (diff < 43200) {
    return `${Math.floor(diff / 1440)}天前`;
  } else {
    return target.format(DATE_FORMATS.DISPLAY_DATE);
  }
};

/**
 * 验证手机号
 * @param phone 手机号
 * @returns 是否有效
 */
export const validatePhone = (phone: string): boolean => {
  return VALIDATION.PHONE_PATTERN.test(phone);
};

/**
 * 验证邮箱
 * @param email 邮箱
 * @returns 是否有效
 */
export const validateEmail = (email: string): boolean => {
  return VALIDATION.EMAIL_PATTERN.test(email);
};

/**
 * 验证身份证号
 * @param idCard 身份证号
 * @returns 是否有效
 */
export const validateIdCard = (idCard: string): boolean => {
  return VALIDATION.ID_CARD_PATTERN.test(idCard);
};

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 扩展名
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * 生成随机字符串
 * @param length 长度
 * @returns 随机字符串
 */
export const generateRandomString = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间
 * @returns 防抖后的函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * 节流函数
 * @param func 要节流的函数
 * @param wait 等待时间
 * @returns 节流后的函数
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
};

/**
 * 深拷贝
 * @param obj 要拷贝的对象
 * @returns 拷贝后的对象
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {} as { [key: string]: any };
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj as T;
  }
  
  return obj;
};

/**
 * 获取URL参数
 * @param name 参数名
 * @returns 参数值
 */
export const getUrlParam = (name: string): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
};

/**
 * 设置URL参数
 * @param params 参数对象
 */
export const setUrlParams = (params: Record<string, string>): void => {
  const url = new URL(window.location.href);
  Object.keys(params).forEach(key => {
    url.searchParams.set(key, params[key]);
  });
  window.history.replaceState({}, '', url.toString());
};

/**
 * 删除URL参数
 * @param names 参数名数组
 */
export const removeUrlParams = (names: string[]): void => {
  const url = new URL(window.location.href);
  names.forEach(name => {
    url.searchParams.delete(name);
  });
  window.history.replaceState({}, '', url.toString());
};

/**
 * 滚动到顶部
 * @param smooth 是否平滑滚动
 */
export const scrollToTop = (smooth: boolean = true): void => {
  window.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'auto',
  });
};

/**
 * 滚动到指定元素
 * @param element 元素或选择器
 * @param smooth 是否平滑滚动
 */
export const scrollToElement = (element: string | Element, smooth: boolean = true): void => {
  const target = typeof element === 'string' ? document.querySelector(element) : element;
  if (target) {
    target.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'start',
    });
  }
};

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns Promise
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (error) {
    console.error('复制失败:', error);
    return false;
  }
};

/**
 * 下载文件
 * @param url 文件URL
 * @param filename 文件名
 */
export const downloadFile = (url: string, filename?: string): void => {
  const link = document.createElement('a');
  link.href = url;
  if (filename) {
    link.download = filename;
  }
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 检查是否为移动设备
 * @returns 是否为移动设备
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * 获取设备类型
 * @returns 设备类型
  */
export const getDeviceType = (): DeviceType => {
  const width = window.innerWidth;
  if (width < 768) {
    return DeviceType.MOBILE;
  } else if (width < 1024) {
    return DeviceType.TABLET;
  } else {
    return DeviceType.DESKTOP;
  }
};

/**
 * 格式化价格
 * @param price 价格
 * @param currency 货币符号
 * @returns 格式化后的价格
 */
export const formatPrice = (price: number, currency: string = '¥'): string => {
  return `${currency}${price.toLocaleString()}`;
};

/**
 * 计算百分比
 * @param value 当前值
 * @param total 总值
 * @param decimals 小数位数
 * @returns 百分比
 */
export const calculatePercentage = (value: number, total: number, decimals: number = 1): number => {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(decimals));
};

/**
 * 生成颜色
 * @param str 字符串
 * @returns 颜色值
 */
export const generateColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = Math.abs(hash).toString(16).substring(0, 6);
  return `#${'000000'.substring(0, 6 - color.length)}${color}`;
};

/**
 * 获取对比色
 * @param hexColor 十六进制颜色
 * @returns 对比色
 */
export const getContrastColor = (hexColor: string): string => {
  const color = hexColor.replace('#', '');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? 'var(--contrast-dark, #000000)' : 'var(--contrast-light, #ffffff)';
};

/**
 * 安全的JSON解析
 * @param str JSON字符串
 * @param defaultValue 默认值
 * @returns 解析结果
 */
export const safeJsonParse = <T>(str: string, defaultValue: T): T => {
  try {
    return JSON.parse(str);
  } catch (error) {
    return defaultValue;
  }
};

/**
 * 延迟函数
 * @param ms 延迟时间（毫秒）
 * @returns Promise
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 重试函数
 * @param fn 要重试的函数
 * @param retries 重试次数
 * @param delayMs 重试间隔
 * @returns Promise
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await delay(delayMs);
      return retry(fn, retries - 1, delayMs);
    }
    throw error;
  }
};
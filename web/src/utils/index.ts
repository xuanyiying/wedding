import dayjs from 'dayjs';
import { DATE_FORMATS } from '../constants';
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
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj as T;
  }

  return obj;
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
 * 根据时间范围类型获取日期范围
 */
export const getDateRange =(rangeType: 'month' | 'quarter' | 'year')=> {
  const now = new Date();

  if (rangeType === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { startDate: startOfMonth, endDate: endOfMonth };
  }
  if (rangeType === 'quarter'){
    const quarter = Math.floor(now.getMonth() / 3);
    const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
    const endOfQuarter = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
    return { startDate: startOfQuarter, endDate: endOfQuarter };
  }
  if (rangeType === 'year'){
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    return { startDate: startOfYear, endDate: endOfYear };
  }
  return { startDate: null, endDate: null };
}
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
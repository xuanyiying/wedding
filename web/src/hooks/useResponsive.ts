import { useState, useEffect, useCallback } from 'react';

// 断点定义
export const breakpoints = {
  xs: 480,
  sm: 768,
  md: 1024,
  lg: 1200,
  xl: 1600,
} as const;

export type BreakpointKey = keyof typeof breakpoints;

export interface ResponsiveInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: BreakpointKey;
  orientation: 'portrait' | 'landscape';
}

// 获取当前断点
const getCurrentBreakpoint = (width: number): BreakpointKey => {
  if (width < breakpoints.xs) return 'xs';
  if (width < breakpoints.sm) return 'xs';
  if (width < breakpoints.md) return 'sm';
  if (width < breakpoints.lg) return 'md';
  if (width < breakpoints.xl) return 'lg';
  return 'xl';
};

// 获取响应式信息
const getResponsiveInfo = (width: number, height: number): ResponsiveInfo => {
  const breakpoint = getCurrentBreakpoint(width);
  const isMobile = width < breakpoints.sm;
  const isTablet = width >= breakpoints.sm && width < breakpoints.lg;
  const isDesktop = width >= breakpoints.lg;
  const orientation = width > height ? 'landscape' : 'portrait';

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    breakpoint,
    orientation,
  };
};

// 防抖函数
const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const useResponsive = () => {
  const [responsiveInfo, setResponsiveInfo] = useState<ResponsiveInfo>(() => {
    // 服务端渲染兼容
    if (typeof window === 'undefined') {
      return getResponsiveInfo(1200, 800);
    }
    return getResponsiveInfo(window.innerWidth, window.innerHeight);
  });

  const updateSize = useCallback(() => {
    if (typeof window !== 'undefined') {
      const newInfo = getResponsiveInfo(window.innerWidth, window.innerHeight);
      setResponsiveInfo(newInfo);
    }
  }, []);

  // 防抖的更新函数
  const debouncedUpdateSize = useCallback(
    debounce(updateSize, 150),
    [updateSize]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 初始化
    updateSize();

    // 监听窗口大小变化
    window.addEventListener('resize', debouncedUpdateSize);
    
    // 监听屏幕方向变化（移动设备）
    const handleOrientationChange = () => {
      // 延迟执行，等待屏幕旋转完成
      setTimeout(updateSize, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', debouncedUpdateSize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [debouncedUpdateSize, updateSize]);

  return responsiveInfo;
};

// 媒体查询Hook
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // 现代浏览器
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // 兼容旧浏览器
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query]);

  return matches;
};

// 预定义的媒体查询
export const useBreakpoint = () => {
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.sm - 1}px)`);
  const isTablet = useMediaQuery(
    `(min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.lg - 1}px)`
  );
  const isDesktop = useMediaQuery(`(min-width: ${breakpoints.lg}px)`);
  const isLargeDesktop = useMediaQuery(`(min-width: ${breakpoints.xl}px)`);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
  };
};

// 触摸设备检测
export const useTouchDevice = (): boolean => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTouchDevice = () => {
      const hasTouch = 'ontouchstart' in window || 
                      navigator.maxTouchPoints > 0 || 
                      (navigator as any).msMaxTouchPoints > 0;
      setIsTouchDevice(hasTouch);
    };

    checkTouchDevice();
  }, []);

  return isTouchDevice;
};

export default useResponsive;
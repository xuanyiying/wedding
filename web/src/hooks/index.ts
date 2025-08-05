import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { throttle, getDeviceType } from '../utils';
import { DEBOUNCE_DELAY } from '../constants';

/**
 * 防抖Hook
 * @param value 要防抖的值
 * @param delay 延迟时间
 * @returns 防抖后的值
 */
export const useDebounce = <T>(value: T, delay: number = DEBOUNCE_DELAY.SEARCH): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

/**
 * 节流Hook
 * @param callback 回调函数
 * @param delay 延迟时间
 * @returns 节流后的函数
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const throttledCallback = useRef(throttle(callback, delay));
  
  useEffect(() => {
    throttledCallback.current = throttle(callback, delay);
  }, [callback, delay]);
  
  return throttledCallback.current as T;
};

/**
 * 本地存储Hook
 * @param key 存储键
 * @param initialValue 初始值
 * @returns [value, setValue]
 */
export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );
  
  return [storedValue, setValue];
};

/**
 * 会话存储Hook
 * @param key 存储键
 * @param initialValue 初始值
 * @returns [value, setValue]
 */
export const useSessionStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting sessionStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );
  
  return [storedValue, setValue];
};

/**
 * 窗口大小Hook
 * @returns 窗口尺寸和设备类型
 */
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    deviceType: getDeviceType(),
  });
  
  useEffect(() => {
    const handleResize = throttle(() => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
        deviceType: getDeviceType(),
      });
    }, 100);
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return windowSize;
};

/**
 * 滚动位置Hook
 * @returns 滚动位置信息
 */
export const useScrollPosition = () => {
  const [scrollPosition, setScrollPosition] = useState({
    x: window.pageXOffset,
    y: window.pageYOffset,
  });
  
  useEffect(() => {
    const handleScroll = throttle(() => {
      setScrollPosition({
        x: window.pageXOffset,
        y: window.pageYOffset,
      });
    }, 50);
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  return scrollPosition;
};

/**
 * 在线状态Hook
 * @returns 是否在线
 */
export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
};

/**
 * 点击外部Hook
 * @param ref 元素引用
 * @param handler 点击外部时的处理函数
 */
export const useClickOutside = (
  ref: React.RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void
): void => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };
    
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

/**
 * 键盘事件Hook
 * @param key 键名
 * @param handler 处理函数
 * @param element 目标元素
 */
export const useKeyPress = (
  key: string,
  handler: (event: KeyboardEvent) => void,
  element: HTMLElement | Document = document
): void => {
  useEffect(() => {
    const listener = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === key) {
        handler(keyboardEvent);
      }
    };
    
    element.addEventListener('keydown', listener);
    
    return () => {
      element.removeEventListener('keydown', listener);
    };
  }, [key, handler, element]);
};

/**
 * 异步状态Hook
 * @returns 异步状态管理
 */
export const useAsyncState = <T>() => {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });
  
  const execute = useCallback(async (asyncFunction: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const data = await asyncFunction();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
      throw error;
    }
  }, []);
  
  return { ...state, execute };
};

/**
 * 倒计时Hook
 * @param initialTime 初始时间（秒）
 * @returns 倒计时状态和控制函数
 */
export const useCountdown = (initialTime: number) => {
  const [time, setTime] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime(time => time - 1);
      }, 1000);
    } else if (time === 0) {
      setIsActive(false);
    }
    
    return () => clearInterval(interval);
  }, [isActive, time]);
  
  const start = useCallback(() => setIsActive(true), []);
  const pause = useCallback(() => setIsActive(false), []);
  const reset = useCallback(() => {
    setTime(initialTime);
    setIsActive(false);
  }, [initialTime]);
  
  return { time, isActive, start, pause, reset };
};

/**
 * 分页Hook
 * @param initialPage 初始页码
 * @param initialPageSize 初始页大小
 * @returns 分页状态和控制函数
 */
export const usePagination = (initialPage: number = 1, initialPageSize: number = 10) => {
  const [current, setCurrent] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);
  
  const totalPages = useMemo(() => Math.ceil(total / pageSize), [total, pageSize]);
  
  const goToPage = useCallback((page: number) => {
    setCurrent(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);
  
  const nextPage = useCallback(() => {
    goToPage(current + 1);
  }, [current, goToPage]);
  
  const prevPage = useCallback(() => {
    goToPage(current - 1);
  }, [current, goToPage]);
  
  const changePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrent(1); // 重置到第一页
  }, []);
  
  const reset = useCallback(() => {
    setCurrent(initialPage);
    setPageSize(initialPageSize);
    setTotal(0);
  }, [initialPage, initialPageSize]);
  
  return {
    current,
    pageSize,
    total,
    totalPages,
    setTotal,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    reset,
  };
};

/**
 * 路由查询参数Hook
 * @returns 查询参数和设置函数
 */
export const useQueryParams = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const queryParams = useMemo(() => {
    return new URLSearchParams(location.search);
  }, [location.search]);
  
  const setQueryParams = useCallback(
    (params: Record<string, string | number | boolean | null | undefined>) => {
      const newParams = new URLSearchParams(location.search);
      
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      });
      
      navigate({
        pathname: location.pathname,
        search: newParams.toString(),
      }, { replace: true });
    },
    [location.pathname, location.search, navigate]
  );
  
  const getQueryParam = useCallback(
    (key: string): string | null => {
      return queryParams.get(key);
    },
    [queryParams]
  );
  
  return { queryParams, setQueryParams, getQueryParam };
};

/**
 * 表单状态Hook
 * @param initialValues 初始值
 * @returns 表单状态和控制函数
 */
export const useFormState = <T extends Record<string, any>>(initialValues: T) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  
  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // 清除该字段的错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);
  
  const setError = useCallback((name: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);
  
  const setFieldTouched = useCallback((name: keyof T, isTouched: boolean = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
  }, []);
  
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);
  
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);
  
  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setError,
    setTouched: setFieldTouched,
    reset,
  };
};
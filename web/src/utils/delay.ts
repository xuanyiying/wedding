/**
 * 延迟工具函数
 * 提供更现代的异步延迟方法来替代 setTimeout
 */

/**
 * 创建一个延迟 Promise
 * @param ms 延迟时间（毫秒）
 * @returns Promise<void>
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    const timeoutId = setTimeout(resolve, ms);
    // 可以在这里添加清理逻辑，如果需要的话
    return timeoutId;
  });
}

/**
 * 可取消的延迟函数
 * @param ms 延迟时间（毫秒）
 * @returns 包含 promise 和 cancel 方法的对象
 */
export function cancellableDelay(ms: number): {
  promise: Promise<void>;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout;
  let cancelled = false;

  const promise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(() => {
      if (!cancelled) {
        resolve();
      }
    }, ms);
  });

  const cancel = () => {
    cancelled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  return { promise, cancel };
}

/**
 * 使用 requestAnimationFrame 的下一帧延迟
 * 适用于 UI 更新相关的延迟
 * @returns Promise<void>
 */
export function nextFrame(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * 使用 requestIdleCallback 的空闲时间延迟
 * 适用于非关键任务的延迟执行
 * @param timeout 超时时间（毫秒）
 * @returns Promise<void>
 */
export function nextIdle(timeout: number = 5000): Promise<void> {
  return new Promise(resolve => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout });
    } else {
      // 降级到 setTimeout
      setTimeout(resolve, 0);
    }
  });
}

/**
 * 创建一个定时器管理器
 * 用于管理多个定时器，支持批量清理
 */
export class TimerManager {
  private timers = new Map<string, NodeJS.Timeout>();

  /**
   * 设置一个定时器
   * @param id 定时器ID
   * @param callback 回调函数
   * @param delay 延迟时间（毫秒）
   */
  setTimeout(id: string, callback: () => void, delay: number): void {
    this.clearTimeout(id); // 清除已存在的定时器
    const timerId = setTimeout(() => {
      callback();
      this.timers.delete(id);
    }, delay);
    this.timers.set(id, timerId);
  }

  /**
   * 设置一个间隔定时器
   * @param id 定时器ID
   * @param callback 回调函数
   * @param interval 间隔时间（毫秒）
   */
  setInterval(id: string, callback: () => void, interval: number): void {
    this.clearTimeout(id); // 清除已存在的定时器
    const timerId = setInterval(callback, interval);
    this.timers.set(id, timerId);
  }

  /**
   * 清除指定的定时器
   * @param id 定时器ID
   */
  clearTimeout(id: string): void {
    const timerId = this.timers.get(id);
    if (timerId) {
      clearTimeout(timerId);
      this.timers.delete(id);
    }
  }

  /**
   * 清除所有定时器
   */
  clearAll(): void {
    this.timers.forEach(timerId => clearTimeout(timerId));
    this.timers.clear();
  }

  /**
   * 获取活跃的定时器数量
   */
  getActiveCount(): number {
    return this.timers.size;
  }

  /**
   * 检查是否有指定的定时器
   * @param id 定时器ID
   */
  hasTimer(id: string): boolean {
    return this.timers.has(id);
  }
}

// 导出全局定时器管理器实例
export const globalTimerManager = new TimerManager();
import { EventType } from '../types';

// 定义事件类型到颜色的映射
const eventTypeColorMap: Record<EventType, string> = {
  [EventType.WEDDING]: '#ff4d4f', // 红色
  [EventType.ENGAGEMENT]: '#1890ff', // 蓝色
  [EventType.ANNIVERSARY]: '#722ed1', // 紫色
  [EventType.CONSULTATION]: '#52c41a', // 绿色
  [EventType.OTHER]: '#bfbfbf', // 灰色
};

/**
 * 根据事件类型获取对应的颜色
 * @param eventType - 事件类型
 * @returns 颜色字符串
 */
export const getEventTypeColor = (eventType: EventType): string => {
  return eventTypeColorMap[eventType] || eventTypeColorMap.other;
};
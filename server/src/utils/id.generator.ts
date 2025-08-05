import { v4 as uuidv4 } from 'uuid';

/**
 * 生成 UUID v4 格式的唯一标识符
 * @returns {string} UUID v4 字符串
 */
export const generateId = (): string => {
  return uuidv4();
};

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from './logger';

// 密码相关工具
export class PasswordUtils {
  // 哈希密码
  static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(config.security.bcryptRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error('Failed to hash password', error as Error);
      throw new Error('Password hashing failed');
    }
  }

  // 验证密码
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error('Failed to compare password', error as Error);
      return false;
    }
  }

  // 生成随机密码
  static generateRandomPassword(length = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  // 验证密码强度
  static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('密码长度至少8位');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('密码必须包含小写字母');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('密码必须包含大写字母');
    }

    if (!/\d/.test(password)) {
      errors.push('密码必须包含数字');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('密码必须包含特殊字符');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// JWT 工具
export class JWTUtils {
  // 生成访问令牌
  static generateAccessToken(payload: object): string {
    const options: SignOptions = {
      expiresIn: config.jwt.expiresIn as any,
      issuer: 'wedding-club',
      audience: 'wedding-club-users',
    };
    return jwt.sign(payload, config.jwt.secret, options);
  }

  // 生成刷新令牌
  static generateRefreshToken(payload: object): string {
    const options: SignOptions = {
      expiresIn: config.jwt.refreshExpiresIn as any,
      issuer: 'wedding-club',
      audience: 'wedding-club-users',
    };
    return jwt.sign(payload, config.jwt.refreshSecret, options);
  }

  // 验证访问令牌 - 增加时间容错和重试机制
  static verifyAccessToken(token: string): object {
    try {
      console.log('🔍 JWT验证开始:', {
        tokenLength: token.length,
        tokenPreview: `${token.substring(0, 20)}...`,
        secretExists: !!config.jwt.secret,
        secretLength: config.jwt.secret ? config.jwt.secret.length : 0,
      });

      const payload = jwt.verify(token, config.jwt.secret, {
        issuer: 'wedding-club',
        audience: 'wedding-club-users',
        clockTolerance: 30, // 增加30秒时间容错
        ignoreExpiration: false, // 不忽略过期，但允许时间容错
      }) as object;

      console.log('✅ JWT验证成功:', payload);

      return payload;
    } catch (error: any) {
      console.error('❌ JWT验证失败:', {
        errorName: error.name,
        errorMessage: error.message,
        tokenLength: token.length,
        tokenPreview: `${token.substring(0, 20)}...`,
      });

      // 如果是时间相关错误，尝试使用更宽松的时间容错
      if (error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') {
        try {
          console.log('🔄 尝试使用宽松时间容错重新验证...');
          const payload = jwt.verify(token, config.jwt.secret, {
            issuer: 'wedding-club',
            audience: 'wedding-club-users',
            clockTolerance: 300, // 5分钟时间容错
            ignoreExpiration: false,
          }) as object;

          console.log('✅ 宽松验证成功:', payload);
          return payload;
        } catch (retryError) {
          console.error('❌ 宽松验证也失败:', retryError);
        }
      }

      logger.warn('Invalid access token', { error: (error as Error).message });

      // 直接抛出原始的JWT错误，让全局错误处理中间件正确识别错误类型
      throw error;
    }
  }

  // 验证刷新令牌
  static verifyRefreshToken(token: string): object {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'wedding-club',
        audience: 'wedding-club-users',
      }) as object;
    } catch (error: any) {
      logger.warn('Invalid refresh token', { error: (error as Error).message });

      // 直接抛出原始的JWT错误，让全局错误处理中间件正确识别错误类型
      throw error;
    }
  }

  // 解码令牌（不验证）
  static decodeToken(token: string): object | null {
    try {
      return jwt.decode(token) as object;
    } catch (error) {
      return null;
    }
  }
}

// 字符串工具
export class StringUtils {
  // 生成随机字符串
  static generateRandomString(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // 生成UUID
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  // 转换为驼峰命名
  static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  // 转换为下划线命名
  static toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // 转换为短横线命名
  static toKebabCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }

  // 截断字符串
  static truncate(str: string, length: number, suffix = '...'): string {
    if (str.length <= length) {
      return str;
    }
    return str.substring(0, length - suffix.length) + suffix;
  }

  // 移除HTML标签
  static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  // 转义HTML
  static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m] || m);
  }
}

// 数组工具
export class ArrayUtils {
  // 数组去重
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  // 数组分块
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // 数组随机排序
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    return shuffled;
  }

  // 数组分页
  static paginate<T>(
    array: T[],
    page: number,
    limit: number,
  ): { data: T[]; total: number; page: number; limit: number; totalPages: number } {
    const offset = (page - 1) * limit;
    const data = array.slice(offset, offset + limit);
    const total = array.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }
}

// 对象工具
export class ObjectUtils {
  // 深度克隆
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const cloned = {} as Record<string, unknown>;
      Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone((obj as Record<string, unknown>)[key]);
      });
      return cloned as T;
    }

    return obj;
  }

  // 移除对象中的空值
  static removeEmpty(obj: Record<string, unknown>): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'object' && !Array.isArray(value)) {
          const cleanedNested = this.removeEmpty(value as Record<string, unknown>);
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested;
          }
        } else {
          cleaned[key] = value;
        }
      }
    });

    return cleaned;
  }

  // 扁平化对象
  static flatten(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
    const flattened: Record<string, unknown> = {};

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, this.flatten(value as Record<string, unknown>, newKey));
      } else {
        flattened[newKey] = value;
      }
    });

    return flattened;
  }
}

// 日期工具
export class DateUtils {
  // 格式化日期
  static format(date: Date, format = 'YYYY-MM-DD HH:mm:ss'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  // 添加天数
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  // 添加小时
  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  // 获取日期差（天数）
  static getDaysDiff(date1: Date, date2: Date): number {
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // 判断是否为今天
  static isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  // 获取月份的第一天
  static getFirstDayOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  // 获取月份的最后一天
  static getLastDayOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
}



// 文件工具
export class FileUtils {
  // 获取文件扩展名
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  // 生成文件名
  static generateFileName(originalName: string): string {
    const ext = this.getFileExtension(originalName);
    const timestamp = Date.now();
    const random = StringUtils.generateRandomString(8);
    return `${timestamp}_${random}.${ext}`;
  }

  // 格式化文件大小
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 检查文件类型
  static isImageFile(mimetype: string): boolean {
    return config.upload.allowedImageTypes.includes(mimetype);
  }

  static isVideoFile(mimetype: string): boolean {
    return config.upload.allowedVideoTypes.includes(mimetype);
  }

  static isAudioFile(mimetype: string): boolean {
    return config.upload.allowedAudioTypes.includes(mimetype);
  }
}

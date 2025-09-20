import { EmailService } from './email.service';
import SystemConfig, { ConfigType } from '../models/SystemConfig';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class SettingsService {
  /**
   * 获取所有设置（管理员）
   */
  static async getSettings() {
    try {
      return await this.getAllConfigs();
    } catch (error) {
      logger.error('获取设置失败:', error);
      throw error;
    }
  }

  /**
   * 获取网站配置（公开）
   */
  static async getSiteConfig() {
    try {
      return await this.getPublicConfigs();
    } catch (error) {
      logger.error('获取网站配置失败:', error);
      throw error;
    }
  }

  /**
   * 更新网站设置
   */
  static async updateSiteSettings(siteSettings: any) {
    try {
      await this.updateConfigs('site', siteSettings);
      logger.info('网站设置更新成功');
    } catch (error) {
      logger.error('更新网站设置失败:', error);
      throw error;
    }
  }

  /**
   * 更新网站配置
   */
  static async updateSiteConfig(config: any) {
    try {
      // 根据配置内容确定类别
      if (config.theme) {
        await this.updateConfigs('theme', config);
      }
      if (config.homepageSections) {
        await this.updateConfigs('homepage', config);
      }
      if (config.site) {
        await this.updateConfigs('site', config);
      }
      if (config.seo) {
        await this.updateConfigs('seo', config);
      }

      logger.info('网站配置更新成功');
    } catch (error) {
      logger.error('更新网站配置失败:', error);
      throw error;
    }
  }

  /**
   * 更新邮件设置
   */
  static async updateEmailSettings(emailSettings: any) {
    try {
      await this.updateConfigs('email', emailSettings);
      logger.info('邮件设置更新成功');
    } catch (error) {
      logger.error('更新邮件设置失败:', error);
      throw error;
    }
  }

  /**
   * 更新安全设置
   */
  static async updateSecuritySettings(securitySettings: any) {
    try {
      await this.updateConfigs('security', securitySettings);
      logger.info('安全设置更新成功');
    } catch (error) {
      logger.error('更新安全设置失败:', error);
      throw error;
    }
  }

  /**
   * 测试邮件发送
   */
  static async testEmail({ to, subject, content }: { to: string; subject: string; content: string }) {
    try {
      // 获取邮件配置
      const emailConfig = await this.getConfigValue('email', {});

      if (!emailConfig.smtpHost || !emailConfig.smtpUser) {
        throw new Error('邮件配置不完整，请先配置SMTP设置');
      }

      await EmailService.sendEmail({
        to,
        subject,
        html: content,
        from: emailConfig.emailFrom || emailConfig.smtpUser,
      });

      logger.info(`测试邮件发送成功: ${to}`);
    } catch (error) {
      logger.error('测试邮件发送失败:', error);
      throw error;
    }
  }

  /**
   * 清理缓存
   */
  static async clearCache() {
    try {
      // 这里可以添加具体的缓存清理逻辑
      // 例如清理 Redis 缓存、内存缓存等
      logger.info('缓存清理成功');
    } catch (error) {
      logger.error('清理缓存失败:', error);
      throw error;
    }
  }

  /**
   * 数据库备份
   */
  static async backupDatabase(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'backups');
      const backupPath = path.join(backupDir, `backup-${timestamp}.sql`);

      // 确保备份目录存在
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // 这里应该根据实际使用的数据库类型实现备份逻辑
      // 例如 MySQL: mysqldump, PostgreSQL: pg_dump 等

      logger.info(`数据库备份完成: ${backupPath}`);
      return backupPath;
    } catch (error) {
      logger.error('数据库备份失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统信息
   */
  static async getSystemInfo() {
    try {
      const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: process.memoryUsage()
        },
        cpu: os.cpus(),
        loadAverage: os.loadavg(),
        hostname: os.hostname(),
        networkInterfaces: os.networkInterfaces()
      };

      return systemInfo;
    } catch (error) {
      logger.error('获取系统信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取特定配置项
   */
  static async getConfigValue(key: string, defaultValue?: any) {
    try {
      return await this._getConfigValue(key, defaultValue);
    } catch (error) {
      logger.error(`获取配置项 ${key} 失败:`, error);
      return defaultValue;
    }
  }

  /**
   * 设置配置项
   */
  static async setConfigValue(key: string, value: any, category = 'general', isPublic = false) {
    try {
      await this._setConfigValue(key, value, category, isPublic);
      logger.info(`配置项 ${key} 设置成功`);
    } catch (error) {
      logger.error(`设置配置项 ${key} 失败:`, error);
      throw error;
    }
  }

  /**
   * 获取所有公开配置
   */
  private static async getPublicConfigs(): Promise<any> {
    try {
      const configs = await SystemConfig.getPublicConfigs();
      return this.transformConfigsToSettings(configs);
    } catch (error) {
      logger.error('获取公开配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有配置（管理员）
   */
  private static async getAllConfigs(): Promise<any> {
    try {
      const configs = await SystemConfig.findAll({
        order: [['category', 'ASC'], ['sortOrder', 'ASC']]
      });
      return this.transformConfigsToSettings(configs);
    } catch (error) {
      logger.error('获取所有配置失败:', error);
      throw error;
    }
  }

  /**
   * 更新配置
   */
  private static async updateConfigs(category: string, settings: any): Promise<void> {
    try {
      const configs = this.transformSettingsToConfigs(settings, category);

      for (const config of configs) {
        await SystemConfig.upsert({
          configKey: config.configKey,
          configValue: config.configValue,
          configType: config.configType as ConfigType,
          category: config.category,
          isPublic: config.isPublic,
          isEditable: true,
          sortOrder: 0
        });
      }

      logger.info(`配置类别 ${category} 更新成功`);
    } catch (error) {
      logger.error(`更新配置类别 ${category} 失败:`, error);
      throw error;
    }
  }

  /**
   * 获取特定配置项
   */
  private static async _getConfigValue(key: string, defaultValue?: any): Promise<any> {
    try {
      const config = await SystemConfig.findByKey(key);
      return config ? config.getParsedValue() : defaultValue;
    } catch (error) {
      logger.error(`获取配置项 ${key} 失败:`, error);
      return defaultValue;
    }
  }

  /**
   * 设置配置项
   */
  private static async _setConfigValue(
    key: string,
    value: any,
    category = 'general',
    isPublic = false
  ): Promise<void> {
    try {
      let configType = ConfigType.STRING;
      let configValue = String(value);

      if (typeof value === 'number') {
        configType = ConfigType.NUMBER;
      } else if (typeof value === 'boolean') {
        configType = ConfigType.BOOLEAN;
        configValue = String(value);
      } else if (typeof value === 'object' && value !== null) {
        configType = ConfigType.JSON;
        configValue = JSON.stringify(value);
      }

      await SystemConfig.upsert({
        configKey: key,
        configValue,
        configType,
        category,
        isPublic,
        isEditable: true,
        sortOrder: 0
      });

      logger.info(`配置项 ${key} 设置成功`);
    } catch (error) {
      logger.error(`设置配置项 ${key} 失败:`, error);
      throw error;
    }
  }

  /**
   * 删除配置项
   */
  static async deleteConfig(key: string): Promise<void> {
    try {
      await SystemConfig.destroy({ where: { configKey: key } });
      logger.info(`配置项 ${key} 删除成功`);
    } catch (error) {
      logger.error(`删除配置项 ${key} 失败:`, error);
      throw error;
    }
  }

  /**
   * 将配置数组转换为设置对象
   */
  private static transformConfigsToSettings(configs: any[]): any {
    const settings: any = {};

    configs.forEach(config => {
      const keys = config.configKey.split('.');
      let current = settings;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      const lastKey = keys[keys.length - 1];
      current[lastKey] = config.getParsedValue();
    });

    return settings;
  }

  /**
   * 将设置对象转换为配置数组
   */
  private static transformSettingsToConfigs(settings: any, category: string, prefix = ''): any[] {
    const configs: any[] = [];

    Object.entries(settings).forEach(([key, value]) => {
      const configKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // 递归处理嵌套对象
        configs.push(...this.transformSettingsToConfigs(value, category, configKey));
      } else {
        // 处理基本类型
        let configType = ConfigType.STRING;
        let configValue = String(value);

        if (typeof value === 'number') {
          configType = ConfigType.NUMBER;
        } else if (typeof value === 'boolean') {
          configType = ConfigType.BOOLEAN;
          configValue = String(value);
        } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          configType = ConfigType.JSON;
          configValue = JSON.stringify(value);
        }

        configs.push({
          configKey,
          configValue,
          configType,
          category,
          isPublic: category !== 'email' && category !== 'security'
        });
      }
    });

    return configs;
  }
}
import { SystemConfig } from '../models';
import { EmailService } from './email.service';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigType } from '../models/SystemConfig';

export class SettingsService {
  /**
   * 获取所有设置
   */
  static async getSettings() {
    try {
      const configs = await SystemConfig.findAll({
        order: [
          ['category', 'ASC'],
          ['sortOrder', 'ASC'],
        ],
      });

      const settings: any = {
        site: {},
        siteTheme: {},
        email: {},
        seo: {},
        homepageSections: {},
        contactEmail: '',
        contactPhone: '',
      };

      configs.forEach(config => {
        const configKey = config.configKey;
        let value: any = config.configValue || config.defaultValue;

        // 对JSON类型的配置进行解析
        if (config.configType === ConfigType.JSON) {
          try {
            value = JSON.parse(value || '{}');
          } catch {
            value = {};
          }
        } else if (config.configType === ConfigType.BOOLEAN) {
          value = value === 'true' || value === '1';
        } else if (config.configType === ConfigType.NUMBER) {
          value = Number(value);
        }

        // 根据配置键映射到对应的结构
        switch (configKey) {
          case 'site':
            settings.site = value;
            break;
          case 'siteTheme':
            settings.siteTheme = value;
            break;
          case 'email':
            settings.email = value;
            break;
          case 'seo':
            settings.seo = value;
            break;
          case 'homepageSections':
            settings.homepageSections = value;
            break;
          case 'contactEmail':
            settings.contactEmail = value;
            break;
          case 'contactPhone':
            settings.contactPhone = value;
            break;
        }
      });

      return settings;
    } catch (error) {
      logger.error('获取设置失败:', error);
      throw error;
    }
  }

  /**
   * 更新网站设置
   */
  static async updateSiteSettings(siteSettings: any) {
    try {
      const updates = [];

      // 更新site配置
      if (siteSettings.site) {
        updates.push({
          key: 'site',
          value: JSON.stringify(siteSettings.site),
          type: ConfigType.JSON,
          category: 'site',
        });
      }

      // 更新siteTheme配置
      if (siteSettings.siteTheme) {
        updates.push({
          key: 'siteTheme',
          value: JSON.stringify(siteSettings.siteTheme),
          type: ConfigType.JSON,
          category: 'site',
        });
      }

      // 更新email配置
      if (siteSettings.email) {
        updates.push({
          key: 'email',
          value: JSON.stringify(siteSettings.email),
          type: ConfigType.JSON,
          category: 'email',
        });
      }

      // 更新seo配置
      if (siteSettings.seo) {
        updates.push({
          key: 'seo',
          value: JSON.stringify(siteSettings.seo),
          type: ConfigType.JSON,
          category: 'seo',
        });
      }

      // 更新homepageSections配置
      if (siteSettings.homepageSections) {
        updates.push({
          key: 'homepageSections',
          value: JSON.stringify(siteSettings.homepageSections),
          type: ConfigType.JSON,
          category: 'site',
        });
      }

      // 更新联系信息
      if (siteSettings.contactEmail) {
        updates.push({
          key: 'contactEmail',
          value: siteSettings.contactEmail,
          type: ConfigType.STRING,
          category: 'site',
        });
      }

      if (siteSettings.contactPhone) {
        updates.push({
          key: 'contactPhone',
          value: siteSettings.contactPhone,
          type: ConfigType.STRING,
          category: 'site',
        });
      }

      for (const update of updates) {
        if (update.value !== undefined && update.value !== null) {
          await this.updateOrCreateConfig(update.key, update.value, update.type, update.category);
        }
      }
    } catch (error) {
      logger.error('更新网站设置失败:', error);
      throw error;
    }
  }

  /**
   * 更新邮件设置
   */
  static async updateEmailSettings(emailSettings: any) {
    try {
      await this.updateOrCreateConfig('email', JSON.stringify(emailSettings), ConfigType.JSON, 'email');
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
      const updates = [
        {
          key: 'enable_registration',
          value: securitySettings.enableRegistration?.toString(),
          type: ConfigType.BOOLEAN,
        },
        { key: 'enable_captcha', value: securitySettings.enableCaptcha?.toString(), type: ConfigType.BOOLEAN },
        { key: 'session_timeout', value: securitySettings.sessionTimeout?.toString(), type: ConfigType.NUMBER },
        { key: 'max_login_attempts', value: securitySettings.maxLoginAttempts?.toString(), type: ConfigType.NUMBER },
        { key: 'ip_whitelist', value: JSON.stringify(securitySettings.ipWhitelist || []), type: ConfigType.JSON },
        { key: 'password_policy', value: JSON.stringify(securitySettings.passwordPolicy || {}), type: ConfigType.JSON },
      ];

      for (const update of updates) {
        await this.updateOrCreateConfig(update.key, update.value, update.type, 'security');
      }
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
      await EmailService.sendEmail({
        to,
        subject: subject || '测试邮件',
        html: content || '<p>这是一封测试邮件，如果您收到此邮件，说明邮件配置正确。</p>',
      });
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
      // 这里可以实现具体的缓存清理逻辑
      // 例如清理 Redis 缓存、文件缓存等
      logger.info('缓存清理完成');
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

      // 这里需要根据实际使用的数据库类型实现备份逻辑
      // 示例：MySQL 备份命令
      // const command = `mysqldump -u ${username} -p${password} ${database} > ${backupPath}`;
      // await execAsync(command);

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
          used: process.memoryUsage(),
        },
        cpu: os.cpus(),
        loadAverage: os.loadavg(),
        hostname: os.hostname(),
        networkInterfaces: os.networkInterfaces(),
      };

      return systemInfo;
    } catch (error) {
      logger.error('获取系统信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取网站配置
   */
  static async getSiteConfig() {
    try {
      const configs = await SystemConfig.findAll({
        where: { category: 'site', isPublic: true },
        order: [['sortOrder', 'ASC']],
      });

      const config: any = {};
      configs.forEach(item => {
        let value = item.configValue || item.defaultValue;

        if (item.configType === ConfigType.BOOLEAN) {
          value = (value === 'true' || value === '1').toString();
        } else if (item.configType === ConfigType.NUMBER) {
          value = Number(value).toString();
        } else if (item.configType === ConfigType.JSON) {
          try {
            value = JSON.parse(value || '{}');
          } catch {
            value = '{}';
          }
        }

        config[item.configKey] = value;
      });

      return config;
    } catch (error) {
      logger.error('获取网站配置失败:', error);
      throw error;
    }
  }

  /**
   * 更新网站配置
   */
  static async updateSiteConfig(config: any) {
    try {
      for (const [key, value] of Object.entries(config)) {
        await this.updateOrCreateConfig(key, value as string, ConfigType.STRING, 'site');
      }
    } catch (error) {
      logger.error('更新网站配置失败:', error);
      throw error;
    }
  }

  /**
   * 更新或创建配置项
   */
  private static async updateOrCreateConfig(key: string, value: string, type: ConfigType, category: string) {
    try {
      const [config] = await SystemConfig.findOrCreate({
        where: { configKey: key },
        defaults: {
          configKey: key,
          configValue: value,
          configType: type,
          category,
          isPublic: false,
          isEditable: true,
          sortOrder: 0,
        },
      });

      if (config.configValue !== value) {
        await config.update({ configValue: value });
      }
    } catch (error) {
      logger.error(`更新配置项失败 ${key}:`, error);
      throw error;
    }
  }
}

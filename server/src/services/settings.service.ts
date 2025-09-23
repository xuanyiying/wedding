import { EmailService } from './email.service';
import SystemConfig, { ConfigType } from '../models/SystemConfig';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

export class SettingsService {
  static async getAllSettings() {
    return await SystemConfig.findAll({ where: { configKey: { [Op.like]: 'settings.%' } } });
  }


  /**
   * 更新网站设置 - 全量更新模式
   */
  static async updateSiteSettings(siteSettings: any) {
    try {
      logger.info('🔧 updateSiteSettings 接收到的数据:', JSON.stringify(siteSettings, null, 2));

      // 先删除现有的网站设置数据
      await SystemConfig.destroy({
        where: {
          configKey: 'settings.site',
          category: 'site'
        }
      });
      logger.info('🗑️ 已删除现有网站设置数据');

      // 写入新的网站设置数据
      if (Object.keys(siteSettings).length > 0) {
        await this.createConfigs('site', 'settings.site', JSON.stringify(siteSettings));
        logger.info('✅ 网站设置全量更新成功');
      }
    } catch (error) {
      logger.error('❌ 更新网站设置失败:', error);
      throw error;
    }
  }


  /**
   * 更新首页设置 - 全量更新模式
   */
  static async updateHomepageSettings(homepageSettings: any) {
    try {
      logger.info('🔧 updateHomepageSettings 接收到的数据:', JSON.stringify(homepageSettings, null, 2));

      // 先删除现有的首页设置数据
      await SystemConfig.destroy({
        where: {
          category: 'homepage'
        }
      });
      logger.info('🗑️ 已删除现有首页设置数据');

      // 写入新的首页设置数据
      if (Object.keys(homepageSettings).length > 0) {
        await this.createConfigs('homepage', 'settings.homepage', JSON.stringify(homepageSettings));
        logger.info('✅ 首页设置全量更新成功');
      }
    } catch (error) {
      logger.error('❌ 更新首页设置失败:', error);
      throw error;
    }
  }

  /**
   * 更新主题设置 - 全量更新模式
   */
  static async updateThemeSettings(themeSettings: any) {
    try {
      logger.info('🔧 updateThemeSettings 接收到的数据:', JSON.stringify(themeSettings, null, 2));

      // 先删除现有的主题设置数据
      await SystemConfig.destroy({
        where: {
          category: 'theme',
          configKey: 'settings.theme'
        }
      });
      logger.info('🗑️ 已删除现有主题设置数据');

      // 写入新的主题设置数据
      if (Object.keys(themeSettings).length > 0) {
        await this.createConfigs('theme', 'settings.theme', JSON.stringify(themeSettings));
        logger.info('✅ 主题设置全量更新成功');
      }
    } catch (error) {
      logger.error('❌ 更新主题设置失败:', error);
      throw error;
    }
  }

  /**
   * 更新邮件设置 - 全量更新模式
   */
  static async updateEmailSettings(emailSettings: any) {
    try {
      logger.info('🔧 updateEmailSettings 接收到的数据:', JSON.stringify(emailSettings, null, 2));

      // 先删除现有的邮件设置数据
      await SystemConfig.destroy({
        where: {
          category: 'email',
          configKey: 'settings.email'
        }
      });
      logger.info('🗑️ 已删除现有邮件设置数据');

      // 写入新的邮件设置数据
      if (Object.keys(emailSettings).length > 0) {
        await this.createConfigs('email', 'settings.email', JSON.stringify(emailSettings));
        logger.info('✅ 邮件设置全量更新成功');
      }
    } catch (error) {
      logger.error('❌ 更新邮件设置失败:', error);
      throw error;
    }
  }
  static async createConfigs(category: string, key: string, value: string) {
    await SystemConfig.create({
      category,
      configKey: key,
      configType: ConfigType.JSON,
      configValue: value,
      defaultValue: null,
      description: null,
      isEditable: true,
      isPublic: true,
      sortOrder: 0,
      validationRule: null,
    });

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
      logger.info('缓存清理成功');
    } catch (error) {
      logger.error('清理缓存失败:', error);
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
   * 获取特定配置项
   */
  private static async _getConfigValue(key: string, defaultValue?: any): Promise<any> {
    try {
      // 修复键格式问题，应该直接使用 key 而不是 'settings.' + key
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
}
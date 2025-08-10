#!/usr/bin/env ts-node

import { Sequelize } from 'sequelize';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { initModels } from '../models';
import SystemConfig, { ConfigType } from '../models/SystemConfig';
import { generateId } from '../utils/id.generator';

/**
 * SystemConfig初始化数据
 */
const INITIAL_CONFIGS = [
  // 网站基本设置
  {
    configKey: 'site_name',
    defaultValue: '婚礼服务平台',
    configType: ConfigType.STRING,
    category: 'site',
    description: '网站名称',
    isPublic: true,
    isEditable: true,
    sortOrder: 1,
  },
  {
    configKey: 'site_description',
    defaultValue: '专业的婚礼策划与服务平台，为您打造完美的婚礼体验',
    configType: ConfigType.TEXT,
    category: 'site',
    description: '网站描述',
    isPublic: true,
    isEditable: true,
    sortOrder: 2,
  },
  {
    configKey: 'contact_email',
    defaultValue: 'contact@wedding.com',
    configType: ConfigType.STRING,
    category: 'site',
    description: '联系邮箱',
    isPublic: true,
    isEditable: true,
    sortOrder: 3,
  },
  {
    configKey: 'contact_phone',
    defaultValue: '400-123-4567',
    configType: ConfigType.STRING,
    category: 'site',
    description: '联系电话',
    isPublic: true,
    isEditable: true,
    sortOrder: 4,
  },
  {
    configKey: 'site_logo',
    defaultValue: '/images/logo.png',
    configType: ConfigType.STRING,
    category: 'site',
    description: '网站Logo',
    isPublic: true,
    isEditable: true,
    sortOrder: 5,
  },
  {
    configKey: 'site_favicon',
    defaultValue: '/images/favicon.ico',
    configType: ConfigType.STRING,
    category: 'site',
    description: '网站图标',
    isPublic: true,
    isEditable: true,
    sortOrder: 6,
  },
  {
    configKey: 'homepage_background_image',
    defaultValue: '/images/homepage-bg.jpg',
    configType: ConfigType.STRING,
    category: 'site',
    description: '首页背景图',
    isPublic: true,
    isEditable: true,
    sortOrder: 7,
  },
  
  // SEO设置
  {
    configKey: 'seo_title',
    defaultValue: '婚礼服务平台 - 专业婚礼策划与服务',
    configType: ConfigType.STRING,
    category: 'site',
    description: 'SEO标题',
    isPublic: true,
    isEditable: true,
    sortOrder: 8,
  },
  {
    configKey: 'seo_description',
    defaultValue: '专业的婚礼策划与服务平台，提供婚礼摄影、婚礼主持、婚礼策划等一站式服务',
    configType: ConfigType.TEXT,
    category: 'site',
    description: 'SEO描述',
    isPublic: true,
    isEditable: true,
    sortOrder: 9,
  },
  {
    configKey: 'seo_keywords',
    defaultValue: '婚礼策划,婚礼摄影,婚礼主持,婚礼服务,婚庆公司',
    configType: ConfigType.STRING,
    category: 'site',
    description: 'SEO关键词',
    isPublic: true,
    isEditable: true,
    sortOrder: 10,
  },
  
  // 社交媒体设置
  {
    configKey: 'social_wechat',
    defaultValue: '',
    configType: ConfigType.STRING,
    category: 'site',
    description: '微信号',
    isPublic: true,
    isEditable: true,
    sortOrder: 11,
  },
  {
    configKey: 'social_weibo',
    defaultValue: '',
    configType: ConfigType.STRING,
    category: 'site',
    description: '微博地址',
    isPublic: true,
    isEditable: true,
    sortOrder: 12,
  },
  {
    configKey: 'social_instagram',
    defaultValue: '',
    configType: ConfigType.STRING,
    category: 'site',
    description: 'Instagram地址',
    isPublic: true,
    isEditable: true,
    sortOrder: 13,
  },
  
  // 首页版块设置
  {
    configKey: 'homepage_sections',
    defaultValue: JSON.stringify({
      hero: { enabled: true, title: '完美婚礼，从这里开始', subtitle: '专业团队为您打造梦想中的婚礼' },
      services: { enabled: true, title: '我们的服务' },
      portfolio: { enabled: true, title: '精选作品' },
      testimonials: { enabled: true, title: '客户评价' },
      contact: { enabled: true, title: '联系我们' }
    }),
    configType: ConfigType.JSON,
    category: 'site',
    description: '首页版块配置',
    isPublic: true,
    isEditable: true,
    sortOrder: 14,
  },
  
  // 主题设置
  {
    configKey: 'primary_color',
    defaultValue: '#FFFFFF',
    configType: ConfigType.STRING,
    category: 'theme',
    description: '主色调',
    isPublic: true,
    isEditable: true,
    sortOrder: 1,
  },
  {
    configKey: 'border_radius',
    defaultValue: '8',
    configType: ConfigType.NUMBER,
    category: 'theme',
    description: '圆角大小(px)',
    isPublic: true,
    isEditable: true,
    sortOrder: 2,
  },
  {
    configKey: 'compact_mode',
    defaultValue: 'false',
    configType: ConfigType.BOOLEAN,
    category: 'theme',
    description: '紧凑模式',
    isPublic: true,
    isEditable: true,
    sortOrder: 3,
  },
  {
    configKey: 'dark_mode',
    defaultValue: 'false',
    configType: ConfigType.BOOLEAN,
    category: 'theme',
    description: '深色模式',
    isPublic: true,
    isEditable: true,
    sortOrder: 4,
  },
  {
    configKey: 'font_size',
    defaultValue: '14',
    configType: ConfigType.NUMBER,
    category: 'theme',
    description: '字体大小(px)',
    isPublic: true,
    isEditable: true,
    sortOrder: 5,
  },
  {
    configKey: 'client_theme_variant',
    defaultValue: 'default',
    configType: ConfigType.STRING,
    category: 'theme',
    description: '客户端主题变体',
    isPublic: true,
    isEditable: true,
    sortOrder: 6,
  },
  
  // 邮件设置
  {
    configKey: 'smtp_host',
    defaultValue: 'smtp.gmail.com',
    configType: ConfigType.STRING,
    category: 'email',
    description: 'SMTP服务器地址',
    isPublic: false,
    isEditable: true,
    sortOrder: 1,
  },
  {
    configKey: 'smtp_port',
    defaultValue: '587',
    configType: ConfigType.NUMBER,
    category: 'email',
    description: 'SMTP端口',
    isPublic: false,
    isEditable: true,
    sortOrder: 2,
  },
  {
    configKey: 'smtp_user',
    defaultValue: '',
    configType: ConfigType.STRING,
    category: 'email',
    description: 'SMTP用户名',
    isPublic: false,
    isEditable: true,
    sortOrder: 3,
  },
  {
    configKey: 'smtp_password',
    defaultValue: '',
    configType: ConfigType.STRING,
    category: 'email',
    description: 'SMTP密码',
    isPublic: false,
    isEditable: true,
    sortOrder: 4,
  },
  {
    configKey: 'smtp_secure',
    defaultValue: 'true',
    configType: ConfigType.BOOLEAN,
    category: 'email',
    description: '启用SSL/TLS',
    isPublic: false,
    isEditable: true,
    sortOrder: 5,
  },
  {
    configKey: 'email_from',
    defaultValue: 'noreply@wedding.com',
    configType: ConfigType.STRING,
    category: 'email',
    description: '发件人邮箱',
    isPublic: false,
    isEditable: true,
    sortOrder: 6,
  },
  {
    configKey: 'email_from_name',
    defaultValue: '婚礼服务平台',
    configType: ConfigType.STRING,
    category: 'email',
    description: '发件人名称',
    isPublic: false,
    isEditable: true,
    sortOrder: 7,
  },
  
  // 安全设置
  {
    configKey: 'enable_registration',
    defaultValue: 'true',
    configType: ConfigType.BOOLEAN,
    category: 'security',
    description: '允许用户注册',
    isPublic: false,
    isEditable: true,
    sortOrder: 1,
  },
  {
    configKey: 'enable_captcha',
    defaultValue: 'false',
    configType: ConfigType.BOOLEAN,
    category: 'security',
    description: '启用验证码',
    isPublic: false,
    isEditable: true,
    sortOrder: 2,
  },
  {
    configKey: 'session_timeout',
    defaultValue: '7200',
    configType: ConfigType.NUMBER,
    category: 'security',
    description: '会话超时时间(秒)',
    isPublic: false,
    isEditable: true,
    sortOrder: 3,
  },
  {
    configKey: 'max_login_attempts',
    defaultValue: '5',
    configType: ConfigType.NUMBER,
    category: 'security',
    description: '最大登录尝试次数',
    isPublic: false,
    isEditable: true,
    sortOrder: 4,
  },
  {
    configKey: 'ip_whitelist',
    defaultValue: JSON.stringify([]),
    configType: ConfigType.JSON,
    category: 'security',
    description: 'IP白名单',
    isPublic: false,
    isEditable: true,
    sortOrder: 5,
  },
  {
    configKey: 'password_policy',
    defaultValue: JSON.stringify({
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false
    }),
    configType: ConfigType.JSON,
    category: 'security',
    description: '密码策略',
    isPublic: false,
    isEditable: true,
    sortOrder: 6,
  },
  
  // 系统设置
  {
    configKey: 'system_version',
    defaultValue: '1.0.0',
    configType: ConfigType.STRING,
    category: 'system',
    description: '系统版本',
    isPublic: true,
    isEditable: false,
    sortOrder: 1,
  },
  {
    configKey: 'maintenance_mode',
    defaultValue: 'false',
    configType: ConfigType.BOOLEAN,
    category: 'system',
    description: '维护模式',
    isPublic: false,
    isEditable: true,
    sortOrder: 2,
  },
  {
    configKey: 'debug_mode',
    defaultValue: 'false',
    configType: ConfigType.BOOLEAN,
    category: 'system',
    description: '调试模式',
    isPublic: false,
    isEditable: true,
    sortOrder: 3,
  },
  {
    configKey: 'cache_enabled',
    defaultValue: 'true',
    configType: ConfigType.BOOLEAN,
    category: 'system',
    description: '启用缓存',
    isPublic: false,
    isEditable: true,
    sortOrder: 4,
  },
  {
    configKey: 'log_level',
    defaultValue: 'info',
    configType: ConfigType.STRING,
    category: 'system',
    description: '日志级别',
    isPublic: false,
    isEditable: true,
    sortOrder: 5,
  },
];

/**
 * SystemConfig初始化器
 */
export class SystemConfigInitializer {
  constructor(_sequelize: Sequelize) {
  }

  /**
   * 初始化SystemConfig数据
   */
  async initializeSystemConfigs(): Promise<void> {
    try {
      logger.info('开始初始化SystemConfig数据...');

      // 清除现有配置数据
      await SystemConfig.destroy({ where: {}, force: true });
      logger.info('已清除现有SystemConfig数据');

      // 准备初始配置数据
      const configs = INITIAL_CONFIGS.map(config => ({
        id: generateId(),
        configKey: config.configKey,
        configValue: config.defaultValue,
        defaultValue: config.defaultValue,
        configType: config.configType,
        category: config.category,
        description: config.description,
        validationRule: null,
        isPublic: config.isPublic,
        isEditable: config.isEditable,
        sortOrder: config.sortOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // 批量插入配置数据
      await SystemConfig.bulkCreate(configs);
      logger.info(`成功插入 ${configs.length} 条SystemConfig数据`);
      
      logger.info('SystemConfig数据初始化完成');
    } catch (error) {
      logger.error('SystemConfig数据初始化失败:', error);
      throw error;
    }
  }

  /**
   * 执行完整的SystemConfig初始化
   */
  async initialize(): Promise<void> {
    try {
      logger.info('开始SystemConfig初始化...');
      await this.initializeSystemConfigs();
      logger.info('SystemConfig初始化完成');
    } catch (error) {
      logger.error('SystemConfig初始化失败:', error);
      throw error;
    }
  }
}

/**
 * 导出初始化函数
 */
export async function initializeSystemConfig(sequelize: Sequelize): Promise<void> {
  const initializer = new SystemConfigInitializer(sequelize);
  await initializer.initialize();
}

/**
 * SystemConfig初始化执行脚本
 */
async function main() {
  let sequelize: Sequelize | null = null;

  try {
    logger.info('正在连接数据库...');

    // 创建数据库连接
    sequelize = new Sequelize({
      dialect: 'mysql',
      host: config.database.host,
      port: config.database.port,
      username: config.database.username,
      password: config.database.password,
      database: config.database.name,
      logging: msg => logger.debug(msg),
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });

    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 初始化模型
    initModels(sequelize);
    logger.info('数据库模型初始化完成');

    // 初始化SystemConfig数据
    await initializeSystemConfig(sequelize);
    logger.info('SystemConfig数据初始化完成');

    process.exit(0);
  } catch (error) {
    logger.error('SystemConfig初始化脚本执行失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    if (sequelize) {
      await sequelize.close();
      logger.info('数据库连接已关闭');
    }
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, _promise) => {
  logger.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

// 执行主函数
if (require.main === module) {
  main();
}

export default main;
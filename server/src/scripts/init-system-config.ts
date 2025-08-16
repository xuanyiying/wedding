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
  // 网站基本设置 - 使用site结构
  {
    configKey: 'site',
    defaultValue: JSON.stringify({
      name: '婚礼服务平台',
      description: '专业的婚礼策划与服务平台，为您打造完美的婚礼体验',
      keywords: '婚礼策划,婚礼摄影,婚礼主持,婚礼服务,婚庆公司',
      logo: './assets/images/logo.png',
      favicon: './assets/images/favicon.ico',
    }),
    configType: ConfigType.JSON,
    category: 'site',
    description: '网站基本信息配置',
    isPublic: true,
    isEditable: true,
    sortOrder: 1,
  },
  {
    configKey: 'contactEmail',
    defaultValue: 'contact@wedding.com',
    configType: ConfigType.STRING,
    category: 'site',
    description: '联系邮箱',
    isPublic: true,
    isEditable: true,
    sortOrder: 2,
  },
  {
    configKey: 'contactPhone',
    defaultValue: '400-123-4567',
    configType: ConfigType.STRING,
    category: 'site',
    description: '联系电话',
    isPublic: true,
    isEditable: true,
    sortOrder: 3,
  },

  // 首页版块设置
  {
    configKey: 'homepageSections',
    defaultValue: JSON.stringify({
      hero: {
        backgroundImage: '/images/hero-bg.jpg',
        visible: true,
        title: '完美婚礼，从这里开始',
        description: '专业团队为您打造梦想中的婚礼',
        ctaText: '立即咨询',
        ctaLink: '/contact',
      },
      team: {
        visible: true,
        title: '专业团队',
        subtitle: '经验丰富的婚礼策划师',
        description: '专业团队为您打造梦想中的婚礼',
      },
      teamShowcase: {
        visible: true,
        title: '团队风采',
        subtitle: '展示我们的专业实力',
        description: '查看我们团队的精彩瞬间',
      },
      portfolio: {
        visible: true,
        title: '精选作品',
        subtitle: '见证每一个美好时刻',
        description: '浏览我们的婚礼摄影作品集',
      },
      schedule: {
        visible: true,
        title: '档期查询',
        subtitle: '查询可预约的主持人',
        description: '查询可预约的主持人',
      },
      contact: {
        visible: true,
        title: '联系我们',
        subtitle: '随时为您提供咨询',
        description: '多种方式联系我们的团队',
        address: '北京市朝阳区婚礼大厦',
        phone: '400-123-4567',
        email: 'contact@wedding.com',
        wechat: 'wedding_service',
        xiaohongshu: 'wedding_xiaohongshu',
        douyin: 'wedding_douyin',
      },
    }),
    configType: ConfigType.JSON,
    category: 'site',
    description: '首页版块配置',
    isPublic: true,
    isEditable: true,
    sortOrder: 14,
  },

  // 主题设置 - 使用siteTheme结构
  {
    configKey: 'siteTheme',
    defaultValue: JSON.stringify({
      colors: {
        primary: '#1890ff',
        secondary: '#52c41a',
        background: '#ffffff',
        text: '#000000',
      },
      fonts: {
        primary: 'Arial, sans-serif',
        secondary: 'Georgia, serif',
      },
      spacing: {
        containerPadding: '20px',
        sectionPadding: '40px',
      },
    }),
    configType: ConfigType.JSON,
    category: 'theme',
    description: '网站主题配置',
    isPublic: true,
    isEditable: true,
    sortOrder: 1,
  },

  // 邮件设置 - 使用email结构
  {
    configKey: 'email',
    defaultValue: JSON.stringify({
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      smtpSecure: true,
      emailFrom: 'noreply@wedding.com',
      emailFromName: '婚礼服务平台',
    }),
    configType: ConfigType.JSON,
    category: 'email',
    description: '邮件服务配置',
    isPublic: false,
    isEditable: true,
    sortOrder: 1,
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
      requireSpecialChars: false,
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

  // SEO设置 - 使用seo结构
  {
    configKey: 'seo',
    defaultValue: JSON.stringify({
      title: '婚礼服务平台 - 专业婚礼策划与服务',
      description: '专业的婚礼策划与服务平台，提供婚礼摄影、婚礼主持、婚礼策划等一站式服务',
      keywords: '婚礼策划,婚礼摄影,婚礼主持,婚礼服务,婚庆公司',
      ogImage: '/images/og-image.jpg',
      twitterCard: 'summary_large_image',
    }),
    configType: ConfigType.JSON,
    category: 'seo',
    description: 'SEO优化配置',
    isPublic: true,
    isEditable: true,
    sortOrder: 1,
  },
];

/**
 * SystemConfig初始化器
 */
export class SystemConfigInitializer {
  constructor(_sequelize: Sequelize) {}

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

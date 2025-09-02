import { Sequelize } from 'sequelize';
import { config } from './config';
import { logger } from '../utils/logger';
import { initModels } from '../models';

// 创建 Sequelize 实例
export const sequelize = new Sequelize({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.username,
  password: config.database.password,
  dialect: 'mysql',
  logging: config.database.logging ? (sql: string) => logger.debug(sql) : false,
  pool: config.database.pool,
  timezone: '+08:00', // 设置时区为中国标准时间
  define: {
    timestamps: true, // 自动添加 createdAt 和 updatedAt
    underscored: true, // 使用下划线命名
    paranoid: false, // 软删除
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  dialectOptions: {
    charset: 'utf8mb4',
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: true,
    typeCast: true,
  },
});

// 数据库连接函数
export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');

    // 初始化模型关联关系
    initModels(sequelize);
    logger.info('Database models initialized successfully.');

    // 在开发环境下同步数据库模型
    if (config.nodeEnv === 'development') {
      await sequelize.sync({force: true });
      logger.info('Database models synchronized successfully.');
    }
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
};

// 关闭数据库连接
export const closeDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('Database connection closed successfully.');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
};

// 数据库健康检查
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

// 开始事务
export const createTransaction = async () => {
  return await sequelize.transaction();
};

export default sequelize;

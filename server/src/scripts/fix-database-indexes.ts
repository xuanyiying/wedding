#!/usr/bin/env ts-node

import { Sequelize } from 'sequelize';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { initModels } from '../models';

/**
 * 数据库索引修复脚本
 * 用于解决"Too many keys specified; max 64 keys allowed"错误
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

    // 检查system_configs表的索引情况
    logger.info('检查system_configs表索引...');
    
    // 查询当前表的索引
    const indexes = await sequelize.query(
      `SHOW INDEX FROM system_configs`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    logger.info(`当前system_configs表索引数量: ${indexes.length}`);
    logger.info('当前索引列表:');
    indexes.forEach((index: any) => {
      logger.info(`  - ${index.Key_name} (${index.Column_name})`);
    });

    // 删除重复或不必要的索引
    logger.info('开始清理多余的索引...');
    
    // 删除可能重复的索引
    const duplicateIndexes = [
      'config_key',  // 这个索引可能与idx_system_configs_key重复
    ];
    
    for (const indexName of duplicateIndexes) {
      try {
        logger.info(`尝试删除索引: ${indexName}`);
        await sequelize.query(
          `DROP INDEX ${indexName} ON system_configs`,
          { type: sequelize.QueryTypes.RAW }
        );
        logger.info(`成功删除索引: ${indexName}`);
      } catch (error: any) {
        if (error.message && error.message.includes('check that column/key exists')) {
          logger.info(`索引 ${indexName} 不存在，跳过`);
        } else {
          logger.warn(`删除索引 ${indexName} 时出错: ${error.message}`);
        }
      }
    }

    // 重新检查索引
    const updatedIndexes = await sequelize.query(
      `SHOW INDEX FROM system_configs`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    logger.info(`修复后system_configs表索引数量: ${updatedIndexes.length}`);
    logger.info('修复后索引列表:');
    updatedIndexes.forEach((index: any) => {
      logger.info(`  - ${index.Key_name} (${index.Column_name})`);
    });

    logger.info('数据库索引修复完成');
    process.exit(0);
  } catch (error) {
    logger.error('数据库索引修复脚本执行失败:', error);
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
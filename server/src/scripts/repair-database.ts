#!/usr/bin/env ts-node

import { Sequelize, QueryTypes } from 'sequelize';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { initModels } from '../models';
import { SystemConfig } from '../models';

/**
 * 数据库修复脚本
 * 用于解决"Too many keys specified; max 64 keys allowed"错误
 * 并重新初始化数据库结构
 */

async function checkAndRepairIndexes(sequelize: Sequelize) {
  try {
    logger.info('检查system_configs表索引...');
    
    // 查询当前表的索引
    const indexes: any[] = await sequelize.query(
      `SHOW INDEX FROM system_configs`,
      { type: QueryTypes.SELECT }
    );
    
    logger.info(`当前system_configs表索引数量: ${indexes.length}`);
    
    // 按索引名称分组
    const indexGroups: { [key: string]: any[] } = {};
    indexes.forEach(index => {
      const keyName = index.Key_name;
      if (!indexGroups[keyName]) {
        indexGroups[keyName] = [];
      }
      indexGroups[keyName].push(index);
    });
    
    logger.info('当前索引详情:');
    Object.keys(indexGroups).forEach(keyName => {
      const group = indexGroups[keyName];
      if (group) {
        const columns = group.map(idx => idx.Column_name).join(', ');
        logger.info(`  - ${keyName}: ${columns}`);
      }
    });
    
    // 检查是否有重复索引
    const duplicateIndexes: string[] = [];
    const configKeyIndexes = Object.keys(indexGroups).filter(name => 
      name.includes('config_key') || (indexGroups[name] && indexGroups[name]!.some(idx => idx.Column_name === 'config_key'))
    );
    
    if (configKeyIndexes.length > 1) {
      logger.warn(`发现重复的config_key索引: ${configKeyIndexes.join(', ')}`);
      // 保留一个，删除其他的
      for (let i = 1; i < configKeyIndexes.length; i++) {
        duplicateIndexes.push(configKeyIndexes[i]!);
      }
    }
    
    // 删除重复索引
    for (const indexName of duplicateIndexes) {
      try {
        logger.info(`删除重复索引: ${indexName}`);
        await sequelize.query(
          `DROP INDEX ${indexName} ON system_configs`,
          { type: QueryTypes.RAW }
        );
        logger.info(`成功删除索引: ${indexName}`);
      } catch (error: any) {
        logger.warn(`删除索引 ${indexName} 时出错: ${error.message}`);
      }
    }
    
    return true;
  } catch (error) {
    logger.error('检查和修复索引时出错:', error);
    return false;
  }
}

async function repairSystemConfigTable(sequelize: Sequelize) {
  try {
    logger.info('修复system_configs表结构...');
    
    // 首先检查表是否存在
    const tableExists: any[] = await sequelize.query(
      `SHOW TABLES LIKE 'system_configs'`,
      { type: QueryTypes.SELECT }
    );
    
    if (tableExists.length === 0) {
      logger.info('system_configs表不存在，将通过模型同步创建');
      return true;
    }
    
    // 检查字段是否存在
    const columns: any[] = await sequelize.query(
      `SHOW COLUMNS FROM system_configs`,
      { type: QueryTypes.SELECT }
    );
    
    const columnNames = columns.map(col => col.Field);
    logger.info(`system_configs表字段: ${columnNames.join(', ')}`);
    
    // 检查config_key字段的索引情况
    const configKeyColumn = columns.find(col => col.Field === 'config_key');
    if (configKeyColumn) {
      logger.info(`config_key字段详情: ${JSON.stringify(configKeyColumn)}`);
    }
    
    return true;
  } catch (error) {
    logger.error('修复system_configs表结构时出错:', error);
    return false;
  }
}

async function reinitializeSystemConfig(sequelize: Sequelize) {
  try {
    logger.info('重新初始化SystemConfig数据...');
    
    // 删除现有数据
    await SystemConfig.destroy({ where: {}, force: true });
    logger.info('已清除现有SystemConfig数据');
    
    // 重新同步表结构
    await SystemConfig.sync({ alter: true });
    logger.info('SystemConfig表结构同步完成');
    
    return true;
  } catch (error) {
    logger.error('重新初始化SystemConfig时出错:', error);
    return false;
  }
}

async function main() {
  let sequelize: Sequelize | null = null;

  try {
    logger.info('开始数据库修复...');
    
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

    // 步骤1: 检查和修复索引
    logger.info('步骤1: 检查和修复索引');
    const indexRepairSuccess = await checkAndRepairIndexes(sequelize);
    if (!indexRepairSuccess) {
      logger.error('索引修复失败');
      process.exit(1);
    }

    // 步骤2: 修复表结构
    logger.info('步骤2: 修复表结构');
    const tableRepairSuccess = await repairSystemConfigTable(sequelize);
    if (!tableRepairSuccess) {
      logger.error('表结构修复失败');
      process.exit(1);
    }

    // 步骤3: 重新初始化SystemConfig
    logger.info('步骤3: 重新初始化SystemConfig');
    const reinitSuccess = await reinitializeSystemConfig(sequelize);
    if (!reinitSuccess) {
      logger.error('SystemConfig重新初始化失败');
      process.exit(1);
    }

    logger.info('数据库修复完成');
    process.exit(0);
  } catch (error) {
    logger.error('数据库修复脚本执行失败:', error);
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
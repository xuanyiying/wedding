#!/usr/bin/env node

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// 配置数据库连接
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wedding_service',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// 检查环境变量
const environment = process.env.ENVIRONMENT || 'dev';
console.log(`运行环境: ${environment}`);

async function checkAndFixIndexes() {
  try {
    console.log('正在连接数据库...');
    
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 检查system_configs表的索引
    console.log('检查system_configs表索引...');
    
    const [indexes] = await sequelize.query(
      'SHOW INDEX FROM system_configs'
    );
    
    console.log(`当前system_configs表索引数量: ${indexes.length}`);
    console.log('当前索引列表:');
    indexes.forEach((index) => {
      console.log(`  - ${index.Key_name} (${index.Column_name})`);
    });

    // 查找重复的config_key索引
    const configKeyIndexes = indexes.filter(index => 
      index.Column_name === 'config_key'
    );
    
    console.log(`\n发现 ${configKeyIndexes.length} 个config_key相关索引`);
    
    if (configKeyIndexes.length > 1) {
      console.log('发现重复索引，开始清理...');
      
      // 保留第一个索引，删除其他的
      for (let i = 1; i < configKeyIndexes.length; i++) {
        const indexName = configKeyIndexes[i].Key_name;
        try {
          console.log(`删除重复索引: ${indexName}`);
          await sequelize.query(
            `DROP INDEX ${indexName} ON system_configs`
          );
          console.log(`成功删除索引: ${indexName}`);
        } catch (error) {
          console.log(`删除索引 ${indexName} 时出错: ${error.message}`);
        }
      }
    } else {
      console.log('未发现重复索引，无需清理');
    }
    
    // 检查索引数量是否超过限制
    if (indexes.length > 60) {  // 留一些余量
      console.log(`警告: 索引数量(${indexes.length})接近MySQL限制(64)`);
      console.log('建议优化索引设计');
    }

    // 重新检查索引
    const [updatedIndexes] = await sequelize.query(
      'SHOW INDEX FROM system_configs'
    );
    
    console.log(`\n修复后system_configs表索引数量: ${updatedIndexes.length}`);
    console.log('修复后索引列表:');
    updatedIndexes.forEach((index) => {
      console.log(`  - ${index.Key_name} (${index.Column_name})`);
    });

    console.log('\n数据库索引修复完成');
    return true;
  } catch (error) {
    console.error('数据库索引修复失败:', error.message);
    return false;
  } finally {
    await sequelize.close();
    console.log('数据库连接已关闭');
  }
}

// 执行修复
checkAndFixIndexes()
  .then(success => {
    if (success) {
      console.log('修复脚本执行成功');
      process.exit(0);
    } else {
      console.log('修复脚本执行失败');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('修复脚本执行出错:', error);
    process.exit(1);
  });
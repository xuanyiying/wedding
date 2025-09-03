#!/bin/bash

# 数据库初始化检查脚本
# 用于检查数据库表是否已正确初始化

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 获取环境变量
source_env_file() {
    local env_file="$1"
    if [[ -f "$env_file" ]]; then
        log_info "加载环境变量: $env_file"
        source "$env_file"
    else
        log_error "环境变量文件不存在: $env_file"
        return 1
    fi
}

# 检查数据库连接
check_db_connection() {
    log_info "检查数据库连接..."
    
    # 使用docker exec连接到API容器并执行数据库连接检查
    if docker exec wedding-api-prod node -e "
        const { Sequelize } = require('sequelize');
        const sequelize = new Sequelize('${DB_NAME}', '${DB_USER}', '${DB_PASSWORD}', {
            host: '${DB_HOST}',
            port: ${DB_PORT},
            dialect: 'mysql'
        });
        
        async function testConnection() {
            try {
                await sequelize.authenticate();
                console.log('数据库连接成功');
                process.exit(0);
            } catch (error) {
                console.error('数据库连接失败:', error.message);
                process.exit(1);
            }
        }
        
        testConnection();
    "; then
        log_success "数据库连接成功"
        return 0
    else
        log_error "数据库连接失败"
        return 1
    fi
}

# 检查数据库表是否存在
check_db_tables() {
    log_info "检查数据库表是否存在..."
    
    # 使用docker exec连接到API容器并执行数据库表检查
    if docker exec wedding-api-prod node -e "
        const { Sequelize } = require('sequelize');
        const sequelize = new Sequelize('${DB_NAME}', '${DB_USER}', '${DB_PASSWORD}', {
            host: '${DB_HOST}',
            port: ${DB_PORT},
            dialect: 'mysql'
        });
        
        async function checkTables() {
            try {
                // 查询所有表
                const [results] = await sequelize.query('SHOW TABLES');
                const tables = results.map(r => Object.values(r)[0]);
                
                console.log('数据库表:', tables.join(', '));
                
                // 检查是否有表
                if (tables.length === 0) {
                    console.error('数据库中没有表');
                    process.exit(1);
                }
                
                // 检查关键表是否存在
                const requiredTables = ['users', 'weddings', 'guests'];
                const missingTables = requiredTables.filter(t => !tables.includes(t));
                
                if (missingTables.length > 0) {
                    console.error('缺少关键表:', missingTables.join(', '));
                    process.exit(1);
                }
                
                console.log('所有关键表都存在');
                process.exit(0);
            } catch (error) {
                console.error('检查数据库表失败:', error.message);
                process.exit(1);
            }
        }
        
        checkTables();
    "; then
        log_success "数据库表检查成功"
        return 0
    else
        log_error "数据库表检查失败"
        return 1
    fi
}

# 手动触发数据库同步
trigger_db_sync() {
    log_info "手动触发数据库同步..."
    
    # 使用docker exec连接到API容器并执行数据库同步
    if docker exec wedding-api-prod node -e "
        const { Sequelize } = require('sequelize');
        const sequelize = new Sequelize('${DB_NAME}', '${DB_USER}', '${DB_PASSWORD}', {
            host: '${DB_HOST}',
            port: ${DB_PORT},
            dialect: 'mysql'
        });
        
        // 导入所有模型
        const fs = require('fs');
        const path = require('path');
        
        // 初始化模型
        const modelsPath = path.join(__dirname, '../src/models');
        fs.readdirSync(modelsPath)
            .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
            .forEach(file => {
                try {
                    require(path.join(modelsPath, file))(sequelize);
                    console.log('加载模型:', file);
                } catch (error) {
                    console.error('加载模型失败:', file, error.message);
                }
            });
        
        async function syncDatabase() {
            try {
                // 使用alter模式同步数据库
                await sequelize.sync({ alter: true });
                console.log('数据库同步成功');
                process.exit(0);
            } catch (error) {
                console.error('数据库同步失败:', error.message);
                process.exit(1);
            }
        }
        
        syncDatabase();
    "; then
        log_success "数据库同步成功"
        return 0
    else
        log_error "数据库同步失败"
        return 1
    fi
}

# 主函数
main() {
    log_info "开始检查数据库初始化状态..."
    
    # 获取脚本目录
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
    
    # 加载环境变量
    local env_file="$PROJECT_ROOT/deployment/environments/.env.prod"
    source_env_file "$env_file" || return 1
    
    # 检查数据库连接
    check_db_connection || return 1
    
    # 检查数据库表
    if ! check_db_tables; then
        log_warning "数据库表检查失败，尝试手动触发同步..."
        trigger_db_sync || return 1
        
        # 再次检查数据库表
        check_db_tables || {
            log_error "数据库初始化失败，请检查日志"
            return 1
        }
    fi
    
    log_success "数据库初始化检查完成"
    return 0
}

# 运行主函数
main "$@"
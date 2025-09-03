#!/bin/bash

# 数据库初始化包装脚本
# 优化后的数据库初始化流程：
# 1. 让Sequelize自动创建表结构
# 2. 然后插入初始化数据

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

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 数据库连接信息
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="wedding_club"
DB_USER="wedding_user"
DB_PASSWORD="W3dd1ng_Us3r_2024_Pr0d_S3cur3!"
DB_ROOT_PASSWORD="W3dd1ng_R00t_2024_Pr0d_S3cur3!"

# 检查数据库连接
check_database_connection() {
    log_info "检查数据库连接..."
    
    if docker exec wedding-mysql-prod mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" >/dev/null 2>&1; then
        log_success "数据库连接正常"
        return 0
    else
        log_error "数据库连接失败"
        return 1
    fi
}

# 等待API服务启动并完成表结构同步
wait_for_api_sync() {
    log_info "等待API服务启动并完成表结构同步..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "检查API服务状态 (尝试 $attempt/$max_attempts)"
        
        # 检查API健康状态
        if curl -f -m 5 -s http://localhost:3000/health >/dev/null 2>&1; then
            log_success "API服务已启动"
            
            # 等待额外时间确保表结构同步完成
            log_info "等待表结构同步完成..."
            sleep 10
            
            # 检查关键表是否存在
            if docker exec wedding-mysql-prod mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SHOW TABLES LIKE 'users';" 2>/dev/null | grep -q "users"; then
                log_success "表结构同步完成"
                return 0
            fi
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log_info "等待5秒后重试..."
            sleep 5
        fi
        
        ((attempt++))
    done
    
    log_error "API服务启动超时或表结构同步失败"
    return 1
}

# 插入初始化数据
insert_initial_data() {
    log_info "插入初始化数据..."
    
    if [[ -f "$PROJECT_ROOT/server/scripts/database-data-init.sql" ]]; then
        if docker exec -i wedding-mysql-prod mysql -u "$DB_USER" -p"$DB_PASSWORD" < "$PROJECT_ROOT/server/scripts/database-data-init.sql" 2>/dev/null; then
            log_success "初始化数据插入成功"
            return 0
        else
            log_error "初始化数据插入失败"
            return 1
        fi
    else
        log_error "初始化数据脚本不存在: $PROJECT_ROOT/server/scripts/database-data-init.sql"
        return 1
    fi
}

# 验证初始化结果
verify_initialization() {
    log_info "验证初始化结果..."
    
    # 检查管理员用户是否存在
    local user_count
    user_count=$(docker exec wedding-mysql-prod mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT COUNT(*) FROM users WHERE username='admin';" 2>/dev/null | tail -n 1)
    
    if [[ "$user_count" -gt 0 ]]; then
        log_success "管理员用户创建成功"
    else
        log_error "管理员用户创建失败"
        return 1
    fi
    
    # 检查系统配置是否存在
    local config_count
    config_count=$(docker exec wedding-mysql-prod mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT COUNT(*) FROM system_configs;" 2>/dev/null | tail -n 1)
    
    if [[ "$config_count" -gt 0 ]]; then
        log_success "系统配置创建成功"
    else
        log_warning "系统配置创建失败或表不存在"
    fi
    
    log_success "数据库初始化验证完成"
    return 0
}

# 主函数
main() {
    log_info "开始优化的数据库初始化流程..."
    
    # 1. 检查数据库连接
    if ! check_database_connection; then
        log_error "数据库连接检查失败，请确保MySQL服务正常运行"
        exit 1
    fi
    
    # 2. 等待API服务启动并完成表结构同步
    if ! wait_for_api_sync; then
        log_error "API服务启动或表结构同步失败"
        exit 1
    fi
    
    # 3. 插入初始化数据
    if ! insert_initial_data; then
        log_error "初始化数据插入失败"
        exit 1
    fi
    
    # 4. 验证初始化结果
    if ! verify_initialization; then
        log_error "初始化结果验证失败"
        exit 1
    fi
    
    log_success "数据库初始化完成！"
    
    # 显示访问信息
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}    数据库初始化完成${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "管理员账户: ${YELLOW}admin${NC}"
    echo -e "管理员密码: ${YELLOW}password${NC}"
    echo -e "登录地址: ${BLUE}http://localhost/admin/login${NC}"
    echo ""
}

# 运行主函数
main "$@"
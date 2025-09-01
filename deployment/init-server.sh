#!/bin/bash

# Wedding Client 服务器初始化脚本
# 在服务部署完成后自动执行数据库初始化和系统配置

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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Wedding Client 服务器初始化${NC}"
echo -e "${BLUE}========================================${NC}"

# 检测环境
detect_environment() {
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^deployment-web:latest$"; then
        echo "tencent"
    else
        echo "production"
    fi
}

ENV_TYPE=$(detect_environment)
log_info "检测到环境类型: $ENV_TYPE"

# 设置配置文件路径
if [[ "$ENV_TYPE" == "development" ]]; then
    COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
    ENV_FILE="$PROJECT_ROOT/deployment/environments/.env.dev"
else
    COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
    ENV_FILE="$PROJECT_ROOT/deployment/environments/.env.prod"
fi

# 检查服务状态
check_services() {
    log_info "检查服务状态..."
    
    cd "$PROJECT_ROOT"
    
    # 检查Docker Compose配置
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "Docker Compose配置文件不存在: $COMPOSE_FILE"
        exit 1
    fi
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "环境配置文件不存在: $ENV_FILE"
        exit 1
    fi
    
    # 检查服务是否运行
    local services_status=$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --services --filter "status=running")
    local required_services=("mysql" "api")
    
    for service in "${required_services[@]}"; do
        if echo "$services_status" | grep -q "$service"; then
            log_success "$service 服务正在运行"
        else
            log_warning "$service 服务未运行，尝试启动..."
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d "$service"
            sleep 10
        fi
    done
}

# 等待数据库就绪
wait_for_database() {
    log_info "等待数据库服务就绪..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T mysql mysqladmin ping -h localhost -u root -p"$(grep MYSQL_ROOT_PASSWORD "$ENV_FILE" | cut -d'=' -f2)" >/dev/null 2>&1; then
            log_success "数据库连接成功"
            return 0
        fi
        
        log_info "等待数据库启动... (${attempt}/${max_attempts})"
        sleep 5
        ((attempt++))
    done
    
    log_error "数据库连接超时"
    return 1
}

# 执行数据库初始化
init_database() {
    log_info "执行数据库初始化..."
    
    local db_script="$PROJECT_ROOT/server/scripts/database-init.sql"
    
    if [[ ! -f "$db_script" ]]; then
        log_error "数据库初始化脚本不存在: $db_script"
        return 1
    fi
    
    # 执行数据库初始化脚本
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T mysql mysql -u root -p"$(grep MYSQL_ROOT_PASSWORD "$ENV_FILE" | cut -d'=' -f2)" < "$db_script"; then
        log_success "数据库初始化完成"
    else
        log_error "数据库初始化失败"
        return 1
    fi
}

# 执行系统配置初始化
init_system_configs() {
    log_info "执行系统配置初始化..."
    
    local config_script="$PROJECT_ROOT/server/scripts/init-system-configs.sql"
    
    if [[ ! -f "$config_script" ]]; then
        log_warning "系统配置初始化脚本不存在: $config_script"
        return 0
    fi
    
    # 执行系统配置初始化脚本
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T mysql mysql -u root -p"$(grep MYSQL_ROOT_PASSWORD "$ENV_FILE" | cut -d'=' -f2)" < "$config_script"; then
        log_success "系统配置初始化完成"
    else
        log_warning "系统配置初始化失败，但继续执行"
    fi
}

# 创建初始化状态文件
create_init_marker() {
    local init_file="$PROJECT_ROOT/.initialized"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    cat > "$init_file" << EOF
# Wedding Client 初始化完成标记
# 此文件表示服务器已完成初始化，请勿删除

INIT_DATE=$timestamp
ENVIRONMENT=$ENV_TYPE
INIT_VERSION=1.0.0
DATABASE_INITIALIZED=true
SYSTEM_CONFIGS_INITIALIZED=true

# 管理员登录信息
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@wedding.com

# 重要提醒：
# 1. 请及时修改默认管理员密码
# 2. 请配置正确的SMTP邮件服务
# 3. 请根据实际需求修改系统配置
EOF

    log_success "初始化标记文件已创建: $init_file"
}

# 显示后续配置提醒
show_post_init_instructions() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}    初始化完成！后续配置提醒${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}重要提醒：${NC}"
    echo "1. 默认管理员账户："
    echo "   - 用户名: admin"
    echo "   - 邮箱: admin@wedding.com"
    echo "   - 密码: admin123 (请立即修改!)"
    echo ""
    echo "2. 需要配置的服务："
    echo "   - SMTP邮件服务 (在环境配置文件中)"
    echo "   - 系统基础信息 (通过管理后台)"
    echo "   - 文件存储配置 (MinIO已自动配置)"
    echo ""
    echo "3. 访问地址："
    local server_ip=$(hostname -I | awk '{print $1}' || echo "localhost")
    if [[ "$ENV_TYPE" == "tencent" ]]; then
        echo "   - 前端: http://$server_ip"
        echo "   - API: http://$server_ip:3000"
    else
        echo "   - 前端: http://$server_ip:8080"
        echo "   - API: http://$server_ip:3000"
    fi
    echo "   - MinIO控制台: http://$server_ip:9001"
    echo ""
    echo "4. 安全建议："
    echo "   - 立即修改默认管理员密码"
    echo "   - 配置防火墙规则"
    echo "   - 启用SSL证书 (如果需要)"
    echo "   - 定期备份数据库"
    echo ""
}

# 主函数
main() {
    local skip_checks="${1:-false}"
    
    if [[ "$skip_checks" != "--skip-checks" ]]; then
        check_services
        
        if ! wait_for_database; then
            log_error "数据库服务未就绪，初始化失败"
            exit 1
        fi
    else
        log_warning "跳过服务检查，直接执行初始化"
    fi
    
    # 检查是否已经初始化过
    if [[ -f "$PROJECT_ROOT/.initialized" ]]; then
        log_warning "系统已经初始化过，如需重新初始化请删除 .initialized 文件"
        echo ""
        show_post_init_instructions
        exit 0
    fi
    
    # 执行初始化步骤
    if init_database; then
        init_system_configs
        create_init_marker
        show_post_init_instructions
        log_success "服务器初始化完成！"
    else
        log_error "初始化失败，请检查错误信息"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "Wedding Client 服务器初始化脚本"
    echo ""
    echo "使用方法:"
    echo "  $0                 # 正常初始化（包含服务检查）"
    echo "  $0 --skip-checks   # 跳过服务检查，强制初始化"
    echo "  $0 --help          # 显示帮助信息"
    echo ""
    echo "功能:"
    echo "  - 检查和启动必要的Docker服务"
    echo "  - 等待数据库和API服务就绪"
    echo "  - 执行数据库结构初始化"
    echo "  - 执行系统配置初始化"
    echo "  - 创建默认管理员用户"
    echo "  - 生成初始化完成标记"
    echo ""
}

# 解析命令行参数
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --skip-checks)
        main "--skip-checks"
        ;;
    *)
        main
        ;;
esac
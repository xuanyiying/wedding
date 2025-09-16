#!/bin/bash

# =============================================================================
# Wedding Club 部署脚本 - 支持多环境部署
# =============================================================================
# 使用方法:
#   ./deploy.sh [环境] [操作] [选项]
#   
# 环境: dev, test, prod (默认: prod)
# 操作: deploy, stop, restart, logs, status, clean (默认: deploy)
# 选项: --force, --no-cache, --pull, --build-only
# 
# 示例:
#   ./deploy.sh prod deploy --force     # 强制部署生产环境
#   ./deploy.sh dev restart             # 重启开发环境
#   ./deploy.sh test logs               # 查看测试环境日志
# =============================================================================

set -euo pipefail

# =============================================================================
# 全局变量和配置
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 默认参数
ENVIRONMENT="${1:-prod}"
DB_HOST="wedding-service-mysql-"${ENVIRONMENT}
COMPOSE_FILE="docker-compose.yml"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认参数
ACTION="${2:-deploy}"
FORCE_FLAG=""
NO_CACHE_FLAG=""
PULL_FLAG=""
BUILD_ONLY_FLAG=""

# =============================================================================
# 工具函数
# =============================================================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    cat << EOF
Wedding Club 部署脚本

使用方法:
    $0 [环境] [操作] [选项]

环境:
    dev     - 开发环境
    test    - 测试环境  
    prod    - 生产环境 (默认)

操作:
    deploy  - 部署服务 (默认)
    stop    - 停止服务
    restart - 重启服务
    logs    - 查看日志
    status  - 查看状态
    clean   - 清理资源

选项:
    --force      - 强制重新构建和部署
    --no-cache   - 构建时不使用缓存
    --pull       - 拉取最新基础镜像
    --build-only - 仅构建，不启动服务
    --help       - 显示帮助信息

示例:
    $0 prod deploy --force
    $0 dev restart
    $0 test logs api
EOF
}

# 解析命令行参数
parse_args() {
    shift 2 2>/dev/null || true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE_FLAG="--force-recreate --remove-orphans"
                shift
                ;;
            --no-cache)
                NO_CACHE_FLAG="--no-cache"
                shift
                ;;
            --pull)
                PULL_FLAG="--pull"
                shift
                ;;
            --build-only)
                BUILD_ONLY_FLAG="true"
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# 验证环境
validate_environment() {
    case $ENVIRONMENT in
        dev|test|prod)
            log_info "使用环境: $ENVIRONMENT"
            ;;
        *)
            log_error "无效环境: $ENVIRONMENT"
            log_error "支持的环境: dev, test, prod"
            exit 1
            ;;
    esac
}

# 检查环境文件
check_env_file() {
    local env_file="./deployment/environments/.env.$ENVIRONMENT"
    
    if [[ ! -f "$env_file" ]]; then
        log_error "环境文件不存在: $env_file"
        exit 1
    fi
    
    log_info "使用环境文件: $env_file"
}

# 设置环境变量
setup_environment() {
    export ENVIRONMENT="$ENVIRONMENT"
    export COMPOSE_DB_HOST="${DB_HOST}"
    
    # 加载环境变量文件
    local env_file="./deployment/environments/.env.$ENVIRONMENT"
    if [[ -f "$env_file" ]]; then
        log_info "加载环境变量文件: $env_file"
        
        # 使用set -a自动导出变量，然后source文件
        set -a
        if source "$env_file"; then
            log_success "环境变量文件加载完成"
        else
            log_error "环境变量文件加载失败"
            set +a
            return 1
        fi
        set +a
    else
        log_error "环境变量文件不存在: $env_file"
        return 1
    fi
    
    # 设置Docker Compose文件
    export COMPOSE_FILE="$COMPOSE_FILE"
    
    log_info "项目名称: $COMPOSE_DB_HOST"
    log_info "环境: $ENVIRONMENT"
}

# 检查Docker和Docker Compose
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装或不在PATH中"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装或不在PATH中"
        exit 1
    fi
    
    # 优先使用 docker compose (v2)
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        DOCKER_COMPOSE="docker-compose"
    fi
    
    log_info "使用 Docker Compose: $DOCKER_COMPOSE"
}

# 创建必要目录
create_directories() {
    local dirs=(
        "./deployment/logs/nginx"
        "./deployment/logs/api"
        "./deployment/logs/mysql"
        "./deployment/logs/redis"
        "./deployment/logs/minio"
        "./deployment/uploads/images"
        "./deployment/uploads/videos"
        "./deployment/ssl"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_info "创建目录: $dir"
        fi
    done
}

# 构建镜像
build_images() {
    log_info "开始构建镜像..."
    
    # Docker Compose v2 使用 build.args 而不是 --build-arg 参数
    ENVIRONMENT=$ENVIRONMENT $DOCKER_COMPOSE build
    
    log_success "镜像构建完成"
}

# 数据库索引修复函数
clean_database_indexes() {
    local environment=$1
    
    log_info "开始清理数据库索引..."
    
    # 复制清理脚本到API容器
    local clean_script_path="server/scripts/clean-database-indexes.js"
    
    if [ ! -f "$clean_script_path" ]; then
        log_error "清理脚本不存在: $clean_script_path"
        return 1
    fi
    
    if ! docker cp "$clean_script_path" wedding-service-api-${environment}:/app/clean-database-indexes.js; then
        log_error "复制清理脚本到容器失败"
        return 1
    fi
    
    # 在容器中执行清理脚本
    log_info "在容器中执行数据库索引清理..."
    if docker exec wedding-service-api-${environment} node clean-database-indexes.js; then
        log_success "数据库索引清理完成"
        # 清理容器中的清理脚本
        docker exec wedding-service-api-${environment} rm -f /app/clean-database-indexes.js
        return 0
    else
        log_error "数据库索引清理失败"
        # 清理容器中的清理脚本
        docker exec wedding-service-api-${environment} rm -f /app/clean-database-indexes.js
        return 1
    fi
}

# 数据库初始化函数
init_database() {
    local environment=$1
    local max_retries=30
    local retry_count=0
    
    log_info "开始数据库初始化流程..."
    
    # 1. 等待数据库服务就绪
    log_info "等待数据库服务启动..."
    while [ $retry_count -lt $max_retries ]; do
        if docker exec ${DB_NAME}-mysql-${environment} mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "SELECT 1;" >/dev/null 2>&1; then
            log_success "数据库服务已就绪"
            break
        fi
        
        retry_count=$((retry_count + 1))
        log_info "等待数据库启动... (${retry_count}/${max_retries})"
        sleep 2
    done
    
    if [ $retry_count -eq $max_retries ]; then
        log_error "数据库服务启动超时"
        return 1
    fi
    
    # 2. 验证数据库和表结构
    log_info "验证数据库结构..."
    if ! docker exec ${DB_HOST}-mysql-${environment} mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "USE ${DB_NAME}; SHOW TABLES;" >/dev/null 2>&1; then
        log_error "数据库 ${DB_NAME} 不存在或表结构未创建"
        return 1
    fi
    
    # 获取表数量
    local table_count=$(docker exec ${DB_HOST}-mysql-${environment} mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "USE ${DB_NAME}; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';" -s -N 2>/dev/null)
    log_info "发现 ${table_count} 个数据表"
    
    # 3. 检查是否已初始化
    log_info "检查数据库初始化状态..."
    local admin_exists=$(docker exec ${DB_HOST}-mysql-${environment} mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "USE ${DB_NAME}; SELECT COUNT(*) FROM users WHERE username='admin';" -s -N 2>/dev/null || echo "0")
    
    if [ "$admin_exists" -gt "0" ]; then
        log_info "检测到管理员用户已存在，跳过数据初始化"
        validate_initialization_data "$environment"
        return $?
    fi
    
    # 4. 复制初始化脚本到容器
    log_info "准备数据库初始化脚本..."
    local init_script_path="server/scripts/database-data-init.sql"
    
    if [ ! -f "$init_script_path" ]; then
        log_error "初始化脚本不存在: $init_script_path"
        return 1
    fi
    
    # 创建临时脚本，替换数据库名称
    local temp_script="/tmp/database-init-${environment}.sql"
    sed "s/USE wedding_service;/USE ${DB_NAME};/g" "$init_script_path" > "$temp_script"
    
    if ! docker cp "$temp_script" ${DB_HOST}-mysql-${environment}:/tmp/init.sql; then
        log_error "复制初始化脚本到容器失败"
        rm -f "$temp_script"
        return 1
    fi
    
    rm -f "$temp_script"
    log_success "初始化脚本已准备就绪"
    
    # 4.1 清理数据库索引
    log_info "清理数据库索引..."
    if clean_database_indexes "$environment"; then
        log_success "数据库索引清理成功"
    else
        log_warning "数据库索引清理失败，继续执行数据库初始化"
    fi
    
    # 5. 执行数据库初始化
    log_info "执行数据库数据初始化..."
    local init_output
    init_output=$(docker exec ${DB_HOST}-mysql-${environment} mysql -u root -p${MYSQL_ROOT_PASSWORD} ${DB_NAME} -e "source /tmp/init.sql" 2>&1)
    local init_exit_code=$?
    
    if [ $init_exit_code -ne 0 ]; then
        log_error "数据库初始化执行失败:"
        echo "$init_output" | while IFS= read -r line; do
            log_error "  $line"
        done
        return 1
    fi
    
    # 6. 解析初始化结果
    log_info "解析初始化执行结果..."
    echo "$init_output" | while IFS= read -r line; do
        if [[ "$line" =~ ^[0-9]+$ ]] || [[ "$line" =~ "Data initialization completed successfully" ]] || [[ "$line" =~ "admin" ]]; then
            log_info "  $line"
        fi
    done
    
    # 7. 数据校验
    log_info "执行数据完整性校验..."
    if ! validate_initialization_data "$environment"; then
        log_error "数据校验失败"
        return 1
    fi
    
    # 8. 清理临时文件
    docker exec ${DB_HOST}-mysql-${environment} rm -f /tmp/init.sql >/dev/null 2>&1
    
    log_success "数据库初始化流程完成"
    return 0
}

# 数据校验函数
validate_initialization_data() {
    local environment=$1
    local validation_failed=0
    
    log_info "开始数据完整性校验..."
    
    # 校验管理员用户
    local admin_count=$(docker exec ${DB_HOST}-mysql-${environment} mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "USE ${DB_NAME}; SELECT COUNT(*) FROM users WHERE username='admin' AND role='super_admin';" -s -N 2>/dev/null || echo "0")
    if [ "$admin_count" -eq "1" ]; then
        log_success "✓ 管理员用户校验通过"
    else
        log_error "✗ 管理员用户校验失败 (期望:1, 实际:$admin_count)"
        validation_failed=1
    fi
    
    # 校验系统配置
    local config_count=$(docker exec ${DB_HOST}-mysql-${environment} mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "USE ${DB_NAME}; SELECT COUNT(*) FROM system_configs;" -s -N 2>/dev/null || echo "0")
    if [ "$config_count" -ge "5" ]; then
        log_success "✓ 系统配置校验通过 ($config_count 项配置)"
    else
        log_error "✗ 系统配置校验失败 (期望:>=5, 实际:$config_count)"
        validation_failed=1
    fi
    
    # 校验用户权限
    local permission_count=$(docker exec ${DB_HOST}-mysql-${environment} mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "USE ${DB_NAME}; SELECT COUNT(*) FROM user_permissions WHERE user_id='1';" -s -N 2>/dev/null || echo "0")
    if [ "$permission_count" -ge "30" ]; then
        log_success "✓ 用户权限校验通过 ($permission_count 个权限)"
    else
        log_error "✗ 用户权限校验失败 (期望:>=30, 实际:$permission_count)"
        validation_failed=1
    fi
    
    # 校验关键配置项
    local site_name=$(docker exec ${DB_HOST}-mysql-${environment} mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "USE ${DB_NAME}; SELECT config_value FROM system_configs WHERE config_key='site_name';" -s -N 2>/dev/null || echo "")
    if [ -n "$site_name" ]; then
        log_success "✓ 网站配置校验通过 (site_name: $site_name)"
    else
        log_error "✗ 网站配置校验失败 (site_name 配置缺失)"
        validation_failed=1
    fi
    
    # 输出详细统计信息
    log_info "数据库初始化统计信息:"
    local stats_output=$(docker exec ${DB_HOST}-mysql-${environment} mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "
        USE ${DB_NAME};
        SELECT 'Users' as table_name, COUNT(*) as count FROM users
        UNION ALL
        SELECT 'System Configs' as table_name, COUNT(*) as count FROM system_configs
        UNION ALL
        SELECT 'User Permissions' as table_name, COUNT(*) as count FROM user_permissions;
    " -s -N 2>/dev/null)
    
    echo "$stats_output" | while IFS=$'\t' read -r table_name count; do
        log_info "  $table_name: $count"
    done
    
    if [ $validation_failed -eq 0 ]; then
        log_success "所有数据校验通过"
        return 0
    else
        log_error "数据校验存在失败项"
        return 1
    fi
}

# 部署服务
deploy_services() {
    log_info "开始部署服务..."
    
    # 如果只构建不启动
    if [[ "$BUILD_ONLY_FLAG" == "true" ]]; then
        log_success "仅构建模式，跳过服务启动"
        return 0
    fi
    
    local up_args="-d"
    
    if [[ -n "$FORCE_FLAG" ]]; then
        up_args="$up_args $FORCE_FLAG"
    fi
    
    $DOCKER_COMPOSE up $up_args
    
    log_success "服务部署完成"
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    check_services_health
    
    # 执行数据库初始化
    log_info "开始数据库初始化检查..."
    if init_database "$ENVIRONMENT"; then
        log_success "数据库初始化完成"
    else
        log_error "数据库初始化失败，但服务已启动"
        log_info "可以稍后手动执行数据库初始化"
        return 1
    fi
}

# 检查服务健康状态
check_services_health() {
    log_info "检查服务健康状态..."
    
    local services=("web" "api" "mysql" "redis")
    local failed_services=()
    
    for service in "${services[@]}"; do
        local container_name="${DB_HOST}-${service}-${ENVIRONMENT}"
        
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name.*healthy\|Up"; then
            log_success "✓ $service 服务运行正常"
        else
            log_warning "✗ $service 服务可能存在问题"
            failed_services+=("$service")
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        log_warning "以下服务可能需要检查: ${failed_services[*]}"
        log_info "使用 '$0 $ENVIRONMENT logs [服务名]' 查看详细日志"
    fi
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    $DOCKER_COMPOSE down
    log_success "服务已停止"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    $DOCKER_COMPOSE restart
    log_success "服务已重启"
    
    # 检查服务状态
    sleep 5
    check_services_health
}

# 查看日志
show_logs() {
    local service="${3:-}"
    
    if [[ -n "$service" ]]; then
        log_info "查看 $service 服务日志..."
        $DOCKER_COMPOSE logs -f --tail=100 "$service"
    else
        log_info "查看所有服务日志..."
        $DOCKER_COMPOSE logs -f --tail=50
    fi
}

# 查看状态
show_status() {
    log_info "服务状态:"
    $DOCKER_COMPOSE ps
    
    echo
    log_info "系统资源使用:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# 清理资源
clean_resources() {
    log_warning "这将删除所有容器、镜像和数据卷！"
    read -p "确认继续? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "清理资源..."
        
        # 停止并删除容器
        $DOCKER_COMPOSE down -v --remove-orphans
        
        # 删除镜像
        docker images | grep "$DB_HOST" | awk '{print $3}' | xargs -r docker rmi -f
        
        # 清理未使用的资源
        docker system prune -f
        
        log_success "资源清理完成"
    else
        log_info "取消清理操作"
    fi
}

# =============================================================================
# 主函数
# =============================================================================
main() {
    log_info "Wedding Club 部署脚本启动"
    log_info "时间: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # 解析参数
    parse_args "$@"
    
    # 验证环境
    validate_environment
    
    # 检查依赖
    check_dependencies
    
    # 检查环境文件
    check_env_file
    
    # 设置环境变量
    setup_environment
    
    # 创建必要目录
    create_directories
    
    # 执行操作
    case $ACTION in
        deploy)
            build_images
            deploy_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            show_logs "$@"
            ;;
        status)
            show_status
            ;;
        clean)
            clean_resources
            ;;
        *)
            log_error "无效操作: $ACTION"
            show_usage
            exit 1
            ;;
    esac
    
    log_success "操作完成: $ACTION ($ENVIRONMENT)"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
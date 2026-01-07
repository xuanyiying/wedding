#!/bin/bash

# =============================================================================
# Wedding Club 部署脚本 - 支持多环境部署（优化版）
# =============================================================================
# 使用方法:
#   ./deploy.sh [环境] [操作] [选项]
#   
# 环境: dev, test, prod (默认: prod)
# 操作: deploy, stop, restart, logs, status, clean (默认: deploy)
# 选项: --force, --no-cache, --pull, --build-only, --skip-build, --services
# 
# 示例:
#   ./deploy.sh prod deploy --force     # 强制部署生产环境
#   ./deploy.sh dev restart             # 重启开发环境
#   ./deploy.sh dev deploy --skip-build # 开发环境跳过构建
#   ./deploy.sh test logs               # 查看测试环境日志
# =============================================================================

set -euo pipefail

# =============================================================================
# 全局变量和配置
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 默认参数
ENVIRONMENT="${1:-prod}"
PROJECT_NAME="wedding-service"
COMPOSE_FILE="docker-compose.yml"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默认参数
ACTION="${2:-deploy}"
FORCE_FLAG=""
NO_CACHE_FLAG=""
PULL_FLAG=""
BUILD_ONLY_FLAG=""
SKIP_BUILD_FLAG=""
SERVICES_FLAG=""

# 开发环境特殊配置
DEV_SKIP_SERVICES=("api" "web" "nginx")  # dev环境默认跳过构建的服务
DEV_AVAILABLE_SERVICES=("mysql" "redis" "minio")  # dev环境可用的服务

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

log_dev() {
    echo -e "${PURPLE}[DEV]${NC} $1"
}

log_build() {
    echo -e "${CYAN}[BUILD]${NC} $1"
}

show_usage() {
    cat << EOF
Wedding Club 部署脚本 - 优化版

使用方法:
    $0 [环境] [操作] [选项]

环境:
    dev     - 开发环境 (默认跳过api和web构建)
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
    --force         - 强制重新构建和部署
    --no-cache      - 构建时不使用缓存
    --pull          - 拉取最新基础镜像
    --build-only    - 仅构建，不启动服务
    --skip-build    - 跳过构建步骤（适用于dev环境）
    --services      - 指定要操作的服务（逗号分隔）
    --help          - 显示帮助信息

开发环境特殊功能:
    # 跳过api和web构建，仅启动基础服务
    $0 dev deploy --skip-build
    
    # 仅启动指定服务
    $0 dev deploy --services mysql,redis,minio
    
    # 强制构建所有服务（包括api和web）
    $0 dev deploy --force

示例:
    $0 prod deploy --force
    $0 dev deploy --skip-build
    $0 dev restart --services mysql,redis
    $0 test logs api
EOF
}

# 解析命令行参数
parse_args() {
    shift 2 2>/dev/null || true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE_FLAG="true"
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
            --skip-build)
                SKIP_BUILD_FLAG="true"
                shift
                ;;
            --services)
                SERVICES_FLAG="$2"
                shift 2
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
            
            # 开发环境特殊提示
            if [[ "$ENVIRONMENT" == "dev" ]]; then
                log_dev "开发环境模式已启用"
                if [[ -z "$SKIP_BUILD_FLAG" && -z "$FORCE_FLAG" ]]; then
                    log_dev "提示: 使用 --skip-build 可跳过api和web构建，加快部署速度"
                fi
            fi
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
        
        # 临时关闭 -u (unbound variable) 检查，以允许环境文件中的变量替换
        set +u
        # 使用set -a自动导出变量，然后source文件
        set -a
        if source "$env_file"; then
            log_success "环境变量文件加载完成"
        else
            log_error "环境变量文件加载失败"
            set +a
            set -u
            return 1
        fi
        set +a
        set -u
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
        "./deployment/logs/loki"
        "./deployment/logs/grafana"
        "./deployment/loki/chunks"
        "./deployment/loki/boltdb-shipper-active"
        "./deployment/loki/boltdb-shipper-cache"
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
    
    # 设置 Loki 目录权限
    if [[ -d "./deployment/loki" ]]; then
        chmod -R 777 ./deployment/loki 2>/dev/null || true
        chmod -R 777 ./deployment/logs/loki 2>/dev/null || true
        chmod -R 777 ./deployment/logs/grafana 2>/dev/null || true
    fi
}

# 检查是否需要跳过服务构建
should_skip_service_build() {
    local service="$1"
    
    # 如果强制构建，不跳过任何服务
    if [[ "$FORCE_FLAG" == "true" ]]; then
        return 1
    fi
    
    # 如果明确指定跳过构建
    if [[ -n "$SKIP_BUILD_FLAG" ]]; then
        return 0
    fi
    
    # 开发环境默认跳过api和web构建
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        for skip_service in "${DEV_SKIP_SERVICES[@]}"; do
            if [[ "$service" == "$skip_service" ]]; then
                return 0
            fi
        done
    fi
    
    return 1
}

# 获取需要构建的服务列表
get_build_services() {
    local all_services=("web" "api")
    local build_services=()
    
    for service in "${all_services[@]}"; do
        if ! should_skip_service_build "$service"; then
            build_services+=("$service")
        fi
    done
    
    # 确保总是返回数组，即使为空
    echo "${build_services[@]:-}"
}

# 获取需要启动的服务列表
get_deploy_services() {
    if [[ -n "$SERVICES_FLAG" ]]; then
        # 用户指定的服务列表
        echo "$SERVICES_FLAG" | tr ',' ' '
    elif [[ "$ENVIRONMENT" == "dev" && -n "$SKIP_BUILD_FLAG" ]]; then
        # 开发环境跳过构建时，只启动基础服务
        echo "${DEV_AVAILABLE_SERVICES[@]}"
    else
        # 默认启动所有服务
        echo ""
    fi
}

# 构建镜像
build_images() {
    local build_services
    build_services=($(get_build_services))
    
    if [[ ${#build_services[@]} -eq 0 ]]; then
        log_dev "跳过所有服务构建"
        log_dev "跳过的服务: ${DEV_SKIP_SERVICES[*]}"
        log_dev "原因: 开发环境默认跳过api和web构建以加快部署速度"
        return 0
    fi
    
    log_build "开始构建镜像..."
    log_build "构建服务: ${build_services[*]}"
    
    # 显示跳过的服务
    local all_services=("web" "api")
    local skipped_services=()
    for service in "${all_services[@]}"; do
        if should_skip_service_build "$service"; then
            skipped_services+=("$service")
        fi
    done
    
    if [[ ${#skipped_services[@]} -gt 0 ]]; then
        log_dev "跳过构建的服务: ${skipped_services[*]}"
        if [[ "$ENVIRONMENT" == "dev" ]]; then
            log_dev "提示: 使用 --force 可强制构建所有服务"
        fi
    fi
    
    # 构建指定的服务
    local build_args=""
    if [[ -n "$NO_CACHE_FLAG" ]]; then
        build_args="$build_args $NO_CACHE_FLAG"
    fi
    if [[ -n "$PULL_FLAG" ]]; then
        build_args="$build_args $PULL_FLAG"
    fi
    
    for service in "${build_services[@]}"; do
        log_build "构建服务: $service"
        ENVIRONMENT=$ENVIRONMENT $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" build $build_args "$service"
    done
    
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
    local mysql_container="${PROJECT_NAME}-mysql-${environment}"
    
    log_info "开始数据库初始化流程..."
    
    # 1. 等待数据库服务就绪
    log_info "等待数据库服务启动并进入就绪状态..."
    while [ $retry_count -lt $max_retries ]; do
        if docker exec ${mysql_container} mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD} --silent >/dev/null 2>&1; then
            log_success "数据库服务已连接"
            break
        fi
        
        retry_count=$((retry_count + 1))
        log_info "等待数据库就绪... (${retry_count}/${max_retries})"
        sleep 2
    done
    
    if [ $retry_count -eq $max_retries ]; then
        log_error "数据库服务就绪超时"
        return 1
    fi
    
    # 2. 检查并创建数据库
    log_info "检查数据库 ${DB_NAME} 是否存在..."
    docker exec ${mysql_container} mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
    # 3. 检查表结构是否存在
    log_info "验证数据库表结构..."
    local table_count=$(docker exec ${mysql_container} mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';" -s -N 2>/dev/null || echo "0")
    
    # 如果表数量较少（如少于10个），认为需要执行初始化脚本
    if [ "$table_count" -lt "10" ]; then
        log_warning "检测到表结构不完整 (当前表数量: ${table_count})，准备执行完整初始化..."
        
        local init_script_path="server/scripts/database-init.sql"
        if [ ! -f "$init_script_path" ]; then
            log_error "初始化脚本不存在: $init_script_path"
            return 1
        fi
        
        # 复制并执行初始化脚本
        if ! docker cp "$init_script_path" ${mysql_container}:/tmp/database-init.sql; then
            log_error "复制初始化脚本到容器失败"
            return 1
        fi
        
        log_info "执行初始化脚本..."
        if ! docker exec ${mysql_container} mysql -u root -p${MYSQL_ROOT_PASSWORD} ${DB_NAME} -e "source /tmp/database-init.sql" >/dev/null 2>&1; then
            log_error "执行初始化脚本失败"
            return 1
        fi
        log_success "表结构初始化完成"
    else
        log_info "表结构已存在 (当前表数量: ${table_count})，跳过完整初始化"
    fi
    
    # 4. 确保超级管理员数据存在（幂等操作）
    log_info "确保超级管理员账号已初始化..."
    # 注意：database-init.sql 中已经包含了 INSERT IGNORE INTO users 逻辑
    # 如果需要额外确保，可以在这里执行特定的 SQL
    
    # 5. 执行健康检查
    if health_check_database "$environment"; then
        log_success "数据库初始化与健康检查通过"
        return 0
    else
        log_error "数据库健康检查失败"
        return 1
    fi
}

# 数据库健康检查函数
health_check_database() {
    local environment=$1
    local check_failed=0
    local mysql_container="${PROJECT_NAME}-mysql-${environment}"
    
    log_info "执行数据库深度健康检查..."
    
    # 检查核心表是否存在
    local core_tables=("users" "schedules" "works" "contacts" "teams")
    for table in "${core_tables[@]}"; do
        if ! docker exec ${mysql_container} mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "USE ${DB_NAME}; DESCRIBE \`${table}\`;" >/dev/null 2>&1; then
            log_error "✗ 核心表缺失: ${table}"
            check_failed=1
        fi
    done
    
    # 检查超级管理员是否存在
    local admin_exists=$(docker exec ${mysql_container} mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "USE ${DB_NAME}; SELECT COUNT(*) FROM users WHERE role='super_admin';" -s -N 2>/dev/null || echo "0")
    if [ "$admin_exists" -gt "0" ]; then
        log_success "✓ 超级管理员账号校验通过"
    else
        log_error "✗ 未发现超级管理员账号"
        check_failed=1
    fi
    
    return $check_failed
}

# 部署服务
deploy_services() {
    log_info "开始部署服务..."
    
    # 如果只构建不启动
    if [[ "$BUILD_ONLY_FLAG" == "true" ]]; then
        log_success "仅构建模式，跳过服务启动"
        return 0
    fi
    
    # 强制模式下，只停止应用容器（保留数据库容器）
    if [[ -n "$FORCE_FLAG" ]]; then
        log_warning "强制模式：停止应用容器和日志容器..."
        $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" stop api web nginx loki promtail grafana 2>/dev/null || true
        $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" rm -f api web nginx loki promtail grafana 2>/dev/null || true
        sleep 2
    fi
    
    local up_args="-d"
    local deploy_services=($(get_deploy_services))
    
    if [[ -n "$FORCE_FLAG" ]]; then
        up_args="$up_args --remove-orphans"
    fi
    
    # 显示部署信息
    if [[ ${#deploy_services[@]} -gt 0 ]]; then
        log_info "部署指定服务: ${deploy_services[*]}"
        $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" up $up_args "${deploy_services[@]}"
    else
        log_info "部署所有服务"
        $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" up $up_args
    fi
    
    log_success "服务部署完成"
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    check_services_health
    
    # 执行数据库初始化（仅当MySQL服务启动时）
    if [[ ${#deploy_services[@]} -eq 0 ]] || [[ " ${deploy_services[*]} " =~ " mysql " ]]; then
        log_info "开始数据库初始化检查..."
        if init_database "$ENVIRONMENT"; then
            log_success "数据库初始化完成"
        else
            log_error "数据库初始化失败，但服务已启动"
            log_info "可以稍后手动执行数据库初始化"
            return 1
        fi
    else
        log_dev "跳过数据库初始化 (MySQL服务未启动)"
    fi
}

# 检查服务健康状态
check_services_health() {
    log_info "检查服务健康状态..."
    
    local services=("web" "api" "mysql" "redis" "minio" "nginx")
    local failed_services=()
    local deploy_services=($(get_deploy_services))
    
    for service in "${services[@]}"; do
        # 如果指定了服务列表，只检查指定的服务
        if [[ ${#deploy_services[@]} -gt 0 ]] && [[ ! " ${deploy_services[*]} " =~ " ${service} " ]]; then
            continue
        fi
        
        local container_name="${PROJECT_NAME}-${service}-${ENVIRONMENT}"
        
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
    local services=($(get_deploy_services))
    
    if [[ ${#services[@]} -gt 0 ]]; then
        log_info "停止指定服务: ${services[*]}"
        $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" stop "${services[@]}"
    else
        log_info "停止所有服务..."
        $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" down
    fi
    
    log_success "服务已停止"
}

# 重启服务
restart_services() {
    local services=($(get_deploy_services))
    
    if [[ ${#services[@]} -gt 0 ]]; then
        log_info "重启指定服务: ${services[*]}"
        $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" restart "${services[@]}"
    else
        log_info "重启所有服务..."
        $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" restart
    fi
    
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
        $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" logs -f --tail=100 "$service"
    else
        local services=($(get_deploy_services))
        if [[ ${#services[@]} -gt 0 ]]; then
            log_info "查看指定服务日志: ${services[*]}"
            $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" logs -f --tail=50 "${services[@]}"
        else
            log_info "查看所有服务日志..."
            $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" logs -f --tail=50
        fi
    fi
}

# 查看状态
show_status() {
    log_info "服务状态:"
    $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" ps
    
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
        $DOCKER_COMPOSE --env-file "./deployment/environments/.env.$ENVIRONMENT" down -v --remove-orphans
        
        # 删除镜像
        docker images | grep "$DB_HOST" | awk '{print $3}' | xargs -r docker rmi -f
        
        # 清理未使用的资源
        docker system prune -f
        
        log_success "资源清理完成"
    else
        log_info "取消清理操作"
    fi
}

# 显示环境摘要
show_environment_summary() {
    echo
    log_info "=== 部署环境摘要 ==="
    log_info "环境: $ENVIRONMENT"
    log_info "操作: $ACTION"
    
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        log_dev "开发环境特殊配置:"
        if [[ -n "$SKIP_BUILD_FLAG" || (-z "$FORCE_FLAG" && -z "$BUILD_ONLY_FLAG") ]]; then
            log_dev "  - 跳过构建: ${DEV_SKIP_SERVICES[*]}"
        fi
        
        local deploy_services=($(get_deploy_services))
        if [[ ${#deploy_services[@]} -gt 0 ]]; then
            log_dev "  - 启动服务: ${deploy_services[*]}"
        else
            log_dev "  - 启动服务: 所有服务"
        fi
    fi
    
    if [[ "$FORCE_FLAG" == "true" ]]; then
        log_warning "强制模式: 将停止旧容器并重新构建所有服务"
    fi
    
    if [[ -n "$SKIP_BUILD_FLAG" ]]; then
        log_dev "跳过构建模式: 不构建任何服务"
    fi
    
    echo
}

# =============================================================================
# 主函数
# =============================================================================
main() {
    log_info "Wedding Club 部署脚本启动 - 优化版"
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

    # 显示环境摘要
    show_environment_summary
    
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
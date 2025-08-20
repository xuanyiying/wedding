#!/bin/bash

# ========================================
# Wedding Client - 生产环境启动脚本
# ========================================

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 错误处理
error_exit() {
    log_error "$1"
    exit 1
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        error_exit "Docker 未安装，请先安装 Docker"
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error_exit "Docker Compose 未安装，请先安装 Docker Compose"
    fi
    
    # 检查Docker服务状态
    if ! docker info &> /dev/null; then
        error_exit "Docker 服务未运行，请启动 Docker 服务"
    fi
    
    log_success "系统依赖检查完成"
}

# 检查配置文件
check_config_files() {
    log_info "检查配置文件..."
    
    local config_files=(
        "docker-compose-production.yml"
        ".env.production"
        "nginx/nginx-prod.conf"
    )
    
    for file in "${config_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error_exit "配置文件 $file 不存在"
        fi
    done
    
    log_success "配置文件检查完成"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    local directories=(
        "logs"
        "data/mysql"
        "data/redis"
        "data/minio"
        "backups"
        "ssl"
    )
    
    for dir in "${directories[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_info "创建目录: $dir"
        fi
    done
    
    # 设置目录权限
    chmod 755 logs data backups ssl
    chmod 700 data/mysql data/redis data/minio
    
    log_success "目录创建完成"
}

# 拉取最新镜像
pull_images() {
    log_info "拉取最新Docker镜像..."
    
    if docker compose version &> /dev/null; then
        docker compose -f docker-compose-production.yml pull
    else
        docker-compose -f docker-compose-production.yml pull
    fi
    
    log_success "镜像拉取完成"
}

# 停止现有服务
stop_existing_services() {
    log_info "停止现有服务..."
    
    if docker compose version &> /dev/null; then
        docker compose -f docker-compose-production.yml down --remove-orphans || true
    else
        docker-compose -f docker-compose-production.yml down --remove-orphans || true
    fi
    
    log_success "现有服务已停止"
}

# 清理未使用的资源
cleanup_resources() {
    log_info "清理未使用的Docker资源..."
    
    # 清理未使用的镜像
    docker image prune -f || true
    
    # 清理未使用的网络
    docker network prune -f || true
    
    # 清理未使用的卷（谨慎使用）
    # docker volume prune -f || true
    
    log_success "资源清理完成"
}

# 启动服务
start_services() {
    log_info "启动生产环境服务..."
    
    if docker compose version &> /dev/null; then
        docker compose -f docker-compose-production.yml up -d
    else
        docker-compose -f docker-compose-production.yml up -d
    fi
    
    log_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    local max_attempts=60
    local attempt=0
    
    # 等待MySQL
    log_info "等待MySQL服务..."
    while ! docker exec wedding-mysql-prod mysqladmin ping -h localhost --silent 2>/dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            error_exit "MySQL服务启动超时"
        fi
        sleep 2
    done
    log_success "MySQL服务就绪"
    
    # 等待Redis
    log_info "等待Redis服务..."
    attempt=0
    while ! docker exec wedding-redis-prod redis-cli ping 2>/dev/null | grep -q PONG; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            error_exit "Redis服务启动超时"
        fi
        sleep 2
    done
    log_success "Redis服务就绪"
    
    # 等待MinIO
    log_info "等待MinIO服务..."
    attempt=0
    while ! curl -f http://localhost:9000/minio/health/live 2>/dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            error_exit "MinIO服务启动超时"
        fi
        sleep 2
    done
    log_success "MinIO服务就绪"
    
    # 等待API服务
    log_info "等待API服务..."
    attempt=0
    while ! curl -f http://localhost:3000/health 2>/dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            error_exit "API服务启动超时"
        fi
        sleep 3
    done
    log_success "API服务就绪"
    
    # 等待Web服务
    log_info "等待Web服务..."
    attempt=0
    while ! curl -f http://localhost:80/health 2>/dev/null; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            error_exit "Web服务启动超时"
        fi
        sleep 2
    done
    log_success "Web服务就绪"
    
    log_success "所有服务已就绪"
}

# 显示服务状态
show_service_status() {
    log_info "服务状态:"
    
    if docker compose version &> /dev/null; then
        docker compose -f docker-compose-production.yml ps
    else
        docker-compose -f docker-compose-production.yml ps
    fi
    
    echo ""
    log_info "服务访问地址:"
    echo "  - Web应用: http://localhost"
    echo "  - API服务: http://localhost:3000"
    echo "  - MinIO控制台: http://localhost:9001"
    echo "  - MySQL: localhost:3306"
    echo "  - Redis: localhost:6379"
}

# 显示日志
show_logs() {
    log_info "显示服务日志 (按 Ctrl+C 退出):"
    
    if docker compose version &> /dev/null; then
        docker compose -f docker-compose-production.yml logs -f
    else
        docker-compose -f docker-compose-production.yml logs -f
    fi
}

# 主函数
main() {
    echo "========================================"
    echo "Wedding Client - 生产环境启动脚本"
    echo "========================================"
    echo ""
    
    # 切换到脚本所在目录
    cd "$(dirname "$0")"
    
    # 检查参数
    local show_logs_flag=false
    local force_rebuild=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --logs)
                show_logs_flag=true
                shift
                ;;
            --rebuild)
                force_rebuild=true
                shift
                ;;
            --help|-h)
                echo "用法: $0 [选项]"
                echo "选项:"
                echo "  --logs     启动后显示日志"
                echo "  --rebuild  强制重新构建镜像"
                echo "  --help     显示帮助信息"
                exit 0
                ;;
            *)
                error_exit "未知参数: $1"
                ;;
        esac
    done
    
    # 执行启动流程
    check_dependencies
    check_config_files
    create_directories
    
    if [[ "$force_rebuild" == true ]]; then
        log_info "强制重新构建镜像..."
        if docker compose version &> /dev/null; then
            docker compose -f docker-compose-production.yml build --no-cache
        else
            docker-compose -f docker-compose-production.yml build --no-cache
        fi
    fi
    
    pull_images
    stop_existing_services
    cleanup_resources
    start_services
    wait_for_services
    show_service_status
    
    echo ""
    log_success "生产环境启动完成！"
    echo ""
    
    if [[ "$show_logs_flag" == true ]]; then
        show_logs
    else
        log_info "使用 'docker-compose -f docker-compose-production.yml logs -f' 查看日志"
        log_info "使用 '$0 --logs' 启动并显示日志"
    fi
}

# 信号处理
trap 'log_warning "脚本被中断"; exit 1' INT TERM

# 执行主函数
main "$@"
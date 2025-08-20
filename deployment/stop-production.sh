#!/bin/bash

# ========================================
# Wedding Client - 生产环境停止脚本
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

# 检查Docker Compose
check_docker_compose() {
    if ! command -v docker &> /dev/null; then
        error_exit "Docker 未安装"
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error_exit "Docker Compose 未安装"
    fi
}

# 显示当前服务状态
show_current_status() {
    log_info "当前服务状态:"
    
    if docker compose version &> /dev/null; then
        docker compose -f docker-compose-production.yml ps 2>/dev/null || log_warning "无法获取服务状态"
    else
        docker-compose -f docker-compose-production.yml ps 2>/dev/null || log_warning "无法获取服务状态"
    fi
    echo ""
}

# 优雅停止服务
graceful_stop() {
    log_info "优雅停止服务..."
    
    # 首先停止Web服务（停止接收新请求）
    log_info "停止Web服务..."
    docker stop wedding-web-prod 2>/dev/null || log_warning "Web服务可能已经停止"
    
    # 等待一段时间让现有请求处理完成
    log_info "等待现有请求处理完成..."
    sleep 5
    
    # 停止API服务
    log_info "停止API服务..."
    docker stop wedding-api-prod 2>/dev/null || log_warning "API服务可能已经停止"
    
    # 等待API服务完全停止
    sleep 3
    
    # 停止数据库服务
    log_info "停止数据库服务..."
    docker stop wedding-mysql-prod 2>/dev/null || log_warning "MySQL服务可能已经停止"
    docker stop wedding-redis-prod 2>/dev/null || log_warning "Redis服务可能已经停止"
    docker stop wedding-minio-prod 2>/dev/null || log_warning "MinIO服务可能已经停止"
    
    log_success "服务优雅停止完成"
}

# 强制停止服务
force_stop() {
    log_warning "强制停止所有服务..."
    
    if docker compose version &> /dev/null; then
        docker compose -f docker-compose-production.yml down --timeout 30
    else
        docker-compose -f docker-compose-production.yml down --timeout 30
    fi
    
    log_success "服务强制停止完成"
}

# 停止并移除容器
stop_and_remove() {
    log_info "停止并移除容器..."
    
    if docker compose version &> /dev/null; then
        docker compose -f docker-compose-production.yml down --remove-orphans
    else
        docker-compose -f docker-compose-production.yml down --remove-orphans
    fi
    
    log_success "容器停止并移除完成"
}

# 停止、移除容器和卷
stop_remove_volumes() {
    log_warning "停止并移除容器和数据卷（这将删除所有数据！）..."
    
    read -p "确定要删除所有数据吗？这个操作不可逆！(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if docker compose version &> /dev/null; then
            docker compose -f docker-compose-production.yml down --volumes --remove-orphans
        else
            docker-compose -f docker-compose-production.yml down --volumes --remove-orphans
        fi
        log_success "容器和数据卷移除完成"
    else
        log_info "操作已取消"
    fi
}

# 备份数据
backup_data() {
    log_info "备份数据..."
    
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # 备份MySQL数据
    if docker ps | grep -q wedding-mysql-prod; then
        log_info "备份MySQL数据..."
        docker exec wedding-mysql-prod mysqldump -u root -p"${MYSQL_ROOT_PASSWORD:-wedding123}" --all-databases > "$backup_dir/mysql_backup.sql" 2>/dev/null || log_warning "MySQL备份失败"
    fi
    
    # 备份Redis数据
    if docker ps | grep -q wedding-redis-prod; then
        log_info "备份Redis数据..."
        docker exec wedding-redis-prod redis-cli BGSAVE >/dev/null 2>&1 || log_warning "Redis备份失败"
        sleep 2
        docker cp wedding-redis-prod:/data/dump.rdb "$backup_dir/redis_dump.rdb" 2>/dev/null || log_warning "Redis数据复制失败"
    fi
    
    # 备份MinIO数据
    if [[ -d "data/minio" ]]; then
        log_info "备份MinIO数据..."
        cp -r data/minio "$backup_dir/" 2>/dev/null || log_warning "MinIO数据备份失败"
    fi
    
    # 备份配置文件
    log_info "备份配置文件..."
    cp docker-compose-production.yml "$backup_dir/" 2>/dev/null || true
    cp .env.production "$backup_dir/" 2>/dev/null || true
    cp -r nginx "$backup_dir/" 2>/dev/null || true
    
    log_success "数据备份完成: $backup_dir"
}

# 清理未使用的资源
cleanup_resources() {
    log_info "清理未使用的Docker资源..."
    
    # 清理停止的容器
    docker container prune -f || true
    
    # 清理未使用的镜像
    docker image prune -f || true
    
    # 清理未使用的网络
    docker network prune -f || true
    
    log_success "资源清理完成"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --graceful    优雅停止服务（默认）"
    echo "  --force       强制停止服务"
    echo "  --remove      停止并移除容器"
    echo "  --volumes     停止并移除容器和数据卷（危险！）"
    echo "  --backup      停止前备份数据"
    echo "  --cleanup     停止后清理未使用的资源"
    echo "  --help        显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                    # 优雅停止服务"
    echo "  $0 --backup --remove  # 备份数据后停止并移除容器"
    echo "  $0 --force --cleanup  # 强制停止并清理资源"
}

# 主函数
main() {
    echo "========================================"
    echo "Wedding Client - 生产环境停止脚本"
    echo "========================================"
    echo ""
    
    # 切换到脚本所在目录
    cd "$(dirname "$0")"
    
    # 检查配置文件
    if [[ ! -f "docker-compose-production.yml" ]]; then
        error_exit "docker-compose-production.yml 文件不存在"
    fi
    
    # 加载环境变量
    if [[ -f ".env.production" ]]; then
        set -a
        source .env.production
        set +a
    fi
    
    # 解析参数
    local stop_mode="graceful"
    local backup_data_flag=false
    local cleanup_flag=false
    
    if [[ $# -eq 0 ]]; then
        stop_mode="graceful"
    fi
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --graceful)
                stop_mode="graceful"
                shift
                ;;
            --force)
                stop_mode="force"
                shift
                ;;
            --remove)
                stop_mode="remove"
                shift
                ;;
            --volumes)
                stop_mode="volumes"
                shift
                ;;
            --backup)
                backup_data_flag=true
                shift
                ;;
            --cleanup)
                cleanup_flag=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                error_exit "未知参数: $1"
                ;;
        esac
    done
    
    # 检查依赖
    check_docker_compose
    
    # 显示当前状态
    show_current_status
    
    # 备份数据（如果需要）
    if [[ "$backup_data_flag" == true ]]; then
        backup_data
    fi
    
    # 根据模式停止服务
    case $stop_mode in
        "graceful")
            graceful_stop
            ;;
        "force")
            force_stop
            ;;
        "remove")
            stop_and_remove
            ;;
        "volumes")
            stop_remove_volumes
            ;;
    esac
    
    # 清理资源（如果需要）
    if [[ "$cleanup_flag" == true ]]; then
        cleanup_resources
    fi
    
    echo ""
    log_success "生产环境停止完成！"
    
    # 显示最终状态
    log_info "最终状态:"
    if docker compose version &> /dev/null; then
        docker compose -f docker-compose-production.yml ps 2>/dev/null || log_info "没有运行的服务"
    else
        docker-compose -f docker-compose-production.yml ps 2>/dev/null || log_info "没有运行的服务"
    fi
}

# 信号处理
trap 'log_warning "脚本被中断"; exit 1' INT TERM

# 执行主函数
main "$@"
#!/bin/bash

# 本地开发环境启动脚本
# 作者: Wedding Club Team
# 版本: 1.0.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        log_info "安装地址: https://www.docker.com/get-started"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        log_info "安装地址: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    log_success "Docker 和 Docker Compose 已安装"
}

# 检查Docker服务是否运行
check_docker_service() {
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行，请启动 Docker"
        exit 1
    fi
    
    log_success "Docker 服务正在运行"
}

# 创建环境变量文件
setup_env() {
    if [ ! -f ".env" ]; then
        if [ -f ".env.local" ]; then
            cp .env.local .env
            log_success "已创建 .env 文件"
        else
            log_warning ".env.local 文件不存在，请手动创建 .env 文件"
        fi
    else
        log_info ".env 文件已存在"
    fi
}

# 停止现有服务
stop_services() {
    log_info "停止现有服务..."
    docker-compose down 2>/dev/null || true
    log_success "服务已停止"
}

# 构建并启动服务
start_services() {
    log_info "构建并启动开发环境..."
    
    # 构建镜像
    log_info "构建 Docker 镜像..."
    docker-compose build
    
    # 启动服务
    log_info "启动服务..."
    docker-compose up -d
    
    log_success "开发环境已启动"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务启动..."
    
    # 等待MySQL
    log_info "等待 MySQL 启动..."
    timeout 60 bash -c 'until docker-compose exec -T mysql mysqladmin ping -h localhost --silent; do sleep 2; done' || {
        log_error "MySQL 启动超时"
        return 1
    }
    
    # 等待Redis
    log_info "等待 Redis 启动..."
    timeout 30 bash -c 'until docker-compose exec -T redis redis-cli ping | grep -q PONG; do sleep 2; done' || {
        log_error "Redis 启动超时"
        return 1
    }
    
    # 等待MinIO
    log_info "等待 MinIO 启动..."
    timeout 30 bash -c 'until curl -f http://localhost:9000/minio/health/live &>/dev/null; do sleep 2; done' || {
        log_error "MinIO 启动超时"
        return 1
    }
    
    # 等待后端服务
    log_info "等待后端服务启动..."
    timeout 60 bash -c 'until curl -f http://localhost:3000/health &>/dev/null; do sleep 3; done' || {
        log_warning "后端服务可能需要更多时间启动，请稍后检查"
    }
    
    log_success "所有服务已启动"
}

# 显示服务状态
show_status() {
    echo
    log_info "=== 服务状态 ==="
    docker-compose ps
    
    echo
    log_info "=== 访问地址 ==="
    echo -e "${GREEN}前端应用:${NC}     http://localhost:5173"
    echo -e "${GREEN}后端API:${NC}      http://localhost:3000"
    echo -e "${GREEN}MinIO控制台:${NC}  http://localhost:9001 (minioadmin/minioadmin123)"
    echo -e "${GREEN}MySQL数据库:${NC}  localhost:3306 (wedding/wedding123)"
    echo -e "${GREEN}Redis缓存:${NC}    localhost:6379"
    
    echo
    log_info "=== 常用命令 ==="
    echo "查看日志:     docker-compose logs -f"
    echo "停止服务:     docker-compose down"
    echo "重启服务:     docker-compose restart"
    echo "进入容器:     docker-compose exec [service] sh"
    echo
}

# 显示帮助信息
show_help() {
    echo "Wedding Club 本地开发环境启动脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  start     启动开发环境 (默认)"
    echo "  stop      停止开发环境"
    echo "  restart   重启开发环境"
    echo "  status    查看服务状态"
    echo "  logs      查看服务日志"
    echo "  clean     清理所有数据 (谨慎使用)"
    echo "  help      显示帮助信息"
    echo
    echo "示例:"
    echo "  $0 start    # 启动开发环境"
    echo "  $0 stop     # 停止开发环境"
    echo "  $0 logs     # 查看日志"
    echo
}

# 主函数
main() {
    local command=${1:-start}
    
    case $command in
        start)
            log_info "启动 Wedding Club 本地开发环境..."
            check_docker
            check_docker_service
            setup_env
            stop_services
            start_services
            wait_for_services
            show_status
            ;;
        stop)
            log_info "停止开发环境..."
            docker-compose down
            log_success "开发环境已停止"
            ;;
        restart)
            log_info "重启开发环境..."
            docker-compose restart
            log_success "开发环境已重启"
            ;;
        status)
            show_status
            ;;
        logs)
            docker-compose logs -f
            ;;
        clean)
            log_warning "这将删除所有数据，包括数据库、缓存和文件存储"
            read -p "确定要继续吗? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                docker-compose down -v
                docker system prune -f
                log_success "数据已清理"
            else
                log_info "操作已取消"
            fi
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
#!/bin/bash

# Wedding Client 统一部署脚本
# 支持三套环境: tencent(腾讯云), prod(生产), dev(开发)

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 默认环境
DEFAULT_ENV="dev"

# 显示帮助信息
show_help() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}    Wedding Client 统一部署工具${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "使用方法: ./deploy-unified.sh [命令] [环境]"
    echo ""
    echo -e "${GREEN}环境选项:${NC}"
    echo "  tencent    腾讯云环境"
    echo "  prod       生产环境"
    echo "  dev        开发环境 (默认)"
    echo ""
    echo -e "${GREEN}核心命令:${NC}"
    echo "  start         启动服务"
    echo "  stop          停止服务"
    echo "  restart       重启服务"
    echo "  status        查看状态"
    echo ""
    echo -e "${YELLOW}部署命令:${NC}"
    echo "  deploy        完整部署（推荐）"
    echo "  rebuild       重新构建并部署"
    echo ""
    echo -e "${BLUE}管理命令:${NC}"
    echo "  logs [服务]   查看日志"
    echo "  clean         清理资源"
    echo "  health        健康检查"
    echo "  test          测试配置"
    echo ""
    echo "示例:"
    echo "  ./deploy-unified.sh deploy tencent    # 腾讯云完整部署"
    echo "  ./deploy-unified.sh start prod        # 启动生产环境"
    echo "  ./deploy-unified.sh logs api dev      # 查看开发环境API日志"
    echo ""
    echo -e "${GREEN}Swagger文档:${NC} http://YOUR_IP/api/v1/docs"
    echo ""
}

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 获取环境配置
get_env_config() {
    local env=${1:-$DEFAULT_ENV}
    
    case "$env" in
        tencent)
            COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-compose.tencent.yml"
            ENV_FILE="$PROJECT_ROOT/deployment/.env.tencent"
            ;;
        prod)
            COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-compose.prod.yml"
            ENV_FILE="$PROJECT_ROOT/deployment/.env.prod"
            ;;
        dev|*)
            COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-compose.dev.yml"
            ENV_FILE="$PROJECT_ROOT/deployment/.env.dev"
            ;;
    esac
    
    # 如果环境特定的docker-compose文件不存在，使用通用文件
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        case "$env" in
            tencent)
                COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-compose.deployment.yml"
                ;;
            prod)
                COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-compose.production.yml"
                ;;
            dev|*)
                COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-compose.yml"
                ;;
        esac
    fi
    
    export ENV=$env
    log_info "使用环境: $env"
    log_info "配置文件: $ENV_FILE"
    log_info "Compose文件: $COMPOSE_FILE"
}

# 启动服务
start_services() {
    local env=${1:-$DEFAULT_ENV}
    get_env_config "$env"
    
    log_info "启动Wedding Client服务 ($env)..."
    
    cd "$PROJECT_ROOT"
    
    # 分层启动 - 确保依赖顺序
    log_info "1. 启动基础服务 (MySQL, Redis, MinIO)..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d mysql redis minio
    sleep 30
    
    log_info "2. 启动API服务..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api
    sleep 20
    
    log_info "3. 启动Web和Nginx服务..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d web nginx
    
    sleep 10
    show_status "$env"
    log_success "服务启动完成！"
}

# 停止服务
stop_services() {
    local env=${1:-$DEFAULT_ENV}
    get_env_config "$env"
    
    log_info "停止Wedding Client服务 ($env)..."
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans
    
    log_success "服务已停止！"
}

# 重启服务
restart_services() {
    local env=${1:-$DEFAULT_ENV}
    log_info "重启Wedding Client服务 ($env)..."
    stop_services "$env"
    sleep 5
    start_services "$env"
}

# 显示状态
show_status() {
    local env=${1:-$DEFAULT_ENV}
    get_env_config "$env"
    
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}    服务状态信息 ($env)${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    echo -e "\n${BLUE}访问地址:${NC}"
    # 使用source命令加载环境变量
    source "$ENV_FILE"
    
    case "$env" in
        tencent)
            echo -e "  前端:    ${GREEN}http://$SERVER_IP${NC}"
            echo -e "  API:     ${GREEN}http://$SERVER_IP/api/v1${NC}"
            echo -e "  Swagger: ${GREEN}http://$SERVER_IP/api/v1/docs${NC}"
            ;;
        prod)
            echo -e "  前端:    ${GREEN}http://$SERVER_IP:$WEB_PORT${NC}"
            echo -e "  API:     ${GREEN}http://$SERVER_IP:$API_PORT/api/v1${NC}"
            echo -e "  Swagger: ${GREEN}http://$SERVER_IP:$API_PORT/api/v1/docs${NC}"
            ;;
        dev|*)
            echo -e "  前端:    ${GREEN}http://$SERVER_IP:$WEB_PORT${NC}"
            echo -e "  API:     ${GREEN}http://$SERVER_IP:$API_PORT/api/v1${NC}"
            echo -e "  Swagger: ${GREEN}http://$SERVER_IP:$API_PORT/api/v1/docs${NC}"
            ;;
    esac
    echo -e "  MinIO:   ${GREEN}http://$SERVER_IP:$MINIO_CONSOLE_PORT${NC}"
    echo ""
}

# 清理资源
clean_resources() {
    local env=${1:-$DEFAULT_ENV}
    get_env_config "$env"
    
    log_info "清理Docker资源 ($env)..."
    
    cd "$PROJECT_ROOT"
    
    # 停止并移除容器
    log_info "停止并移除容器..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v --remove-orphans 2>/dev/null || true
    
    # 删除相关镜像
    log_info "删除相关镜像..."
    docker rmi wedding-web:latest wedding-api:latest 2>/dev/null || true
    
    # 清理构建缓存
    log_info "清理构建缓存..."
    if [[ -d "web/node_modules/.vite" ]]; then
        rm -rf web/node_modules/.vite
    fi
    
    if [[ -d "web/dist" ]]; then
        rm -rf web/dist/*
    fi
    
    if [[ -d "server/dist" ]]; then
        rm -rf server/dist/*
    fi
    
    log_success "资源清理完成！"
}

# 构建镜像
build_images() {
    local env=${1:-$DEFAULT_ENV}
    get_env_config "$env"
    
    log_info "构建镜像 ($env)..."
    cd "$PROJECT_ROOT"
    
    # 清理构建产物
    log_info "清理构建产物..."
    if [[ -d "web/dist" ]]; then
        rm -rf web/dist/*
    fi
    
    if [[ -d "web/node_modules/.vite" ]]; then
        rm -rf web/node_modules/.vite
    fi
    
    if [[ -d "server/dist" ]]; then
        rm -rf server/dist/*
    fi
    
    # 构建Web镜像
    if [[ -f "web/Dockerfile" ]]; then
        log_info "构建Web镜像..."
        # 强制重新构建，不使用缓存
        docker build --no-cache -t wedding-web:latest web/ || {
            log_error "Web镜像构建失败"
            return 1
        }
    fi

    # 构建API镜像
    if [[ -f "server/Dockerfile" ]]; then
        log_info "构建API镜像..."
        # 强制重新构建，不使用缓存
        docker build --no-cache -t wedding-api:latest server/ || {
            log_error "API镜像构建失败"
            return 1
        }
    fi
    
    log_success "镜像构建完成！"
}

# 完整部署
deploy_full() {
    local env=${1:-$DEFAULT_ENV}
    log_info "开始完整部署 ($env)..."
    
    # 停止现有服务
    stop_services "$env" 2>/dev/null || true
    
    # 清理资源
    clean_resources "$env"
    
    # 重新构建镜像
    build_images "$env"
    
    # 启动服务
    start_services "$env"
    
    # 健康检查
    health_check "$env"
    
    log_success "完整部署完成！"
}

# 重新构建并部署
rebuild_deploy() {
    local env=${1:-$DEFAULT_ENV}
    log_info "重新构建并部署 ($env)..."
    
    # 停止现有服务
    stop_services "$env" 2>/dev/null || true
    
    # 清理资源，包括 wedding-web 和 wedding-api 镜像和容器
    clean_resources "$env"
    
    # 重新构建镜像
    log_info "重新构建镜像..."
    cd "$PROJECT_ROOT"
    
    # 清理前端构建缓存和产物
    if [[ -d "web/dist" ]]; then
        log_info "清理前端构建产物..."
        rm -rf web/dist/*
    fi
    
    if [[ -d "web/node_modules/.vite" ]]; then
        log_info "清理前端构建缓存..."
        rm -rf web/node_modules/.vite
    fi
    
    # 构建Web镜像
    if [[ -f "web/Dockerfile" ]]; then
        log_info "构建Web镜像..."
        # 强制重新构建，不使用缓存
        docker build --no-cache -t wedding-web:latest web/ || {
            log_error "Web镜像构建失败"
            return 1
        }
    fi
    
    # 构建API镜像
    if [[ -f "server/Dockerfile" ]]; then
        log_info "构建API镜像..."
        # 强制重新构建，不使用缓存
        docker build --no-cache -t wedding-api:latest server/ || {
            log_error "API镜像构建失败"
            return 1
        }
    fi
    
    # 启动服务
    start_services "$env"
    
    # 健康检查
    health_check "$env"
    
    log_success "重新构建并部署完成！"
}

# 查看日志
show_logs() {
    local service=${1:-api}
    local env=${2:-$DEFAULT_ENV}
    get_env_config "$env"
    
    log_info "查看 $service 服务日志 ($env)..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f "$service"
}

# 健康检查
health_check() {
    local env=${1:-$DEFAULT_ENV}
    get_env_config "$env"
    
    log_info "执行健康检查 ($env)..."
    
    # 使用source命令加载环境变量
    source "$ENV_FILE"
    
    # 检查API服务
    if curl -f -s "http://$SERVER_IP:$API_PORT/api/v1/health" > /dev/null; then
        log_success "API服务健康检查通过"
    else
        log_error "API服务健康检查失败"
        return 1
    fi
    
    # 检查Web服务
    if curl -f -s "http://$SERVER_IP:$WEB_PORT/health" > /dev/null; then
        log_success "Web服务健康检查通过"
    else
        log_error "Web服务健康检查失败"
        return 1
    fi
    
    log_success "所有服务健康检查通过！"
}

# 测试配置
test_config() {
    local env=${1:-$DEFAULT_ENV}
    get_env_config "$env"
    
    log_info "测试配置 ($env)..."
    
    # 检查环境文件是否存在
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "环境文件不存在: $ENV_FILE"
        return 1
    fi
    
    # 检查必需的环境变量
    local required_vars=("SERVER_IP" "MYSQL_ROOT_PASSWORD" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$ENV_FILE"; then
            log_error "缺少必需的环境变量: $var"
            return 1
        fi
    done
    
    log_success "配置测试通过！"
}

# 主函数
main() {
    local command=${1:-help}
    local env=${2:-$DEFAULT_ENV}
    
    case "$command" in
        help|--help|-h)
            show_help
            ;;
        start)
            start_services "$env"
            ;;
        stop)
            stop_services "$env"
            ;;
        restart)
            restart_services "$env"
            ;;
        status)
            show_status "$env"
            ;;
        deploy)
            deploy_full "$env"
            ;;
        rebuild)
            rebuild_deploy "$env"
            ;;
        logs)
            local service=${3:-api}
            show_logs "$service" "$env"
            ;;
        clean)
            clean_resources "$env"
            ;;
        health)
            health_check "$env"
            ;;
        test)
            test_config "$env"
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
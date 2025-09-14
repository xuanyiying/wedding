#!/bin/bash

# Wedding Client 精简部署脚本
# 确保部署流程一次成功，失败则需要重新构建

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# 显示帮助信息
show_help() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}    Wedding Client 精简部署工具${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "使用方法: ./deploy.sh [命令] [选项]"
    echo ""
    echo -e "${GREEN}核心命令:${NC}"
    echo "  start         启动服务"
    echo "  stop          停止服务"
    echo "  restart       重启服务"
    echo "  status        查看状态"
    echo ""
    echo -e "${YELLOW}部署命令:${NC}"
    echo "  deploy        智能部署（检测变化后部署）"
    echo "  redeploy      强制重新构建并部署"
    echo ""
    echo -e "${BLUE}管理命令:${NC}"
    echo "  logs [服务]   查看日志"
    echo "  clean         清理资源"
    echo "  health        健康检查"
    echo "  test          测试配置"
    echo ""
    echo -e "${YELLOW}选项:${NC}"
    echo "  --services <服务列表>  指定要构建和部署的服务（web,api,nginx,mcp）"
    echo ""
    echo -e "${GREEN}部署模式说明:${NC}"
    echo "  deploy        - 智能检测代码变化，无变化时快速重启"
    echo "  redeploy      - 强制重新构建指定服务（或全部服务）"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh deploy                        # 智能部署（推荐）"
    echo "  ./deploy.sh redeploy                      # 强制重新构建所有服务"
    echo "  ./deploy.sh redeploy --services web       # 只重新构建web服务"
    echo "  ./deploy.sh redeploy --services web,api   # 重新构建web和api服务"
    echo "  ./deploy.sh redeploy --services web,api,mcp # 重新构建web、api和mcp服务"
    echo "  ./deploy.sh deploy --services web         # 智能部署，仅构建web服务（如有变化）"
    echo "  ./deploy.sh logs api                      # 查看API日志"
    echo ""
    echo -e "${GREEN}Swagger文档:${NC} http://YOUR_IP/api/v1/docs"
    echo ""
}

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 获取配置文件路径
get_config_files() {
    local env=${ENVIRONMENT:-prod}
    COMPOSE_FILE="$PROJECT_ROOT/docker-compose.env.yml"
    ENV_FILE="$PROJECT_ROOT/deployment/environments/.env.$env"
}

# 启动服务
start_services() {
    log_info "启动Wedding Client服务..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    
    log_info "使用 docker-compose 启动所有服务..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans
    
    # 等待Nginx服务启动并显示启动日志
    log_info "等待Nginx服务启动..."
    sleep 5
    
    # 显示Nginx启动日志
    log_info "Nginx启动日志："
    docker logs wedding-nginx-${ENVIRONMENT:-prod} --tail 200 2>/dev/null || log_warning "无法获取Nginx日志"
    
    show_status
    log_success "服务启动完成！"
}

# 停止服务
stop_services() {
    log_info "停止Wedding Client服务..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    
    log_success "服务已停止。"
}

# 重启服务
restart_services() {
    log_info "重启Wedding Client服务..."
    stop_services
    start_services
}

# 查看服务状态
show_status() {
    log_info "查看服务状态..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
}

# 查看日志
show_logs() {
    log_info "查看日志..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    if [[ -z "$1" ]]; then
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f
    else
        # 特殊处理nginx日志，显示更多启动信息
        if [[ "$1" == "nginx" ]]; then
            log_info "显示Nginx详细日志..."
            docker logs wedding-nginx-${ENVIRONMENT:-prod} -f --tail 200
        else
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f "$1"
        fi
    fi
}

# 清理资源
clean_resources() {
    log_warning "这将删除所有容器、网络和卷。确定要继续吗？ (y/n)"
    read -r answer
    if [[ "$answer" != "y" ]]; then
        log_info "操作已取消。"
        exit 0
    fi
    
    log_info "清理资源..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v --remove-orphans
    
    log_success "资源清理完成。"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    log_info "检查各服务健康状态..."
    # 在这里添加更具体的健康检查逻辑
}

# 测试配置
test_config() {
    log_info "测试配置..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config
    
    log_success "配置测试通过。"
}

# 部署
deploy() {
    log_info "开始智能部署..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    
    local services_to_build=()
    if [[ -n "$SERVICES" ]]; then
        IFS=',' read -ra ADDR <<< "$SERVICES"
        for service in "${ADDR[@]}"; do
            services_to_build+=("$service")
        done
    fi
    
    if [[ ${#services_to_build[@]} -gt 0 ]]; then
        log_info "将要构建的服务: ${services_to_build[*]}"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --build-arg BUILDKIT_INLINE_BUILD=1 "${services_to_build[@]}"
    else
        log_info "构建所有服务..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
    fi
    
    start_services
    log_success "部署完成！"
}

# 强制重新部署
redeploy() {
    log_info "开始强制重新部署..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    
    local services_to_build=()
    if [[ -n "$SERVICES" ]]; then
        IFS=',' read -ra ADDR <<< "$SERVICES"
        for service in "${ADDR[@]}"; do
            services_to_build+=("$service")
        done
    fi
    
    if [[ ${#services_to_build[@]} -gt 0 ]]; then
        log_info "将要强制重新构建的服务: ${services_to_build[*]}"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache --build-arg BUILDKIT_INLINE_BUILD=1 "${services_to_build[@]}"
    else
        log_info "强制重新构建所有服务..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache
    fi
    
    start_services
    log_success "强制重新部署完成！"
}

# 主逻辑
main() {
    # 解析选项
    while [[ $# -gt 0 ]]; do
        key="$1"
        case $key in
            --services)
                SERVICES="$2"
                shift
                shift
                ;;
            *)
                break
                ;;
        esac
    done

    COMMAND=${1:-help}

    case $COMMAND in
        start) start_services ;;
        stop) stop_services ;;
        restart) restart_services ;;
        status) show_status ;;
        deploy) deploy ;;
        redeploy) redeploy ;;
        logs) show_logs "$2" ;;
        clean) clean_resources ;;
        health) health_check ;;
        test) test_config ;;
        help|*) show_help ;;
    esac
}

main "$@"
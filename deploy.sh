#!/bin/bash

# Wedding Client 统一部署管理脚本
# 集成所有核心功能：部署、修复、诊断

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
    echo -e "${BLUE}    Wedding Client 部署管理工具${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "使用方法: ./deploy.sh [命令] [选项]"
    echo ""
    echo -e "${GREEN}核心命令:${NC}"
    echo "  start         快速启动服务"
    echo "  stop          停止所有服务"
    echo "  restart       重启所有服务"
    echo "  status        查看服务状态"
    echo ""
    echo -e "${YELLOW}部署命令:${NC}"
    echo "  deploy        完整部署（推荐）"
    echo "  quick         快速部署"
    echo ""
    echo -e "${RED}修复命令:${NC}"
    echo "  fix           自动修复常见问题"
    echo "  fix-network   修复网络冲突"
    echo "  diagnose      问题诊断"
    echo ""
    echo -e "${BLUE}管理命令:${NC}"
    echo "  logs [服务]   查看日志"
    echo "  clean         清理资源"
    echo "  test          测试配置"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh start          # 启动服务"
    echo "  ./deploy.sh deploy         # 完整部署"
    echo "  ./deploy.sh fix            # 修复问题"
    echo "  ./deploy.sh logs nginx     # 查看nginx日志"
    echo ""
}

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检测环境
detect_environment() {
    # 检查是否有本地镜像（腾讯云环境）
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^deployment-web:latest$"; then
        echo "tencent"
    else
        echo "production"
    fi
}

# 获取配置文件路径
get_config_files() {
    local env=$(detect_environment)
    if [[ "$env" == "tencent" ]]; then
        COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-compose.tencent.yml"
        ENV_FILE="$PROJECT_ROOT/deployment/.env.tencent"
    else
        COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-compose.prod.yml"
        ENV_FILE="$PROJECT_ROOT/deployment/.env.production"
    fi
}

# 启动服务
start_services() {
    log_info "启动Wedding Client服务..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    
    # 分层启动
    log_info "启动基础服务 (数据库、缓存、存储)..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d mysql redis minio
    sleep 20
    
    log_info "启动应用服务..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api
    sleep 10
    
    log_info "启动Web服务..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d web nginx
    
    sleep 5
    show_status
    log_success "服务启动完成！"
}

# 停止服务
stop_services() {
    log_info "停止Wedding Client服务..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans
    
    log_success "服务已停止！"
}

# 重启服务
restart_services() {
    log_info "重启Wedding Client服务..."
    stop_services
    sleep 3
    start_services
}

# 显示状态
show_status() {
    get_config_files
    
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}    服务状态信息${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    echo -e "\n${BLUE}访问地址:${NC}"
    local server_ip=$(hostname -I | awk '{print $1}' || echo "localhost")
    local env=$(detect_environment)
    
    if [[ "$env" == "tencent" ]]; then
        echo -e "  前端: ${GREEN}http://$server_ip${NC}"
        echo -e "  API:  ${GREEN}http://$server_ip:3000${NC}"
    else
        echo -e "  前端: ${GREEN}http://$server_ip:8080${NC}"
        echo -e "  API:  ${GREEN}http://$server_ip:3000${NC}"
    fi
    echo -e "  MinIO: ${GREEN}http://$server_ip:9001${NC}"
    echo ""
}

# 完整部署
deploy_full() {
    log_info "开始完整部署..."
    
    # 停止现有服务
    stop_services 2>/dev/null || true
    
    # 清理网络冲突
    fix_network_issues
    
    # 启动服务
    start_services
    
    # 健康检查
    health_check
    
    log_success "完整部署完成！"
}

# 快速部署
deploy_quick() {
    log_info "开始快速部署..."
    restart_services
}

# 修复网络问题
fix_network_issues() {
    log_info "修复网络冲突问题..."
    
    # 清理冲突网络
    docker network prune -f >/dev/null 2>&1 || true
    
    local networks=("deployment_wedding-net" "wedding-client_wedding-net" "wedding_wedding-net" "wedding-net")
    for net in "${networks[@]}"; do
        docker network rm "$net" 2>/dev/null || true
    done
    
    log_success "网络问题修复完成"
}

# 自动修复
auto_fix() {
    log_info "开始自动修复常见问题..."
    
    # 1. 修复网络问题
    fix_network_issues
    
    # 2. 检查环境变量
    check_env_variables
    
    # 3. 清理Docker资源
    log_info "清理Docker资源..."
    docker container prune -f >/dev/null 2>&1 || true
    docker volume prune -f >/dev/null 2>&1 || true
    
    # 4. 验证Nginx配置
    validate_nginx_config
    
    log_success "自动修复完成"
}

# 检查环境变量
check_env_variables() {
    get_config_files
    
    log_info "检查环境变量配置..."
    
    # 检查SMTP配置
    if ! grep -q "SMTP_USER=.*@.*" "$ENV_FILE"; then
        log_warning "SMTP_USER未正确配置，应用可能无法发送邮件"
        log_info "请编辑 $ENV_FILE 设置正确的SMTP配置"
    fi
    
    # 检查数据库配置
    if ! grep -q "DB_PASSWORD=.*" "$ENV_FILE"; then
        log_warning "数据库密码未配置"
    fi
}

# 验证Nginx配置
validate_nginx_config() {
    local env=$(detect_environment)
    local nginx_config
    
    if [[ "$env" == "tencent" ]]; then
        nginx_config="$PROJECT_ROOT/deployment/nginx/nginx.tencent.conf"
    else
        nginx_config="$PROJECT_ROOT/deployment/nginx/nginx.prod.conf"
    fi
    
    if [[ -f "$nginx_config" ]]; then
        log_info "验证Nginx配置..."
        
        # 检查负载均衡冲突
        local upstream_blocks=$(grep -n "upstream" "$nginx_config" | wc -l)
        local lb_methods=$(grep -E "least_conn|ip_hash|hash" "$nginx_config" | wc -l)
        
        if [[ $lb_methods -gt $upstream_blocks ]]; then
            log_warning "检测到可能的负载均衡方法冲突"
        fi
    fi
}
    docker container prune -f >/dev/null 2>&1 || true
    docker system prune -f >/dev/null 2>&1 || true
    
    # 3. 重启服务
    log_info "重启服务..."
    restart_services
    
    log_success "自动修复完成！"
}

# 问题诊断
diagnose() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}    系统诊断${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    get_config_files
    
    # 检查Docker
    log_info "检查Docker环境..."
    if command -v docker >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Docker已安装: $(docker --version)"
    else
        echo -e "${RED}✗${NC} Docker未安装"
    fi
    
    if command -v docker-compose >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Docker Compose已安装: $(docker-compose --version)"
    else
        echo -e "${RED}✗${NC} Docker Compose未安装"
    fi
    
    # 检查配置文件
    log_info "检查配置文件..."
    if [[ -f "$COMPOSE_FILE" ]]; then
        echo -e "${GREEN}✓${NC} Docker Compose配置存在"
    else
        echo -e "${RED}✗${NC} Docker Compose配置不存在: $COMPOSE_FILE"
    fi
    
    if [[ -f "$ENV_FILE" ]]; then
        echo -e "${GREEN}✓${NC} 环境配置文件存在"
    else
        echo -e "${RED}✗${NC} 环境配置文件不存在: $ENV_FILE"
    fi
    
    # 检查服务状态
    log_info "检查服务状态..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    # 检查网络
    log_info "检查Docker网络..."
    docker network ls | grep -E "(wedding|bridge)"
    
    # 检查端口
    log_info "检查端口占用..."
    local ports=("80" "3000" "3306" "6379" "9000" "9001")
    for port in "${ports[@]}"; do
        if ss -tlnp | grep -q ":$port "; then
            echo -e "${GREEN}✓${NC} 端口 $port 正在使用"
        else
            echo -e "${YELLOW}○${NC} 端口 $port 未使用"
        fi
    done
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=6
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "健康检查尝试 $attempt/$max_attempts"
        
        local healthy=0
        
        # 检查Web服务
        if curl -f -m 5 -s http://localhost/health >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Web服务正常"
            healthy=$((healthy + 1))
        fi
        
        # 检查API服务
        if curl -f -m 5 -s http://localhost:3000/health >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} API服务正常"
            healthy=$((healthy + 1))
        fi
        
        if [[ $healthy -eq 2 ]]; then
            log_success "健康检查通过"
            return 0
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log_info "等待15秒后重试..."
            sleep 15
        fi
        
        ((attempt++))
    done
    
    log_warning "健康检查未完全通过，请检查服务状态"
}

# 查看日志
show_logs() {
    local service="$1"
    get_config_files
    
    cd "$PROJECT_ROOT"
    
    if [[ -n "$service" ]]; then
        log_info "显示 $service 服务日志..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f --tail=50 "$service"
    else
        log_info "显示所有服务日志..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=20
    fi
}

# 清理资源
clean_resources() {
    log_info "清理Docker资源..."
    
    # 停止服务
    stop_services 2>/dev/null || true
    
    # 清理资源
    docker system prune -f >/dev/null 2>&1 || true
    docker volume prune -f >/dev/null 2>&1 || true
    docker network prune -f >/dev/null 2>&1 || true
    
    log_success "资源清理完成"
}

# 测试配置
test_config() {
    log_info "测试配置文件..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} 配置文件语法正确"
    else
        echo -e "${RED}✗${NC} 配置文件语法错误"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config
    fi
}

# 主函数
main() {
    local command="${1:-help}"
    
    case $command in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        deploy)
            deploy_full
            ;;
        quick)
            deploy_quick
            ;;
        fix)
            auto_fix
            ;;
        fix-network)
            fix_network_issues
            ;;
        diagnose)
            diagnose
            ;;
        logs)
            show_logs "$2"
            ;;
        clean)
            clean_resources
            ;;
        test)
            test_config
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}未知命令: $command${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
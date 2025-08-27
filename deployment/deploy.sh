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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 显示帮助信息
show_help() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}    Wedding Client 精简部署工具${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "使用方法: ./deploy.sh [命令]"
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
    echo "  diagnose      诊断文件上传问题"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh deploy    # 完整部署"
    echo "  ./deploy.sh logs api  # 查看API日志"
    echo "  ./deploy.sh diagnose  # 诊断文件上传问题"
    echo ""
    echo -e "${GREEN}Swagger文档:${NC} http://YOUR_IP/api/v1/docs"
    echo ""
}

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检测环境
detect_environment() {
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
        ENV_FILE="$PROJECT_ROOT/deployment/.env"
    fi
}

# 启动服务
start_services() {
    log_info "启动Wedding Client服务..."
    get_config_files
    
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
    sleep 5
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
        echo -e "  前端:    ${GREEN}http://$server_ip${NC}"
        echo -e "  API:     ${GREEN}http://$server_ip/api/v1${NC}"
        echo -e "  Swagger: ${GREEN}http://$server_ip/api/v1/docs${NC}"
    else
        echo -e "  前端:    ${GREEN}http://$server_ip:8080${NC}"
        echo -e "  API:     ${GREEN}http://$server_ip:3000/api/v1${NC}"
        echo -e "  Swagger: ${GREEN}http://$server_ip:3000/api/v1/docs${NC}"
    fi
    echo -e "  MinIO:   ${GREEN}http://$server_ip:9001${NC}"
    echo ""
}

# 完整部署
deploy_full() {
    log_info "开始完整部署..."
    
    # 停止现有服务
    stop_services 2>/dev/null || true
    
    # 启动服务
    start_services
    
    # 健康检查
    health_check
    
    log_success "完整部署完成！"
    echo ""
    echo -e "${YELLOW}重要访问地址:${NC}"
    local server_ip=$(hostname -I | awk '{print $1}' || echo "localhost") 
    echo -e "  📖 API文档: ${GREEN}http://$server_ip/api/v1/docs${NC}"
    echo ""
}

# 重新构建部署
rebuild_deploy() {
    log_info "开始重新构建并部署..."
    
    # 停止服务
    stop_services 2>/dev/null || true
    
    # 清理资源
    clean_resources
    
    # 重新构建镜像
    log_info "重新构建镜像..."
    cd "$PROJECT_ROOT"
    
    # 构建Web镜像
    if [[ -f "web/Dockerfile" ]]; then
        log_info "构建Web镜像..."
        docker build -t deployment-web:latest web/ || {
            log_error "Web镜像构建失败"
            return 1
        }
    fi
    
    # 构建API镜像
    if [[ -f "server/Dockerfile" ]]; then
        log_info "构建API镜像..."
        docker build -t deployment-api1:latest server/ || {
            log_error "API镜像构建失败"
            return 1
        }
    fi
    
    # 启动服务
    start_services
    
    # 健康检查
    health_check
    
    log_success "重新构建部署完成！"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=5
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
        
        # 检查Swagger文档
        if curl -f -m 5 -s http://localhost/api/v1/docs >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Swagger文档可访问"
            healthy=$((healthy + 1))
        fi
        
        if [[ $healthy -ge 2 ]]; then
            log_success "健康检查通过"
            return 0
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log_info "等待15秒后重试..."
            sleep 15
        fi
        
        ((attempt++))
    done
    
    log_error "健康检查失败，建议执行重新构建: ./deploy-simple.sh rebuild"
    return 1
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
        return 0
    else
        echo -e "${RED}✗${NC} 配置文件语法错误"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config
        return 1
    fi
}

# 诊断文件上传问题
diagnose_upload() {
    log_info "诊断文件上传问题..."
    
    # 检查诊断脚本是否存在
    if [[ -f "$SCRIPT_DIR/scripts/diagnose-upload.sh" ]]; then
        log_info "运行文件上传诊断脚本..."
        bash "$SCRIPT_DIR/scripts/diagnose-upload.sh"
        return $?
    else
        log_error "诊断脚本不存在: $SCRIPT_DIR/scripts/diagnose-upload.sh"
        return 1
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
        rebuild)
            rebuild_deploy
            ;;
        logs)
            show_logs "$2"
            ;;
        clean)
            clean_resources
            ;;
        health)
            health_check
            ;;
        test)
            test_config
            ;;
        diagnose)
            diagnose_upload
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
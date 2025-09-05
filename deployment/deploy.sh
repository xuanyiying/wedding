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
    echo "使用方法: ./deploy.sh [命令] [选项]"
    echo ""
    echo -e "${GREEN}核心命令:${NC}"
    echo "  start         启动服务"
    echo "  stop          停止服务"
    echo "  restart       重启服务"
    echo "  status        查看状态"
    echo ""
    echo -e "${YELLOW}部署命令:${NC}"
    echo "  deploy        完整部署（推荐）"
    echo "  redeploy       重新构建并部署"
    echo ""
    echo -e "${BLUE}管理命令:${NC}"
    echo "  logs [服务]   查看日志"
    echo "  clean         清理资源"
    echo "  health        健康检查"
    echo "  test          测试配置"
    echo "  diagnose      诊断文件上传问题"
    echo ""
    echo -e "${YELLOW}选项:${NC}"
    echo "  --services <服务列表>  指定要构建和部署的服务（web,api）"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh deploy                     # 完整部署"
    echo "  ./deploy.sh deploy --services web      # 只部署web服务"
    echo "  ./deploy.sh deploy --services web,api  # 部署web和api服务"
    echo "  ./deploy.sh logs api                   # 查看API日志"
    echo "  ./deploy.sh diagnose                   # 诊断文件上传问题"
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
    # 检查环境变量
    if [[ -n "$ENVIRONMENT" ]]; then
        echo "$ENVIRONMENT"
    else
        # 默认返回prod环境
        echo "prod"
    fi
}

# 获取配置文件路径
get_config_files() {
    local env=$(detect_environment)
    COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
    if [[ "$env" == "development" ]] || [[ "$env" == "dev" ]]; then
        ENV_FILE="$PROJECT_ROOT/deployment/environments/.env.dev"
    elif [[ "$env" == "test" ]]; then
        ENV_FILE="$PROJECT_ROOT/deployment/environments/.env.test"
    else
        ENV_FILE="$PROJECT_ROOT/deployment/environments/.env.prod"
    fi
}

# 复制环境文件到项目根目录
copy_env_file() {
    log_info "复制环境文件到项目根目录..."
    
    # 确保目标目录存在
    mkdir -p "$PROJECT_ROOT"
    
    # 复制对应的环境文件到项目根目录
    if [[ -f "$ENV_FILE" ]]; then
        cp "$ENV_FILE" "$PROJECT_ROOT/.env"
        log_success "已将 $ENV_FILE 复制到项目根目录"
    else
        log_warning "环境文件 $ENV_FILE 不存在，跳过复制"
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
    local server_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    local env=$(detect_environment)
    
    if [[ "$env" == "tencent" ]]; then
        echo -e "  前端:    ${GREEN}http://$server_ip${NC}"
        echo -e "  API:     ${GREEN}http://$server_ip/api/v1${NC}"
        echo -e "  Swagger: ${GREEN}http://$server_ip/api/v1/docs${NC}"
    else
        echo -e "  前端:    ${GREEN}http://$server_ip${NC}"
        echo -e "  API:     ${GREEN}http://$server_ip:3000/api/v1${NC}"
        echo -e "  Swagger: ${GREEN}http://$server_ip:3000/api/v1/docs${NC}"
    fi
    echo -e "  MinIO:   ${GREEN}http://$server_ip:9001${NC}"
    echo ""
}

# 检查代码和配置是否发生变化
check_changes() {
    local web_hash_file=".deploy_cache/web_code_hash"
    local api_hash_file=".deploy_cache/api_code_hash"
    local config_hash_file=".deploy_cache/config_hash"
    local web_current_hash
    local api_current_hash
    local config_current_hash
    
    # 创建缓存目录
    mkdir -p .deploy_cache
    
    # 计算当前代码哈希值
    web_current_hash=$(find web/src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" -o -name "*.html" | sort | xargs md5sum | md5sum | awk '{print $1}')
    api_current_hash=$(find server/src -type f -name "*.ts" -o -name "*.js" | sort | xargs md5sum | md5sum | awk '{print $1}')
    
    # 计算配置文件哈希值
    config_current_hash=$(find deployment/environments deployment/docker/mysql deployment/docker/redis -type f | sort | xargs md5sum | md5sum | awk '{print $1}')
    
    local web_changed=false
    local api_changed=false
    local config_changed=false
    
    # 检查前端代码是否变化
    if [[ -f "$web_hash_file" ]]; then
        local web_last_hash
        web_last_hash=$(cat "$web_hash_file")
        if [[ "$web_current_hash" != "$web_last_hash" ]]; then
            web_changed=true
        fi
    else
        web_changed=true
    fi
    
    # 检查后端代码是否变化
    if [[ -f "$api_hash_file" ]]; then
        local api_last_hash
        api_last_hash=$(cat "$api_hash_file")
        if [[ "$api_current_hash" != "$api_last_hash" ]]; then
            api_changed=true
        fi
    else
        api_changed=true
    fi
    
    # 检查配置文件是否变化
    if [[ -f "$config_hash_file" ]]; then
        local config_last_hash
        config_last_hash=$(cat "$config_hash_file")
        if [[ "$config_current_hash" != "$config_last_hash" ]]; then
            config_changed=true
        fi
    else
        config_changed=true
    fi
    
    # 保存当前哈希值
    echo "$web_current_hash" > "$web_hash_file"
    echo "$api_current_hash" > "$api_hash_file"
    echo "$config_current_hash" > "$config_hash_file"
    
    # 返回结果
    if [[ "$web_changed" == true || "$api_changed" == true || "$config_changed" == true ]]; then
        echo "changed"
    else
        echo "unchanged"
    fi
}

# 解析命令行参数
parse_args() {
    SERVICES_TO_BUILD=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --services)
                SERVICES_TO_BUILD="$2"
                shift 2
                ;;
            *)
                # 其他参数保持不变
                break
                ;;
        esac
    done
}

# 构建指定服务
build_services() {
    local services="$1"
    
    if [[ -z "$services" ]]; then
        log_info "未指定服务，跳过构建步骤"
        return 0
    fi
    
    log_info "构建指定服务: $services"
    cd "$PROJECT_ROOT"
    
    # 解析服务列表
    IFS=',' read -ra SERVICE_ARRAY <<< "$services"
    
    for service in "${SERVICE_ARRAY[@]}"; do
        case $service in
            web)
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
                    docker build -t wedding-web:$(detect_environment)-latest web/ || {
                        log_error "Web镜像构建失败"
                        return 1
                    }
                fi
                ;;
            api)
                # 构建API镜像
                if [[ -f "server/Dockerfile" ]]; then
                    log_info "构建API镜像..."
                    docker build -t wedding-api:$(detect_environment)-latest server/ || {
                        log_error "API镜像构建失败"
                        return 1
                    }
                fi
                ;;
            nginx)
                # 构建Nginx镜像
                if [[ -f "deployment/docker/nginx/Dockerfile" ]]; then
                    log_info "构建Nginx镜像..."
                    docker build -t wedding-nginx:$(detect_environment)-latest -f deployment/docker/nginx/Dockerfile . || {
                        log_error "Nginx镜像构建失败"
                        return 1
                    }
                elif [[ -f "deployment/docker/nginx/nginx.Dockerfile" ]]; then
                    log_info "构建Nginx镜像..."
                    docker build -t wedding-nginx:$(detect_environment)-latest -f deployment/docker/nginx/nginx.Dockerfile . || {
                        log_error "Nginx镜像构建失败"
                        return 1
                    }
                else
                    log_warning "未找到Nginx Dockerfile，跳过构建"
                fi
                ;;
            *)
                log_warning "未知服务: $service，跳过构建"
                ;;
        esac
    done
    
    log_success "指定服务构建完成"
}

# 智能部署
smart_deploy() {
    log_info "开始智能部署..."
    
    
    # 检查代码和配置变化
    local change_status
    change_status=$(check_changes)
    
    if [[ "$change_status" == "unchanged" ]]; then
        log_info "代码和配置未发生变化，跳过构建步骤"
        # 只重启Web和API服务
        log_info "重启Web和API服务..."
        get_config_files
        cd "$PROJECT_ROOT"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart web api
        sleep 10
        health_check
        log_success "服务重启完成！"
        return 0
    fi
    
    log_info "检测到代码或配置变化，开始重新构建..."
    
    # 停止服务
    stop_services 2>/dev/null || true
    
    # 清理资源，包括 wedding-web 和 wedding-api 镜像和容器
    clean_resources
    
    # 复制环境文件
    copy_env_file
    
    # 构建指定服务
    build_services "$SERVICES_TO_BUILD"
    
    # 启动服务
    start_services
    
    # 执行数据库初始化
    initialize_database
    
    # 健康检查
    health_check
    
    log_success "智能部署完成！"
}

# 完整部署
deploy_full() {
    log_info "开始完整部署..."
    
    
    # 停止现有服务
    stop_services 2>/dev/null || true
    
    # 清理资源，包括 wedding-web 和 wedding-api 镜像和容器
    clean_resources
    
    # 复制环境文件
    copy_env_file
    
    # 构建指定服务
    build_services "$SERVICES_TO_BUILD"
    
    # 重新构建镜像
    log_info "重新构建镜像..."
    cd "$PROJECT_ROOT"
    
    # 启动服务
    start_services
    
    # 执行数据库初始化
    initialize_database
    
    # 健康检查
    health_check
    
    log_success "完整部署完成！"
    echo ""
    echo -e "${YELLOW}重要访问地址:${NC}"
    local server_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost") 
    echo -e "  📖 API文档: ${GREEN}http://$server_ip:3000/api/v1/docs${NC}"
    echo ""
}

# 重新构建部署
redeploy() {
    log_info "开始重新构建并部署..."

    # 停止服务
    stop_services 2>/dev/null || true
    
    # 清理资源，包括 wedding-web 和 wedding-api 镜像和容器
    clean_resources
    
    # 复制环境文件
    copy_env_file
    
    # 构建指定服务
    build_services "$SERVICES_TO_BUILD"
    
    # 重新构建镜像
    log_info "重新构建镜像..."
    cd "$PROJECT_ROOT"
    
    # 启动服务
    start_services
    
    # 执行数据库初始化
    initialize_database
    
    # 健康检查
    health_check
    
    log_success "重新构建部署完成！"
}

# 初始化数据库
initialize_database() {
    log_info "执行优化的数据库初始化..."
    
    # 使用新的优化初始化脚本
    if [[ -f "$PROJECT_ROOT/deployment/init-database.sh" ]]; then
        cd "$PROJECT_ROOT/deployment"
        chmod +x init-database.sh
        if ./init-database.sh; then
            log_success "数据库初始化完成"
            return 0
        else
            log_error "数据库初始化失败"
            return 1
        fi
    else
        log_error "优化的数据库初始化脚本不存在: $PROJECT_ROOT/deployment/init-database.sh"
        return 1
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=5
    local attempt=1
    
    # 获取环境配置
    get_config_files
    if [[ -f "$ENV_FILE" ]]; then
        source "$ENV_FILE"
    fi
    
    # 使用配置中的端口
    local web_port=${WEB_PORT:-8080}
    local api_port=${SERVER_PORT:-3000}
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "健康检查尝试 $attempt/$max_attempts"
        
        local healthy=0
        
        # 检查Web服务
        if curl -f -m 5 -s http://localhost:$web_port/health >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Web服务正常"
            healthy=$((healthy + 1))
        else
            log_warning "Web服务检查失败"
        fi
        
        # 检查API服务
        if curl -f -m 5 -s http://localhost:$api_port/health >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} API服务正常"
            healthy=$((healthy + 1))
        else
            log_warning "API服务检查失败"
        fi
        
        # 检查Swagger文档
        if curl -f -m 5 -s http://localhost:$api_port/api/v1/docs >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Swagger文档可访问"
            healthy=$((healthy + 1))
        else
            log_warning "Swagger文档检查失败"
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
    
    log_error "健康检查失败，建议执行重新构建: ./deploy.sh redeploy"
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
    
    # 停止并移除所有wedding相关的容器（如果存在）
    log_info "停止并移除所有wedding相关的容器..."
    docker stop $(docker ps -aq -f name=wedding-) 2>/dev/null || true
    docker rm $(docker ps -aq -f name=wedding-) 2>/dev/null || true
    
    # 删除 wedding-web 和 wedding-api 镜像（如果存在）
    log_info "删除 wedding-web 和 wedding-api 镜像..."
    docker rmi wedding-web:$(detect_environment)-latest 2>/dev/null || true
    docker rmi wedding-api:$(detect_environment)-latest 2>/dev/null || true
    
    # 清理wedding相关的网络和卷
    docker network rm $(docker network ls -q -f name=wedding-) 2>/dev/null || true
    docker volume rm $(docker volume ls -q -f name=wedding-) 2>/dev/null || true
    
    # 清理其他资源
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

# 主函数
main() {
    local command="${1:-help}"
    
    # 解析参数
    parse_args "$@"
    
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
            smart_deploy
            ;;
        redeploy)
            redeploy
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
#!/bin/bash

# Wedding Club 腾讯云服务器专用部署脚本
# 针对腾讯云网络环境优化，跳过Docker Hub镜像拉取

set -euo pipefail

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_ENV="${DEPLOY_ENV:-tencent}"
FORCE_DEPLOY="${FORCE_DEPLOY:-false}"
VERBOSE="${VERBOSE:-false}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_verbose() { [[ "$VERBOSE" == "true" ]] && echo -e "${BLUE}[VERBOSE]${NC} $1"; }

# 错误处理
error_exit() {
    log_error "$1"
    exit 1
}

# 帮助信息
show_help() {
    cat << EOF
Wedding Club 腾讯云服务器专用部署脚本

使用方法: $0 [OPTIONS]

选项:
    -f, --force             强制部署，忽略检查失败
    -v, --verbose           详细输出
    --help                  显示帮助信息

环境变量:
    FORCE_DEPLOY            强制部署 (true/false)
    VERBOSE                 详细输出 (true/false)

示例:
    $0                      # 正常部署
    $0 -f -v                # 强制部署并显示详细信息

EOF
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE_DEPLOY="true"
            shift
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查Docker
    if ! command -v docker >/dev/null 2>&1; then
        error_exit "Docker 未安装"
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1; then
        error_exit "Docker Compose 未安装"
    fi
    
    # 检查Docker服务状态
    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker 服务未运行"
    fi
    
    log_success "依赖检查完成"
}

# 验证本地镜像
verify_local_images() {
    log_info "验证本地Docker镜像..."
    
    local required_images=(
        "deployment-web:latest"
        "deployment-api1:latest"
        "mysql:8.0"
        "redis:7-alpine"
        "minio/minio:latest"
        "nginx:alpine"
    )
    
    local missing_images=()
    
    for image in "${required_images[@]}"; do
        if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^$image$"; then
            missing_images+=("$image")
            log_warning "缺少镜像: $image"
        else
            log_verbose "找到镜像: $image"
        fi
    done
    
    if [[ ${#missing_images[@]} -gt 0 ]]; then
        log_error "缺少以下必需的Docker镜像:"
        for image in "${missing_images[@]}"; do
            echo "  - $image"
        done
        
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            error_exit "请先准备所需的Docker镜像，或使用 --force 强制部署"
        else
            log_warning "强制部署模式，将尝试使用可用的镜像"
        fi
    fi
    
    log_success "镜像验证完成"
}

# 环境检查
check_environment() {
    log_info "检查部署环境..."
    
    # 检查配置文件
    local compose_file="$PROJECT_ROOT/deployment/docker-compose.tencent.yml"
    if [[ ! -f "$compose_file" ]]; then
        error_exit "Docker Compose 配置文件不存在: $compose_file"
    fi
    
    local env_file="$PROJECT_ROOT/deployment/.env.production"
    if [[ ! -f "$env_file" ]]; then
        error_exit "环境配置文件不存在: $env_file"
    fi
    
    # 验证配置文件语法
    if ! docker-compose -f "$compose_file" --env-file "$env_file" config >/dev/null 2>&1; then
        error_exit "Docker Compose 配置文件语法错误"
    fi
    
    log_success "环境检查完成"
}

# 预部署检查
pre_deployment_checks() {
    log_info "执行预部署检查..."
    
    # 检查磁盘空间
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB
    
    if [[ $available_space -lt $required_space ]]; then
        log_warning "磁盘空间不足。可用: ${available_space}KB, 建议: ${required_space}KB"
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            error_exit "磁盘空间不足，请清理后重试，或使用 --force 强制部署"
        fi
    fi
    
    # 检查端口占用
    local ports=("80" "443" "3000" "3306" "6379" "9000" "9001")
    for port in "${ports[@]}"; do
        if ss -tlnp | grep -q ":$port "; then
            log_verbose "端口 $port 已被占用 (可能是现有服务)"
        fi
    done
    
    # 检查内存
    local available_memory=$(free -m | awk 'NR==2{print $7}' 2>/dev/null || echo "unknown")
    if [[ "$available_memory" != "unknown" && $available_memory -lt 1024 ]]; then
        log_warning "可用内存不足: ${available_memory}MB (建议至少1GB)"
    fi
    
    log_success "预部署检查完成"
}

# 创建必要目录
create_directories() {
    log_info "创建必要的目录结构..."
    
    local dirs=(
        "$PROJECT_ROOT/deployment/logs/nginx"
        "$PROJECT_ROOT/deployment/logs/api"
        "$PROJECT_ROOT/deployment/logs/mysql"
        "$PROJECT_ROOT/deployment/logs/redis"
        "$PROJECT_ROOT/deployment/logs/minio"
        "$PROJECT_ROOT/deployment/uploads"
        "$PROJECT_ROOT/deployment/ssl"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_verbose "创建目录: $dir"
        fi
    done
    
    log_success "目录创建完成"
}

# 停止现有服务
stop_existing_services() {
    log_info "停止现有服务..."
    
    local compose_file="$PROJECT_ROOT/deployment/docker-compose.tencent.yml"
    local env_file="$PROJECT_ROOT/deployment/.env.production"
    
    # 优雅停止服务
    docker-compose -f "$compose_file" --env-file "$env_file" down --remove-orphans 2>/dev/null || true
    
    # 等待容器完全停止
    sleep 5
    
    log_success "现有服务已停止"
}

# 启动服务
start_services() {
    log_info "启动应用服务..."
    
    local compose_file="$PROJECT_ROOT/deployment/docker-compose.tencent.yml"
    local env_file="$PROJECT_ROOT/deployment/.env.production"
    
    cd "$PROJECT_ROOT"
    
    # 启动核心服务（按依赖顺序）
    log_info "启动数据库服务..."
    docker-compose -f "$compose_file" --env-file "$env_file" up -d mysql redis minio
    
    # 等待数据库服务启动
    log_info "等待数据库服务就绪..."
    sleep 30
    
    # 启动API服务
    log_info "启动API服务..."
    docker-compose -f "$compose_file" --env-file "$env_file" up -d api
    
    # 等待API服务启动
    sleep 20
    
    # 启动Web和Nginx服务
    log_info "启动Web服务..."
    docker-compose -f "$compose_file" --env-file "$env_file" up -d web nginx
    
    log_success "服务启动完成"
}

# 健康检查
health_checks() {
    log_info "执行健康检查..."
    
    local max_attempts=15
    local attempt=1
    local services_healthy=false
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "健康检查尝试 $attempt/$max_attempts"
        
        local all_healthy=true
        
        # 检查容器状态
        local compose_file="$PROJECT_ROOT/deployment/docker-compose.tencent.yml"
        local env_file="$PROJECT_ROOT/deployment/.env.production"
        
        local unhealthy_services=()
        while IFS= read -r line; do
            local service=$(echo "$line" | awk '{print $1}')
            local status=$(echo "$line" | awk '{print $NF}')
            if [[ "$status" != "Up" && "$status" != "healthy" ]]; then
                unhealthy_services+=("$service")
                all_healthy=false
            fi
        done < <(docker-compose -f "$compose_file" --env-file "$env_file" ps --format "table {{.Service}} {{.Status}}" | tail -n +2)
        
        if [[ "$all_healthy" == "true" ]]; then
            # 进一步检查服务可访问性
            local web_healthy=false
            local api_healthy=false
            
            # 检查Web服务
            if curl -f -m 10 -s http://localhost:80 >/dev/null 2>&1; then
                web_healthy=true
            fi
            
            # 检查API服务
            if curl -f -m 10 -s http://localhost:3000/health >/dev/null 2>&1; then
                api_healthy=true
            fi
            
            if [[ "$web_healthy" == "true" && "$api_healthy" == "true" ]]; then
                services_healthy=true
                break
            else
                log_verbose "服务响应检查失败"
                all_healthy=false
            fi
        else
            log_verbose "发现异常服务: ${unhealthy_services[*]}"
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log_verbose "等待30秒后重试..."
            sleep 30
        fi
        
        ((attempt++))
    done
    
    if [[ "$services_healthy" == "true" ]]; then
        log_success "所有服务健康检查通过"
    else
        log_error "健康检查失败，服务可能未正常启动"
        
        # 显示服务状态用于调试
        log_info "当前服务状态:"
        docker-compose -f "$compose_file" --env-file "$env_file" ps
        
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            error_exit "健康检查失败，请检查服务日志"
        else
            log_warning "强制部署模式，忽略健康检查失败"
        fi
    fi
}

# 显示部署状态
show_deployment_status() {
    log_info "部署状态信息:"
    
    echo "=========================================="
    echo "部署环境: 腾讯云服务器"
    echo "部署时间: $(date)"
    echo "项目路径: $PROJECT_ROOT"
    echo "=========================================="
    
    # 显示服务状态
    local compose_file="$PROJECT_ROOT/deployment/docker-compose.tencent.yml"
    local env_file="$PROJECT_ROOT/deployment/.env.production"
    
    echo "服务状态:"
    docker-compose -f "$compose_file" --env-file "$env_file" ps
    
    echo "=========================================="
    echo "访问地址:"
    echo "  前端: http://$(hostname -I | awk '{print $1}'):80"
    echo "  API: http://$(hostname -I | awk '{print $1}'):3000"
    echo "  MinIO控制台: http://$(hostname -I | awk '{print $1}'):9001"
    echo "=========================================="
    
    # 显示容器资源使用情况
    echo "资源使用情况:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -10
    echo "=========================================="
}

# 主函数
main() {
    log_info "开始 Wedding Club 腾讯云服务器部署"
    
    # 信号处理
    trap 'log_error "部署被中断"; exit 1' INT TERM
    
    check_dependencies
    verify_local_images
    check_environment
    pre_deployment_checks
    create_directories
    stop_existing_services
    start_services
    health_checks
    show_deployment_status
    
    log_success "🎉 腾讯云服务器部署完成！"
    log_info "提示: 如果遇到问题，请检查服务日志: docker-compose logs [service_name]"
}

# 运行主函数
main "$@"
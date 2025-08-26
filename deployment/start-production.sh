#!/bin/bash

# Wedding Club 生产环境服务启动脚本
# 支持多种部署环境的统一启动接口

set -euo pipefail

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-production}"

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

# 错误处理
error_exit() {
    log_error "$1"
    exit 1
}

# 帮助信息
show_help() {
    cat << EOF
Wedding Club 生产环境服务启动脚本

使用方法: $0 [OPTIONS]

选项:
    -e, --env ENV          部署环境 (production, tencent)
    -f, --force            强制启动，忽略健康检查
    -w, --wait             等待服务完全启动
    -v, --verbose          详细输出
    --help                 显示帮助信息

环境变量:
    ENVIRONMENT            部署环境
    FORCE_START            强制启动 (true/false)
    WAIT_FOR_READY         等待服务就绪 (true/false)
    VERBOSE                详细输出 (true/false)

示例:
    $0                     # 启动生产环境服务
    $0 -e tencent          # 启动腾讯云环境服务
    $0 -f -w               # 强制启动并等待就绪

EOF
}

# 解析命令行参数
FORCE_START="${FORCE_START:-false}"
WAIT_FOR_READY="${WAIT_FOR_READY:-false}"
VERBOSE="${VERBOSE:-false}"

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_START="true"
            shift
            ;;
        -w|--wait)
            WAIT_FOR_READY="true"
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

# 检测环境并设置配置文件
detect_environment() {
    log_info "检测部署环境: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        production)
            COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-compose.prod.yml"
            ENV_FILE="$PROJECT_ROOT/deployment/.env.production"
            ;;
        tencent)
            COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-compose.tencent.yml"
            ENV_FILE="$PROJECT_ROOT/deployment/.env.tencent"
            ;;
        *)
            error_exit "不支持的环境: $ENVIRONMENT"
            ;;
    esac
    
    # 检查配置文件
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error_exit "Docker Compose配置文件不存在: $COMPOSE_FILE"
    fi
    
    if [[ ! -f "$ENV_FILE" ]]; then
        error_exit "环境配置文件不存在: $ENV_FILE"
    fi
    
    log_success "环境检测完成: $ENVIRONMENT"
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    if ! command -v docker >/dev/null 2>&1; then
        error_exit "Docker 未安装"
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        error_exit "Docker Compose 未安装"
    fi
    
    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker 服务未运行"
    fi
    
    log_success "依赖检查完成"
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."
    
    local dirs=(
        "$PROJECT_ROOT/deployment/logs/nginx"
        "$PROJECT_ROOT/deployment/logs/api"
        "$PROJECT_ROOT/deployment/logs/mysql"
        "$PROJECT_ROOT/deployment/logs/redis"
        "$PROJECT_ROOT/deployment/logs/minio"
        "$PROJECT_ROOT/deployment/uploads"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            [[ "$VERBOSE" == "true" ]] && log_info "创建目录: $dir"
        fi
    done
    
    log_success "目录创建完成"
}

# 停止现有服务
stop_existing_services() {
    log_info "停止现有服务..."
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans 2>/dev/null || true
    
    # 等待容器完全停止
    sleep 3
    
    log_success "现有服务已停止"
}

# 启动服务（分层启动以确保依赖关系）
start_services() {
    log_info "启动服务..."
    
    cd "$PROJECT_ROOT"
    
    # 第一层：数据库和存储服务
    log_info "启动数据库和存储服务..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d mysql redis minio
    
    # 等待数据库服务启动
    log_info "等待数据库服务就绪..."
    sleep 30
    
    # 第二层：应用服务
    log_info "启动应用服务..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api
    
    # 等待API服务启动
    log_info "等待API服务就绪..."
    sleep 20
    
    # 第三层：Web和代理服务
    log_info "启动Web和代理服务..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d web nginx
    
    log_success "所有服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    if [[ "$WAIT_FOR_READY" != "true" ]]; then
        return 0
    fi
    
    log_info "等待服务完全就绪..."
    
    local max_attempts=20
    local attempt=1
    local all_ready=false
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "健康检查尝试 $attempt/$max_attempts"
        
        local ready_count=0
        local total_checks=0
        
        # 检查Web服务
        total_checks=$((total_checks + 1))
        if curl -f -m 5 -s http://localhost/health >/dev/null 2>&1; then
            ready_count=$((ready_count + 1))
            [[ "$VERBOSE" == "true" ]] && log_info "Web服务就绪"
        fi
        
        # 检查API服务
        total_checks=$((total_checks + 1))
        if curl -f -m 5 -s http://localhost:3000/health >/dev/null 2>&1; then
            ready_count=$((ready_count + 1))
            [[ "$VERBOSE" == "true" ]] && log_info "API服务就绪"
        fi
        
        # 检查数据库连接（通过API）
        total_checks=$((total_checks + 1))
        if curl -f -m 5 -s http://localhost:3000/api/v1/health >/dev/null 2>&1; then
            ready_count=$((ready_count + 1))
            [[ "$VERBOSE" == "true" ]] && log_info "数据库连接就绪"
        fi
        
        if [[ $ready_count -eq $total_checks ]]; then
            all_ready=true
            break
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log_info "等待15秒后重试..."
            sleep 15
        fi
        
        ((attempt++))
    done
    
    if [[ "$all_ready" == "true" ]]; then
        log_success "所有服务已就绪"
    else
        if [[ "$FORCE_START" == "true" ]]; then
            log_warning "服务可能未完全就绪，但强制启动模式忽略此问题"
        else
            error_exit "服务未能在预期时间内就绪"
        fi
    fi
}

# 显示服务状态
show_service_status() {
    log_info "服务状态信息："
    
    echo "=========================================="
    echo "环境: $ENVIRONMENT"
    echo "启动时间: $(date)"
    echo "=========================================="
    
    # 显示容器状态
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    echo "=========================================="
    echo "访问地址:"
    local server_ip=$(hostname -I | awk '{print $1}' || echo "localhost")
    
    if [[ "$ENVIRONMENT" == "tencent" ]]; then
        echo "  前端: http://$server_ip"
        echo "  API: http://$server_ip:3000"
        echo "  MinIO控制台: http://$server_ip:9001"
    else
        echo "  前端: http://$server_ip:8080"
        echo "  API: http://$server_ip:3000"
        echo "  MinIO控制台: http://$server_ip:9001"
    fi
    
    echo "=========================================="
    
    # 显示资源使用情况
    if [[ "$VERBOSE" == "true" ]]; then
        echo "资源使用情况:"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -10
        echo "=========================================="
    fi
}

# 主函数
main() {
    log_info "开始启动 Wedding Club 服务 ($ENVIRONMENT 环境)"
    
    # 信号处理
    trap 'log_error "启动被中断"; exit 1' INT TERM
    
    detect_environment
    check_dependencies
    create_directories
    stop_existing_services
    start_services
    wait_for_services
    show_service_status
    
    log_success "🎉 Wedding Club 服务启动完成！"
    
    if [[ "$WAIT_FOR_READY" == "true" ]]; then
        log_info "提示: 所有服务已就绪，可以开始使用"
    else
        log_info "提示: 服务正在后台启动，请稍等片刻后访问"
    fi
}

# 运行主函数
main "$@"
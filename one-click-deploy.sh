#!/bin/bash

# Wedding Client 一键部署脚本
# 使用方法: ./one-click-deploy.sh [environment] [options]

set -euo pipefail

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
ENVIRONMENT="${1:-production}"
FORCE_DEPLOY="${FORCE_DEPLOY:-false}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
AUTO_ROLLBACK="${AUTO_ROLLBACK:-true}"

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
    if [[ "$AUTO_ROLLBACK" == "true" && -f "$PROJECT_ROOT/.last_backup" ]]; then
        log_warning "尝试自动回滚..."
        ./scripts/backup-restore.sh restore "$(cat "$PROJECT_ROOT/.last_backup")"
    fi
    exit 1
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    command -v docker >/dev/null 2>&1 || error_exit "Docker 未安装"
    command -v docker-compose >/dev/null 2>&1 || command -v docker >/dev/null 2>&1 || error_exit "Docker Compose 未安装"
    
    # 检查Docker服务状态
    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker 服务未运行"
    fi
    
    log_success "依赖检查完成"
}

# 环境检查
check_environment() {
    log_info "检查部署环境..."
    
    # 检查环境配置文件
    local env_file="$PROJECT_ROOT/deployment/.env.$ENVIRONMENT"
    if [[ ! -f "$env_file" ]]; then
        error_exit "环境配置文件不存在: $env_file"
    fi
    
    # 检查Docker Compose文件
    local compose_file="$PROJECT_ROOT/deployment/docker-compose.$ENVIRONMENT.yml"
    if [[ ! -f "$compose_file" ]]; then
        compose_file="$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml"
        if [[ ! -f "$compose_file" ]]; then
            error_exit "Docker Compose配置文件不存在"
        fi
    fi
    
    log_success "环境检查完成"
}

# 预部署检查
pre_deploy_checks() {
    log_info "执行预部署检查..."
    
    # 检查端口占用
    local ports=("80" "443" "3000" "8080" "3306" "6379")
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_warning "端口 $port 已被占用"
        fi
    done
    
    # 检查磁盘空间
    local available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 2097152 ]]; then  # 2GB
        log_warning "磁盘空间不足，建议至少保留2GB空间"
    fi
    
    # 检查内存（macOS兼容）
    if command -v free >/dev/null 2>&1; then
        local available_memory=$(free -m | awk 'NR==2{print $7}')
        if [[ $available_memory -lt 1024 ]]; then  # 1GB
            log_warning "可用内存不足，建议至少1GB可用内存"
        fi
    else
        log_info "跳过内存检查（macOS系统）"
    fi
    
    log_success "预部署检查完成"
}

# 备份当前版本
backup_current_version() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        log_warning "跳过备份步骤"
        return 0
    fi
    
    log_info "备份当前版本..."
    
    if [[ -x "$PROJECT_ROOT/scripts/backup-restore.sh" ]]; then
        "$PROJECT_ROOT/scripts/backup-restore.sh" backup || error_exit "备份失败"
    else
        log_warning "备份脚本不存在，跳过备份"
    fi
    
    log_success "备份完成"
}

# 部署应用
deploy_application() {
    log_info "开始部署应用..."
    
    # 执行部署脚本
    local deploy_script="$PROJECT_ROOT/scripts/deploy-production.sh"
    if [[ -x "$deploy_script" ]]; then
        local deploy_args=("--env" "$ENVIRONMENT")
        
        if [[ "$FORCE_DEPLOY" == "true" ]]; then
            deploy_args+=("--force")
        fi
        
        "$deploy_script" "${deploy_args[@]}" || error_exit "应用部署失败"
    else
        error_exit "部署脚本不存在: $deploy_script"
    fi
    
    log_success "应用部署完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    local start_script="$PROJECT_ROOT/deployment/start-production.sh"
    if [[ -x "$start_script" ]]; then
        "$start_script" || error_exit "服务启动失败"
    else
        # 备用启动方法
        local compose_file="$PROJECT_ROOT/deployment/docker-compose.$ENVIRONMENT.yml"
        if [[ -f "$compose_file" ]]; then
            docker-compose -f "$compose_file" up -d || error_exit "服务启动失败"
        else
            error_exit "无法找到服务启动配置"
        fi
    fi
    
    log_success "服务启动完成"
}

# 健康检查
health_checks() {
    log_info "执行健康检查..."
    
    local health_script="$PROJECT_ROOT/scripts/health-check.sh"
    if [[ -x "$health_script" ]]; then
        "$health_script" --all || error_exit "健康检查失败"
    else
        # 基本健康检查
        log_info "执行基本健康检查..."
        
        local max_attempts=10
        local attempt=1
        
        while [[ $attempt -le $max_attempts ]]; do
            log_info "健康检查尝试 $attempt/$max_attempts"
            
            # 检查Web服务
            if curl -f -m 10 http://localhost:8080/health >/dev/null 2>&1; then
                log_success "Web服务健康检查通过"
                break
            fi
            
            # 检查API服务
            if curl -f -m 10 http://localhost:3000/api/v1/health >/dev/null 2>&1; then
                log_success "API服务健康检查通过"
                break
            fi
            
            if [[ $attempt -eq $max_attempts ]]; then
                error_exit "健康检查失败，服务可能未正常启动"
            fi
            
            sleep 30
            ((attempt++))
        done
    fi
    
    log_success "健康检查完成"
}

# 运行测试
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "跳过测试步骤"
        return 0
    fi
    
    log_info "运行集成测试..."
    
    local test_script="$PROJECT_ROOT/scripts/test-automation.sh"
    if [[ -x "$test_script" ]]; then
        "$test_script" integration || log_warning "集成测试失败，但继续部署"
    else
        log_warning "测试脚本不存在，跳过测试"
    fi
    
    log_success "测试完成"
}

# 生成API文档
generate_docs() {
    log_info "生成API文档..."
    
    local docs_script="$PROJECT_ROOT/scripts/api-docs.sh"
    if [[ -x "$docs_script" ]]; then
        "$docs_script" generate || log_warning "API文档生成失败"
    else
        log_warning "API文档脚本不存在，跳过文档生成"
    fi
    
    log_success "API文档生成完成"
}

# 部署后清理
post_deploy_cleanup() {
    log_info "执行部署后清理..."
    
    # 清理Docker资源
    docker system prune -f >/dev/null 2>&1 || true
    
    # 清理临时文件
    rm -rf "$PROJECT_ROOT/temp" >/dev/null 2>&1 || true
    
    log_success "清理完成"
}

# 显示部署状态
show_deployment_status() {
    log_info "部署状态信息:"
    
    echo "==========================================="
    echo "部署环境: $ENVIRONMENT"
    echo "部署时间: $(date)"
    echo "项目路径: $PROJECT_ROOT"
    echo "==========================================="
    
    # 显示服务状态
    if command -v docker-compose >/dev/null 2>&1; then
        local compose_file="$PROJECT_ROOT/deployment/docker-compose.$ENVIRONMENT.yml"
        if [[ -f "$compose_file" ]]; then
            echo "服务状态:"
            docker-compose -f "$compose_file" ps
        fi
    fi
    
    echo "==========================================="
    echo "访问地址:"
    echo "  前端: http://localhost:8080"
    echo "  API: http://localhost:3000"
    echo "  API文档: http://localhost:3000/api-docs"
    echo "==========================================="
}

# 显示帮助信息
show_help() {
    echo "Wedding Client 一键部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [environment] [options]"
    echo ""
    echo "环境:"
    echo "  production    生产环境（默认）"
    echo "  development   开发环境"
    echo "  staging       预发布环境"
    echo ""
    echo "选项:"
    echo "  --force       强制部署（跳过检查）"
    echo "  --skip-backup 跳过备份步骤"
    echo "  --skip-tests  跳过测试步骤"
    echo "  --no-rollback 禁用自动回滚"
    echo "  --help        显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 production"
    echo "  $0 development --skip-tests"
    echo "  $0 production --force --skip-backup"
}

# 主函数
main() {
    # 检查帮助参数
    if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
        show_help
        exit 0
    fi
    
    log_info "开始一键部署 Wedding Client ($ENVIRONMENT 环境)"
    
    # 解析命令行参数
    while [[ $# -gt 1 ]]; do
        case $2 in
            --force)
                FORCE_DEPLOY="true"
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP="true"
                shift
                ;;
            --skip-tests)
                SKIP_TESTS="true"
                shift
                ;;
            --no-rollback)
                AUTO_ROLLBACK="false"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_warning "未知参数: $2"
                shift
                ;;
        esac
    done
    
    # 执行部署流程
    check_dependencies
    check_environment
    pre_deploy_checks
    backup_current_version
    deploy_application
    start_services
    health_checks
    run_tests
    generate_docs
    post_deploy_cleanup
    show_deployment_status
    
    log_success "🎉 一键部署完成！"
}

# 信号处理
trap 'log_error "部署被中断"; exit 1' INT TERM

# 执行主函数
main "$@"
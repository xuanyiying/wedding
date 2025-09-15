#!/bin/bash

# =============================================================================
# Wedding Club 环境切换脚本
# =============================================================================
# 快速切换不同部署环境的辅助脚本
# =============================================================================

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 显示帮助
show_help() {
    cat << EOF
Wedding Club 环境切换脚本

使用方法:
    $0 <环境> [操作]

环境:
    dev     - 开发环境
    test    - 测试环境
    prod    - 生产环境

操作:
    switch  - 切换环境 (默认)
    status  - 查看当前环境状态
    compare - 比较环境配置差异

示例:
    $0 dev              # 切换到开发环境
    $0 prod switch      # 切换到生产环境
    $0 test status      # 查看测试环境状态
    $0 compare          # 比较所有环境配置

EOF
}

# 验证环境
validate_environment() {
    local env="$1"
    case $env in
        dev|test|prod)
            return 0
            ;;
        *)
            log_error "无效环境: $env"
            log_error "支持的环境: dev, test, prod"
            return 1
            ;;
    esac
}

# 检查环境文件
check_env_files() {
    local missing_files=()
    
    for env in dev test prod; do
        local env_file="$PROJECT_ROOT/deployment/environments/.env.$env"
        if [[ ! -f "$env_file" ]]; then
            missing_files+=("$env_file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "缺少环境配置文件:"
        for file in "${missing_files[@]}"; do
            log_error "  - $file"
        done
        return 1
    fi
    
    return 0
}

# 获取当前运行的环境
get_current_environment() {
    local current_containers
    current_containers=$(docker ps --format "{{.Names}}" | grep "^wedding-" | head -1)
    
    if [[ -n "$current_containers" ]]; then
        # 从容器名中提取环境名
        echo "$current_containers" | sed -n 's/wedding-.*-\([^-]*\)$/\1/p'
    else
        echo "none"
    fi
}

# 停止当前环境
stop_current_environment() {
    local current_env
    current_env=$(get_current_environment)
    
    if [[ "$current_env" != "none" ]]; then
        log_info "停止当前环境: $current_env"
        cd "$PROJECT_ROOT"
        ENVIRONMENT="$current_env" ./deploy.sh "$current_env" stop
    else
        log_info "当前没有运行的环境"
    fi
}

# 切换环境
switch_environment() {
    local target_env="$1"
    
    log_info "切换到环境: $target_env"
    
    # 检查环境文件
    if ! check_env_files; then
        return 1
    fi
    
    # 验证目标环境
    if ! validate_environment "$target_env"; then
        return 1
    fi
    
    # 停止当前环境
    stop_current_environment
    
    # 启动目标环境
    log_info "启动环境: $target_env"
    cd "$PROJECT_ROOT"
    ENVIRONMENT="$target_env" ./deploy.sh "$target_env" deploy
    
    log_success "环境切换完成: $target_env"
    
    # 显示环境信息
    show_environment_info "$target_env"
}

# 显示环境状态
show_environment_status() {
    local env="$1"
    
    log_info "环境状态: $env"
    
    # 检查环境文件
    local env_file="$PROJECT_ROOT/deployment/environments/.env.$env"
    if [[ ! -f "$env_file" ]]; then
        log_error "环境配置文件不存在: $env_file"
        return 1
    fi
    
    # 显示环境配置摘要
    echo
    log_info "环境配置摘要:"
    echo "  配置文件: $env_file"
    
    # 提取关键配置
    if [[ -f "$env_file" ]]; then
        echo "  域名: $(grep "^DOMAIN=" "$env_file" | cut -d'=' -f2)"
        echo "  Web端口: $(grep "^WEB_PORT=" "$env_file" | cut -d'=' -f2)"
        echo "  API端口: $(grep "^SERVER_PORT=" "$env_file" | cut -d'=' -f2)"
        echo "  数据库: $(grep "^MYSQL_DATABASE=" "$env_file" | cut -d'=' -f2)"
        echo "  日志级别: $(grep "^LOG_LEVEL=" "$env_file" | cut -d'=' -f2)"
    fi
    
    # 检查容器状态
    echo
    log_info "容器状态:"
    local containers
    containers=$(docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "wedding-.*-$env" || true)
    
    if [[ -n "$containers" ]]; then
        echo "$containers"
    else
        log_warning "没有找到 $env 环境的容器"
    fi
    
    # 检查网络
    echo
    log_info "网络状态:"
    local network_name="wedding-$env-network"
    if docker network ls | grep -q "$network_name"; then
        log_success "网络 $network_name 存在"
    else
        log_warning "网络 $network_name 不存在"
    fi
    
    # 检查数据卷
    echo
    log_info "数据卷状态:"
    local volumes
    volumes=$(docker volume ls --format "{{.Name}}" | grep "wedding-.*-$env" || true)
    
    if [[ -n "$volumes" ]]; then
        echo "$volumes" | while read -r volume; do
            log_success "数据卷: $volume"
        done
    else
        log_warning "没有找到 $env 环境的数据卷"
    fi
}

# 显示环境信息
show_environment_info() {
    local env="$1"
    local env_file="$PROJECT_ROOT/deployment/environments/.env.$env"
    
    echo
    log_success "环境信息:"
    echo "  环境: $env"
    echo "  配置文件: $env_file"
    
    if [[ -f "$env_file" ]]; then
        local domain web_port
        domain=$(grep "^DOMAIN=" "$env_file" | cut -d'=' -f2)
        web_port=$(grep "^WEB_PORT=" "$env_file" | cut -d'=' -f2)
        
        echo "  访问地址: http://$domain:$web_port"
        echo "  API文档: http://$domain:$web_port/api/v1/docs"
    fi
    
    echo
    log_info "常用命令:"
    echo "  查看日志: ./deploy.sh $env logs"
    echo "  查看状态: ./deploy.sh $env status"
    echo "  重启服务: ./deploy.sh $env restart"
    echo "  停止服务: ./deploy.sh $env stop"
}

# 比较环境配置
compare_environments() {
    log_info "比较环境配置差异"
    
    local envs=("dev" "test" "prod")
    local env_files=()
    
    # 检查所有环境文件
    for env in "${envs[@]}"; do
        local env_file="$PROJECT_ROOT/deployment/environments/.env.$env"
        if [[ -f "$env_file" ]]; then
            env_files+=("$env_file")
        else
            log_warning "环境文件不存在: $env_file"
        fi
    done
    
    if [[ ${#env_files[@]} -lt 2 ]]; then
        log_error "至少需要两个环境文件才能比较"
        return 1
    fi
    
    # 提取所有配置键
    local all_keys
    all_keys=$(grep -h "^[A-Z_]*=" "${env_files[@]}" | cut -d'=' -f1 | sort -u)
    
    echo
    printf "%-25s" "配置项"
    for env in "${envs[@]}"; do
        printf "%-20s" "$env"
    done
    echo
    
    printf "%-25s" "$(printf '%.0s-' {1..25})"
    for env in "${envs[@]}"; do
        printf "%-20s" "$(printf '%.0s-' {1..20})"
    done
    echo
    
    # 比较每个配置项
    while IFS= read -r key; do
        printf "%-25s" "$key"
        
        for env in "${envs[@]}"; do
            local env_file="$PROJECT_ROOT/deployment/environments/.env.$env"
            local value=""
            
            if [[ -f "$env_file" ]]; then
                value=$(grep "^$key=" "$env_file" 2>/dev/null | cut -d'=' -f2- || echo "")
            fi
            
            # 截断长值
            if [[ ${#value} -gt 18 ]]; then
                value="${value:0:15}..."
            fi
            
            printf "%-20s" "$value"
        done
        echo
    done <<< "$all_keys"
}

# 主函数
main() {
    if [[ $# -eq 0 ]]; then
        show_help
        exit 0
    fi
    
    local environment="$1"
    local action="${2:-switch}"
    
    case "$action" in
        switch)
            if ! validate_environment "$environment"; then
                exit 1
            fi
            switch_environment "$environment"
            ;;
        status)
            if ! validate_environment "$environment"; then
                exit 1
            fi
            show_environment_status "$environment"
            ;;
        compare)
            compare_environments
            ;;
        *)
            log_error "无效操作: $action"
            show_help
            exit 1
            ;;
    esac
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
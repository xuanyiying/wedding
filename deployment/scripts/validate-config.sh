#!/bin/bash

# =============================================================================
# Wedding Club 配置验证脚本
# =============================================================================
# 验证环境配置文件的完整性和一致性
# =============================================================================

set -euo pipefail

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

# 验证环境配置文件
validate_env_file() {
    local env_file="$1"
    local env_name="$2"
    
    log_info "验证 $env_name 环境配置文件: $env_file"
    
    if [[ ! -f "$env_file" ]]; then
        log_error "配置文件不存在: $env_file"
        return 1
    fi
    
    # 必需的配置项
    local required_vars=(
        "ENVIRONMENT"
        "NODE_ENV"
        "OSS_TYPE"
        "OSS_ENDPOINT"
        "OSS_ACCESS_KEY"
        "OSS_SECRET_KEY"
        "OSS_BUCKET"
        "DB_HOST"
        "DB_NAME"
        "DB_USER"
        "DB_PASSWORD"
        "MYSQL_ROOT_PASSWORD"
        "MYSQL_DATABASE"
        "REDIS_HOST"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "VITE_API_BASE_URL"
    )
    
    local missing_vars=()
    
    # 检查必需变量
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "$env_name 环境缺少以下必需配置项:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
    
    # 检查配置一致性
    local oss_type=$(grep "^OSS_TYPE=" "$env_file" | cut -d'=' -f2)
    local db_host=$(grep "^DB_HOST=" "$env_file" | cut -d'=' -f2)
    local redis_host=$(grep "^REDIS_HOST=" "$env_file" | cut -d'=' -f2)
    
    log_info "  OSS类型: $oss_type"
    log_info "  数据库主机: $db_host"
    log_info "  Redis主机: $redis_host"
    
    # 检查重复配置项
    local duplicate_vars=(
        "DB_HOST"
        "DB_NAME"
        "DB_USER"
        "DB_PASSWORD"
        "REDIS_HOST"
        "REDIS_PORT"
        "VITE_API_BASE_URL"
    )
    
    for var in "${duplicate_vars[@]}"; do
        local count=$(grep -c "^${var}=" "$env_file" || true)
        if [[ $count -gt 1 ]]; then
            log_warning "$env_name 环境中 $var 配置项重复 ($count 次)"
        fi
    done
    
    log_success "$env_name 环境配置验证通过"
    return 0
}

# 验证配置一致性
validate_consistency() {
    log_info "验证环境间配置一致性"
    
    # 检查OSS配置命名一致性
    for env in dev test prod; do
        local env_file="deployment/environments/.env.$env"
        if [[ -f "$env_file" ]]; then
            # 检查是否使用了统一的OSS_前缀
            if grep -q "^MINIO_ROOT_USER=" "$env_file" && grep -q "^OSS_ACCESS_KEY=" "$env_file"; then
                log_success "$env 环境正确使用了OSS_和MINIO_双重配置"
            else
                log_warning "$env 环境OSS配置可能不完整"
            fi
            
            # 检查是否使用了统一的DB_前缀
            if grep -q "^DB_HOST=" "$env_file" && grep -q "^MYSQL_ROOT_PASSWORD=" "$env_file"; then
                log_success "$env 环境正确使用了DB_和MYSQL_双重配置"
            else
                log_warning "$env 环境数据库配置可能不完整"
            fi
        fi
    done
}

# 主函数
main() {
    log_info "=== Wedding Club 配置验证开始 ==="
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root="$(cd "$script_dir/../.." && pwd)"
    
    cd "$project_root"
    
    local validation_failed=false
    
    # 验证各环境配置文件
    for env in dev test prod; do
        local env_file="deployment/environments/.env.$env"
        if ! validate_env_file "$env_file" "$env"; then
            validation_failed=true
        fi
        echo
    done
    
    # 验证配置一致性
    validate_consistency
    echo
    
    # 检查是否存在重复的配置文件
    if [[ -f "web/.env" ]]; then
        log_warning "发现重复的配置文件: web/.env"
        log_info "建议删除此文件，使用统一的环境配置"
    else
        log_success "没有发现重复的配置文件"
    fi
    
    if [[ "$validation_failed" == "true" ]]; then
        log_error "=== 配置验证失败 ==="
        exit 1
    else
        log_success "=== 配置验证通过 ==="
    fi
}

# 执行主函数
main "$@"
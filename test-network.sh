#!/bin/bash

# 测试网络配置脚本
# 用于验证动态网络分配逻辑

set -e

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

# 检查Docker网络配置
check_docker_network() {
    log_info "检查Docker网络配置..."
    
    # 清理已存在的wedding-net网络
    if docker network ls --format "table {{.Name}}\t{{.Driver}}" | grep -q "wedding-net"; then
        log_info "发现已存在的wedding-net网络，将进行清理"
        # 停止使用该网络的容器
        docker-compose down --remove-orphans 2>/dev/null || true
        # 强制删除网络
        docker network rm wedding-net 2>/dev/null || true
        sleep 2
    fi
    
    # 清理所有未使用的网络
    log_info "清理未使用的Docker网络..."
    docker network prune -f 2>/dev/null || true
    
    # 检查可用的子网范围
    log_info "检查网络子网可用性..."
    local test_subnets=("172.20.0.0/16" "172.21.0.0/16" "172.22.0.0/16" "172.23.0.0/16" "10.20.0.0/16")
    AVAILABLE_SUBNET=""
    AVAILABLE_GATEWAY=""
    
    for subnet in "${test_subnets[@]}"; do
        local network_prefix=$(echo $subnet | cut -d'/' -f1 | cut -d'.' -f1-2)
        local gateway="${network_prefix}.0.1"
        
        log_info "测试子网: $subnet (网关: $gateway)"
        
        # 检查路由表冲突
        if ! ip route | grep -q "$network_prefix"; then
            log_success "路由表检查通过: $network_prefix"
            # 检查Docker网络冲突
            if ! docker network ls --format "table {{.Name}}\t{{.Subnet}}" | grep -q "$network_prefix"; then
                log_success "Docker网络检查通过: $network_prefix"
                AVAILABLE_SUBNET="$subnet"
                AVAILABLE_GATEWAY="$gateway"
                log_success "找到可用子网: $subnet (网关: $gateway)"
                break
            else
                log_warning "Docker网络冲突: $network_prefix"
            fi
        else
            log_warning "路由表冲突: $network_prefix"
        fi
    done
    
    if [[ -z "$AVAILABLE_SUBNET" ]]; then
        log_error "无法找到可用的网络子网，请手动清理网络冲突"
        log_info "当前Docker网络:"
        docker network ls
        log_info "当前路由表:"
        ip route | grep -E "172\.|10\."
        return 1
    fi
    
    log_success "Docker网络检查完成，将使用子网: $AVAILABLE_SUBNET"
    return 0
}

# 测试网络创建
test_network_creation() {
    log_info "测试创建Docker网络..."
    
    if [[ -z "$AVAILABLE_SUBNET" ]] || [[ -z "$AVAILABLE_GATEWAY" ]]; then
        log_error "未找到可用的网络子网配置"
        return 1
    fi
    
    docker network create \
        --driver bridge \
        --subnet="$AVAILABLE_SUBNET" \
        --gateway="$AVAILABLE_GATEWAY" \
        --opt com.docker.network.bridge.name=wedding-br0 \
        --opt com.docker.network.driver.mtu=1500 \
        wedding-net || {
        log_error "创建Docker网络失败，子网: $AVAILABLE_SUBNET"
        log_info "尝试清理网络冲突..."
        docker network prune -f 2>/dev/null || true
        return 1
    }
    
    log_success "Docker网络创建成功，使用子网: $AVAILABLE_SUBNET"
    
    # 显示网络信息
    log_info "网络详细信息:"
    docker network inspect wedding-net
    
    return 0
}

# 清理测试网络
cleanup_test_network() {
    log_info "清理测试网络..."
    docker network rm wedding-net 2>/dev/null || true
    log_success "测试网络清理完成"
}

# 主函数
main() {
    echo "=== Docker网络配置测试脚本 ==="
    echo
    
    # 检查Docker是否运行
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker未运行或无权限访问"
        exit 1
    fi
    
    # 检查网络配置
    if check_docker_network; then
        # 测试网络创建
        if test_network_creation; then
            log_success "网络配置测试成功！"
            echo
            echo "=== 测试结果 ==="
            echo "可用子网: $AVAILABLE_SUBNET"
            echo "网关地址: $AVAILABLE_GATEWAY"
            echo "网络名称: wedding-net"
            echo
            
            # 清理测试网络
            cleanup_test_network
        else
            log_error "网络创建测试失败"
            exit 1
        fi
    else
        log_error "网络配置检查失败"
        exit 1
    fi
}

# 运行主函数
main "$@"
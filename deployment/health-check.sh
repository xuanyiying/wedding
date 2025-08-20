#!/bin/bash

# 健康检查脚本
# 用于监控Wedding Client应用的健康状态

set -e

# 配置
FRONTEND_URL="http://114.132.225.94"
BACKEND_URL="http://114.132.225.94/api/v1/health"
TIMEOUT=30
RETRY_COUNT=3
RETRY_DELAY=5
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Slack通知函数
send_slack_notification() {
    local message="$1"
    local emoji="$2"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{
                \"channel\": \"#monitoring\",
                \"username\": \"Wedding Health Monitor\",
                \"icon_emoji\": \"$emoji\",
                \"text\": \"$message\"
            }" \
            "$SLACK_WEBHOOK_URL" > /dev/null
    fi
}

# HTTP健康检查函数
check_http_endpoint() {
    local url="$1"
    local expected_status="$2"
    local service_name="$3"
    
    log_info "检查 $service_name: $url"
    
    for i in $(seq 1 $RETRY_COUNT); do
        if [ $i -gt 1 ]; then
            log_info "重试 $i/$RETRY_COUNT..."
            sleep $RETRY_DELAY
        fi
        
        # 执行HTTP请求
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "HTTPSTATUS:000")
        
        # 提取HTTP状态码
        http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        
        # 提取响应体
        response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
        
        if [ "$http_status" = "$expected_status" ]; then
            log_info "$service_name 健康检查通过 (状态码: $http_status)"
            return 0
        else
            log_warn "$service_name 健康检查失败 (状态码: $http_status)"
        fi
    done
    
    log_error "$service_name 健康检查失败，已重试 $RETRY_COUNT 次"
    send_slack_notification ":warning: *健康检查失败*\\n服务: $service_name\\nURL: $url\\n状态码: $http_status\\n时间: $(date '+%Y-%m-%d %H:%M:%S')" ":warning:"
    return 1
}

# 检查Docker容器状态
check_docker_containers() {
    log_info "检查Docker容器状态"
    
    # 检查容器是否运行
    local containers=("wedding-client-web" "wedding-client-server" "wedding-client-nginx")
    local failed_containers=()
    
    for container in "${containers[@]}"; do
        if ! docker ps --format "table {{.Names}}" | grep -q "$container"; then
            log_error "容器 $container 未运行"
            failed_containers+=("$container")
        else
            log_info "容器 $container 正在运行"
        fi
    done
    
    if [ ${#failed_containers[@]} -gt 0 ]; then
        local failed_list=$(IFS=', '; echo "${failed_containers[*]}")
        send_slack_notification ":x: *Docker容器异常*\\n失败容器: $failed_list\\n时间: $(date '+%Y-%m-%d %H:%M:%S')" ":x:"
        return 1
    fi
    
    return 0
}

# 检查磁盘空间
check_disk_space() {
    log_info "检查磁盘空间"
    
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    local threshold=85
    
    if [ "$disk_usage" -gt "$threshold" ]; then
        log_warn "磁盘使用率过高: ${disk_usage}%"
        send_slack_notification ":warning: *磁盘空间警告*\\n使用率: ${disk_usage}%\\n阈值: ${threshold}%\\n时间: $(date '+%Y-%m-%d %H:%M:%S')" ":warning:"
        return 1
    else
        log_info "磁盘使用率正常: ${disk_usage}%"
    fi
    
    return 0
}

# 检查内存使用
check_memory_usage() {
    log_info "检查内存使用"
    
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    local threshold=90
    
    if [ "$memory_usage" -gt "$threshold" ]; then
        log_warn "内存使用率过高: ${memory_usage}%"
        send_slack_notification ":warning: *内存使用警告*\\n使用率: ${memory_usage}%\\n阈值: ${threshold}%\\n时间: $(date '+%Y-%m-%d %H:%M:%S')" ":warning:"
        return 1
    else
        log_info "内存使用率正常: ${memory_usage}%"
    fi
    
    return 0
}

# 主函数
main() {
    log_info "开始健康检查..."
    
    local exit_code=0
    
    # 检查前端
    if ! check_http_endpoint "$FRONTEND_URL" "200" "前端服务"; then
        exit_code=1
    fi
    
    # 检查后端API
    if ! check_http_endpoint "$BACKEND_URL" "200" "后端API"; then
        exit_code=1
    fi
    
    # 检查Docker容器
    if ! check_docker_containers; then
        exit_code=1
    fi
    
    # 检查系统资源
    check_disk_space || exit_code=1
    check_memory_usage || exit_code=1
    
    if [ $exit_code -eq 0 ]; then
        log_info "所有健康检查通过"
        # 可选：发送成功通知（避免过多通知）
        # send_slack_notification ":white_check_mark: 所有服务健康检查通过" ":white_check_mark:"
    else
        log_error "健康检查发现问题"
        send_slack_notification ":x: *健康检查失败*\\n请检查系统状态\\n时间: $(date '+%Y-%m-%d %H:%M:%S')" ":x:"
    fi
    
    log_info "健康检查完成"
    exit $exit_code
}

# 处理命令行参数
case "${1:-}" in
    "--frontend-only")
        log_info "仅检查前端服务"
        check_http_endpoint "$FRONTEND_URL" "200" "前端服务"
        ;;
    "--backend-only")
        log_info "仅检查后端服务"
        check_http_endpoint "$BACKEND_URL" "200" "后端API"
        ;;
    "--docker-only")
        log_info "仅检查Docker容器"
        check_docker_containers
        ;;
    "--system-only")
        log_info "仅检查系统资源"
        check_disk_space
        check_memory_usage
        ;;
    "--help")
        echo "用法: $0 [选项]"
        echo "选项:"
        echo "  --frontend-only    仅检查前端服务"
        echo "  --backend-only     仅检查后端API"
        echo "  --docker-only      仅检查Docker容器"
        echo "  --system-only      仅检查系统资源"
        echo "  --help             显示此帮助信息"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "未知选项: $1"
        echo "使用 --help 查看可用选项"
        exit 1
        ;;
esac
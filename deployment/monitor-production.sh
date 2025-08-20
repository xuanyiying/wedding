#!/bin/bash

# ========================================
# Wedding Client - 生产环境监控脚本
# ========================================

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_header() {
    echo -e "${PURPLE}[MONITOR]${NC} $1"
}

# 全局变量
HEALTH_STATUS=0
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=80
ALERT_THRESHOLD_DISK=90

# 检查容器状态
check_container_status() {
    log_header "=== 容器状态检查 ==="
    
    local containers=("wedding-mysql-prod" "wedding-redis-prod" "wedding-minio-prod" "wedding-api-prod" "wedding-web-prod")
    local all_healthy=true
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "$container"; then
            local status=$(docker ps --format "{{.Status}}" --filter "name=$container")
            if [[ $status == *"Up"* ]]; then
                log_success "$container: 运行中 ($status)"
            else
                log_error "$container: 状态异常 ($status)"
                all_healthy=false
                HEALTH_STATUS=1
            fi
        else
            log_error "$container: 未运行"
            all_healthy=false
            HEALTH_STATUS=1
        fi
    done
    
    if [[ "$all_healthy" == true ]]; then
        log_success "所有容器运行正常"
    fi
    echo ""
}

# 检查服务健康状态
check_service_health() {
    log_header "=== 服务健康检查 ==="
    
    # 检查MySQL
    log_info "检查MySQL服务..."
    if docker exec wedding-mysql-prod mysqladmin ping -h localhost --silent 2>/dev/null; then
        log_success "MySQL: 健康"
    else
        log_error "MySQL: 不健康"
        HEALTH_STATUS=1
    fi
    
    # 检查Redis
    log_info "检查Redis服务..."
    if docker exec wedding-redis-prod redis-cli ping 2>/dev/null | grep -q PONG; then
        log_success "Redis: 健康"
    else
        log_error "Redis: 不健康"
        HEALTH_STATUS=1
    fi
    
    # 检查MinIO
    log_info "检查MinIO服务..."
    if curl -f http://localhost:9000/minio/health/live 2>/dev/null >/dev/null; then
        log_success "MinIO: 健康"
    else
        log_error "MinIO: 不健康"
        HEALTH_STATUS=1
    fi
    
    # 检查API服务
    log_info "检查API服务..."
    if curl -f http://localhost:3000/health 2>/dev/null >/dev/null; then
        log_success "API: 健康"
    else
        log_error "API: 不健康"
        HEALTH_STATUS=1
    fi
    
    # 检查Web服务
    log_info "检查Web服务..."
    if curl -f http://localhost:80/health 2>/dev/null >/dev/null; then
        log_success "Web: 健康"
    else
        log_error "Web: 不健康"
        HEALTH_STATUS=1
    fi
    
    echo ""
}

# 检查资源使用情况
check_resource_usage() {
    log_header "=== 资源使用情况 ==="
    
    local containers=("wedding-mysql-prod" "wedding-redis-prod" "wedding-minio-prod" "wedding-api-prod" "wedding-web-prod")
    
    for container in "${containers[@]}"; do
        if docker ps --filter "name=$container" --format "{{.Names}}" | grep -q "$container"; then
            log_info "$container 资源使用:"
            
            # 获取资源使用统计
            local stats=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" "$container" 2>/dev/null || echo "N/A\tN/A\tN/A")
            
            if [[ "$stats" != "N/A"* ]]; then
                echo "  $stats"
                
                # 提取CPU和内存使用率
                local cpu_percent=$(echo "$stats" | tail -n 1 | awk '{print $1}' | sed 's/%//')
                local mem_percent=$(echo "$stats" | tail -n 1 | awk '{print $3}' | sed 's/%//')
                
                # 检查是否超过阈值
                if [[ -n "$cpu_percent" ]] && (( $(echo "$cpu_percent > $ALERT_THRESHOLD_CPU" | bc -l) )); then
                    log_warning "$container CPU使用率过高: ${cpu_percent}%"
                fi
                
                if [[ -n "$mem_percent" ]] && (( $(echo "$mem_percent > $ALERT_THRESHOLD_MEMORY" | bc -l) )); then
                    log_warning "$container 内存使用率过高: ${mem_percent}%"
                fi
            else
                log_warning "无法获取 $container 的资源使用统计"
            fi
        fi
    done
    
    echo ""
}

# 检查磁盘使用情况
check_disk_usage() {
    log_header "=== 磁盘使用情况 ==="
    
    # 检查主机磁盘使用
    local disk_usage=$(df -h / | tail -n 1 | awk '{print $5}' | sed 's/%//')
    log_info "主机根分区使用率: ${disk_usage}%"
    
    if (( disk_usage > ALERT_THRESHOLD_DISK )); then
        log_warning "磁盘使用率过高: ${disk_usage}%"
        HEALTH_STATUS=1
    fi
    
    # 检查数据目录
    if [[ -d "data" ]]; then
        local data_size=$(du -sh data 2>/dev/null | awk '{print $1}' || echo "N/A")
        log_info "数据目录大小: $data_size"
    fi
    
    # 检查日志目录
    if [[ -d "logs" ]]; then
        local logs_size=$(du -sh logs 2>/dev/null | awk '{print $1}' || echo "N/A")
        log_info "日志目录大小: $logs_size"
    fi
    
    echo ""
}

# 检查网络连接
check_network_connectivity() {
    log_header "=== 网络连接检查 ==="
    
    # 检查容器间网络
    log_info "检查容器网络连接..."
    
    # API到MySQL连接
    if docker exec wedding-api-prod nc -z wedding-mysql-prod 3306 2>/dev/null; then
        log_success "API -> MySQL: 连接正常"
    else
        log_error "API -> MySQL: 连接失败"
        HEALTH_STATUS=1
    fi
    
    # API到Redis连接
    if docker exec wedding-api-prod nc -z wedding-redis-prod 6379 2>/dev/null; then
        log_success "API -> Redis: 连接正常"
    else
        log_error "API -> Redis: 连接失败"
        HEALTH_STATUS=1
    fi
    
    # API到MinIO连接
    if docker exec wedding-api-prod nc -z wedding-minio-prod 9000 2>/dev/null; then
        log_success "API -> MinIO: 连接正常"
    else
        log_error "API -> MinIO: 连接失败"
        HEALTH_STATUS=1
    fi
    
    echo ""
}

# 检查日志错误
check_logs_for_errors() {
    log_header "=== 日志错误检查 ==="
    
    local containers=("wedding-api-prod" "wedding-web-prod")
    local error_patterns=("ERROR" "FATAL" "Exception" "Error:" "Failed")
    
    for container in "${containers[@]}"; do
        if docker ps --filter "name=$container" --format "{{.Names}}" | grep -q "$container"; then
            log_info "检查 $container 日志错误..."
            
            # 获取最近5分钟的日志
            local recent_logs=$(docker logs --since=5m "$container" 2>&1 || echo "")
            
            if [[ -n "$recent_logs" ]]; then
                local error_count=0
                for pattern in "${error_patterns[@]}"; do
                    local count=$(echo "$recent_logs" | grep -i "$pattern" | wc -l)
                    error_count=$((error_count + count))
                done
                
                if (( error_count > 0 )); then
                    log_warning "$container: 发现 $error_count 个错误日志"
                    # 显示最近的几个错误
                    echo "$recent_logs" | grep -i -E "$(IFS='|'; echo "${error_patterns[*]}")" | tail -n 3 | while read -r line; do
                        echo "  $line"
                    done
                else
                    log_success "$container: 无错误日志"
                fi
            else
                log_info "$container: 无日志输出"
            fi
        fi
    done
    
    echo ""
}

# 检查数据库连接数
check_database_connections() {
    log_header "=== 数据库连接检查 ==="
    
    # MySQL连接数
    log_info "检查MySQL连接数..."
    local mysql_connections=$(docker exec wedding-mysql-prod mysql -u root -p"${MYSQL_ROOT_PASSWORD:-wedding123}" -e "SHOW STATUS LIKE 'Threads_connected';" 2>/dev/null | tail -n 1 | awk '{print $2}' || echo "N/A")
    
    if [[ "$mysql_connections" != "N/A" ]]; then
        log_info "MySQL当前连接数: $mysql_connections"
        if (( mysql_connections > 100 )); then
            log_warning "MySQL连接数过高: $mysql_connections"
        fi
    else
        log_warning "无法获取MySQL连接数"
    fi
    
    # Redis连接数
    log_info "检查Redis连接数..."
    local redis_connections=$(docker exec wedding-redis-prod redis-cli info clients 2>/dev/null | grep "connected_clients:" | cut -d: -f2 | tr -d '\r' || echo "N/A")
    
    if [[ "$redis_connections" != "N/A" ]]; then
        log_info "Redis当前连接数: $redis_connections"
        if (( redis_connections > 50 )); then
            log_warning "Redis连接数过高: $redis_connections"
        fi
    else
        log_warning "无法获取Redis连接数"
    fi
    
    echo ""
}

# 生成监控报告
generate_report() {
    local report_file="logs/monitor_report_$(date +%Y%m%d_%H%M%S).txt"
    mkdir -p logs
    
    {
        echo "========================================"
        echo "Wedding Client 生产环境监控报告"
        echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "========================================"
        echo ""
        
        # 容器状态
        echo "容器状态:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep wedding || echo "无运行的容器"
        echo ""
        
        # 资源使用
        echo "资源使用情况:"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep wedding || echo "无法获取资源使用情况"
        echo ""
        
        # 磁盘使用
        echo "磁盘使用情况:"
        df -h
        echo ""
        
        # 网络状态
        echo "网络状态:"
        docker network ls | grep wedding || echo "无相关网络"
        echo ""
        
        # 健康状态
        echo "整体健康状态: $([ $HEALTH_STATUS -eq 0 ] && echo '健康' || echo '异常')"
        
    } > "$report_file"
    
    log_success "监控报告已生成: $report_file"
}

# 发送告警（可扩展）
send_alert() {
    local message="$1"
    
    # 这里可以集成各种告警方式
    # 例如：邮件、Slack、钉钉、企业微信等
    
    log_warning "告警: $message"
    
    # 示例：写入告警日志
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ALERT: $message" >> logs/alerts.log
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --continuous     持续监控模式（每30秒检查一次）"
    echo "  --report         生成详细监控报告"
    echo "  --alert-cpu      CPU告警阈值（默认80%）"
    echo "  --alert-memory   内存告警阈值（默认80%）"
    echo "  --alert-disk     磁盘告警阈值（默认90%）"
    echo "  --help           显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                           # 单次检查"
    echo "  $0 --continuous              # 持续监控"
    echo "  $0 --report                  # 生成报告"
    echo "  $0 --alert-cpu 70 --report  # 设置CPU阈值并生成报告"
}

# 主函数
main() {
    echo "========================================"
    echo "Wedding Client - 生产环境监控"
    echo "========================================"
    echo ""
    
    # 切换到脚本所在目录
    cd "$(dirname "$0")"
    
    # 加载环境变量
    if [[ -f ".env.production" ]]; then
        set -a
        source .env.production
        set +a
    fi
    
    # 解析参数
    local continuous_mode=false
    local generate_report_flag=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --continuous)
                continuous_mode=true
                shift
                ;;
            --report)
                generate_report_flag=true
                shift
                ;;
            --alert-cpu)
                ALERT_THRESHOLD_CPU="$2"
                shift 2
                ;;
            --alert-memory)
                ALERT_THRESHOLD_MEMORY="$2"
                shift 2
                ;;
            --alert-disk)
                ALERT_THRESHOLD_DISK="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    # 执行监控检查
    run_monitoring_checks() {
        HEALTH_STATUS=0
        
        check_container_status
        check_service_health
        check_resource_usage
        check_disk_usage
        check_network_connectivity
        check_logs_for_errors
        check_database_connections
        
        # 显示整体状态
        if [[ $HEALTH_STATUS -eq 0 ]]; then
            log_success "系统整体状态: 健康"
        else
            log_error "系统整体状态: 异常"
            send_alert "生产环境检测到异常状态"
        fi
        
        echo "========================================"
    }
    
    # 持续监控模式
    if [[ "$continuous_mode" == true ]]; then
        log_info "启动持续监控模式（按 Ctrl+C 退出）..."
        
        while true; do
            run_monitoring_checks
            
            if [[ "$generate_report_flag" == true ]]; then
                generate_report
            fi
            
            log_info "等待30秒后进行下次检查..."
            sleep 30
        done
    else
        # 单次检查
        run_monitoring_checks
        
        if [[ "$generate_report_flag" == true ]]; then
            generate_report
        fi
    fi
}

# 信号处理
trap 'log_warning "监控脚本被中断"; exit 0' INT TERM

# 执行主函数
main "$@"
#!/bin/bash

# Wedding Club System Monitoring Script
# This script monitors application health, performance metrics, and system resources

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-development}"
MONITOR_INTERVAL="${MONITOR_INTERVAL:-30}"
ALERT_THRESHOLD_CPU="${ALERT_THRESHOLD_CPU:-80}"
ALERT_THRESHOLD_MEMORY="${ALERT_THRESHOLD_MEMORY:-85}"
ALERT_THRESHOLD_DISK="${ALERT_THRESHOLD_DISK:-90}"
LOG_FILE="${LOG_FILE:-$PROJECT_ROOT/logs/monitoring.log}"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    local message="$1"
    echo -e "${BLUE}[INFO]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $message" >> "$LOG_FILE"
}

log_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $message" >> "$LOG_FILE"
}

log_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $message" >> "$LOG_FILE"
}

log_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $message" >> "$LOG_FILE"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        local message="$1"
        echo -e "${BLUE}[VERBOSE]${NC} $message"
        echo "$(date '+%Y-%m-%d %H:%M:%S') [VERBOSE] $message" >> "$LOG_FILE"
    fi
}

# Help function
show_help() {
    cat << EOF
Wedding Club System Monitoring Script

Usage: $0 [OPTIONS] COMMAND

Commands:
    health              Check application health
    performance         Show performance metrics
    resources           Monitor system resources
    services            Check service status
    logs                Analyze application logs
    alerts              Check for alerts
    dashboard           Show monitoring dashboard
    continuous          Start continuous monitoring
    report              Generate monitoring report

Options:
    -e, --env ENV           Environment (development, staging, production)
    -i, --interval SEC      Monitoring interval in seconds (default: 30)
    -l, --log-file FILE     Log file path
    -v, --verbose           Enable verbose output
    --cpu-threshold NUM     CPU alert threshold percentage (default: 80)
    --memory-threshold NUM  Memory alert threshold percentage (default: 85)
    --disk-threshold NUM    Disk alert threshold percentage (default: 90)
    --help                  Show this help message

Examples:
    $0 health                           # Check application health
    $0 performance                      # Show performance metrics
    $0 continuous -i 60                 # Start continuous monitoring every 60 seconds
    $0 dashboard                        # Show monitoring dashboard
    $0 report                           # Generate monitoring report

EOF
}

# Parse command line arguments
COMMAND=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -i|--interval)
            MONITOR_INTERVAL="$2"
            shift 2
            ;;
        -l|--log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        --cpu-threshold)
            ALERT_THRESHOLD_CPU="$2"
            shift 2
            ;;
        --memory-threshold)
            ALERT_THRESHOLD_MEMORY="$2"
            shift 2
            ;;
        --disk-threshold)
            ALERT_THRESHOLD_DISK="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        health|performance|resources|services|logs|alerts|dashboard|continuous|report)
            COMMAND="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

if [[ -z "$COMMAND" ]]; then
    log_error "No command specified"
    show_help
    exit 1
fi

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Load environment configuration
load_env_config() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [[ -f "$env_file" ]]; then
        set -a  # automatically export all variables
        source "$env_file"
        set +a
        log_verbose "Loaded configuration for environment: $ENVIRONMENT"
    else
        log_warning "Environment file not found: $env_file"
    fi
}

# Check application health
check_health() {
    log_info "Checking application health for environment: $ENVIRONMENT"
    
    local health_status=0
    local services=("frontend" "api" "database" "redis")
    
    echo ""
    printf "%-15s %-10s %-50s\n" "Service" "Status" "Details"
    printf "%-15s %-10s %-50s\n" "-------" "------" "-------"
    
    # Check frontend
    local frontend_port="${FRONTEND_PORT:-8080}"
    if curl -f -m 10 "http://localhost:$frontend_port/health" >/dev/null 2>&1; then
        printf "%-15s %-10s %-50s\n" "Frontend" "✓ UP" "http://localhost:$frontend_port"
    else
        printf "%-15s %-10s %-50s\n" "Frontend" "✗ DOWN" "http://localhost:$frontend_port - Not responding"
        ((health_status++))
    fi
    
    # Check API
    local api_port="${PORT:-3000}"
    if curl -f -m 10 "http://localhost:$api_port/api/v1/health" >/dev/null 2>&1; then
        printf "%-15s %-10s %-50s\n" "API" "✓ UP" "http://localhost:$api_port/api/v1/health"
    else
        printf "%-15s %-10s %-50s\n" "API" "✗ DOWN" "http://localhost:$api_port/api/v1/health - Not responding"
        ((health_status++))
    fi
    
    # Check database
    if [[ -n "${DB_HOST:-}" && -n "${DB_USER:-}" && -n "${DB_PASSWORD:-}" ]]; then
        if mysql -h"$DB_HOST" -P"${DB_PORT:-3306}" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" >/dev/null 2>&1; then
            printf "%-15s %-10s %-50s\n" "Database" "✓ UP" "$DB_HOST:${DB_PORT:-3306} - Connection OK"
        else
            printf "%-15s %-10s %-50s\n" "Database" "✗ DOWN" "$DB_HOST:${DB_PORT:-3306} - Connection failed"
            ((health_status++))
        fi
    else
        printf "%-15s %-10s %-50s\n" "Database" "? UNKNOWN" "Database configuration not found"
    fi
    
    # Check Redis
    if [[ -n "${REDIS_HOST:-}" ]]; then
        local redis_port="${REDIS_PORT:-6379}"
        if redis-cli -h "$REDIS_HOST" -p "$redis_port" ping >/dev/null 2>&1; then
            printf "%-15s %-10s %-50s\n" "Redis" "✓ UP" "$REDIS_HOST:$redis_port - PONG received"
        else
            printf "%-15s %-10s %-50s\n" "Redis" "✗ DOWN" "$REDIS_HOST:$redis_port - No response"
            ((health_status++))
        fi
    else
        printf "%-15s %-10s %-50s\n" "Redis" "? UNKNOWN" "Redis configuration not found"
    fi
    
    echo ""
    
    if [[ $health_status -eq 0 ]]; then
        log_success "All services are healthy"
        return 0
    else
        log_error "$health_status service(s) are unhealthy"
        return 1
    fi
}

# Show performance metrics
show_performance() {
    log_info "Collecting performance metrics"
    
    echo ""
    echo "=== System Performance Metrics ==="
    echo ""
    
    # CPU Usage
    local cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null || echo "0")
    echo "CPU Usage: ${cpu_usage}%"
    
    # Memory Usage
    local memory_info=$(vm_stat | grep -E "Pages (free|active|inactive|speculative|wired down)")
    local page_size=4096
    local free_pages=$(echo "$memory_info" | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    local active_pages=$(echo "$memory_info" | grep "Pages active" | awk '{print $3}' | sed 's/\.//')
    local inactive_pages=$(echo "$memory_info" | grep "Pages inactive" | awk '{print $3}' | sed 's/\.//')
    local wired_pages=$(echo "$memory_info" | grep "Pages wired down" | awk '{print $4}' | sed 's/\.//')
    
    local total_memory=$((($free_pages + $active_pages + $inactive_pages + $wired_pages) * $page_size / 1024 / 1024))
    local used_memory=$((($active_pages + $inactive_pages + $wired_pages) * $page_size / 1024 / 1024))
    local memory_usage=$((used_memory * 100 / total_memory))
    
    echo "Memory Usage: ${memory_usage}% (${used_memory}MB / ${total_memory}MB)"
    
    # Disk Usage
    echo "Disk Usage:"
    df -h | grep -E "^/dev/" | while read -r line; do
        local usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
        local mount=$(echo "$line" | awk '{print $9}')
        echo "  $mount: ${usage}%"
    done
    
    # Load Average
    local load_avg=$(uptime | awk -F'load averages:' '{print $2}' | xargs)
    echo "Load Average: $load_avg"
    
    # Network Connections
    local connections=$(netstat -an | grep ESTABLISHED | wc -l | xargs)
    echo "Active Connections: $connections"
    
    echo ""
    echo "=== Application Metrics ==="
    echo ""
    
    # Docker container stats (if using Docker)
    if command -v docker >/dev/null 2>&1 && docker ps -q >/dev/null 2>&1; then
        echo "Docker Container Stats:"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | head -10
    fi
    
    # Process information
    echo ""
    echo "Top Processes by CPU:"
    ps aux | sort -rn -k3 | head -5 | awk '{printf "  %-20s %5s%% %8s\n", $11, $3, $4}'
    
    echo ""
    echo "Top Processes by Memory:"
    ps aux | sort -rn -k4 | head -5 | awk '{printf "  %-20s %5s%% %8s\n", $11, $3, $4}'
}

# Monitor system resources
monitor_resources() {
    log_info "Monitoring system resources"
    
    local alerts=0
    
    # Check CPU usage
    local cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null || echo "0")
    if (( $(echo "$cpu_usage > $ALERT_THRESHOLD_CPU" | bc -l) )); then
        log_warning "High CPU usage: ${cpu_usage}% (threshold: ${ALERT_THRESHOLD_CPU}%)"
        ((alerts++))
    else
        log_verbose "CPU usage normal: ${cpu_usage}%"
    fi
    
    # Check memory usage
    local memory_info=$(vm_stat | grep -E "Pages (free|active|inactive|speculative|wired down)")
    local page_size=4096
    local free_pages=$(echo "$memory_info" | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    local active_pages=$(echo "$memory_info" | grep "Pages active" | awk '{print $3}' | sed 's/\.//')
    local inactive_pages=$(echo "$memory_info" | grep "Pages inactive" | awk '{print $3}' | sed 's/\.//')
    local wired_pages=$(echo "$memory_info" | grep "Pages wired down" | awk '{print $4}' | sed 's/\.//')
    
    local total_memory=$((($free_pages + $active_pages + $inactive_pages + $wired_pages) * $page_size / 1024 / 1024))
    local used_memory=$((($active_pages + $inactive_pages + $wired_pages) * $page_size / 1024 / 1024))
    local memory_usage=$((used_memory * 100 / total_memory))
    
    if (( memory_usage > ALERT_THRESHOLD_MEMORY )); then
        log_warning "High memory usage: ${memory_usage}% (threshold: ${ALERT_THRESHOLD_MEMORY}%)"
        ((alerts++))
    else
        log_verbose "Memory usage normal: ${memory_usage}%"
    fi
    
    # Check disk usage
    df -h | grep -E "^/dev/" | while read -r line; do
        local usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
        local mount=$(echo "$line" | awk '{print $9}')
        
        if (( usage > ALERT_THRESHOLD_DISK )); then
            log_warning "High disk usage on $mount: ${usage}% (threshold: ${ALERT_THRESHOLD_DISK}%)"
            ((alerts++))
        else
            log_verbose "Disk usage normal on $mount: ${usage}%"
        fi
    done
    
    if [[ $alerts -eq 0 ]]; then
        log_success "All system resources within normal limits"
    else
        log_error "$alerts resource alert(s) detected"
    fi
    
    return $alerts
}

# Check service status
check_services() {
    log_info "Checking service status"
    
    echo ""
    echo "=== Docker Services ==="
    
    if command -v docker-compose >/dev/null 2>&1; then
        local compose_file="docker-compose.${ENVIRONMENT}.yml"
        if [[ -f "$PROJECT_ROOT/$compose_file" ]]; then
            cd "$PROJECT_ROOT"
            docker-compose -f "$compose_file" ps
        else
            echo "Docker compose file not found: $compose_file"
        fi
    else
        echo "Docker Compose not available"
    fi
    
    echo ""
    echo "=== System Services ==="
    
    # Check common services
    local services=("nginx" "mysql" "redis-server")
    for service in "${services[@]}"; do
        if pgrep -x "$service" >/dev/null; then
            echo "$service: Running"
        else
            echo "$service: Not running"
        fi
    done
}

# Analyze application logs
analyze_logs() {
    log_info "Analyzing application logs"
    
    local log_dir="$PROJECT_ROOT/logs"
    
    if [[ ! -d "$log_dir" ]]; then
        log_warning "Log directory not found: $log_dir"
        return 0
    fi
    
    echo ""
    echo "=== Recent Error Logs ==="
    
    # Find recent errors in application logs
    find "$log_dir" -name "*.log" -mtime -1 -exec grep -l "ERROR\|FATAL" {} \; | while read -r logfile; do
        echo "\nErrors in $(basename "$logfile"):"
        tail -100 "$logfile" | grep "ERROR\|FATAL" | tail -5
    done
    
    echo ""
    echo "=== Log File Sizes ==="
    
    find "$log_dir" -name "*.log" -exec ls -lh {} \; | awk '{print $5, $9}' | sort -hr
    
    echo ""
    echo "=== Recent Log Activity ==="
    
    # Show recent log entries
    find "$log_dir" -name "*.log" -mtime -1 -exec tail -10 {} \; | tail -20
}

# Check for alerts
check_alerts() {
    log_info "Checking for system alerts"
    
    local alert_count=0
    
    # Check system resources
    monitor_resources
    local resource_alerts=$?
    alert_count=$((alert_count + resource_alerts))
    
    # Check application health
    if ! check_health >/dev/null 2>&1; then
        log_warning "Application health check failed"
        ((alert_count++))
    fi
    
    # Check log files for recent errors
    local error_count=$(find "$PROJECT_ROOT/logs" -name "*.log" -mtime -1 -exec grep -c "ERROR\|FATAL" {} \; 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
    if [[ $error_count -gt 10 ]]; then
        log_warning "High error count in logs: $error_count errors in the last 24 hours"
        ((alert_count++))
    fi
    
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        log_warning "Critical disk space: ${disk_usage}% used"
        ((alert_count++))
    fi
    
    echo ""
    if [[ $alert_count -eq 0 ]]; then
        log_success "No alerts detected"
    else
        log_error "$alert_count alert(s) detected"
    fi
    
    return $alert_count
}

# Show monitoring dashboard
show_dashboard() {
    clear
    echo "======================================"
    echo "   Wedding Club Monitoring Dashboard"
    echo "   Environment: $ENVIRONMENT"
    echo "   Updated: $(date)"
    echo "======================================"
    
    check_health
    echo ""
    show_performance
    echo ""
    check_alerts
}

# Start continuous monitoring
start_continuous_monitoring() {
    log_info "Starting continuous monitoring (interval: ${MONITOR_INTERVAL}s)"
    log_info "Press Ctrl+C to stop"
    
    # Trap to handle graceful shutdown
    trap 'log_info "Stopping continuous monitoring"; exit 0' INT TERM
    
    while true; do
        show_dashboard
        sleep "$MONITOR_INTERVAL"
    done
}

# Generate monitoring report
generate_report() {
    local report_file="$PROJECT_ROOT/logs/monitoring_report_$(date +%Y%m%d_%H%M%S).txt"
    
    log_info "Generating monitoring report: $report_file"
    
    {
        echo "Wedding Club Monitoring Report"
        echo "=============================="
        echo "Generated: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo ""
        
        echo "=== Health Check ==="
        check_health
        echo ""
        
        echo "=== Performance Metrics ==="
        show_performance
        echo ""
        
        echo "=== Resource Monitoring ==="
        monitor_resources
        echo ""
        
        echo "=== Service Status ==="
        check_services
        echo ""
        
        echo "=== Log Analysis ==="
        analyze_logs
        echo ""
        
        echo "=== Alert Summary ==="
        check_alerts
        
    } > "$report_file"
    
    log_success "Monitoring report generated: $report_file"
}

# Main function
main() {
    load_env_config
    
    case "$COMMAND" in
        health)
            check_health
            ;;
        performance)
            show_performance
            ;;
        resources)
            monitor_resources
            ;;
        services)
            check_services
            ;;
        logs)
            analyze_logs
            ;;
        alerts)
            check_alerts
            ;;
        dashboard)
            show_dashboard
            ;;
        continuous)
            start_continuous_monitoring
            ;;
        report)
            generate_report
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main
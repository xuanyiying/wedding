#!/bin/bash

# Wedding Club Performance Monitoring Script
# This script monitors application performance, analyzes resource usage, and provides optimization recommendations

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-development}"
PERF_LOG="${PERF_LOG:-$PROJECT_ROOT/logs/performance.log}"
REPORT_DIR="${REPORT_DIR:-$PROJECT_ROOT/logs/performance}"
MONITOR_DURATION="${MONITOR_DURATION:-60}"
SAMPLE_INTERVAL="${SAMPLE_INTERVAL:-5}"
VERBOSE="${VERBOSE:-false}"

# Performance thresholds
CPU_THRESHOLD="${CPU_THRESHOLD:-80}"
MEMORY_THRESHOLD="${MEMORY_THRESHOLD:-80}"
DISK_THRESHOLD="${DISK_THRESHOLD:-85}"
RESPONSE_TIME_THRESHOLD="${RESPONSE_TIME_THRESHOLD:-2000}" # milliseconds
ERROR_RATE_THRESHOLD="${ERROR_RATE_THRESHOLD:-5}" # percentage

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    local message="$1"
    echo -e "${BLUE}[INFO]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $message" >> "$PERF_LOG"
}

log_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $message" >> "$PERF_LOG"
}

log_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $message" >> "$PERF_LOG"
}

log_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $message" >> "$PERF_LOG"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        local message="$1"
        echo -e "${PURPLE}[VERBOSE]${NC} $message"
        echo "$(date '+%Y-%m-%d %H:%M:%S') [VERBOSE] $message" >> "$PERF_LOG"
    fi
}

# Help function
show_help() {
    cat << EOF
Wedding Club Performance Monitoring Script

Usage: $0 [OPTIONS] COMMAND

Commands:
    system-metrics         Show current system metrics
    app-performance        Monitor application performance
    database-performance   Monitor database performance
    network-performance    Monitor network performance
    load-test              Run load testing
    memory-analysis        Analyze memory usage
    cpu-profiling          Profile CPU usage
    disk-analysis          Analyze disk I/O
    benchmark              Run performance benchmarks
    continuous-monitor     Start continuous monitoring
    generate-report        Generate performance report
    optimize-suggestions   Get optimization suggestions

Options:
    -e, --env ENV              Environment (development, staging, production)
    -d, --duration SECONDS     Monitoring duration (default: 60)
    -i, --interval SECONDS     Sample interval (default: 5)
    --cpu-threshold PERCENT    CPU usage alert threshold (default: 80)
    --memory-threshold PERCENT Memory usage alert threshold (default: 80)
    --disk-threshold PERCENT   Disk usage alert threshold (default: 85)
    --response-threshold MS    Response time alert threshold (default: 2000)
    -v, --verbose              Enable verbose output
    --help                     Show this help message

Examples:
    $0 system-metrics                          # Show current system metrics
    $0 app-performance --duration 300          # Monitor app for 5 minutes
    $0 load-test                               # Run load testing
    $0 continuous-monitor                      # Start continuous monitoring
    $0 generate-report                         # Generate performance report

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
        -d|--duration)
            MONITOR_DURATION="$2"
            shift 2
            ;;
        -i|--interval)
            SAMPLE_INTERVAL="$2"
            shift 2
            ;;
        --cpu-threshold)
            CPU_THRESHOLD="$2"
            shift 2
            ;;
        --memory-threshold)
            MEMORY_THRESHOLD="$2"
            shift 2
            ;;
        --disk-threshold)
            DISK_THRESHOLD="$2"
            shift 2
            ;;
        --response-threshold)
            RESPONSE_TIME_THRESHOLD="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        system-metrics|app-performance|database-performance|network-performance|load-test|memory-analysis|cpu-profiling|disk-analysis|benchmark|continuous-monitor|generate-report|optimize-suggestions)
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

# Ensure required directories exist
mkdir -p "$(dirname "$PERF_LOG")" "$REPORT_DIR"

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

# Get system metrics
get_system_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # CPU usage
    local cpu_usage
    if command -v top >/dev/null 2>&1; then
        cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null || echo "0")
    else
        cpu_usage="0"
    fi
    
    # Memory usage
    local memory_info
    if command -v vm_stat >/dev/null 2>&1; then
        # macOS
        local pages_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        local pages_active=$(vm_stat | grep "Pages active" | awk '{print $3}' | sed 's/\.//')
        local pages_inactive=$(vm_stat | grep "Pages inactive" | awk '{print $3}' | sed 's/\.//')
        local pages_speculative=$(vm_stat | grep "Pages speculative" | awk '{print $3}' | sed 's/\.//')
        local pages_wired=$(vm_stat | grep "Pages wired down" | awk '{print $4}' | sed 's/\.//')
        
        local page_size=4096
        local total_pages=$((pages_free + pages_active + pages_inactive + pages_speculative + pages_wired))
        local used_pages=$((pages_active + pages_inactive + pages_wired))
        local memory_usage=$((used_pages * 100 / total_pages))
        
        memory_info="${memory_usage}% ($(((used_pages * page_size) / 1024 / 1024))MB used / $(((total_pages * page_size) / 1024 / 1024))MB total)"
    elif [[ -f /proc/meminfo ]]; then
        # Linux
        local mem_total=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        local mem_available=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        local mem_used=$((mem_total - mem_available))
        local memory_usage=$((mem_used * 100 / mem_total))
        
        memory_info="${memory_usage}% ($((mem_used / 1024))MB used / $((mem_total / 1024))MB total)"
    else
        memory_info="N/A"
    fi
    
    # Disk usage
    local disk_usage=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | sed 's/%//')
    local disk_info=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $3 " used / " $2 " total"}')
    
    # Load average
    local load_avg
    if command -v uptime >/dev/null 2>&1; then
        load_avg=$(uptime | awk -F'load average:' '{print $2}' | sed 's/^[ \t]*//')
    else
        load_avg="N/A"
    fi
    
    # Network connections
    local connections=0
    if command -v netstat >/dev/null 2>&1; then
        connections=$(netstat -an | grep ESTABLISHED | wc -l | tr -d ' ')
    fi
    
    echo "$timestamp,$cpu_usage,$memory_usage,$disk_usage,$load_avg,$connections"
    
    # Display formatted output
    printf "\n${CYAN}=== System Metrics (%s) ===${NC}\n" "$timestamp"
    printf "${BLUE}CPU Usage:${NC}      %s%%\n" "$cpu_usage"
    printf "${BLUE}Memory Usage:${NC}   %s\n" "$memory_info"
    printf "${BLUE}Disk Usage:${NC}     %s%% (%s)\n" "$disk_usage" "$disk_info"
    printf "${BLUE}Load Average:${NC}   %s\n" "$load_avg"
    printf "${BLUE}Connections:${NC}    %s\n" "$connections"
    
    # Check thresholds and alert
    if [[ "$cpu_usage" != "N/A" && "$cpu_usage" -gt "$CPU_THRESHOLD" ]]; then
        log_warning "CPU usage (${cpu_usage}%) exceeds threshold (${CPU_THRESHOLD}%)"
    fi
    
    if [[ "$memory_usage" != "N/A" && "$memory_usage" -gt "$MEMORY_THRESHOLD" ]]; then
        log_warning "Memory usage (${memory_usage}%) exceeds threshold (${MEMORY_THRESHOLD}%)"
    fi
    
    if [[ "$disk_usage" != "N/A" && "$disk_usage" -gt "$DISK_THRESHOLD" ]]; then
        log_warning "Disk usage (${disk_usage}%) exceeds threshold (${DISK_THRESHOLD}%)"
    fi
}

# Monitor application performance
monitor_app_performance() {
    log_info "Monitoring application performance for $MONITOR_DURATION seconds"
    
    local app_url="http://localhost:${PORT:-3000}"
    local api_url="${app_url}/api/health"
    
    echo ""
    echo "=== Application Performance Monitoring ==="
    echo "Duration: ${MONITOR_DURATION}s, Interval: ${SAMPLE_INTERVAL}s"
    echo "App URL: $app_url"
    echo "API URL: $api_url"
    echo ""
    
    local start_time=$(date +%s)
    local end_time=$((start_time + MONITOR_DURATION))
    local sample_count=0
    local total_response_time=0
    local error_count=0
    
    printf "%-20s %-15s %-15s %-15s %-10s\n" "Timestamp" "Response Time" "Status Code" "App Status" "Errors"
    printf "%-20s %-15s %-15s %-15s %-10s\n" "--------" "-------------" "-----------" "----------" "------"
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local timestamp=$(date '+%H:%M:%S')
        
        # Test application response
        local response_time="N/A"
        local status_code="N/A"
        local app_status="DOWN"
        
        if command -v curl >/dev/null 2>&1; then
            local curl_output
            curl_output=$(curl -w "%{http_code},%{time_total}" -s -m 10 "$app_url" -o /dev/null 2>/dev/null || echo "000,0")
            status_code=$(echo "$curl_output" | cut -d',' -f1)
            response_time=$(echo "$curl_output" | cut -d',' -f2 | awk '{printf "%.0f", $1*1000}')
            
            if [[ "$status_code" =~ ^[23] ]]; then
                app_status="UP"
            else
                app_status="DOWN"
                ((error_count++))
            fi
        fi
        
        # Test API health endpoint
        local api_status="DOWN"
        if command -v curl >/dev/null 2>&1; then
            if curl -f -s -m 5 "$api_url" >/dev/null 2>&1; then
                api_status="UP"
            else
                ((error_count++))
            fi
        fi
        
        printf "%-20s %-15s %-15s %-15s %-10s\n" "$timestamp" "${response_time}ms" "$status_code" "$app_status" "$error_count"
        
        # Accumulate statistics
        if [[ "$response_time" != "N/A" ]]; then
            total_response_time=$((total_response_time + response_time))
            ((sample_count++))
            
            # Check response time threshold
            if [[ "$response_time" -gt "$RESPONSE_TIME_THRESHOLD" ]]; then
                log_warning "Response time (${response_time}ms) exceeds threshold (${RESPONSE_TIME_THRESHOLD}ms)"
            fi
        fi
        
        sleep "$SAMPLE_INTERVAL"
    done
    
    # Calculate statistics
    echo ""
    echo "=== Performance Summary ==="
    
    if [[ $sample_count -gt 0 ]]; then
        local avg_response_time=$((total_response_time / sample_count))
        local error_rate=$((error_count * 100 / sample_count))
        
        printf "${BLUE}Average Response Time:${NC} %dms\n" "$avg_response_time"
        printf "${BLUE}Total Samples:${NC}         %d\n" "$sample_count"
        printf "${BLUE}Error Count:${NC}           %d\n" "$error_count"
        printf "${BLUE}Error Rate:${NC}            %d%%\n" "$error_rate"
        
        # Check error rate threshold
        if [[ "$error_rate" -gt "$ERROR_RATE_THRESHOLD" ]]; then
            log_warning "Error rate (${error_rate}%) exceeds threshold (${ERROR_RATE_THRESHOLD}%)"
        else
            log_success "Error rate (${error_rate}%) is within acceptable limits"
        fi
        
        if [[ "$avg_response_time" -le "$RESPONSE_TIME_THRESHOLD" ]]; then
            log_success "Average response time (${avg_response_time}ms) is within acceptable limits"
        fi
    else
        log_error "No successful samples collected"
    fi
}

# Monitor database performance
monitor_database_performance() {
    log_info "Monitoring database performance"
    
    echo ""
    echo "=== Database Performance Monitoring ==="
    
    # Check if database is running
    local db_status="DOWN"
    local db_type="unknown"
    
    # Check MySQL
    if command -v mysql >/dev/null 2>&1; then
        if mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" -p"${DB_PASSWORD:-}" -e "SELECT 1" >/dev/null 2>&1; then
            db_status="UP"
            db_type="MySQL"
            
            echo "${BLUE}Database Type:${NC}     $db_type"
            echo "${BLUE}Database Status:${NC}   $db_status"
            
            # Get MySQL performance metrics
            local mysql_metrics
            mysql_metrics=$(mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" -p"${DB_PASSWORD:-}" -e "
                SHOW STATUS WHERE Variable_name IN (
                    'Connections', 'Threads_connected', 'Threads_running',
                    'Queries', 'Slow_queries', 'Uptime',
                    'Innodb_buffer_pool_read_requests', 'Innodb_buffer_pool_reads'
                );
            " 2>/dev/null || echo "")
            
            if [[ -n "$mysql_metrics" ]]; then
                echo ""
                echo "${CYAN}MySQL Performance Metrics:${NC}"
                echo "$mysql_metrics" | while read -r line; do
                    if [[ "$line" =~ ^[A-Za-z] ]]; then
                        local metric=$(echo "$line" | awk '{print $1}')
                        local value=$(echo "$line" | awk '{print $2}')
                        printf "  %-30s %s\n" "$metric:" "$value"
                    fi
                done
            fi
        fi
    fi
    
    # Check PostgreSQL
    if [[ "$db_status" == "DOWN" ]] && command -v psql >/dev/null 2>&1; then
        if PGPASSWORD="${DB_PASSWORD:-}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-postgres}" -c "SELECT 1" >/dev/null 2>&1; then
            db_status="UP"
            db_type="PostgreSQL"
            
            echo "${BLUE}Database Type:${NC}     $db_type"
            echo "${BLUE}Database Status:${NC}   $db_status"
        fi
    fi
    
    # Check Redis
    if command -v redis-cli >/dev/null 2>&1; then
        local redis_status="DOWN"
        if redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" ping >/dev/null 2>&1; then
            redis_status="UP"
            
            echo ""
            echo "${BLUE}Redis Status:${NC}      $redis_status"
            
            # Get Redis info
            local redis_info
            redis_info=$(redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" info memory 2>/dev/null || echo "")
            
            if [[ -n "$redis_info" ]]; then
                echo ""
                echo "${CYAN}Redis Memory Usage:${NC}"
                echo "$redis_info" | grep -E "used_memory_human|used_memory_peak_human|maxmemory_human" | while read -r line; do
                    local key=$(echo "$line" | cut -d':' -f1)
                    local value=$(echo "$line" | cut -d':' -f2 | tr -d '\r')
                    printf "  %-25s %s\n" "$key:" "$value"
                done
            fi
        else
            echo ""
            echo "${BLUE}Redis Status:${NC}      $redis_status"
        fi
    fi
    
    if [[ "$db_status" == "DOWN" ]]; then
        log_warning "No database connection available"
    else
        log_success "Database ($db_type) is running and accessible"
    fi
}

# Monitor network performance
monitor_network_performance() {
    log_info "Monitoring network performance"
    
    echo ""
    echo "=== Network Performance Monitoring ==="
    
    # Test external connectivity
    local external_hosts=("8.8.8.8" "1.1.1.1" "google.com")
    
    echo "${CYAN}External Connectivity Test:${NC}"
    for host in "${external_hosts[@]}"; do
        if command -v ping >/dev/null 2>&1; then
            local ping_result
            ping_result=$(ping -c 3 "$host" 2>/dev/null | tail -1 | awk -F'/' '{print $5}' 2>/dev/null || echo "N/A")
            if [[ "$ping_result" != "N/A" ]]; then
                printf "  %-15s %sms average\n" "$host:" "$ping_result"
            else
                printf "  %-15s %s\n" "$host:" "FAILED"
            fi
        fi
    done
    
    # Test local services
    echo ""
    echo "${CYAN}Local Services Test:${NC}"
    
    local services=(
        "localhost:${PORT:-3000}:App"
        "localhost:${DB_PORT:-3306}:Database"
        "localhost:${REDIS_PORT:-6379}:Redis"
    )
    
    for service in "${services[@]}"; do
        local host=$(echo "$service" | cut -d':' -f1)
        local port=$(echo "$service" | cut -d':' -f2)
        local name=$(echo "$service" | cut -d':' -f3)
        
        if command -v nc >/dev/null 2>&1; then
            if nc -z "$host" "$port" 2>/dev/null; then
                printf "  %-15s %s\n" "$name ($port):" "OPEN"
            else
                printf "  %-15s %s\n" "$name ($port):" "CLOSED"
            fi
        fi
    done
    
    # Network interface statistics
    echo ""
    echo "${CYAN}Network Interface Statistics:${NC}"
    
    if command -v netstat >/dev/null 2>&1; then
        netstat -i | head -5
    elif [[ -f /proc/net/dev ]]; then
        cat /proc/net/dev | head -5
    fi
}

# Run load testing
run_load_test() {
    log_info "Running load testing"
    
    local app_url="http://localhost:${PORT:-3000}"
    local concurrent_users="${LOAD_TEST_USERS:-10}"
    local test_duration="${LOAD_TEST_DURATION:-30}"
    
    echo ""
    echo "=== Load Testing ==="
    echo "URL: $app_url"
    echo "Concurrent Users: $concurrent_users"
    echo "Duration: ${test_duration}s"
    echo ""
    
    # Check if application is running
    if ! curl -f -s -m 5 "$app_url" >/dev/null 2>&1; then
        log_error "Application is not responding at $app_url"
        return 1
    fi
    
    # Simple load test using curl
    log_info "Starting load test..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + test_duration))
    local request_count=0
    local success_count=0
    local total_response_time=0
    
    # Run concurrent requests
    while [[ $(date +%s) -lt $end_time ]]; do
        for ((i=1; i<=concurrent_users; i++)); do
            {
                local response_time
                local status_code
                
                if command -v curl >/dev/null 2>&1; then
                    local curl_output
                    curl_output=$(curl -w "%{http_code},%{time_total}" -s -m 10 "$app_url" -o /dev/null 2>/dev/null || echo "000,0")
                    status_code=$(echo "$curl_output" | cut -d',' -f1)
                    response_time=$(echo "$curl_output" | cut -d',' -f2 | awk '{printf "%.0f", $1*1000}')
                    
                    ((request_count++))
                    
                    if [[ "$status_code" =~ ^[23] ]]; then
                        ((success_count++))
                        total_response_time=$((total_response_time + response_time))
                    fi
                fi
            } &
        done
        
        # Wait for batch to complete
        wait
        
        # Brief pause between batches
        sleep 1
    done
    
    # Calculate results
    echo ""
    echo "=== Load Test Results ==="
    
    local success_rate=0
    local avg_response_time=0
    
    if [[ $request_count -gt 0 ]]; then
        success_rate=$((success_count * 100 / request_count))
    fi
    
    if [[ $success_count -gt 0 ]]; then
        avg_response_time=$((total_response_time / success_count))
    fi
    
    printf "${BLUE}Total Requests:${NC}        %d\n" "$request_count"
    printf "${BLUE}Successful Requests:${NC}   %d\n" "$success_count"
    printf "${BLUE}Failed Requests:${NC}       %d\n" "$((request_count - success_count))"
    printf "${BLUE}Success Rate:${NC}          %d%%\n" "$success_rate"
    printf "${BLUE}Average Response Time:${NC} %dms\n" "$avg_response_time"
    printf "${BLUE}Requests per Second:${NC}   %.2f\n" "$(echo "scale=2; $request_count / $test_duration" | bc 2>/dev/null || echo "N/A")"
    
    # Performance assessment
    echo ""
    if [[ $success_rate -ge 95 && $avg_response_time -le $RESPONSE_TIME_THRESHOLD ]]; then
        log_success "Load test passed: Good performance under load"
    elif [[ $success_rate -ge 90 ]]; then
        log_warning "Load test warning: Acceptable performance but could be improved"
    else
        log_error "Load test failed: Poor performance under load"
    fi
}

# Analyze memory usage
analyze_memory() {
    log_info "Analyzing memory usage"
    
    echo ""
    echo "=== Memory Analysis ==="
    
    # System memory
    if command -v vm_stat >/dev/null 2>&1; then
        echo "${CYAN}System Memory (macOS):${NC}"
        vm_stat | head -10
    elif [[ -f /proc/meminfo ]]; then
        echo "${CYAN}System Memory (Linux):${NC}"
        head -10 /proc/meminfo
    fi
    
    echo ""
    
    # Process memory usage
    echo "${CYAN}Top Memory Consuming Processes:${NC}"
    if command -v ps >/dev/null 2>&1; then
        ps aux --sort=-%mem | head -10 2>/dev/null || ps aux | sort -k4 -nr | head -10
    fi
    
    echo ""
    
    # Node.js process memory (if running)
    local node_pids
    node_pids=$(pgrep -f "node" 2>/dev/null || true)
    
    if [[ -n "$node_pids" ]]; then
        echo "${CYAN}Node.js Process Memory:${NC}"
        echo "$node_pids" | while read -r pid; do
            if [[ -n "$pid" ]]; then
                local mem_info
                mem_info=$(ps -p "$pid" -o pid,ppid,%mem,rss,vsz,comm 2>/dev/null || true)
                if [[ -n "$mem_info" ]]; then
                    echo "$mem_info"
                fi
            fi
        done
    fi
}

# Profile CPU usage
profile_cpu() {
    log_info "Profiling CPU usage for $MONITOR_DURATION seconds"
    
    echo ""
    echo "=== CPU Profiling ==="
    echo "Duration: ${MONITOR_DURATION}s"
    echo ""
    
    # Monitor CPU usage over time
    local start_time=$(date +%s)
    local end_time=$((start_time + MONITOR_DURATION))
    local sample_count=0
    local total_cpu=0
    
    printf "%-20s %-15s %-20s\n" "Timestamp" "CPU Usage" "Load Average"
    printf "%-20s %-15s %-20s\n" "--------" "---------" "------------"
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local timestamp=$(date '+%H:%M:%S')
        
        # Get CPU usage
        local cpu_usage="0"
        if command -v top >/dev/null 2>&1; then
            cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null || echo "0")
        fi
        
        # Get load average
        local load_avg="N/A"
        if command -v uptime >/dev/null 2>&1; then
            load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//' | sed 's/^[ \t]*//')
        fi
        
        printf "%-20s %-15s %-20s\n" "$timestamp" "${cpu_usage}%" "$load_avg"
        
        # Accumulate for average
        if [[ "$cpu_usage" != "N/A" ]]; then
            total_cpu=$(echo "$total_cpu + $cpu_usage" | bc 2>/dev/null || echo "$total_cpu")
            ((sample_count++))
        fi
        
        sleep "$SAMPLE_INTERVAL"
    done
    
    # Calculate average
    echo ""
    if [[ $sample_count -gt 0 ]]; then
        local avg_cpu
        avg_cpu=$(echo "scale=2; $total_cpu / $sample_count" | bc 2>/dev/null || echo "N/A")
        printf "${BLUE}Average CPU Usage:${NC} %s%%\n" "$avg_cpu"
        
        # Show top CPU consuming processes
        echo ""
        echo "${CYAN}Top CPU Consuming Processes:${NC}"
        if command -v ps >/dev/null 2>&1; then
            ps aux --sort=-%cpu | head -10 2>/dev/null || ps aux | sort -k3 -nr | head -10
        fi
    fi
}

# Analyze disk I/O
analyze_disk() {
    log_info "Analyzing disk I/O performance"
    
    echo ""
    echo "=== Disk I/O Analysis ==="
    
    # Disk usage
    echo "${CYAN}Disk Usage:${NC}"
    df -h
    
    echo ""
    
    # Disk I/O statistics (if available)
    if command -v iostat >/dev/null 2>&1; then
        echo "${CYAN}Disk I/O Statistics:${NC}"
        iostat -d 1 3 2>/dev/null || iostat 1 3
    elif [[ -f /proc/diskstats ]]; then
        echo "${CYAN}Disk Statistics (Linux):${NC}"
        cat /proc/diskstats | head -10
    fi
    
    echo ""
    
    # Large files
    echo "${CYAN}Largest Files in Project:${NC}"
    find "$PROJECT_ROOT" -type f -size +10M 2>/dev/null | head -10 | while read -r file; do
        local size
        size=$(du -h "$file" 2>/dev/null | cut -f1)
        printf "  %-10s %s\n" "$size" "$file"
    done
    
    echo ""
    
    # Directory sizes
    echo "${CYAN}Directory Sizes:${NC}"
    du -h -d 1 "$PROJECT_ROOT" 2>/dev/null | sort -hr | head -10
}

# Run benchmarks
run_benchmark() {
    log_info "Running performance benchmarks"
    
    echo ""
    echo "=== Performance Benchmarks ==="
    
    # CPU benchmark
    echo "${CYAN}CPU Benchmark (calculating pi):${NC}"
    local cpu_start=$(date +%s.%N)
    echo "scale=1000; 4*a(1)" | bc -l >/dev/null 2>&1 || echo "bc not available for CPU benchmark"
    local cpu_end=$(date +%s.%N)
    local cpu_time
    cpu_time=$(echo "$cpu_end - $cpu_start" | bc 2>/dev/null || echo "N/A")
    printf "  CPU calculation time: %ss\n" "$cpu_time"
    
    echo ""
    
    # Memory benchmark
    echo "${CYAN}Memory Benchmark (array operations):${NC}"
    local mem_start=$(date +%s.%N)
    
    # Simple memory test using dd
    if command -v dd >/dev/null 2>&1; then
        dd if=/dev/zero of=/tmp/benchmark_test bs=1M count=100 2>/dev/null
        rm -f /tmp/benchmark_test
    fi
    
    local mem_end=$(date +%s.%N)
    local mem_time
    mem_time=$(echo "$mem_end - $mem_start" | bc 2>/dev/null || echo "N/A")
    printf "  Memory operation time: %ss\n" "$mem_time"
    
    echo ""
    
    # Disk I/O benchmark
    echo "${CYAN}Disk I/O Benchmark:${NC}"
    local disk_start=$(date +%s.%N)
    
    if command -v dd >/dev/null 2>&1; then
        local write_speed
        write_speed=$(dd if=/dev/zero of=/tmp/disk_benchmark bs=1M count=50 2>&1 | grep -o '[0-9.]* MB/s' | tail -1 || echo "N/A")
        
        local read_speed
        read_speed=$(dd if=/tmp/disk_benchmark of=/dev/null bs=1M 2>&1 | grep -o '[0-9.]* MB/s' | tail -1 || echo "N/A")
        
        rm -f /tmp/disk_benchmark
        
        printf "  Disk write speed: %s\n" "$write_speed"
        printf "  Disk read speed: %s\n" "$read_speed"
    fi
    
    local disk_end=$(date +%s.%N)
    local disk_time
    disk_time=$(echo "$disk_end - $disk_start" | bc 2>/dev/null || echo "N/A")
    printf "  Disk I/O test time: %ss\n" "$disk_time"
}

# Continuous monitoring
continuous_monitor() {
    log_info "Starting continuous performance monitoring"
    log_info "Press Ctrl+C to stop monitoring"
    
    local metrics_file="$REPORT_DIR/continuous_metrics_$(date +%Y%m%d_%H%M%S).csv"
    
    # Create CSV header
    echo "timestamp,cpu_usage,memory_usage,disk_usage,load_avg,connections,response_time,app_status" > "$metrics_file"
    
    # Trap Ctrl+C to gracefully exit
    trap 'log_info "Stopping continuous monitoring"; exit 0' INT
    
    while true; do
        # Get system metrics
        local metrics
        metrics=$(get_system_metrics | tail -1)
        
        # Get application response time
        local app_url="http://localhost:${PORT:-3000}"
        local response_time="N/A"
        local app_status="DOWN"
        
        if command -v curl >/dev/null 2>&1; then
            local curl_output
            curl_output=$(curl -w "%{http_code},%{time_total}" -s -m 5 "$app_url" -o /dev/null 2>/dev/null || echo "000,0")
            local status_code=$(echo "$curl_output" | cut -d',' -f1)
            response_time=$(echo "$curl_output" | cut -d',' -f2 | awk '{printf "%.0f", $1*1000}')
            
            if [[ "$status_code" =~ ^[23] ]]; then
                app_status="UP"
            fi
        fi
        
        # Append to CSV
        echo "$metrics,$response_time,$app_status" >> "$metrics_file"
        
        sleep "$SAMPLE_INTERVAL"
    done
}

# Generate performance report
generate_performance_report() {
    local report_file="$REPORT_DIR/performance_report_$(date +%Y%m%d_%H%M%S).txt"
    
    log_info "Generating performance report: $report_file"
    
    {
        echo "Wedding Club Performance Report"
        echo "==============================="
        echo "Generated: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo ""
        
        echo "=== System Metrics ==="
        get_system_metrics >/dev/null
        echo ""
        
        echo "=== Application Performance ==="
        monitor_app_performance 2>&1 || true
        echo ""
        
        echo "=== Database Performance ==="
        monitor_database_performance 2>&1 || true
        echo ""
        
        echo "=== Memory Analysis ==="
        analyze_memory 2>&1 || true
        echo ""
        
        echo "=== Disk Analysis ==="
        analyze_disk 2>&1 || true
        
    } > "$report_file"
    
    log_success "Performance report generated: $report_file"
}

# Get optimization suggestions
get_optimization_suggestions() {
    log_info "Analyzing system and providing optimization suggestions"
    
    echo ""
    echo "=== Performance Optimization Suggestions ==="
    echo ""
    
    local suggestions=()
    
    # Check CPU usage
    local cpu_usage
    if command -v top >/dev/null 2>&1; then
        cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null || echo "0")
        if [[ "$cpu_usage" -gt 70 ]]; then
            suggestions+=("High CPU usage detected (${cpu_usage}%). Consider optimizing CPU-intensive operations or scaling horizontally.")
        fi
    fi
    
    # Check memory usage
    if command -v vm_stat >/dev/null 2>&1; then
        local pages_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        local pages_total=$(vm_stat | grep -E "Pages (free|active|inactive|speculative|wired)" | awk '{sum += $3} END {print sum}')
        local memory_usage=$((100 - (pages_free * 100 / pages_total)))
        
        if [[ "$memory_usage" -gt 80 ]]; then
            suggestions+=("High memory usage detected (${memory_usage}%). Consider implementing memory caching, optimizing data structures, or increasing available RAM.")
        fi
    fi
    
    # Check disk usage
    local disk_usage=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ "$disk_usage" -gt 80 ]]; then
        suggestions+=("High disk usage detected (${disk_usage}%). Consider cleaning up old files, implementing log rotation, or expanding storage.")
    fi
    
    # Check for large files
    local large_files
    large_files=$(find "$PROJECT_ROOT" -type f -size +100M 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$large_files" -gt 0 ]]; then
        suggestions+=("Found $large_files large files (>100MB). Consider compressing, archiving, or removing unnecessary large files.")
    fi
    
    # Check Node.js processes
    local node_processes
    node_processes=$(pgrep -f "node" | wc -l | tr -d ' ')
    if [[ "$node_processes" -gt 5 ]]; then
        suggestions+=("Multiple Node.js processes detected ($node_processes). Consider using PM2 for process management or clustering.")
    fi
    
    # Check for package.json optimizations
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        if ! grep -q '"engines"' "$PROJECT_ROOT/package.json"; then
            suggestions+=("Consider specifying Node.js engine version in package.json for consistency across environments.")
        fi
        
        if [[ -d "$PROJECT_ROOT/node_modules" ]]; then
            local node_modules_size
            node_modules_size=$(du -sh "$PROJECT_ROOT/node_modules" 2>/dev/null | cut -f1)
            suggestions+=("node_modules directory size: $node_modules_size. Consider using npm ci for faster, reliable builds.")
        fi
    fi
    
    # Check for Docker optimizations
    if [[ -f "$PROJECT_ROOT/Dockerfile" ]]; then
        if ! grep -q "multi-stage" "$PROJECT_ROOT/Dockerfile"; then
            suggestions+=("Consider using multi-stage Docker builds to reduce image size and improve build performance.")
        fi
        
        if ! grep -q "\.dockerignore" "$PROJECT_ROOT/.dockerignore" 2>/dev/null; then
            suggestions+=("Create a .dockerignore file to exclude unnecessary files from Docker build context.")
        fi
    fi
    
    # Check for caching opportunities
    if [[ -f "$PROJECT_ROOT/nginx.conf" || -f "$PROJECT_ROOT/nginx/nginx.conf" ]]; then
        local nginx_config
        nginx_config=$(find "$PROJECT_ROOT" -name "nginx.conf" -o -name "*.conf" | head -1)
        if [[ -n "$nginx_config" ]] && ! grep -q "expires" "$nginx_config"; then
            suggestions+=("Consider adding cache headers in Nginx configuration for static assets to improve performance.")
        fi
    fi
    
    # Database optimization suggestions
    if [[ -f "$PROJECT_ROOT/.env" ]] && grep -q "DB_" "$PROJECT_ROOT/.env"; then
        suggestions+=("Consider implementing database connection pooling and query optimization for better database performance.")
        suggestions+=("Regularly analyze slow queries and add appropriate database indexes.")
    fi
    
    # Security and performance
    suggestions+=("Implement gzip compression for HTTP responses to reduce bandwidth usage.")
    suggestions+=("Use a CDN for static assets to improve global performance.")
    suggestions+=("Implement proper logging levels to avoid excessive I/O in production.")
    suggestions+=("Consider implementing health checks and monitoring alerts.")
    
    # Display suggestions
    if [[ ${#suggestions[@]} -gt 0 ]]; then
        local count=1
        for suggestion in "${suggestions[@]}"; do
            printf "${YELLOW}%d.${NC} %s\n\n" "$count" "$suggestion"
            ((count++))
        done
    else
        log_success "No specific optimization suggestions at this time. System appears to be performing well."
    fi
    
    echo ""
    echo "${CYAN}General Performance Best Practices:${NC}"
    echo "• Implement proper error handling and logging"
    echo "• Use environment-specific configurations"
    echo "• Regularly update dependencies for security and performance"
    echo "• Monitor application metrics and set up alerts"
    echo "• Implement graceful shutdown handling"
    echo "• Use load balancing for high-traffic applications"
    echo "• Implement proper backup and disaster recovery procedures"
}

# Main function
main() {
    load_env_config
    
    case "$COMMAND" in
        system-metrics)
            get_system_metrics >/dev/null
            ;;
        app-performance)
            monitor_app_performance
            ;;
        database-performance)
            monitor_database_performance
            ;;
        network-performance)
            monitor_network_performance
            ;;
        load-test)
            run_load_test
            ;;
        memory-analysis)
            analyze_memory
            ;;
        cpu-profiling)
            profile_cpu
            ;;
        disk-analysis)
            analyze_disk
            ;;
        benchmark)
            run_benchmark
            ;;
        continuous-monitor)
            continuous_monitor
            ;;
        generate-report)
            generate_performance_report
            ;;
        optimize-suggestions)
            get_optimization_suggestions
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
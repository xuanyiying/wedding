#!/bin/bash

# Wedding Club Health Check Script
# This script performs comprehensive health checks for the Wedding Club application

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-development}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-30}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-3}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-5}"
VERBOSE="${VERBOSE:-false}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-text}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Service endpoints
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
API_URL="${API_URL:-http://localhost:5000}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
NGINX_URL="${NGINX_URL:-http://localhost:80}"
MINIO_URL="${MINIO_URL:-http://localhost:9000}"

# Health check thresholds
CPU_THRESHOLD="${CPU_THRESHOLD:-80}"
MEMORY_THRESHOLD="${MEMORY_THRESHOLD:-85}"
DISK_THRESHOLD="${DISK_THRESHOLD:-90}"
LOAD_THRESHOLD="${LOAD_THRESHOLD:-2.0}"
RESPONSE_TIME_THRESHOLD="${RESPONSE_TIME_THRESHOLD:-5000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Health check results
declare -A HEALTH_RESULTS
declare -A HEALTH_DETAILS
declare -A HEALTH_METRICS

# Logging functions
log_info() {
    local message="$1"
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        return
    fi
    echo -e "${BLUE}[INFO]${NC} $message"
}

log_success() {
    local message="$1"
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        return
    fi
    echo -e "${GREEN}[SUCCESS]${NC} $message"
}

log_warning() {
    local message="$1"
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        return
    fi
    echo -e "${YELLOW}[WARNING]${NC} $message"
}

log_error() {
    local message="$1"
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        return
    fi
    echo -e "${RED}[ERROR]${NC} $message"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]] && [[ "$OUTPUT_FORMAT" != "json" ]]; then
        local message="$1"
        echo -e "${PURPLE}[VERBOSE]${NC} $message"
    fi
}

# Help function
show_help() {
    cat << EOF
Wedding Club Health Check Script

Usage: $0 [OPTIONS] [COMMAND]

Commands:
    all                     Run all health checks (default)
    system                  Check system resources
    services                Check application services
    database                Check database connectivity
    redis                   Check Redis connectivity
    frontend                Check frontend availability
    api                     Check API endpoints
    nginx                   Check Nginx status
    minio                   Check MinIO storage
    docker                  Check Docker containers
    ssl                     Check SSL certificates
    dependencies            Check external dependencies
    performance             Check performance metrics
    security                Check security status
    continuous              Run continuous health monitoring

Options:
    -e, --env ENV              Environment (development, staging, production)
    --frontend-url URL         Frontend URL (default: http://localhost:3000)
    --api-url URL              API URL (default: http://localhost:5000)
    --db-host HOST             Database host (default: localhost)
    --db-port PORT             Database port (default: 3306)
    --redis-host HOST          Redis host (default: localhost)
    --redis-port PORT          Redis port (default: 6379)
    --nginx-url URL            Nginx URL (default: http://localhost:80)
    --minio-url URL            MinIO URL (default: http://localhost:9000)
    --timeout SECONDS          Health check timeout (default: 30)
    --retries COUNT            Number of retries (default: 3)
    --interval SECONDS         Interval between retries (default: 5)
    --cpu-threshold PERCENT    CPU usage threshold (default: 80)
    --memory-threshold PERCENT Memory usage threshold (default: 85)
    --disk-threshold PERCENT   Disk usage threshold (default: 90)
    --load-threshold VALUE     Load average threshold (default: 2.0)
    --response-time-threshold MS Response time threshold in ms (default: 5000)
    --output-format FORMAT     Output format: text, json, prometheus (default: text)
    --alert-webhook URL        Webhook URL for alerts
    --slack-webhook URL        Slack webhook URL for notifications
    -v, --verbose              Enable verbose output
    --help                     Show this help message

Examples:
    $0                                         # Run all health checks
    $0 system                                  # Check system resources only
    $0 --env production --output-format json  # Production health check in JSON
    $0 continuous --interval 60                # Continuous monitoring every 60s
    $0 api --verbose                           # Check API with verbose output

EOF
}

# Parse command line arguments
COMMAND="all"
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --frontend-url)
            FRONTEND_URL="$2"
            shift 2
            ;;
        --api-url)
            API_URL="$2"
            shift 2
            ;;
        --db-host)
            DB_HOST="$2"
            shift 2
            ;;
        --db-port)
            DB_PORT="$2"
            shift 2
            ;;
        --redis-host)
            REDIS_HOST="$2"
            shift 2
            ;;
        --redis-port)
            REDIS_PORT="$2"
            shift 2
            ;;
        --nginx-url)
            NGINX_URL="$2"
            shift 2
            ;;
        --minio-url)
            MINIO_URL="$2"
            shift 2
            ;;
        --timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        --retries)
            HEALTH_CHECK_RETRIES="$2"
            shift 2
            ;;
        --interval)
            HEALTH_CHECK_INTERVAL="$2"
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
        --load-threshold)
            LOAD_THRESHOLD="$2"
            shift 2
            ;;
        --response-time-threshold)
            RESPONSE_TIME_THRESHOLD="$2"
            shift 2
            ;;
        --output-format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --alert-webhook)
            ALERT_WEBHOOK="$2"
            shift 2
            ;;
        --slack-webhook)
            SLACK_WEBHOOK="$2"
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
        all|system|services|database|redis|frontend|api|nginx|minio|docker|ssl|dependencies|performance|security|continuous)
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

# Load environment configuration
load_env_config() {
    local env_file="$PROJECT_ROOT/deployment/environments/.env.$ENVIRONMENT"
    
    if [[ -f "$env_file" ]]; then
        set -a  # automatically export all variables
        source "$env_file"
        set +a
        log_verbose "Loaded configuration for environment: $ENVIRONMENT"
    else
        log_verbose "Environment file not found: $env_file"
    fi
}

# HTTP request with timeout and retries
http_request() {
    local url="$1"
    local timeout="${2:-$HEALTH_CHECK_TIMEOUT}"
    local retries="${3:-$HEALTH_CHECK_RETRIES}"
    local method="${4:-GET}"
    local expected_status="${5:-200}"
    
    local attempt=1
    local response_time=0
    local status_code=0
    
    while [[ $attempt -le $retries ]]; do
        log_verbose "HTTP $method request to $url (attempt $attempt/$retries)"
        
        local start_time=$(date +%s%3N)
        
        if command -v curl >/dev/null 2>&1; then
            local response
            response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" \
                --max-time "$timeout" \
                --connect-timeout 10 \
                -X "$method" \
                "$url" 2>/dev/null || echo "HTTPSTATUS:000;TIME:0")
            
            status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
            local time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
            response_time=$(echo "$time_total * 1000" | bc -l 2>/dev/null | cut -d. -f1 || echo "0")
        else
            log_verbose "curl not available, using wget"
            if timeout "$timeout" wget -q --spider "$url" 2>/dev/null; then
                status_code=200
                local end_time=$(date +%s%3N)
                response_time=$((end_time - start_time))
            else
                status_code=000
                response_time=0
            fi
        fi
        
        if [[ "$status_code" == "$expected_status" ]]; then
            echo "$status_code:$response_time"
            return 0
        fi
        
        if [[ $attempt -lt $retries ]]; then
            log_verbose "Request failed (status: $status_code), retrying in ${HEALTH_CHECK_INTERVAL}s..."
            sleep "$HEALTH_CHECK_INTERVAL"
        fi
        
        ((attempt++))
    done
    
    echo "$status_code:$response_time"
    return 1
}

# Check system resources
check_system() {
    log_verbose "Checking system resources"
    
    local cpu_usage=0
    local memory_usage=0
    local disk_usage=0
    local load_average=0
    local system_status="healthy"
    local system_details=""
    
    # CPU usage
    if command -v top >/dev/null 2>&1; then
        cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null || echo "0")
    elif command -v vmstat >/dev/null 2>&1; then
        cpu_usage=$(vmstat 1 2 | tail -1 | awk '{print 100-$15}' 2>/dev/null || echo "0")
    fi
    
    # Memory usage
    if command -v free >/dev/null 2>&1; then
        memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}' 2>/dev/null || echo "0")
    elif [[ "$(uname)" == "Darwin" ]]; then
        # macOS memory calculation
        local vm_stat
        vm_stat=$(vm_stat 2>/dev/null || echo "")
        if [[ -n "$vm_stat" ]]; then
            local pages_free=$(echo "$vm_stat" | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
            local pages_active=$(echo "$vm_stat" | grep "Pages active" | awk '{print $3}' | sed 's/\.//')
            local pages_inactive=$(echo "$vm_stat" | grep "Pages inactive" | awk '{print $3}' | sed 's/\.//')
            local pages_speculative=$(echo "$vm_stat" | grep "Pages speculative" | awk '{print $3}' | sed 's/\.//')
            local pages_wired=$(echo "$vm_stat" | grep "Pages wired down" | awk '{print $4}' | sed 's/\.//')
            
            if [[ -n "$pages_free" ]] && [[ -n "$pages_active" ]]; then
                local total_pages=$((pages_free + pages_active + pages_inactive + pages_speculative + pages_wired))
                local used_pages=$((pages_active + pages_inactive + pages_speculative + pages_wired))
                memory_usage=$(echo "scale=0; $used_pages * 100 / $total_pages" | bc -l 2>/dev/null || echo "0")
            fi
        fi
    fi
    
    # Disk usage
    disk_usage=$(df "$PROJECT_ROOT" 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//' || echo "0")
    
    # Load average
    if command -v uptime >/dev/null 2>&1; then
        load_average=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//' 2>/dev/null || echo "0")
    fi
    
    # Store metrics
    HEALTH_METRICS["cpu_usage"]="$cpu_usage"
    HEALTH_METRICS["memory_usage"]="$memory_usage"
    HEALTH_METRICS["disk_usage"]="$disk_usage"
    HEALTH_METRICS["load_average"]="$load_average"
    
    # Check thresholds
    local warnings=()
    
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        warnings+=("High CPU usage: ${cpu_usage}%")
        system_status="warning"
    fi
    
    if (( $(echo "$memory_usage > $MEMORY_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        warnings+=("High memory usage: ${memory_usage}%")
        system_status="warning"
    fi
    
    if (( $(echo "$disk_usage > $DISK_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        warnings+=("High disk usage: ${disk_usage}%")
        system_status="critical"
    fi
    
    if (( $(echo "$load_average > $LOAD_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        warnings+=("High load average: $load_average")
        system_status="warning"
    fi
    
    if [[ ${#warnings[@]} -gt 0 ]]; then
        system_details=$(IFS=', '; echo "${warnings[*]}")
    else
        system_details="CPU: ${cpu_usage}%, Memory: ${memory_usage}%, Disk: ${disk_usage}%, Load: $load_average"
    fi
    
    HEALTH_RESULTS["system"]="$system_status"
    HEALTH_DETAILS["system"]="$system_details"
    
    log_verbose "System check completed: $system_status"
}

# Check database connectivity
check_database() {
    log_verbose "Checking database connectivity"
    
    local db_status="healthy"
    local db_details=""
    local connection_time=0
    
    local start_time=$(date +%s%3N)
    
    # MySQL check
    if [[ "${DB_TYPE:-mysql}" == "mysql" ]] && command -v mysql >/dev/null 2>&1; then
        if timeout "$HEALTH_CHECK_TIMEOUT" mysql \
            -h "$DB_HOST" \
            -P "$DB_PORT" \
            -u "${DB_USER:-root}" \
            -p"${DB_PASSWORD:-}" \
            -e "SELECT 1" >/dev/null 2>&1; then
            
            local end_time=$(date +%s%3N)
            connection_time=$((end_time - start_time))
            db_details="MySQL connection successful (${connection_time}ms)"
        else
            db_status="critical"
            db_details="MySQL connection failed"
        fi
    # PostgreSQL check
    elif [[ "${DB_TYPE:-mysql}" == "postgresql" ]] && command -v psql >/dev/null 2>&1; then
        if timeout "$HEALTH_CHECK_TIMEOUT" PGPASSWORD="${DB_PASSWORD:-}" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "${DB_USER:-postgres}" \
            -d "${DB_NAME:-wedding_club}" \
            -c "SELECT 1" >/dev/null 2>&1; then
            
            local end_time=$(date +%s%3N)
            connection_time=$((end_time - start_time))
            db_details="PostgreSQL connection successful (${connection_time}ms)"
        else
            db_status="critical"
            db_details="PostgreSQL connection failed"
        fi
    # TCP port check as fallback
    else
        if timeout "$HEALTH_CHECK_TIMEOUT" bash -c "</dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
            local end_time=$(date +%s%3N)
            connection_time=$((end_time - start_time))
            db_details="Database port $DB_PORT accessible (${connection_time}ms)"
        else
            db_status="critical"
            db_details="Database port $DB_PORT not accessible"
        fi
    fi
    
    HEALTH_METRICS["db_connection_time"]="$connection_time"
    HEALTH_RESULTS["database"]="$db_status"
    HEALTH_DETAILS["database"]="$db_details"
    
    log_verbose "Database check completed: $db_status"
}

# Check Redis connectivity
check_redis() {
    log_verbose "Checking Redis connectivity"
    
    local redis_status="healthy"
    local redis_details=""
    local connection_time=0
    
    local start_time=$(date +%s%3N)
    
    if command -v redis-cli >/dev/null 2>&1; then
        if timeout "$HEALTH_CHECK_TIMEOUT" redis-cli \
            -h "$REDIS_HOST" \
            -p "$REDIS_PORT" \
            ping >/dev/null 2>&1; then
            
            local end_time=$(date +%s%3N)
            connection_time=$((end_time - start_time))
            
            # Get Redis info
            local redis_info
            redis_info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info server 2>/dev/null | grep "redis_version" | cut -d: -f2 | tr -d '\r' || echo "unknown")
            
            redis_details="Redis connection successful, version: $redis_info (${connection_time}ms)"
        else
            redis_status="critical"
            redis_details="Redis connection failed"
        fi
    else
        # TCP port check as fallback
        if timeout "$HEALTH_CHECK_TIMEOUT" bash -c "</dev/tcp/$REDIS_HOST/$REDIS_PORT" 2>/dev/null; then
            local end_time=$(date +%s%3N)
            connection_time=$((end_time - start_time))
            redis_details="Redis port $REDIS_PORT accessible (${connection_time}ms)"
        else
            redis_status="critical"
            redis_details="Redis port $REDIS_PORT not accessible"
        fi
    fi
    
    HEALTH_METRICS["redis_connection_time"]="$connection_time"
    HEALTH_RESULTS["redis"]="$redis_status"
    HEALTH_DETAILS["redis"]="$redis_details"
    
    log_verbose "Redis check completed: $redis_status"
}

# Check frontend availability
check_frontend() {
    log_verbose "Checking frontend availability"
    
    local frontend_status="healthy"
    local frontend_details=""
    
    local result
    result=$(http_request "$FRONTEND_URL" "$HEALTH_CHECK_TIMEOUT" "$HEALTH_CHECK_RETRIES")
    local status_code=$(echo "$result" | cut -d: -f1)
    local response_time=$(echo "$result" | cut -d: -f2)
    
    HEALTH_METRICS["frontend_response_time"]="$response_time"
    
    if [[ "$status_code" == "200" ]]; then
        if (( response_time > RESPONSE_TIME_THRESHOLD )); then
            frontend_status="warning"
            frontend_details="Frontend accessible but slow (${response_time}ms > ${RESPONSE_TIME_THRESHOLD}ms)"
        else
            frontend_details="Frontend accessible (${response_time}ms)"
        fi
    else
        frontend_status="critical"
        frontend_details="Frontend not accessible (HTTP $status_code)"
    fi
    
    HEALTH_RESULTS["frontend"]="$frontend_status"
    HEALTH_DETAILS["frontend"]="$frontend_details"
    
    log_verbose "Frontend check completed: $frontend_status"
}

# Check API endpoints
check_api() {
    log_verbose "Checking API endpoints"
    
    local api_status="healthy"
    local api_details=""
    local total_response_time=0
    local failed_endpoints=0
    
    # Define API endpoints to check
    local endpoints=(
        "$API_URL/health:200"
        "$API_URL/api/v1/status:200"
        "$API_URL/api/v1/docs:200"  # Should return 200 if Swagger is enabled
    )
    
    for endpoint_config in "${endpoints[@]}"; do
        local endpoint=$(echo "$endpoint_config" | cut -d: -f1)
        local expected_status=$(echo "$endpoint_config" | cut -d: -f2)
        
        log_verbose "Checking endpoint: $endpoint"
        
        local result
        result=$(http_request "$endpoint" "$HEALTH_CHECK_TIMEOUT" 1 "GET" "$expected_status")
        local status_code=$(echo "$result" | cut -d: -f1)
        local response_time=$(echo "$result" | cut -d: -f2)
        
        total_response_time=$((total_response_time + response_time))
        
        if [[ "$status_code" != "$expected_status" ]]; then
            ((failed_endpoints++))
            log_verbose "Endpoint $endpoint failed: expected $expected_status, got $status_code"
        fi
    done
    
    local avg_response_time=$((total_response_time / ${#endpoints[@]}))
    HEALTH_METRICS["api_response_time"]="$avg_response_time"
    HEALTH_METRICS["api_failed_endpoints"]="$failed_endpoints"
    
    if [[ $failed_endpoints -gt 0 ]]; then
        if [[ $failed_endpoints -eq ${#endpoints[@]} ]]; then
            api_status="critical"
            api_details="All API endpoints failed"
        else
            api_status="warning"
            api_details="$failed_endpoints/${#endpoints[@]} API endpoints failed (avg response: ${avg_response_time}ms)"
        fi
    else
        if (( avg_response_time > RESPONSE_TIME_THRESHOLD )); then
            api_status="warning"
            api_details="API endpoints accessible but slow (${avg_response_time}ms > ${RESPONSE_TIME_THRESHOLD}ms)"
        else
            api_details="All API endpoints accessible (avg response: ${avg_response_time}ms)"
        fi
    fi
    
    HEALTH_RESULTS["api"]="$api_status"
    HEALTH_DETAILS["api"]="$api_details"
    
    log_verbose "API check completed: $api_status"
}

# Check Nginx status
check_nginx() {
    log_verbose "Checking Nginx status"
    
    local nginx_status="healthy"
    local nginx_details=""
    
    local result
    result=$(http_request "$NGINX_URL" "$HEALTH_CHECK_TIMEOUT" "$HEALTH_CHECK_RETRIES")
    local status_code=$(echo "$result" | cut -d: -f1)
    local response_time=$(echo "$result" | cut -d: -f2)
    
    HEALTH_METRICS["nginx_response_time"]="$response_time"
    
    if [[ "$status_code" =~ ^[23] ]]; then
        if (( response_time > RESPONSE_TIME_THRESHOLD )); then
            nginx_status="warning"
            nginx_details="Nginx accessible but slow (${response_time}ms > ${RESPONSE_TIME_THRESHOLD}ms)"
        else
            nginx_details="Nginx accessible (${response_time}ms)"
        fi
    else
        nginx_status="critical"
        nginx_details="Nginx not accessible (HTTP $status_code)"
    fi
    
    HEALTH_RESULTS["nginx"]="$nginx_status"
    HEALTH_DETAILS["nginx"]="$nginx_details"
    
    log_verbose "Nginx check completed: $nginx_status"
}

# Check MinIO storage
check_minio() {
    log_verbose "Checking MinIO storage"
    
    local minio_status="healthy"
    local minio_details=""
    
    local result
    result=$(http_request "$MINIO_URL/minio/health/live" "$HEALTH_CHECK_TIMEOUT" "$HEALTH_CHECK_RETRIES")
    local status_code=$(echo "$result" | cut -d: -f1)
    local response_time=$(echo "$result" | cut -d: -f2)
    
    HEALTH_METRICS["minio_response_time"]="$response_time"
    
    if [[ "$status_code" == "200" ]]; then
        if (( response_time > RESPONSE_TIME_THRESHOLD )); then
            minio_status="warning"
            minio_details="MinIO accessible but slow (${response_time}ms > ${RESPONSE_TIME_THRESHOLD}ms)"
        else
            minio_details="MinIO accessible (${response_time}ms)"
        fi
    else
        minio_status="critical"
        minio_details="MinIO not accessible (HTTP $status_code)"
    fi
    
    HEALTH_RESULTS["minio"]="$minio_status"
    HEALTH_DETAILS["minio"]="$minio_details"
    
    log_verbose "MinIO check completed: $minio_status"
}

# Check Docker containers
check_docker() {
    log_verbose "Checking Docker containers"
    
    local docker_status="healthy"
    local docker_details=""
    local running_containers=0
    local total_containers=0
    local unhealthy_containers=()
    
    if command -v docker >/dev/null 2>&1; then
        # Check if Docker daemon is running
        if ! docker info >/dev/null 2>&1; then
            docker_status="critical"
            docker_details="Docker daemon not accessible"
        else
            # Check containers in the project
            if [[ -f "$PROJECT_ROOT/docker-compose.yml" ]]; then
                cd "$PROJECT_ROOT"
                
                # Get container status
                local containers
                containers=$(docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}" 2>/dev/null | tail -n +2 || echo "")
                
                if [[ -n "$containers" ]]; then
                    while IFS=$'\t' read -r name state status; do
                        if [[ -n "$name" ]]; then
                            ((total_containers++))
                            if [[ "$state" == "running" ]]; then
                                ((running_containers++))
                            else
                                unhealthy_containers+=("$name ($state)")
                            fi
                        fi
                    done <<< "$containers"
                fi
            fi
            
            if [[ $total_containers -eq 0 ]]; then
                docker_details="No Docker containers found"
            elif [[ $running_containers -eq $total_containers ]]; then
                docker_details="All $total_containers containers running"
            else
                docker_status="warning"
                local unhealthy_list
                unhealthy_list=$(IFS=', '; echo "${unhealthy_containers[*]}")
                docker_details="$running_containers/$total_containers containers running. Unhealthy: $unhealthy_list"
            fi
        fi
    else
        docker_status="warning"
        docker_details="Docker not available"
    fi
    
    HEALTH_METRICS["docker_running_containers"]="$running_containers"
    HEALTH_METRICS["docker_total_containers"]="$total_containers"
    HEALTH_RESULTS["docker"]="$docker_status"
    HEALTH_DETAILS["docker"]="$docker_details"
    
    log_verbose "Docker check completed: $docker_status"
}

# Check SSL certificates
check_ssl() {
    log_verbose "Checking SSL certificates"
    
    local ssl_status="healthy"
    local ssl_details=""
    local ssl_urls=()
    
    # Extract HTTPS URLs from configuration
    if [[ "$FRONTEND_URL" =~ ^https:// ]]; then
        ssl_urls+=("$FRONTEND_URL")
    fi
    if [[ "$API_URL" =~ ^https:// ]]; then
        ssl_urls+=("$API_URL")
    fi
    if [[ "$NGINX_URL" =~ ^https:// ]]; then
        ssl_urls+=("$NGINX_URL")
    fi
    
    if [[ ${#ssl_urls[@]} -eq 0 ]]; then
        ssl_details="No HTTPS URLs configured"
    else
        local ssl_issues=()
        
        for url in "${ssl_urls[@]}"; do
            local hostname
            hostname=$(echo "$url" | sed 's|https://||' | cut -d/ -f1 | cut -d: -f1)
            
            log_verbose "Checking SSL certificate for $hostname"
            
            if command -v openssl >/dev/null 2>&1; then
                local cert_info
                cert_info=$(timeout "$HEALTH_CHECK_TIMEOUT" openssl s_client -connect "$hostname:443" -servername "$hostname" </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
                
                if [[ -n "$cert_info" ]]; then
                    local not_after
                    not_after=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
                    
                    if [[ -n "$not_after" ]]; then
                        local expiry_date
                        expiry_date=$(date -d "$not_after" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$not_after" +%s 2>/dev/null || echo "0")
                        local current_date=$(date +%s)
                        local days_until_expiry=$(( (expiry_date - current_date) / 86400 ))
                        
                        if [[ $days_until_expiry -lt 7 ]]; then
                            ssl_issues+=("$hostname expires in $days_until_expiry days")
                            ssl_status="critical"
                        elif [[ $days_until_expiry -lt 30 ]]; then
                            ssl_issues+=("$hostname expires in $days_until_expiry days")
                            if [[ "$ssl_status" != "critical" ]]; then
                                ssl_status="warning"
                            fi
                        fi
                    fi
                else
                    ssl_issues+=("$hostname certificate check failed")
                    ssl_status="warning"
                fi
            else
                ssl_details="OpenSSL not available for SSL checks"
                ssl_status="warning"
                break
            fi
        done
        
        if [[ ${#ssl_issues[@]} -gt 0 ]]; then
            ssl_details=$(IFS=', '; echo "${ssl_issues[*]}")
        else
            ssl_details="All SSL certificates valid"
        fi
    fi
    
    HEALTH_RESULTS["ssl"]="$ssl_status"
    HEALTH_DETAILS["ssl"]="$ssl_details"
    
    log_verbose "SSL check completed: $ssl_status"
}

# Check external dependencies
check_dependencies() {
    log_verbose "Checking external dependencies"
    
    local deps_status="healthy"
    local deps_details=""
    local failed_deps=()
    
    # Common external services to check
    local external_services=(
        "https://api.github.com:200"
        "https://registry.npmjs.org:200"
        "https://www.google.com:200"
    )
    
    for service_config in "${external_services[@]}"; do
        local service_url=$(echo "$service_config" | cut -d: -f1-2)
        local expected_status=$(echo "$service_config" | cut -d: -f3)
        
        log_verbose "Checking external service: $service_url"
        
        local result
        result=$(http_request "$service_url" 10 1 "GET" "$expected_status")
        local status_code=$(echo "$result" | cut -d: -f1)
        
        if [[ "$status_code" != "$expected_status" ]]; then
            failed_deps+=("$(echo "$service_url" | sed 's|https://||' | cut -d/ -f1)")
        fi
    done
    
    if [[ ${#failed_deps[@]} -gt 0 ]]; then
        deps_status="warning"
        deps_details="External dependencies unreachable: $(IFS=', '; echo "${failed_deps[*]}")"
    else
        deps_details="All external dependencies accessible"
    fi
    
    HEALTH_RESULTS["dependencies"]="$deps_status"
    HEALTH_DETAILS["dependencies"]="$deps_details"
    
    log_verbose "Dependencies check completed: $deps_status"
}

# Check performance metrics
check_performance() {
    log_verbose "Checking performance metrics"
    
    local perf_status="healthy"
    local perf_details=""
    local perf_issues=()
    
    # Check average response times
    local total_response_time=0
    local response_count=0
    
    for metric in "frontend_response_time" "api_response_time" "nginx_response_time"; do
        if [[ -n "${HEALTH_METRICS[$metric]:-}" ]]; then
            total_response_time=$((total_response_time + HEALTH_METRICS[$metric]))
            ((response_count++))
        fi
    done
    
    if [[ $response_count -gt 0 ]]; then
        local avg_response_time=$((total_response_time / response_count))
        HEALTH_METRICS["avg_response_time"]="$avg_response_time"
        
        if (( avg_response_time > RESPONSE_TIME_THRESHOLD )); then
            perf_issues+=("High average response time: ${avg_response_time}ms")
            perf_status="warning"
        fi
    fi
    
    # Check system resource usage
    if [[ -n "${HEALTH_METRICS[cpu_usage]:-}" ]] && (( $(echo "${HEALTH_METRICS[cpu_usage]} > $CPU_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        perf_issues+=("High CPU usage: ${HEALTH_METRICS[cpu_usage]}%")
        perf_status="warning"
    fi
    
    if [[ -n "${HEALTH_METRICS[memory_usage]:-}" ]] && (( $(echo "${HEALTH_METRICS[memory_usage]} > $MEMORY_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        perf_issues+=("High memory usage: ${HEALTH_METRICS[memory_usage]}%")
        perf_status="warning"
    fi
    
    if [[ ${#perf_issues[@]} -gt 0 ]]; then
        perf_details=$(IFS=', '; echo "${perf_issues[*]}")
    else
        perf_details="Performance metrics within acceptable ranges"
    fi
    
    HEALTH_RESULTS["performance"]="$perf_status"
    HEALTH_DETAILS["performance"]="$perf_details"
    
    log_verbose "Performance check completed: $perf_status"
}

# Check security status
check_security() {
    log_verbose "Checking security status"
    
    local security_status="healthy"
    local security_details=""
    local security_issues=()
    
    # Check for common security files
    local security_files=(
        "$PROJECT_ROOT/deployment/environments/.env"
        "$PROJECT_ROOT/deployment/environments/.env.prod"
        "$PROJECT_ROOT/package-lock.json"
        "$PROJECT_ROOT/yarn.lock"
    )
    
    for file in "${security_files[@]}"; do
        if [[ -f "$file" ]]; then
            local file_perms
            file_perms=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%A" "$file" 2>/dev/null || echo "unknown")
            
            # Check if file is world-readable
            if [[ "$file_perms" =~ [0-9][0-9][4-7] ]]; then
                security_issues+=("$(basename "$file") is world-readable")
                security_status="warning"
            fi
        fi
    done
    
    # Check for exposed ports
    if command -v netstat >/dev/null 2>&1; then
        local exposed_ports
        exposed_ports=$(netstat -tuln 2>/dev/null | grep "0.0.0.0:" | awk '{print $4}' | cut -d: -f2 | sort -n | uniq | tr '\n' ' ' || echo "")
        
        if [[ -n "$exposed_ports" ]]; then
            log_verbose "Exposed ports: $exposed_ports"
        fi
    fi
    
    # Check SSL configuration
    if [[ "${HEALTH_RESULTS[ssl]:-}" == "critical" ]]; then
        security_issues+=("SSL certificate issues detected")
        security_status="critical"
    elif [[ "${HEALTH_RESULTS[ssl]:-}" == "warning" ]]; then
        security_issues+=("SSL certificate warnings detected")
        if [[ "$security_status" != "critical" ]]; then
            security_status="warning"
        fi
    fi
    
    if [[ ${#security_issues[@]} -gt 0 ]]; then
        security_details=$(IFS=', '; echo "${security_issues[*]}")
    else
        security_details="No security issues detected"
    fi
    
    HEALTH_RESULTS["security"]="$security_status"
    HEALTH_DETAILS["security"]="$security_details"
    
    log_verbose "Security check completed: $security_status"
}

# Send alert notification
send_alert() {
    local alert_level="$1"
    local alert_message="$2"
    
    log_verbose "Sending alert: $alert_level - $alert_message"
    
    # Send to webhook if configured
    if [[ -n "$ALERT_WEBHOOK" ]]; then
        local payload
        payload=$(cat << EOF
{
    "level": "$alert_level",
    "message": "$alert_message",
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "hostname": "$(hostname)"
}
EOF
        )
        
        if command -v curl >/dev/null 2>&1; then
            curl -s -X POST \
                -H "Content-Type: application/json" \
                -d "$payload" \
                "$ALERT_WEBHOOK" >/dev/null 2>&1 || log_verbose "Failed to send webhook alert"
        fi
    fi
    
    # Send to Slack if configured
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="good"
        case "$alert_level" in
            "critical") color="danger" ;;
            "warning") color="warning" ;;
        esac
        
        local slack_payload
        slack_payload=$(cat << EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "Health Check Alert - $ENVIRONMENT",
            "text": "$alert_message",
            "fields": [
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Hostname",
                    "value": "$(hostname)",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$(date)",
                    "short": false
                }
            ]
        }
    ]
}
EOF
        )
        
        if command -v curl >/dev/null 2>&1; then
            curl -s -X POST \
                -H "Content-Type: application/json" \
                -d "$slack_payload" \
                "$SLACK_WEBHOOK" >/dev/null 2>&1 || log_verbose "Failed to send Slack alert"
        fi
    fi
}

# Output results
output_results() {
    local overall_status="healthy"
    local critical_count=0
    local warning_count=0
    local healthy_count=0
    
    # Determine overall status
    for service in "${!HEALTH_RESULTS[@]}"; do
        case "${HEALTH_RESULTS[$service]}" in
            "critical")
                overall_status="critical"
                ((critical_count++))
                ;;
            "warning")
                if [[ "$overall_status" != "critical" ]]; then
                    overall_status="warning"
                fi
                ((warning_count++))
                ;;
            "healthy")
                ((healthy_count++))
                ;;
        esac
    done
    
    case "$OUTPUT_FORMAT" in
        "json")
            # JSON output
            echo "{"
            echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
            echo "  \"environment\": \"$ENVIRONMENT\","
            echo "  \"hostname\": \"$(hostname)\","
            echo "  \"overall_status\": \"$overall_status\","
            echo "  \"summary\": {"
            echo "    \"healthy\": $healthy_count,"
            echo "    \"warning\": $warning_count,"
            echo "    \"critical\": $critical_count"
            echo "  },"
            echo "  \"checks\": {"
            
            local first=true
            for service in $(printf '%s\n' "${!HEALTH_RESULTS[@]}" | sort); do
                if [[ "$first" == "true" ]]; then
                    first=false
                else
                    echo ","
                fi
                
                echo -n "    \"$service\": {"
                echo -n "\"status\": \"${HEALTH_RESULTS[$service]}\", "
                echo -n "\"details\": \"${HEALTH_DETAILS[$service]}\""
                echo -n "}"
            done
            
            echo ""
            echo "  },"
            echo "  \"metrics\": {"
            
            first=true
            for metric in $(printf '%s\n' "${!HEALTH_METRICS[@]}" | sort); do
                if [[ "$first" == "true" ]]; then
                    first=false
                else
                    echo ","
                fi
                
                echo -n "    \"$metric\": ${HEALTH_METRICS[$metric]}"
            done
            
            echo ""
            echo "  }"
            echo "}"
            ;;
        "prometheus")
            # Prometheus metrics output
            echo "# HELP wedding_club_health_status Health status of Wedding Club services (0=healthy, 1=warning, 2=critical)"
            echo "# TYPE wedding_club_health_status gauge"
            
            for service in "${!HEALTH_RESULTS[@]}"; do
                local status_value=0
                case "${HEALTH_RESULTS[$service]}" in
                    "warning") status_value=1 ;;
                    "critical") status_value=2 ;;
                esac
                
                echo "wedding_club_health_status{service=\"$service\",environment=\"$ENVIRONMENT\"} $status_value"
            done
            
            # Output metrics
            for metric in "${!HEALTH_METRICS[@]}"; do
                echo "# HELP wedding_club_$metric $metric metric"
                echo "# TYPE wedding_club_$metric gauge"
                echo "wedding_club_$metric{environment=\"$ENVIRONMENT\"} ${HEALTH_METRICS[$metric]}"
            done
            ;;
        *)
            # Text output (default)
            echo ""
            echo "=== Wedding Club Health Check Report ==="
            echo "Environment: $ENVIRONMENT"
            echo "Timestamp: $(date)"
            echo "Hostname: $(hostname)"
            echo ""
            
            # Overall status
            case "$overall_status" in
                "healthy")
                    echo -e "${GREEN}Overall Status: HEALTHY${NC}"
                    ;;
                "warning")
                    echo -e "${YELLOW}Overall Status: WARNING${NC}"
                    ;;
                "critical")
                    echo -e "${RED}Overall Status: CRITICAL${NC}"
                    ;;
            esac
            
            echo ""
            echo "Summary: $healthy_count healthy, $warning_count warnings, $critical_count critical"
            echo ""
            
            # Service details
            echo "=== Service Status ==="
            printf "%-15s %-10s %s\n" "Service" "Status" "Details"
            printf "%-15s %-10s %s\n" "-------" "------" "-------"
            
            for service in $(printf '%s\n' "${!HEALTH_RESULTS[@]}" | sort); do
                local status="${HEALTH_RESULTS[$service]}"
                local details="${HEALTH_DETAILS[$service]}"
                
                case "$status" in
                    "healthy")
                        printf "%-15s ${GREEN}%-10s${NC} %s\n" "$service" "$status" "$details"
                        ;;
                    "warning")
                        printf "%-15s ${YELLOW}%-10s${NC} %s\n" "$service" "$status" "$details"
                        ;;
                    "critical")
                        printf "%-15s ${RED}%-10s${NC} %s\n" "$service" "$status" "$details"
                        ;;
                esac
            done
            
            # Metrics
            if [[ ${#HEALTH_METRICS[@]} -gt 0 ]]; then
                echo ""
                echo "=== Metrics ==="
                for metric in $(printf '%s\n' "${!HEALTH_METRICS[@]}" | sort); do
                    printf "%-25s: %s\n" "$metric" "${HEALTH_METRICS[$metric]}"
                done
            fi
            
            echo ""
            ;;
    esac
    
    # Send alerts for critical or warning status
    if [[ "$overall_status" == "critical" ]]; then
        send_alert "critical" "Health check failed: $critical_count critical issues detected"
    elif [[ "$overall_status" == "warning" ]]; then
        send_alert "warning" "Health check warnings: $warning_count issues detected"
    fi
}

# Continuous monitoring
continuous_monitoring() {
    log_info "Starting continuous health monitoring (interval: ${HEALTH_CHECK_INTERVAL}s)"
    
    while true; do
        # Clear previous results
        HEALTH_RESULTS=()
        HEALTH_DETAILS=()
        HEALTH_METRICS=()
        
        # Run health checks
        run_health_checks
        
        # Output results
        if [[ "$OUTPUT_FORMAT" != "json" ]]; then
            clear
            echo "=== Continuous Health Monitoring ==="
            echo "Press Ctrl+C to stop"
            echo ""
        fi
        
        output_results
        
        # Wait for next check
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Run health checks based on command
run_health_checks() {
    case "$COMMAND" in
        "all")
            check_system
            check_database
            check_redis
            check_frontend
            check_api
            check_nginx
            check_minio
            check_docker
            check_ssl
            check_dependencies
            check_performance
            check_security
            ;;
        "system")
            check_system
            ;;
        "services")
            check_frontend
            check_api
            check_nginx
            check_minio
            ;;
        "database")
            check_database
            ;;
        "redis")
            check_redis
            ;;
        "frontend")
            check_frontend
            ;;
        "api")
            check_api
            ;;
        "nginx")
            check_nginx
            ;;
        "minio")
            check_minio
            ;;
        "docker")
            check_docker
            ;;
        "ssl")
            check_ssl
            ;;
        "dependencies")
            check_dependencies
            ;;
        "performance")
            check_system
            check_frontend
            check_api
            check_nginx
            check_performance
            ;;
        "security")
            check_ssl
            check_security
            ;;
        "continuous")
            continuous_monitoring
            return
            ;;
    esac
}

# Main function
main() {
    load_env_config
    
    if [[ "$COMMAND" == "continuous" ]]; then
        continuous_monitoring
    else
        run_health_checks
        output_results
        
        # Exit with appropriate code
        local overall_status="healthy"
        for service in "${!HEALTH_RESULTS[@]}"; do
            case "${HEALTH_RESULTS[$service]}" in
                "critical")
                    overall_status="critical"
                    break
                    ;;
                "warning")
                    if [[ "$overall_status" != "critical" ]]; then
                        overall_status="warning"
                    fi
                    ;;
            esac
        done
        
        case "$overall_status" in
            "critical") exit 2 ;;
            "warning") exit 1 ;;
            *) exit 0 ;;
        esac
    fi
}

# Run main function
main
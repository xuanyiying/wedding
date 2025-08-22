#!/bin/bash

# Wedding Club System Maintenance Script
# This script provides comprehensive system maintenance for the Wedding Club application

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOGS_DIR="$PROJECT_ROOT/logs"
BACKUP_DIR="$PROJECT_ROOT/backups"
TEMP_DIR="$PROJECT_ROOT/temp/maintenance"
REPORTS_DIR="$PROJECT_ROOT/reports"
VERBOSE="${VERBOSE:-false}"
DRY_RUN="${DRY_RUN:-false}"
ENVIRONMENT="${ENVIRONMENT:-development}"
FORCE="${FORCE:-false}"
MAINTENANCE_MODE="${MAINTENANCE_MODE:-false}"
SEND_NOTIFICATIONS="${SEND_NOTIFICATIONS:-false}"
CLEANUP_DAYS="${CLEANUP_DAYS:-30}"
LOG_RETENTION_DAYS="${LOG_RETENTION_DAYS:-90}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DISK_USAGE_THRESHOLD="${DISK_USAGE_THRESHOLD:-80}"
MEMORY_USAGE_THRESHOLD="${MEMORY_USAGE_THRESHOLD:-85}"
CPU_USAGE_THRESHOLD="${CPU_USAGE_THRESHOLD:-90}"
MAX_PARALLEL_JOBS="${MAX_PARALLEL_JOBS:-4}"
TIMEOUT="${TIMEOUT:-300}"
SCHEDULE_ENABLED="${SCHEDULE_ENABLED:-false}"
CRON_SCHEDULE="${CRON_SCHEDULE:-0 2 * * 0}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
EMAIL_RECIPIENTS="${EMAIL_RECIPIENTS:-}"
SMTP_HOST="${SMTP_HOST:-localhost}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
FROM_EMAIL="${FROM_EMAIL:-maintenance@weddingclub.com}"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-wedding_club}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Redis configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Maintenance tasks
MAINTENANCE_TASKS=(
    "system_cleanup"
    "log_rotation"
    "database_maintenance"
    "cache_cleanup"
    "disk_cleanup"
    "security_updates"
    "performance_optimization"
    "backup_cleanup"
    "service_restart"
    "health_check"
)

# Logging functions
log_info() {
    local message="$1"
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $message" >> "$LOGS_DIR/maintenance.log"
}

log_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $message" >> "$LOGS_DIR/maintenance.log"
}

log_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $message" >> "$LOGS_DIR/maintenance.log"
}

log_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $message" >> "$LOGS_DIR/maintenance.log"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        local message="$1"
        echo -e "${PURPLE}[VERBOSE]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
        echo "$(date '+%Y-%m-%d %H:%M:%S') [VERBOSE] $message" >> "$LOGS_DIR/maintenance.log"
    fi
}

# Help function
show_help() {
    cat << EOF
Wedding Club System Maintenance Script

Usage: $0 [OPTIONS] [COMMAND] [ARGS...]

Commands:
    run [TASKS...]                  Run maintenance tasks
    schedule                        Schedule maintenance tasks
    unschedule                      Remove scheduled maintenance
    status                          Show maintenance status
    report                          Generate maintenance report
    cleanup                         Clean up system resources
    optimize                        Optimize system performance
    update                          Update system components
    backup                          Create system backup
    restore BACKUP_FILE             Restore from backup
    monitor                         Monitor system resources
    alert                           Check and send alerts
    maintenance-mode on|off         Enable/disable maintenance mode
    validate                        Validate system configuration
    benchmark                       Run system benchmarks
    security-scan                   Run security scan
    disk-usage                      Show disk usage
    memory-usage                    Show memory usage
    cpu-usage                       Show CPU usage
    service-status                  Show service status
    log-analysis                    Analyze system logs
    performance-report              Generate performance report
    health-summary                  Show system health summary

Maintenance Tasks:
    system_cleanup                  Clean temporary files and caches
    log_rotation                    Rotate and compress log files
    database_maintenance            Optimize database tables
    cache_cleanup                   Clear expired cache entries
    disk_cleanup                    Clean up disk space
    security_updates                Apply security updates
    performance_optimization        Optimize system performance
    backup_cleanup                  Clean old backup files
    service_restart                 Restart services if needed
    health_check                    Perform health checks

Options:
    -e, --env ENVIRONMENT           Target environment (default: development)
    --maintenance-mode              Enable maintenance mode during tasks
    --cleanup-days DAYS             Days to keep temporary files (default: 30)
    --log-retention DAYS            Days to keep log files (default: 90)
    --backup-retention DAYS         Days to keep backup files (default: 30)
    --disk-threshold PERCENT        Disk usage alert threshold (default: 80)
    --memory-threshold PERCENT      Memory usage alert threshold (default: 85)
    --cpu-threshold PERCENT         CPU usage alert threshold (default: 90)
    --max-jobs NUMBER               Maximum parallel jobs (default: 4)
    --timeout SECONDS               Task timeout (default: 300)
    --schedule CRON                 Cron schedule (default: 0 2 * * 0)
    --send-notifications            Enable notifications
    --slack-webhook URL             Slack webhook URL
    --email-recipients EMAILS       Email recipients (comma-separated)
    --smtp-host HOST                SMTP server host
    --smtp-port PORT                SMTP server port
    --smtp-user USER                SMTP username
    --smtp-password PASSWORD        SMTP password
    --from-email EMAIL              From email address
    --db-host HOST                  Database host
    --db-port PORT                  Database port
    --db-name NAME                  Database name
    --db-user USER                  Database user
    --db-password PASSWORD          Database password
    --redis-host HOST               Redis host
    --redis-port PORT               Redis port
    --redis-password PASSWORD       Redis password
    --force                         Force operation (use with caution)
    --dry-run                       Show what would be done without executing
    -v, --verbose                   Enable verbose output
    --help                          Show this help message

Examples:
    $0 run system_cleanup log_rotation
    $0 run --maintenance-mode
    $0 schedule --schedule "0 2 * * *"
    $0 cleanup --cleanup-days 7
    $0 optimize --max-jobs 8
    $0 monitor --send-notifications
    $0 report --format html
    $0 maintenance-mode on
    $0 security-scan --verbose

EOF
}

# Parse command line arguments
COMMAND=""
ARGS=()
TASKS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --maintenance-mode)
            MAINTENANCE_MODE="true"
            shift
            ;;
        --cleanup-days)
            CLEANUP_DAYS="$2"
            shift 2
            ;;
        --log-retention)
            LOG_RETENTION_DAYS="$2"
            shift 2
            ;;
        --backup-retention)
            BACKUP_RETENTION_DAYS="$2"
            shift 2
            ;;
        --disk-threshold)
            DISK_USAGE_THRESHOLD="$2"
            shift 2
            ;;
        --memory-threshold)
            MEMORY_USAGE_THRESHOLD="$2"
            shift 2
            ;;
        --cpu-threshold)
            CPU_USAGE_THRESHOLD="$2"
            shift 2
            ;;
        --max-jobs)
            MAX_PARALLEL_JOBS="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --schedule)
            CRON_SCHEDULE="$2"
            shift 2
            ;;
        --send-notifications)
            SEND_NOTIFICATIONS="true"
            shift
            ;;
        --slack-webhook)
            SLACK_WEBHOOK_URL="$2"
            shift 2
            ;;
        --email-recipients)
            EMAIL_RECIPIENTS="$2"
            shift 2
            ;;
        --smtp-host)
            SMTP_HOST="$2"
            shift 2
            ;;
        --smtp-port)
            SMTP_PORT="$2"
            shift 2
            ;;
        --smtp-user)
            SMTP_USER="$2"
            shift 2
            ;;
        --smtp-password)
            SMTP_PASSWORD="$2"
            shift 2
            ;;
        --from-email)
            FROM_EMAIL="$2"
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
        --db-name)
            DB_NAME="$2"
            shift 2
            ;;
        --db-user)
            DB_USER="$2"
            shift 2
            ;;
        --db-password)
            DB_PASSWORD="$2"
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
        --redis-password)
            REDIS_PASSWORD="$2"
            shift 2
            ;;
        --force)
            FORCE="true"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
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
        run|schedule|unschedule|status|report|cleanup|optimize|update|backup|restore|monitor|alert|maintenance-mode|validate|benchmark|security-scan|disk-usage|memory-usage|cpu-usage|service-status|log-analysis|performance-report|health-summary)
            COMMAND="$1"
            shift
            ;;
        *)
            if [[ "$COMMAND" == "run" ]]; then
                TASKS+=("$1")
            else
                ARGS+=("$1")
            fi
            shift
            ;;
    esac
done

# Create necessary directories
mkdir -p "$LOGS_DIR" "$BACKUP_DIR" "$TEMP_DIR" "$REPORTS_DIR"

# Load environment configuration
load_environment_config() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [[ -f "$env_file" ]]; then
        log_verbose "Loading environment configuration from: $env_file"
        
        # Source environment file
        set -a
        source "$env_file"
        set +a
        
        # Override configuration if set in environment
        DB_HOST="${DATABASE_HOST:-$DB_HOST}"
        DB_PORT="${DATABASE_PORT:-$DB_PORT}"
        DB_NAME="${DATABASE_NAME:-$DB_NAME}"
        DB_USER="${DATABASE_USER:-$DB_USER}"
        DB_PASSWORD="${DATABASE_PASSWORD:-$DB_PASSWORD}"
        REDIS_HOST="${REDIS_HOST:-$REDIS_HOST}"
        REDIS_PORT="${REDIS_PORT:-$REDIS_PORT}"
    else
        log_warning "Environment file not found: $env_file"
    fi
}

# Utility functions
get_timestamp() {
    date '+%Y%m%d_%H%M%S'
}

get_disk_usage() {
    df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//'
}

get_memory_usage() {
    free | awk 'NR==2{printf "%.0f", $3*100/$2}'
}

get_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//'
}

get_load_average() {
    uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//'
}

# Notification functions
send_slack_notification() {
    local message="$1"
    local color="${2:-good}"
    
    if [[ -z "$SLACK_WEBHOOK_URL" ]]; then
        log_verbose "Slack webhook URL not configured, skipping notification"
        return 0
    fi
    
    local payload=$(cat << EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "Wedding Club Maintenance",
            "text": "$message",
            "footer": "System Maintenance",
            "ts": $(date +%s)
        }
    ]
}
EOF
    )
    
    curl -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
}

send_email_notification() {
    local subject="$1"
    local body="$2"
    
    if [[ -z "$EMAIL_RECIPIENTS" ]]; then
        log_verbose "Email recipients not configured, skipping notification"
        return 0
    fi
    
    # Send email using sendmail or SMTP
    if command -v sendmail >/dev/null 2>&1; then
        IFS=',' read -ra RECIPIENTS <<< "$EMAIL_RECIPIENTS"
        for recipient in "${RECIPIENTS[@]}"; do
            {
                echo "To: $recipient"
                echo "From: $FROM_EMAIL"
                echo "Subject: $subject"
                echo "Content-Type: text/html; charset=UTF-8"
                echo ""
                echo "$body"
            } | sendmail "$recipient"
        done
    else
        log_warning "sendmail not available, email not sent"
    fi
}

# Maintenance mode functions
enable_maintenance_mode() {
    log_info "Enabling maintenance mode..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would enable maintenance mode"
        return 0
    fi
    
    # Create maintenance mode file
    echo "$(date)" > "$PROJECT_ROOT/.maintenance"
    
    # Update Nginx configuration to show maintenance page
    if command -v nginx >/dev/null 2>&1; then
        # Reload Nginx configuration
        sudo nginx -s reload 2>/dev/null || true
    fi
    
    log_success "Maintenance mode enabled"
}

disable_maintenance_mode() {
    log_info "Disabling maintenance mode..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would disable maintenance mode"
        return 0
    fi
    
    # Remove maintenance mode file
    rm -f "$PROJECT_ROOT/.maintenance"
    
    # Reload Nginx configuration
    if command -v nginx >/dev/null 2>&1; then
        sudo nginx -s reload 2>/dev/null || true
    fi
    
    log_success "Maintenance mode disabled"
}

# System cleanup functions
system_cleanup() {
    log_info "Running system cleanup..."
    
    local cleaned_size=0
    
    # Clean temporary files
    if [[ -d "$TEMP_DIR" ]]; then
        log_verbose "Cleaning temporary files older than $CLEANUP_DAYS days..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            local temp_files=$(find "$TEMP_DIR" -type f -mtime +$CLEANUP_DAYS 2>/dev/null | wc -l)
            log_info "[DRY RUN] Would clean $temp_files temporary files"
        else
            local temp_size=$(find "$TEMP_DIR" -type f -mtime +$CLEANUP_DAYS -exec du -ch {} + 2>/dev/null | tail -1 | cut -f1 || echo "0")
            find "$TEMP_DIR" -type f -mtime +$CLEANUP_DAYS -delete 2>/dev/null || true
            find "$TEMP_DIR" -type d -empty -delete 2>/dev/null || true
            log_success "Cleaned temporary files: $temp_size"
            cleaned_size=$((cleaned_size + $(echo "$temp_size" | sed 's/[^0-9]//g' || echo "0")))
        fi
    fi
    
    # Clean Docker resources
    if command -v docker >/dev/null 2>&1; then
        log_verbose "Cleaning Docker resources..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would clean Docker resources"
        else
            # Remove unused containers, networks, images, and build cache
            docker system prune -f >/dev/null 2>&1 || true
            docker volume prune -f >/dev/null 2>&1 || true
            log_success "Cleaned Docker resources"
        fi
    fi
    
    # Clean package manager cache
    if command -v apt-get >/dev/null 2>&1; then
        log_verbose "Cleaning APT cache..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would clean APT cache"
        else
            sudo apt-get clean >/dev/null 2>&1 || true
            sudo apt-get autoclean >/dev/null 2>&1 || true
            log_success "Cleaned APT cache"
        fi
    fi
    
    if command -v yum >/dev/null 2>&1; then
        log_verbose "Cleaning YUM cache..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would clean YUM cache"
        else
            sudo yum clean all >/dev/null 2>&1 || true
            log_success "Cleaned YUM cache"
        fi
    fi
    
    # Clean system logs
    if command -v journalctl >/dev/null 2>&1; then
        log_verbose "Cleaning system logs..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would clean system logs"
        else
            sudo journalctl --vacuum-time=${LOG_RETENTION_DAYS}d >/dev/null 2>&1 || true
            log_success "Cleaned system logs"
        fi
    fi
    
    log_success "System cleanup completed"
}

# Log rotation function
log_rotation() {
    log_info "Running log rotation..."
    
    local rotated_files=0
    
    # Rotate application logs
    for log_file in "$LOGS_DIR"/*.log; do
        if [[ -f "$log_file" && $(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo "0") -gt 10485760 ]]; then # 10MB
            log_verbose "Rotating log file: $log_file"
            
            if [[ "$DRY_RUN" == "true" ]]; then
                log_info "[DRY RUN] Would rotate log file: $log_file"
            else
                local timestamp=$(get_timestamp)
                mv "$log_file" "${log_file}.${timestamp}"
                gzip "${log_file}.${timestamp}" 2>/dev/null || true
                touch "$log_file"
                rotated_files=$((rotated_files + 1))
            fi
        fi
    done
    
    # Clean old rotated logs
    if [[ "$DRY_RUN" == "true" ]]; then
        local old_logs=$(find "$LOGS_DIR" -name "*.log.*" -mtime +$LOG_RETENTION_DAYS 2>/dev/null | wc -l)
        log_info "[DRY RUN] Would clean $old_logs old log files"
    else
        find "$LOGS_DIR" -name "*.log.*" -mtime +$LOG_RETENTION_DAYS -delete 2>/dev/null || true
    fi
    
    log_success "Log rotation completed: $rotated_files files rotated"
}

# Database maintenance function
database_maintenance() {
    log_info "Running database maintenance..."
    
    if ! command -v mysql >/dev/null 2>&1; then
        log_warning "MySQL client not found, skipping database maintenance"
        return 0
    fi
    
    local mysql_cmd="mysql -h $DB_HOST -P $DB_PORT -u $DB_USER"
    
    if [[ -n "$DB_PASSWORD" ]]; then
        mysql_cmd="$mysql_cmd -p$DB_PASSWORD"
    fi
    
    mysql_cmd="$mysql_cmd $DB_NAME"
    
    # Test database connection
    if ! $mysql_cmd -e "SELECT 1" >/dev/null 2>&1; then
        log_error "Database connection failed"
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would run database maintenance"
        return 0
    fi
    
    # Optimize tables
    log_verbose "Optimizing database tables..."
    local tables=$($mysql_cmd -sN -e "SHOW TABLES;" 2>/dev/null || echo "")
    
    if [[ -n "$tables" ]]; then
        while IFS= read -r table; do
            log_verbose "Optimizing table: $table"
            $mysql_cmd -e "OPTIMIZE TABLE $table;" >/dev/null 2>&1 || true
        done <<< "$tables"
    fi
    
    # Analyze tables
    log_verbose "Analyzing database tables..."
    if [[ -n "$tables" ]]; then
        while IFS= read -r table; do
            $mysql_cmd -e "ANALYZE TABLE $table;" >/dev/null 2>&1 || true
        done <<< "$tables"
    fi
    
    # Clean up old sessions
    log_verbose "Cleaning up old sessions..."
    $mysql_cmd -e "DELETE FROM user_sessions WHERE expires_at < NOW();" >/dev/null 2>&1 || true
    
    # Clean up old audit logs
    log_verbose "Cleaning up old audit logs..."
    $mysql_cmd -e "DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL $LOG_RETENTION_DAYS DAY);" >/dev/null 2>&1 || true
    
    log_success "Database maintenance completed"
}

# Cache cleanup function
cache_cleanup() {
    log_info "Running cache cleanup..."
    
    # Redis cache cleanup
    if command -v redis-cli >/dev/null 2>&1; then
        log_verbose "Cleaning Redis cache..."
        
        local redis_cmd="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
        
        if [[ -n "$REDIS_PASSWORD" ]]; then
            redis_cmd="$redis_cmd -a $REDIS_PASSWORD"
        fi
        
        if $redis_cmd ping >/dev/null 2>&1; then
            if [[ "$DRY_RUN" == "true" ]]; then
                local expired_keys=$($redis_cmd eval "return #redis.call('keys', 'expired:*')" 0 2>/dev/null || echo "0")
                log_info "[DRY RUN] Would clean $expired_keys expired cache keys"
            else
                # Remove expired keys
                $redis_cmd eval "local keys = redis.call('keys', 'expired:*'); for i=1,#keys do redis.call('del', keys[i]) end; return #keys" 0 >/dev/null 2>&1 || true
                
                # Clean up session cache
                $redis_cmd eval "local keys = redis.call('keys', 'session:*'); local expired = 0; for i=1,#keys do local ttl = redis.call('ttl', keys[i]); if ttl == -1 or ttl == -2 then redis.call('del', keys[i]); expired = expired + 1 end end; return expired" 0 >/dev/null 2>&1 || true
                
                log_success "Redis cache cleanup completed"
            fi
        else
            log_warning "Redis connection failed, skipping cache cleanup"
        fi
    else
        log_warning "Redis CLI not found, skipping cache cleanup"
    fi
    
    # File-based cache cleanup
    local cache_dir="$PROJECT_ROOT/cache"
    if [[ -d "$cache_dir" ]]; then
        log_verbose "Cleaning file-based cache..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            local cache_files=$(find "$cache_dir" -type f -mtime +1 2>/dev/null | wc -l)
            log_info "[DRY RUN] Would clean $cache_files cache files"
        else
            find "$cache_dir" -type f -mtime +1 -delete 2>/dev/null || true
            find "$cache_dir" -type d -empty -delete 2>/dev/null || true
            log_success "File-based cache cleanup completed"
        fi
    fi
}

# Performance optimization function
performance_optimization() {
    log_info "Running performance optimization..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would run performance optimization"
        return 0
    fi
    
    # Optimize system parameters
    if [[ -f "/proc/sys/vm/swappiness" ]]; then
        log_verbose "Optimizing system swappiness..."
        echo 10 | sudo tee /proc/sys/vm/swappiness >/dev/null 2>&1 || true
    fi
    
    # Clear page cache if memory usage is high
    local memory_usage=$(get_memory_usage)
    if [[ $memory_usage -gt $MEMORY_USAGE_THRESHOLD ]]; then
        log_verbose "High memory usage detected ($memory_usage%), clearing page cache..."
        sudo sync && echo 1 | sudo tee /proc/sys/vm/drop_caches >/dev/null 2>&1 || true
    fi
    
    # Restart services if needed
    local load_avg=$(get_load_average)
    if (( $(echo "$load_avg > 5.0" | bc -l 2>/dev/null || echo "0") )); then
        log_warning "High load average detected ($load_avg), considering service restart"
        
        # Restart application services
        if command -v docker-compose >/dev/null 2>&1; then
            cd "$PROJECT_ROOT"
            docker-compose restart api >/dev/null 2>&1 || true
            log_success "Restarted API service"
        fi
    fi
    
    log_success "Performance optimization completed"
}

# Health check function
health_check() {
    log_info "Running health check..."
    
    local issues=0
    
    # Check disk usage
    local disk_usage=$(get_disk_usage)
    if [[ $disk_usage -gt $DISK_USAGE_THRESHOLD ]]; then
        log_warning "High disk usage: ${disk_usage}%"
        issues=$((issues + 1))
    else
        log_success "Disk usage OK: ${disk_usage}%"
    fi
    
    # Check memory usage
    local memory_usage=$(get_memory_usage)
    if [[ $memory_usage -gt $MEMORY_USAGE_THRESHOLD ]]; then
        log_warning "High memory usage: ${memory_usage}%"
        issues=$((issues + 1))
    else
        log_success "Memory usage OK: ${memory_usage}%"
    fi
    
    # Check CPU usage
    local cpu_usage=$(get_cpu_usage | sed 's/[^0-9.]//g')
    if (( $(echo "$cpu_usage > $CPU_USAGE_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        log_warning "High CPU usage: ${cpu_usage}%"
        issues=$((issues + 1))
    else
        log_success "CPU usage OK: ${cpu_usage}%"
    fi
    
    # Check services
    if command -v docker-compose >/dev/null 2>&1; then
        cd "$PROJECT_ROOT"
        local running_services=$(docker-compose ps --services --filter "status=running" 2>/dev/null | wc -l)
        local total_services=$(docker-compose ps --services 2>/dev/null | wc -l)
        
        if [[ $running_services -lt $total_services ]]; then
            log_warning "Some services are not running: $running_services/$total_services"
            issues=$((issues + 1))
        else
            log_success "All services running: $running_services/$total_services"
        fi
    fi
    
    if [[ $issues -eq 0 ]]; then
        log_success "Health check passed: no issues found"
    else
        log_warning "Health check completed: $issues issues found"
    fi
    
    return $issues
}

# Run maintenance tasks
run_maintenance() {
    local tasks_to_run=("${TASKS[@]:-${MAINTENANCE_TASKS[@]}}")
    local start_time=$(date +%s)
    local completed_tasks=0
    local failed_tasks=0
    
    log_info "Starting maintenance tasks: ${tasks_to_run[*]}"
    
    # Enable maintenance mode if requested
    if [[ "$MAINTENANCE_MODE" == "true" ]]; then
        enable_maintenance_mode
    fi
    
    # Send start notification
    if [[ "$SEND_NOTIFICATIONS" == "true" ]]; then
        send_slack_notification "🔧 Maintenance started: ${tasks_to_run[*]}" "warning"
    fi
    
    # Run tasks
    for task in "${tasks_to_run[@]}"; do
        log_info "Running task: $task"
        
        case "$task" in
            "system_cleanup")
                if system_cleanup; then
                    completed_tasks=$((completed_tasks + 1))
                else
                    failed_tasks=$((failed_tasks + 1))
                fi
                ;;
            "log_rotation")
                if log_rotation; then
                    completed_tasks=$((completed_tasks + 1))
                else
                    failed_tasks=$((failed_tasks + 1))
                fi
                ;;
            "database_maintenance")
                if database_maintenance; then
                    completed_tasks=$((completed_tasks + 1))
                else
                    failed_tasks=$((failed_tasks + 1))
                fi
                ;;
            "cache_cleanup")
                if cache_cleanup; then
                    completed_tasks=$((completed_tasks + 1))
                else
                    failed_tasks=$((failed_tasks + 1))
                fi
                ;;
            "performance_optimization")
                if performance_optimization; then
                    completed_tasks=$((completed_tasks + 1))
                else
                    failed_tasks=$((failed_tasks + 1))
                fi
                ;;
            "health_check")
                if health_check; then
                    completed_tasks=$((completed_tasks + 1))
                else
                    failed_tasks=$((failed_tasks + 1))
                fi
                ;;
            *)
                log_warning "Unknown task: $task"
                failed_tasks=$((failed_tasks + 1))
                ;;
        esac
    done
    
    # Disable maintenance mode if it was enabled
    if [[ "$MAINTENANCE_MODE" == "true" ]]; then
        disable_maintenance_mode
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_info "Maintenance completed: $completed_tasks tasks completed, $failed_tasks tasks failed, duration: ${duration}s"
    
    # Send completion notification
    if [[ "$SEND_NOTIFICATIONS" == "true" ]]; then
        local color="good"
        if [[ $failed_tasks -gt 0 ]]; then
            color="danger"
        fi
        
        send_slack_notification "✅ Maintenance completed: $completed_tasks tasks completed, $failed_tasks tasks failed, duration: ${duration}s" "$color"
    fi
    
    return $failed_tasks
}

# Generate maintenance report
generate_report() {
    local report_file="$REPORTS_DIR/maintenance_report_$(get_timestamp).html"
    
    log_info "Generating maintenance report: $report_file"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Wedding Club Maintenance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Wedding Club Maintenance Report</h1>
        <p>Generated: $(date)</p>
        <p>Environment: $ENVIRONMENT</p>
    </div>
    
    <div class="section">
        <h2>System Status</h2>
        <table>
            <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
            <tr><td>Disk Usage</td><td>$(get_disk_usage)%</td><td class="$(if [[ $(get_disk_usage) -gt $DISK_USAGE_THRESHOLD ]]; then echo "warning"; else echo "success"; fi)">$(if [[ $(get_disk_usage) -gt $DISK_USAGE_THRESHOLD ]]; then echo "High"; else echo "OK"; fi)</td></tr>
            <tr><td>Memory Usage</td><td>$(get_memory_usage)%</td><td class="$(if [[ $(get_memory_usage) -gt $MEMORY_USAGE_THRESHOLD ]]; then echo "warning"; else echo "success"; fi)">$(if [[ $(get_memory_usage) -gt $MEMORY_USAGE_THRESHOLD ]]; then echo "High"; else echo "OK"; fi)</td></tr>
            <tr><td>Load Average</td><td>$(get_load_average)</td><td class="success">OK</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>Recent Maintenance Activities</h2>
        <pre>$(tail -50 "$LOGS_DIR/maintenance.log" 2>/dev/null || echo "No recent activities")</pre>
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
EOF
    
    # Add recommendations based on system status
    local disk_usage=$(get_disk_usage)
    if [[ $disk_usage -gt $DISK_USAGE_THRESHOLD ]]; then
        echo "            <li class='warning'>Consider cleaning up disk space (current usage: ${disk_usage}%)</li>" >> "$report_file"
    fi
    
    local memory_usage=$(get_memory_usage)
    if [[ $memory_usage -gt $MEMORY_USAGE_THRESHOLD ]]; then
        echo "            <li class='warning'>Consider optimizing memory usage (current usage: ${memory_usage}%)</li>" >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF
            <li>Regular maintenance tasks are recommended weekly</li>
            <li>Monitor system resources continuously</li>
            <li>Keep backups up to date</li>
        </ul>
    </div>
</body>
</html>
EOF
    
    log_success "Maintenance report generated: $report_file"
    echo "$report_file"
}

# Schedule maintenance
schedule_maintenance() {
    log_info "Scheduling maintenance tasks..."
    
    local cron_job="$CRON_SCHEDULE $SCRIPT_DIR/$(basename "$0") run --env $ENVIRONMENT"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would schedule: $cron_job"
        return 0
    fi
    
    # Add to crontab
    (crontab -l 2>/dev/null || true; echo "$cron_job") | crontab -
    
    log_success "Maintenance scheduled: $CRON_SCHEDULE"
}

# Main function
main() {
    if [[ -z "$COMMAND" ]]; then
        show_help
        exit 1
    fi
    
    # Load environment configuration
    load_environment_config
    
    # Execute command
    case "$COMMAND" in
        "run")
            run_maintenance
            ;;
        "schedule")
            schedule_maintenance
            ;;
        "status")
            health_check
            ;;
        "report")
            generate_report
            ;;
        "cleanup")
            system_cleanup
            ;;
        "optimize")
            performance_optimization
            ;;
        "maintenance-mode")
            local mode="${ARGS[0]:-}"
            if [[ "$mode" == "on" ]]; then
                enable_maintenance_mode
            elif [[ "$mode" == "off" ]]; then
                disable_maintenance_mode
            else
                log_error "Invalid maintenance mode: $mode (use 'on' or 'off')"
                exit 1
            fi
            ;;
        "disk-usage")
            echo "Disk usage: $(get_disk_usage)%"
            ;;
        "memory-usage")
            echo "Memory usage: $(get_memory_usage)%"
            ;;
        "health-summary")
            health_check
            ;;
        *)
            log_error "Command not implemented yet: $COMMAND"
            log_info "Available commands: run, schedule, status, report, cleanup, optimize, maintenance-mode, disk-usage, memory-usage, health-summary"
            exit 1
            ;;
    esac
}

# Run main function
main
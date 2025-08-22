#!/bin/bash

# Wedding Club Log Management Script
# This script manages application logs including rotation, cleanup, and analysis

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs}"
MAX_LOG_SIZE="${MAX_LOG_SIZE:-100M}"
MAX_LOG_AGE="${MAX_LOG_AGE:-30}"
MAX_LOG_FILES="${MAX_LOG_FILES:-10}"
COMPRESS_LOGS="${COMPRESS_LOGS:-true}"
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
}

log_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $message"
}

log_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $message"
}

log_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $message"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        local message="$1"
        echo -e "${BLUE}[VERBOSE]${NC} $message"
    fi
}

# Help function
show_help() {
    cat << EOF
Wedding Club Log Management Script

Usage: $0 [OPTIONS] COMMAND

Commands:
    rotate              Rotate log files
    cleanup             Clean up old log files
    analyze             Analyze log files for patterns
    compress            Compress old log files
    tail                Tail specific log files
    search              Search for patterns in logs
    stats               Show log statistics
    archive             Archive logs to backup location
    setup               Setup log rotation configuration
    monitor             Monitor log file sizes

Options:
    -d, --log-dir DIR       Log directory path (default: $PROJECT_ROOT/logs)
    -s, --max-size SIZE     Maximum log file size (default: 100M)
    -a, --max-age DAYS      Maximum log file age in days (default: 30)
    -f, --max-files NUM     Maximum number of rotated files (default: 10)
    -c, --compress          Compress rotated logs (default: true)
    -v, --verbose           Enable verbose output
    --help                  Show this help message

Examples:
    $0 rotate                           # Rotate all log files
    $0 cleanup --max-age 7              # Clean logs older than 7 days
    $0 analyze --pattern "ERROR"        # Analyze error patterns
    $0 tail --file api.log              # Tail API log file
    $0 search --pattern "user_id=123"   # Search for specific user logs
    $0 stats                            # Show log statistics

EOF
}

# Parse command line arguments
COMMAND=""
PATTERN=""
FILE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--log-dir)
            LOG_DIR="$2"
            shift 2
            ;;
        -s|--max-size)
            MAX_LOG_SIZE="$2"
            shift 2
            ;;
        -a|--max-age)
            MAX_LOG_AGE="$2"
            shift 2
            ;;
        -f|--max-files)
            MAX_LOG_FILES="$2"
            shift 2
            ;;
        -c|--compress)
            COMPRESS_LOGS="true"
            shift
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        --pattern)
            PATTERN="$2"
            shift 2
            ;;
        --file)
            FILE="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        rotate|cleanup|analyze|compress|tail|search|stats|archive|setup|monitor)
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
mkdir -p "$LOG_DIR"

# Convert size to bytes
size_to_bytes() {
    local size="$1"
    local number=$(echo "$size" | sed 's/[^0-9]*//g')
    local unit=$(echo "$size" | sed 's/[0-9]*//g' | tr '[:lower:]' '[:upper:]')
    
    case "$unit" in
        "K"|"KB")
            echo $((number * 1024))
            ;;
        "M"|"MB")
            echo $((number * 1024 * 1024))
            ;;
        "G"|"GB")
            echo $((number * 1024 * 1024 * 1024))
            ;;
        *)
            echo "$number"
            ;;
    esac
}

# Rotate log files
rotate_logs() {
    log_info "Rotating log files in: $LOG_DIR"
    
    local max_size_bytes=$(size_to_bytes "$MAX_LOG_SIZE")
    local rotated_count=0
    
    find "$LOG_DIR" -name "*.log" -type f | while read -r logfile; do
        local file_size=$(stat -f%z "$logfile" 2>/dev/null || echo 0)
        
        if [[ $file_size -gt $max_size_bytes ]]; then
            local basename=$(basename "$logfile" .log)
            local dirname=$(dirname "$logfile")
            
            log_verbose "Rotating $logfile (size: $(($file_size / 1024 / 1024))MB)"
            
            # Shift existing rotated files
            for ((i=MAX_LOG_FILES-1; i>=1; i--)); do
                local old_file="$dirname/${basename}.log.$i"
                local new_file="$dirname/${basename}.log.$((i+1))"
                
                if [[ -f "$old_file" ]]; then
                    if [[ $i -eq $((MAX_LOG_FILES-1)) ]]; then
                        # Remove the oldest file
                        rm -f "$old_file"
                        log_verbose "Removed oldest log file: $old_file"
                    else
                        mv "$old_file" "$new_file"
                        log_verbose "Moved $old_file to $new_file"
                    fi
                fi
            done
            
            # Move current log to .1
            mv "$logfile" "$dirname/${basename}.log.1"
            
            # Create new empty log file
            touch "$logfile"
            chmod 644 "$logfile"
            
            # Compress if enabled
            if [[ "$COMPRESS_LOGS" == "true" ]]; then
                gzip "$dirname/${basename}.log.1"
                log_verbose "Compressed $dirname/${basename}.log.1"
            fi
            
            ((rotated_count++))
        fi
    done
    
    log_success "Rotated $rotated_count log files"
}

# Clean up old log files
cleanup_logs() {
    log_info "Cleaning up log files older than $MAX_LOG_AGE days"
    
    local deleted_count=0
    
    # Remove old rotated logs
    find "$LOG_DIR" -name "*.log.*" -type f -mtime +"$MAX_LOG_AGE" | while read -r logfile; do
        log_verbose "Removing old log file: $logfile"
        rm -f "$logfile"
        ((deleted_count++))
    done
    
    # Remove old compressed logs
    find "$LOG_DIR" -name "*.log.*.gz" -type f -mtime +"$MAX_LOG_AGE" | while read -r logfile; do
        log_verbose "Removing old compressed log file: $logfile"
        rm -f "$logfile"
        ((deleted_count++))
    done
    
    # Remove empty directories
    find "$LOG_DIR" -type d -empty -delete 2>/dev/null || true
    
    log_success "Cleaned up $deleted_count old log files"
}

# Analyze log files
analyze_logs() {
    log_info "Analyzing log files"
    
    if [[ -n "$PATTERN" ]]; then
        log_info "Searching for pattern: $PATTERN"
    fi
    
    echo ""
    echo "=== Log Analysis Report ==="
    echo "Generated: $(date)"
    echo "Log Directory: $LOG_DIR"
    echo ""
    
    # Count log files
    local log_count=$(find "$LOG_DIR" -name "*.log" -type f | wc -l | xargs)
    echo "Total log files: $log_count"
    
    # Total log size
    local total_size=$(find "$LOG_DIR" -name "*.log*" -type f -exec stat -f%z {} \; 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
    echo "Total log size: $(($total_size / 1024 / 1024))MB"
    
    echo ""
    echo "=== Error Analysis ==="
    
    # Count errors by type
    local error_patterns=("ERROR" "FATAL" "CRITICAL" "EXCEPTION")
    for pattern in "${error_patterns[@]}"; do
        local count=$(find "$LOG_DIR" -name "*.log" -type f -exec grep -c "$pattern" {} \; 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
        if [[ $count -gt 0 ]]; then
            echo "$pattern: $count occurrences"
        fi
    done
    
    echo ""
    echo "=== Recent Activity ==="
    
    # Show recent log entries
    find "$LOG_DIR" -name "*.log" -type f -mtime -1 | head -5 | while read -r logfile; do
        echo "\nRecent entries from $(basename "$logfile"):"
        tail -5 "$logfile" 2>/dev/null | sed 's/^/  /'
    done
    
    # Pattern-specific analysis
    if [[ -n "$PATTERN" ]]; then
        echo ""
        echo "=== Pattern Analysis: $PATTERN ==="
        
        local matches=$(find "$LOG_DIR" -name "*.log" -type f -exec grep -c "$PATTERN" {} \; 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
        echo "Total matches: $matches"
        
        if [[ $matches -gt 0 ]]; then
            echo "\nSample matches:"
            find "$LOG_DIR" -name "*.log" -type f -exec grep -l "$PATTERN" {} \; | head -3 | while read -r logfile; do
                echo "\nFrom $(basename "$logfile"):"
                grep "$PATTERN" "$logfile" | head -3 | sed 's/^/  /'
            done
        fi
    fi
    
    echo ""
    echo "=== Log File Sizes ==="
    
    find "$LOG_DIR" -name "*.log" -type f -exec ls -lh {} \; | awk '{print $5, $9}' | sort -hr | head -10
}

# Compress old log files
compress_logs() {
    log_info "Compressing old log files"
    
    local compressed_count=0
    
    # Compress rotated logs that aren't already compressed
    find "$LOG_DIR" -name "*.log.*" -type f ! -name "*.gz" | while read -r logfile; do
        log_verbose "Compressing: $logfile"
        gzip "$logfile"
        ((compressed_count++))
    done
    
    log_success "Compressed $compressed_count log files"
}

# Tail log files
tail_logs() {
    if [[ -n "$FILE" ]]; then
        local logfile="$LOG_DIR/$FILE"
        if [[ -f "$logfile" ]]; then
            log_info "Tailing log file: $logfile"
            tail -f "$logfile"
        else
            log_error "Log file not found: $logfile"
            exit 1
        fi
    else
        log_info "Available log files:"
        find "$LOG_DIR" -name "*.log" -type f -exec basename {} \; | sort
        echo ""
        log_info "Use --file option to specify which log to tail"
    fi
}

# Search log files
search_logs() {
    if [[ -z "$PATTERN" ]]; then
        log_error "Pattern not specified. Use --pattern option"
        exit 1
    fi
    
    log_info "Searching for pattern: $PATTERN"
    
    local matches=0
    find "$LOG_DIR" -name "*.log" -type f | while read -r logfile; do
        local file_matches=$(grep -c "$PATTERN" "$logfile" 2>/dev/null || echo 0)
        if [[ $file_matches -gt 0 ]]; then
            echo ""
            echo "=== $(basename "$logfile") ($file_matches matches) ==="
            grep -n --color=always "$PATTERN" "$logfile" | head -10
            matches=$((matches + file_matches))
        fi
    done
    
    if [[ $matches -eq 0 ]]; then
        log_info "No matches found for pattern: $PATTERN"
    fi
}

# Show log statistics
show_stats() {
    log_info "Generating log statistics"
    
    echo ""
    echo "=== Log Statistics ==="
    echo "Generated: $(date)"
    echo "Log Directory: $LOG_DIR"
    echo ""
    
    # File counts
    local active_logs=$(find "$LOG_DIR" -name "*.log" -type f | wc -l | xargs)
    local rotated_logs=$(find "$LOG_DIR" -name "*.log.*" -type f | wc -l | xargs)
    local compressed_logs=$(find "$LOG_DIR" -name "*.log.*.gz" -type f | wc -l | xargs)
    
    echo "Active log files: $active_logs"
    echo "Rotated log files: $rotated_logs"
    echo "Compressed log files: $compressed_logs"
    echo "Total log files: $((active_logs + rotated_logs + compressed_logs))"
    
    # Size statistics
    local total_size=$(find "$LOG_DIR" -name "*.log*" -type f -exec stat -f%z {} \; 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
    local active_size=$(find "$LOG_DIR" -name "*.log" -type f -exec stat -f%z {} \; 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
    
    echo ""
    echo "Total size: $(($total_size / 1024 / 1024))MB"
    echo "Active logs size: $(($active_size / 1024 / 1024))MB"
    echo "Archived logs size: $(((total_size - active_size) / 1024 / 1024))MB"
    
    # Largest files
    echo ""
    echo "Largest log files:"
    find "$LOG_DIR" -name "*.log*" -type f -exec ls -lh {} \; | awk '{print $5, $9}' | sort -hr | head -5 | while read -r size file; do
        echo "  $size - $(basename "$file")"
    done
    
    # Recent activity
    echo ""
    echo "Recent log activity (last 24 hours):"
    local recent_files=$(find "$LOG_DIR" -name "*.log" -type f -mtime -1 | wc -l | xargs)
    echo "Files modified: $recent_files"
    
    if [[ $recent_files -gt 0 ]]; then
        local recent_size=$(find "$LOG_DIR" -name "*.log" -type f -mtime -1 -exec stat -f%z {} \; 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
        echo "Size of recent logs: $(($recent_size / 1024 / 1024))MB"
    fi
}

# Archive logs
archive_logs() {
    local archive_dir="$LOG_DIR/archive/$(date +%Y%m%d)"
    mkdir -p "$archive_dir"
    
    log_info "Archiving logs to: $archive_dir"
    
    local archived_count=0
    
    # Archive rotated logs older than 7 days
    find "$LOG_DIR" -name "*.log.*" -type f -mtime +7 | while read -r logfile; do
        if [[ "$(dirname "$logfile")" != "$archive_dir" ]]; then
            mv "$logfile" "$archive_dir/"
            log_verbose "Archived: $(basename "$logfile")"
            ((archived_count++))
        fi
    done
    
    # Create archive tarball
    if [[ $archived_count -gt 0 ]]; then
        cd "$(dirname "$archive_dir")"
        tar -czf "$(basename "$archive_dir").tar.gz" "$(basename "$archive_dir")"
        rm -rf "$archive_dir"
        
        log_success "Archived $archived_count files to $(basename "$archive_dir").tar.gz"
    else
        rmdir "$archive_dir" 2>/dev/null || true
        log_info "No files to archive"
    fi
}

# Setup log rotation
setup_logrotate() {
    log_info "Setting up log rotation configuration"
    
    local logrotate_config="$PROJECT_ROOT/logrotate.conf"
    
    cat > "$logrotate_config" << EOF
# Wedding Club Log Rotation Configuration

$LOG_DIR/*.log {
    daily
    missingok
    rotate $MAX_LOG_FILES
    compress
    delaycompress
    notifempty
    create 644 $(whoami) $(id -gn)
    maxsize $MAX_LOG_SIZE
    
    postrotate
        # Restart services if needed
        # systemctl reload nginx || true
        # kill -USR1 \$(cat /var/run/app.pid) || true
    endscript
}

$LOG_DIR/*/*.log {
    daily
    missingok
    rotate $MAX_LOG_FILES
    compress
    delaycompress
    notifempty
    create 644 $(whoami) $(id -gn)
    maxsize $MAX_LOG_SIZE
}
EOF
    
    log_success "Log rotation configuration created: $logrotate_config"
    log_info "To enable automatic rotation, add this to your crontab:"
    echo "0 2 * * * /usr/sbin/logrotate -s $PROJECT_ROOT/logrotate.state $logrotate_config"
}

# Monitor log file sizes
monitor_logs() {
    log_info "Monitoring log file sizes"
    
    local max_size_bytes=$(size_to_bytes "$MAX_LOG_SIZE")
    local warnings=0
    
    echo ""
    printf "%-30s %-10s %-10s %-10s\n" "Log File" "Size" "Status" "Action"
    printf "%-30s %-10s %-10s %-10s\n" "--------" "----" "------" "------"
    
    find "$LOG_DIR" -name "*.log" -type f | while read -r logfile; do
        local file_size=$(stat -f%z "$logfile" 2>/dev/null || echo 0)
        local size_mb=$(($file_size / 1024 / 1024))
        local filename=$(basename "$logfile")
        
        if [[ $file_size -gt $max_size_bytes ]]; then
            printf "%-30s %-10s %-10s %-10s\n" "$filename" "${size_mb}MB" "⚠ LARGE" "Rotate"
            ((warnings++))
        elif [[ $file_size -gt $((max_size_bytes * 80 / 100)) ]]; then
            printf "%-30s %-10s %-10s %-10s\n" "$filename" "${size_mb}MB" "⚡ WARN" "Monitor"
        else
            printf "%-30s %-10s %-10s %-10s\n" "$filename" "${size_mb}MB" "✓ OK" "None"
        fi
    done
    
    echo ""
    
    if [[ $warnings -gt 0 ]]; then
        log_warning "$warnings log file(s) need attention"
        log_info "Run '$0 rotate' to rotate large log files"
    else
        log_success "All log files are within normal size limits"
    fi
}

# Main function
main() {
    case "$COMMAND" in
        rotate)
            rotate_logs
            ;;
        cleanup)
            cleanup_logs
            ;;
        analyze)
            analyze_logs
            ;;
        compress)
            compress_logs
            ;;
        tail)
            tail_logs
            ;;
        search)
            search_logs
            ;;
        stats)
            show_stats
            ;;
        archive)
            archive_logs
            ;;
        setup)
            setup_logrotate
            ;;
        monitor)
            monitor_logs
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
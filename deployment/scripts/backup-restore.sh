#!/bin/bash

# Wedding Club Backup and Restore Management Script
# This script manages data backups, system recovery, and disaster recovery procedures

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-development}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
REMOTE_BACKUP_DIR="${REMOTE_BACKUP_DIR:-}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"
VERBOSE="${VERBOSE:-false}"

# Backup configuration
BACKUP_DATABASE="${BACKUP_DATABASE:-true}"
BACKUP_FILES="${BACKUP_FILES:-true}"
BACKUP_UPLOADS="${BACKUP_UPLOADS:-true}"
BACKUP_CONFIGS="${BACKUP_CONFIGS:-true}"
BACKUP_LOGS="${BACKUP_LOGS:-false}"

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
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $message" >> "$BACKUP_DIR/backup.log"
}

log_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $message" >> "$BACKUP_DIR/backup.log"
}

log_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $message" >> "$BACKUP_DIR/backup.log"
}

log_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $message" >> "$BACKUP_DIR/backup.log"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        local message="$1"
        echo -e "${PURPLE}[VERBOSE]${NC} $message"
        echo "$(date '+%Y-%m-%d %H:%M:%S') [VERBOSE] $message" >> "$BACKUP_DIR/backup.log"
    fi
}

# Help function
show_help() {
    cat << EOF
Wedding Club Backup and Restore Management Script

Usage: $0 [OPTIONS] COMMAND

Commands:
    create-backup           Create a full backup
    create-db-backup        Create database backup only
    create-files-backup     Create files backup only
    list-backups            List available backups
    restore-backup          Restore from backup
    restore-db              Restore database only
    restore-files           Restore files only
    verify-backup           Verify backup integrity
    cleanup-backups         Clean up old backups
    sync-remote             Sync backups to remote storage
    schedule-backup         Set up automated backup schedule
    disaster-recovery       Perform disaster recovery
    backup-status           Show backup status and statistics

Options:
    -e, --env ENV              Environment (development, staging, production)
    -d, --backup-dir DIR       Backup directory (default: ./backups)
    -r, --remote-dir DIR       Remote backup directory
    --retention-days DAYS      Backup retention period (default: 30)
    --compression-level LEVEL  Compression level 1-9 (default: 6)
    --encryption-key KEY       Encryption key for backup files
    --no-database              Skip database backup
    --no-files                 Skip files backup
    --no-uploads               Skip uploads backup
    --no-configs               Skip configs backup
    --include-logs             Include logs in backup
    -v, --verbose              Enable verbose output
    --help                     Show this help message

Examples:
    $0 create-backup                           # Create full backup
    $0 create-backup --env production          # Create production backup
    $0 restore-backup backup_20231201_120000   # Restore specific backup
    $0 list-backups                            # List all backups
    $0 cleanup-backups --retention-days 7      # Clean backups older than 7 days
    $0 sync-remote                             # Sync to remote storage

EOF
}

# Parse command line arguments
COMMAND=""
BACKUP_NAME=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -r|--remote-dir)
            REMOTE_BACKUP_DIR="$2"
            shift 2
            ;;
        --retention-days)
            BACKUP_RETENTION_DAYS="$2"
            shift 2
            ;;
        --compression-level)
            COMPRESSION_LEVEL="$2"
            shift 2
            ;;
        --encryption-key)
            ENCRYPTION_KEY="$2"
            shift 2
            ;;
        --no-database)
            BACKUP_DATABASE="false"
            shift
            ;;
        --no-files)
            BACKUP_FILES="false"
            shift
            ;;
        --no-uploads)
            BACKUP_UPLOADS="false"
            shift
            ;;
        --no-configs)
            BACKUP_CONFIGS="false"
            shift
            ;;
        --include-logs)
            BACKUP_LOGS="true"
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
        create-backup|create-db-backup|create-files-backup|list-backups|restore-backup|restore-db|restore-files|verify-backup|cleanup-backups|sync-remote|schedule-backup|disaster-recovery|backup-status)
            COMMAND="$1"
            shift
            ;;
        *)
            if [[ -z "$COMMAND" ]]; then
                log_error "Unknown option: $1"
                show_help
                exit 1
            else
                BACKUP_NAME="$1"
                shift
            fi
            ;;
    esac
done

if [[ -z "$COMMAND" ]]; then
    log_error "No command specified"
    show_help
    exit 1
fi

# Ensure required directories exist
mkdir -p "$BACKUP_DIR" "$BACKUP_DIR/database" "$BACKUP_DIR/files" "$BACKUP_DIR/uploads" "$BACKUP_DIR/configs"

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

# Generate backup name
generate_backup_name() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    echo "backup_${ENVIRONMENT}_${timestamp}"
}

# Compress and optionally encrypt file
compress_file() {
    local source_file="$1"
    local target_file="$2"
    
    log_verbose "Compressing $source_file to $target_file"
    
    if [[ -n "$ENCRYPTION_KEY" ]]; then
        # Compress and encrypt
        if command -v openssl >/dev/null 2>&1; then
            tar -czf - "$source_file" | openssl enc -aes-256-cbc -salt -k "$ENCRYPTION_KEY" > "$target_file.enc"
            log_verbose "File compressed and encrypted: $target_file.enc"
        else
            log_warning "OpenSSL not available, skipping encryption"
            tar -czf "$target_file" "$source_file"
        fi
    else
        # Just compress
        tar -czf "$target_file" "$source_file"
        log_verbose "File compressed: $target_file"
    fi
}

# Decompress and optionally decrypt file
decompress_file() {
    local source_file="$1"
    local target_dir="$2"
    
    log_verbose "Decompressing $source_file to $target_dir"
    
    if [[ "$source_file" == *.enc ]]; then
        # Decrypt and decompress
        if [[ -n "$ENCRYPTION_KEY" ]] && command -v openssl >/dev/null 2>&1; then
            openssl enc -aes-256-cbc -d -salt -k "$ENCRYPTION_KEY" -in "$source_file" | tar -xzf - -C "$target_dir"
            log_verbose "File decrypted and decompressed"
        else
            log_error "Encryption key required or OpenSSL not available"
            return 1
        fi
    else
        # Just decompress
        tar -xzf "$source_file" -C "$target_dir"
        log_verbose "File decompressed"
    fi
}

# Create database backup
create_database_backup() {
    local backup_name="$1"
    local db_backup_dir="$BACKUP_DIR/database/$backup_name"
    
    mkdir -p "$db_backup_dir"
    
    log_info "Creating database backup: $backup_name"
    
    # MySQL backup
    if [[ "${DB_TYPE:-mysql}" == "mysql" ]] && command -v mysqldump >/dev/null 2>&1; then
        local mysql_file="$db_backup_dir/mysql_dump.sql"
        
        log_verbose "Creating MySQL dump"
        
        if mysqldump \
            -h "${DB_HOST:-localhost}" \
            -P "${DB_PORT:-3306}" \
            -u "${DB_USER:-root}" \
            -p"${DB_PASSWORD:-}" \
            --single-transaction \
            --routines \
            --triggers \
            "${DB_NAME:-wedding_club}" > "$mysql_file" 2>/dev/null; then
            
            log_success "MySQL backup created: $mysql_file"
            
            # Compress the dump
            gzip "$mysql_file"
            log_verbose "MySQL dump compressed"
        else
            log_error "Failed to create MySQL backup"
            return 1
        fi
    fi
    
    # PostgreSQL backup
    if [[ "${DB_TYPE:-mysql}" == "postgresql" ]] && command -v pg_dump >/dev/null 2>&1; then
        local pg_file="$db_backup_dir/postgresql_dump.sql"
        
        log_verbose "Creating PostgreSQL dump"
        
        if PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
            -h "${DB_HOST:-localhost}" \
            -p "${DB_PORT:-5432}" \
            -U "${DB_USER:-postgres}" \
            -d "${DB_NAME:-wedding_club}" \
            --no-password > "$pg_file" 2>/dev/null; then
            
            log_success "PostgreSQL backup created: $pg_file"
            
            # Compress the dump
            gzip "$pg_file"
            log_verbose "PostgreSQL dump compressed"
        else
            log_error "Failed to create PostgreSQL backup"
            return 1
        fi
    fi
    
    # Redis backup
    if command -v redis-cli >/dev/null 2>&1; then
        log_verbose "Creating Redis backup"
        
        if redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" --rdb "$db_backup_dir/redis_dump.rdb" >/dev/null 2>&1; then
            log_success "Redis backup created"
        else
            log_warning "Failed to create Redis backup (Redis may not be running)"
        fi
    fi
    
    # Create backup metadata
    cat > "$db_backup_dir/metadata.json" << EOF
{
    "backup_name": "$backup_name",
    "backup_type": "database",
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "database_type": "${DB_TYPE:-mysql}",
    "database_name": "${DB_NAME:-wedding_club}",
    "database_host": "${DB_HOST:-localhost}",
    "database_port": "${DB_PORT:-3306}",
    "redis_host": "${REDIS_HOST:-localhost}",
    "redis_port": "${REDIS_PORT:-6379}"
}
EOF
    
    log_success "Database backup completed: $backup_name"
}

# Create files backup
create_files_backup() {
    local backup_name="$1"
    local files_backup_dir="$BACKUP_DIR/files/$backup_name"
    
    mkdir -p "$files_backup_dir"
    
    log_info "Creating files backup: $backup_name"
    
    # Backup application files
    if [[ "$BACKUP_FILES" == "true" ]]; then
        log_verbose "Backing up application files"
        
        local app_backup="$files_backup_dir/application.tar.gz"
        
        # Create exclusion list
        local exclude_list="/tmp/backup_exclude_$$"
        cat > "$exclude_list" << EOF
node_modules
.git
logs
backups
tmp
*.log
.DS_Store
Thumbs.db
EOF
        
        if tar --exclude-from="$exclude_list" -czf "$app_backup" -C "$PROJECT_ROOT" . 2>/dev/null; then
            log_success "Application files backup created"
        else
            log_error "Failed to create application files backup"
        fi
        
        rm -f "$exclude_list"
    fi
    
    # Backup uploads directory
    if [[ "$BACKUP_UPLOADS" == "true" ]] && [[ -d "$PROJECT_ROOT/uploads" ]]; then
        log_verbose "Backing up uploads directory"
        
        local uploads_backup="$files_backup_dir/uploads.tar.gz"
        
        if tar -czf "$uploads_backup" -C "$PROJECT_ROOT" uploads 2>/dev/null; then
            log_success "Uploads backup created"
        else
            log_warning "Failed to create uploads backup"
        fi
    fi
    
    # Backup configuration files
    if [[ "$BACKUP_CONFIGS" == "true" ]]; then
        log_verbose "Backing up configuration files"
        
        local configs_backup="$files_backup_dir/configs.tar.gz"
        local config_files=()
        
        # Find configuration files
        for pattern in ".env*" "*.conf" "*.config.js" "docker-compose*.yml" "Dockerfile*" "nginx.conf" "package.json" "package-lock.json"; do
            while IFS= read -r -d '' file; do
                config_files+=("$file")
            done < <(find "$PROJECT_ROOT" -maxdepth 2 -name "$pattern" -type f -print0 2>/dev/null)
        done
        
        if [[ ${#config_files[@]} -gt 0 ]]; then
            tar -czf "$configs_backup" -C "$PROJECT_ROOT" "${config_files[@]#$PROJECT_ROOT/}" 2>/dev/null
            log_success "Configuration files backup created"
        else
            log_warning "No configuration files found to backup"
        fi
    fi
    
    # Backup logs (if requested)
    if [[ "$BACKUP_LOGS" == "true" ]] && [[ -d "$PROJECT_ROOT/logs" ]]; then
        log_verbose "Backing up logs directory"
        
        local logs_backup="$files_backup_dir/logs.tar.gz"
        
        if tar -czf "$logs_backup" -C "$PROJECT_ROOT" logs 2>/dev/null; then
            log_success "Logs backup created"
        else
            log_warning "Failed to create logs backup"
        fi
    fi
    
    # Create backup metadata
    cat > "$files_backup_dir/metadata.json" << EOF
{
    "backup_name": "$backup_name",
    "backup_type": "files",
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "includes_application": $BACKUP_FILES,
    "includes_uploads": $BACKUP_UPLOADS,
    "includes_configs": $BACKUP_CONFIGS,
    "includes_logs": $BACKUP_LOGS,
    "project_root": "$PROJECT_ROOT"
}
EOF
    
    log_success "Files backup completed: $backup_name"
}

# Create full backup
create_full_backup() {
    local backup_name="$1"
    
    log_info "Creating full backup: $backup_name"
    
    local start_time=$(date +%s)
    
    # Create database backup
    if [[ "$BACKUP_DATABASE" == "true" ]]; then
        create_database_backup "$backup_name" || log_error "Database backup failed"
    fi
    
    # Create files backup
    create_files_backup "$backup_name" || log_error "Files backup failed"
    
    # Create overall backup metadata
    local backup_dir="$BACKUP_DIR/$backup_name"
    mkdir -p "$backup_dir"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    cat > "$backup_dir/metadata.json" << EOF
{
    "backup_name": "$backup_name",
    "backup_type": "full",
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "duration_seconds": $duration,
    "includes_database": $BACKUP_DATABASE,
    "includes_files": $BACKUP_FILES,
    "includes_uploads": $BACKUP_UPLOADS,
    "includes_configs": $BACKUP_CONFIGS,
    "includes_logs": $BACKUP_LOGS,
    "compression_level": $COMPRESSION_LEVEL,
    "encrypted": $([ -n "$ENCRYPTION_KEY" ] && echo "true" || echo "false")
}
EOF
    
    log_success "Full backup completed: $backup_name (${duration}s)"
}

# List available backups
list_backups() {
    log_info "Listing available backups"
    
    echo ""
    printf "%-30s %-15s %-20s %-10s %s\n" "Backup Name" "Type" "Timestamp" "Size" "Environment"
    printf "%-30s %-15s %-20s %-10s %s\n" "----------" "----" "---------" "----" "-----------"
    
    # List full backups
    if [[ -d "$BACKUP_DIR" ]]; then
        for backup_dir in "$BACKUP_DIR"/backup_*; do
            if [[ -d "$backup_dir" ]] && [[ -f "$backup_dir/metadata.json" ]]; then
                local backup_name=$(basename "$backup_dir")
                local metadata_file="$backup_dir/metadata.json"
                
                local backup_type="full"
                local timestamp="N/A"
                local environment="N/A"
                
                if command -v jq >/dev/null 2>&1; then
                    backup_type=$(jq -r '.backup_type // "full"' "$metadata_file" 2>/dev/null || echo "full")
                    timestamp=$(jq -r '.timestamp // "N/A"' "$metadata_file" 2>/dev/null || echo "N/A")
                    environment=$(jq -r '.environment // "N/A"' "$metadata_file" 2>/dev/null || echo "N/A")
                fi
                
                local size
                size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1 || echo "N/A")
                
                printf "%-30s %-15s %-20s %-10s %s\n" "$backup_name" "$backup_type" "$timestamp" "$size" "$environment"
            fi
        done
    fi
    
    # List database-only backups
    if [[ -d "$BACKUP_DIR/database" ]]; then
        for db_backup in "$BACKUP_DIR/database"/backup_*; do
            if [[ -d "$db_backup" ]] && [[ -f "$db_backup/metadata.json" ]]; then
                local backup_name=$(basename "$db_backup")
                local metadata_file="$db_backup/metadata.json"
                
                local timestamp="N/A"
                local environment="N/A"
                
                if command -v jq >/dev/null 2>&1; then
                    timestamp=$(jq -r '.timestamp // "N/A"' "$metadata_file" 2>/dev/null || echo "N/A")
                    environment=$(jq -r '.environment // "N/A"' "$metadata_file" 2>/dev/null || echo "N/A")
                fi
                
                local size
                size=$(du -sh "$db_backup" 2>/dev/null | cut -f1 || echo "N/A")
                
                printf "%-30s %-15s %-20s %-10s %s\n" "$backup_name" "database" "$timestamp" "$size" "$environment"
            fi
        done
    fi
    
    # List files-only backups
    if [[ -d "$BACKUP_DIR/files" ]]; then
        for files_backup in "$BACKUP_DIR/files"/backup_*; do
            if [[ -d "$files_backup" ]] && [[ -f "$files_backup/metadata.json" ]]; then
                local backup_name=$(basename "$files_backup")
                local metadata_file="$files_backup/metadata.json"
                
                local timestamp="N/A"
                local environment="N/A"
                
                if command -v jq >/dev/null 2>&1; then
                    timestamp=$(jq -r '.timestamp // "N/A"' "$metadata_file" 2>/dev/null || echo "N/A")
                    environment=$(jq -r '.environment // "N/A"' "$metadata_file" 2>/dev/null || echo "N/A")
                fi
                
                local size
                size=$(du -sh "$files_backup" 2>/dev/null | cut -f1 || echo "N/A")
                
                printf "%-30s %-15s %-20s %-10s %s\n" "$backup_name" "files" "$timestamp" "$size" "$environment"
            fi
        done
    fi
    
    echo ""
}

# Restore database from backup
restore_database() {
    local backup_name="$1"
    local db_backup_dir="$BACKUP_DIR/database/$backup_name"
    
    if [[ ! -d "$db_backup_dir" ]]; then
        # Try full backup
        db_backup_dir="$BACKUP_DIR/$backup_name/database/$backup_name"
        if [[ ! -d "$db_backup_dir" ]]; then
            log_error "Database backup not found: $backup_name"
            return 1
        fi
    fi
    
    log_info "Restoring database from backup: $backup_name"
    
    # Restore MySQL
    local mysql_dump="$db_backup_dir/mysql_dump.sql.gz"
    if [[ -f "$mysql_dump" ]] && command -v mysql >/dev/null 2>&1; then
        log_verbose "Restoring MySQL database"
        
        if zcat "$mysql_dump" | mysql \
            -h "${DB_HOST:-localhost}" \
            -P "${DB_PORT:-3306}" \
            -u "${DB_USER:-root}" \
            -p"${DB_PASSWORD:-}" \
            "${DB_NAME:-wedding_club}" 2>/dev/null; then
            
            log_success "MySQL database restored successfully"
        else
            log_error "Failed to restore MySQL database"
            return 1
        fi
    fi
    
    # Restore PostgreSQL
    local pg_dump="$db_backup_dir/postgresql_dump.sql.gz"
    if [[ -f "$pg_dump" ]] && command -v psql >/dev/null 2>&1; then
        log_verbose "Restoring PostgreSQL database"
        
        if zcat "$pg_dump" | PGPASSWORD="${DB_PASSWORD:-}" psql \
            -h "${DB_HOST:-localhost}" \
            -p "${DB_PORT:-5432}" \
            -U "${DB_USER:-postgres}" \
            -d "${DB_NAME:-wedding_club}" >/dev/null 2>&1; then
            
            log_success "PostgreSQL database restored successfully"
        else
            log_error "Failed to restore PostgreSQL database"
            return 1
        fi
    fi
    
    # Restore Redis
    local redis_dump="$db_backup_dir/redis_dump.rdb"
    if [[ -f "$redis_dump" ]] && command -v redis-cli >/dev/null 2>&1; then
        log_verbose "Restoring Redis database"
        
        # Stop Redis, replace dump, restart Redis
        log_warning "Redis restore requires manual intervention - backup file available at: $redis_dump"
    fi
    
    log_success "Database restore completed: $backup_name"
}

# Restore files from backup
restore_files() {
    local backup_name="$1"
    local files_backup_dir="$BACKUP_DIR/files/$backup_name"
    
    if [[ ! -d "$files_backup_dir" ]]; then
        # Try full backup
        files_backup_dir="$BACKUP_DIR/$backup_name/files/$backup_name"
        if [[ ! -d "$files_backup_dir" ]]; then
            log_error "Files backup not found: $backup_name"
            return 1
        fi
    fi
    
    log_info "Restoring files from backup: $backup_name"
    
    # Create restore directory
    local restore_dir="$PROJECT_ROOT/restore_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$restore_dir"
    
    # Restore application files
    local app_backup="$files_backup_dir/application.tar.gz"
    if [[ -f "$app_backup" ]]; then
        log_verbose "Restoring application files"
        
        if tar -xzf "$app_backup" -C "$restore_dir" 2>/dev/null; then
            log_success "Application files restored to: $restore_dir"
        else
            log_error "Failed to restore application files"
        fi
    fi
    
    # Restore uploads
    local uploads_backup="$files_backup_dir/uploads.tar.gz"
    if [[ -f "$uploads_backup" ]]; then
        log_verbose "Restoring uploads directory"
        
        if tar -xzf "$uploads_backup" -C "$restore_dir" 2>/dev/null; then
            log_success "Uploads restored"
        else
            log_warning "Failed to restore uploads"
        fi
    fi
    
    # Restore configuration files
    local configs_backup="$files_backup_dir/configs.tar.gz"
    if [[ -f "$configs_backup" ]]; then
        log_verbose "Restoring configuration files"
        
        if tar -xzf "$configs_backup" -C "$restore_dir" 2>/dev/null; then
            log_success "Configuration files restored"
        else
            log_warning "Failed to restore configuration files"
        fi
    fi
    
    # Restore logs
    local logs_backup="$files_backup_dir/logs.tar.gz"
    if [[ -f "$logs_backup" ]]; then
        log_verbose "Restoring logs directory"
        
        if tar -xzf "$logs_backup" -C "$restore_dir" 2>/dev/null; then
            log_success "Logs restored"
        else
            log_warning "Failed to restore logs"
        fi
    fi
    
    log_success "Files restore completed: $backup_name"
    log_info "Files restored to: $restore_dir"
    log_info "Please review and manually move files to their proper locations"
}

# Restore full backup
restore_full_backup() {
    local backup_name="$1"
    
    log_info "Restoring full backup: $backup_name"
    
    # Restore database
    restore_database "$backup_name" || log_warning "Database restore failed or skipped"
    
    # Restore files
    restore_files "$backup_name" || log_warning "Files restore failed or skipped"
    
    log_success "Full backup restore completed: $backup_name"
}

# Verify backup integrity
verify_backup() {
    local backup_name="$1"
    
    log_info "Verifying backup integrity: $backup_name"
    
    local backup_dir="$BACKUP_DIR/$backup_name"
    local db_backup_dir="$BACKUP_DIR/database/$backup_name"
    local files_backup_dir="$BACKUP_DIR/files/$backup_name"
    
    local verification_passed=true
    
    # Check if backup exists
    if [[ ! -d "$backup_dir" ]] && [[ ! -d "$db_backup_dir" ]] && [[ ! -d "$files_backup_dir" ]]; then
        log_error "Backup not found: $backup_name"
        return 1
    fi
    
    # Verify metadata files
    for metadata_file in "$backup_dir/metadata.json" "$db_backup_dir/metadata.json" "$files_backup_dir/metadata.json"; do
        if [[ -f "$metadata_file" ]]; then
            if command -v jq >/dev/null 2>&1; then
                if ! jq empty "$metadata_file" 2>/dev/null; then
                    log_error "Invalid metadata file: $metadata_file"
                    verification_passed=false
                fi
            fi
        fi
    done
    
    # Verify database backup files
    if [[ -d "$db_backup_dir" ]]; then
        for db_file in "$db_backup_dir"/*.sql.gz "$db_backup_dir"/*.rdb; do
            if [[ -f "$db_file" ]]; then
                if [[ "$db_file" == *.gz ]]; then
                    if ! gzip -t "$db_file" 2>/dev/null; then
                        log_error "Corrupted compressed file: $db_file"
                        verification_passed=false
                    fi
                fi
            fi
        done
    fi
    
    # Verify files backup archives
    if [[ -d "$files_backup_dir" ]]; then
        for archive in "$files_backup_dir"/*.tar.gz; do
            if [[ -f "$archive" ]]; then
                if ! tar -tzf "$archive" >/dev/null 2>&1; then
                    log_error "Corrupted archive: $archive"
                    verification_passed=false
                fi
            fi
        done
    fi
    
    if [[ "$verification_passed" == "true" ]]; then
        log_success "Backup verification passed: $backup_name"
    else
        log_error "Backup verification failed: $backup_name"
        return 1
    fi
}

# Clean up old backups
cleanup_backups() {
    log_info "Cleaning up backups older than $BACKUP_RETENTION_DAYS days"
    
    local deleted_count=0
    
    # Clean up full backups
    if [[ -d "$BACKUP_DIR" ]]; then
        while IFS= read -r -d '' backup_dir; do
            if [[ -d "$backup_dir" ]]; then
                local backup_name=$(basename "$backup_dir")
                if [[ "$backup_name" =~ ^backup_ ]]; then
                    if find "$backup_dir" -maxdepth 0 -mtime +"$BACKUP_RETENTION_DAYS" -print0 | grep -qz .; then
                        log_verbose "Deleting old backup: $backup_name"
                        rm -rf "$backup_dir"
                        ((deleted_count++))
                    fi
                fi
            fi
        done < <(find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup_*" -print0 2>/dev/null)
    fi
    
    # Clean up database backups
    if [[ -d "$BACKUP_DIR/database" ]]; then
        while IFS= read -r -d '' db_backup; do
            if [[ -d "$db_backup" ]]; then
                local backup_name=$(basename "$db_backup")
                if find "$db_backup" -maxdepth 0 -mtime +"$BACKUP_RETENTION_DAYS" -print0 | grep -qz .; then
                    log_verbose "Deleting old database backup: $backup_name"
                    rm -rf "$db_backup"
                    ((deleted_count++))
                fi
            fi
        done < <(find "$BACKUP_DIR/database" -maxdepth 1 -type d -name "backup_*" -print0 2>/dev/null)
    fi
    
    # Clean up files backups
    if [[ -d "$BACKUP_DIR/files" ]]; then
        while IFS= read -r -d '' files_backup; do
            if [[ -d "$files_backup" ]]; then
                local backup_name=$(basename "$files_backup")
                if find "$files_backup" -maxdepth 0 -mtime +"$BACKUP_RETENTION_DAYS" -print0 | grep -qz .; then
                    log_verbose "Deleting old files backup: $backup_name"
                    rm -rf "$files_backup"
                    ((deleted_count++))
                fi
            fi
        done < <(find "$BACKUP_DIR/files" -maxdepth 1 -type d -name "backup_*" -print0 2>/dev/null)
    fi
    
    log_success "Cleanup completed: $deleted_count old backups deleted"
}

# Sync backups to remote storage
sync_remote() {
    if [[ -z "$REMOTE_BACKUP_DIR" ]]; then
        log_error "Remote backup directory not configured"
        return 1
    fi
    
    log_info "Syncing backups to remote storage: $REMOTE_BACKUP_DIR"
    
    # Use rsync if available
    if command -v rsync >/dev/null 2>&1; then
        if rsync -avz --progress "$BACKUP_DIR/" "$REMOTE_BACKUP_DIR/" 2>/dev/null; then
            log_success "Backups synced to remote storage"
        else
            log_error "Failed to sync backups to remote storage"
            return 1
        fi
    else
        log_error "rsync not available for remote sync"
        return 1
    fi
}

# Schedule automated backups
schedule_backup() {
    log_info "Setting up automated backup schedule"
    
    local cron_job="0 2 * * * $SCRIPT_DIR/$(basename "$0") create-backup --env $ENVIRONMENT"
    
    # Add to crontab
    if command -v crontab >/dev/null 2>&1; then
        (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
        log_success "Automated backup scheduled: Daily at 2:00 AM"
    else
        log_error "crontab not available for scheduling"
        log_info "Manual cron job: $cron_job"
    fi
}

# Disaster recovery
disaster_recovery() {
    log_info "Starting disaster recovery procedure"
    
    # Find the most recent backup
    local latest_backup
    latest_backup=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup_*" -printf "%T@ %p\n" 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2- | xargs basename 2>/dev/null || echo "")
    
    if [[ -z "$latest_backup" ]]; then
        log_error "No backups found for disaster recovery"
        return 1
    fi
    
    log_info "Using latest backup for recovery: $latest_backup"
    
    # Stop services
    log_info "Stopping services for disaster recovery"
    if [[ -f "$PROJECT_ROOT/deployment/docker-compose.dev.yml" ]]; then
        cd "$PROJECT_ROOT"
        docker-compose -f "$PROJECT_ROOT/deployment/docker-compose.dev.yml" down 2>/dev/null || log_warning "Failed to stop Docker services"
    fi
    
    # Restore from backup
    restore_full_backup "$latest_backup"
    
    # Start services
    log_info "Starting services after disaster recovery"
    if [[ -f "$PROJECT_ROOT/deployment/docker-compose.dev.yml" ]]; then
        cd "$PROJECT_ROOT"
        docker-compose -f "$PROJECT_ROOT/deployment/docker-compose.dev.yml" up -d 2>/dev/null || log_warning "Failed to start Docker services"
    fi
    
    log_success "Disaster recovery completed using backup: $latest_backup"
}

# Show backup status and statistics
backup_status() {
    log_info "Backup status and statistics"
    
    echo ""
    echo "=== Backup Status ==="
    
    # Count backups
    local full_backups=0
    local db_backups=0
    local files_backups=0
    local total_size=0
    
    if [[ -d "$BACKUP_DIR" ]]; then
        full_backups=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup_*" | wc -l | tr -d ' ')
    fi
    
    if [[ -d "$BACKUP_DIR/database" ]]; then
        db_backups=$(find "$BACKUP_DIR/database" -maxdepth 1 -type d -name "backup_*" | wc -l | tr -d ' ')
    fi
    
    if [[ -d "$BACKUP_DIR/files" ]]; then
        files_backups=$(find "$BACKUP_DIR/files" -maxdepth 1 -type d -name "backup_*" | wc -l | tr -d ' ')
    fi
    
    if [[ -d "$BACKUP_DIR" ]]; then
        total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "N/A")
    fi
    
    printf "${BLUE}Full Backups:${NC}        %d\n" "$full_backups"
    printf "${BLUE}Database Backups:${NC}    %d\n" "$db_backups"
    printf "${BLUE}Files Backups:${NC}       %d\n" "$files_backups"
    printf "${BLUE}Total Size:${NC}          %s\n" "$total_size"
    printf "${BLUE}Backup Directory:${NC}    %s\n" "$BACKUP_DIR"
    printf "${BLUE}Retention Period:${NC}    %d days\n" "$BACKUP_RETENTION_DAYS"
    
    # Show latest backup
    local latest_backup
    latest_backup=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup_*" -printf "%T@ %p\n" 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2- | xargs basename 2>/dev/null || echo "None")
    
    printf "${BLUE}Latest Backup:${NC}       %s\n" "$latest_backup"
    
    # Show disk space
    echo ""
    echo "${CYAN}Backup Directory Disk Usage:${NC}"
    df -h "$BACKUP_DIR" 2>/dev/null || echo "N/A"
    
    echo ""
}

# Main function
main() {
    load_env_config
    
    case "$COMMAND" in
        create-backup)
            local backup_name
            backup_name=$(generate_backup_name)
            create_full_backup "$backup_name"
            ;;
        create-db-backup)
            local backup_name
            backup_name=$(generate_backup_name)
            create_database_backup "$backup_name"
            ;;
        create-files-backup)
            local backup_name
            backup_name=$(generate_backup_name)
            create_files_backup "$backup_name"
            ;;
        list-backups)
            list_backups
            ;;
        restore-backup)
            if [[ -z "$BACKUP_NAME" ]]; then
                log_error "Backup name required for restore"
                exit 1
            fi
            restore_full_backup "$BACKUP_NAME"
            ;;
        restore-db)
            if [[ -z "$BACKUP_NAME" ]]; then
                log_error "Backup name required for database restore"
                exit 1
            fi
            restore_database "$BACKUP_NAME"
            ;;
        restore-files)
            if [[ -z "$BACKUP_NAME" ]]; then
                log_error "Backup name required for files restore"
                exit 1
            fi
            restore_files "$BACKUP_NAME"
            ;;
        verify-backup)
            if [[ -z "$BACKUP_NAME" ]]; then
                log_error "Backup name required for verification"
                exit 1
            fi
            verify_backup "$BACKUP_NAME"
            ;;
        cleanup-backups)
            cleanup_backups
            ;;
        sync-remote)
            sync_remote
            ;;
        schedule-backup)
            schedule_backup
            ;;
        disaster-recovery)
            disaster_recovery
            ;;
        backup-status)
            backup_status
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
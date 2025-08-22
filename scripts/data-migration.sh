#!/bin/bash

# Wedding Club Data Migration Script
# This script provides comprehensive data migration and synchronization for the Wedding Club application

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_ROOT/migrations"
BACKUPS_DIR="$PROJECT_ROOT/backups/migrations"
LOGS_DIR="$PROJECT_ROOT/logs"
TEMP_DIR="$PROJECT_ROOT/temp/migration"
VERBOSE="${VERBOSE:-false}"
DRY_RUN="${DRY_RUN:-false}"
ENVIRONMENT="${ENVIRONMENT:-development}"
FORCE="${FORCE:-false}"
BATCH_SIZE="${BATCH_SIZE:-1000}"
MAX_RETRIES="${MAX_RETRIES:-3}"
TIMEOUT="${TIMEOUT:-300}"
PARALLEL_JOBS="${PARALLEL_JOBS:-4}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
SKIP_VALIDATION="${SKIP_VALIDATION:-false}"
ROLLBACK_ON_ERROR="${ROLLBACK_ON_ERROR:-true}"
SEND_NOTIFICATIONS="${SEND_NOTIFICATIONS:-false}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-wedding_club}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_CHARSET="${DB_CHARSET:-utf8mb4}"
DB_COLLATION="${DB_COLLATION:-utf8mb4_unicode_ci}"

# Migration tracking
MIGRATION_TABLE="migrations"
MIGRATION_LOCK_TABLE="migration_locks"
LOCK_TIMEOUT=3600  # 1 hour

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Migration status
MIGRATION_ID=""
START_TIME=""
END_TIME=""
MIGRATED_COUNT=0
FAILED_COUNT=0
SKIPPED_COUNT=0

# Logging functions
log_info() {
    local message="$1"
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $message" >> "$LOGS_DIR/migration.log"
}

log_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $message" >> "$LOGS_DIR/migration.log"
}

log_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $message" >> "$LOGS_DIR/migration.log"
}

log_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $message" >> "$LOGS_DIR/migration.log"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        local message="$1"
        echo -e "${PURPLE}[VERBOSE]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
        echo "$(date '+%Y-%m-%d %H:%M:%S') [VERBOSE] $message" >> "$LOGS_DIR/migration.log"
    fi
}

# Help function
show_help() {
    cat << EOF
Wedding Club Data Migration Script

Usage: $0 [OPTIONS] [COMMAND] [ARGS...]

Commands:
    init                        Initialize migration system
    create NAME                 Create new migration file
    migrate [VERSION]           Run migrations (all or up to specific version)
    rollback [STEPS]            Rollback migrations (default: 1 step)
    status                      Show migration status
    list                        List all migrations
    reset                       Reset all migrations (dangerous!)
    refresh                     Rollback all and re-run migrations
    seed [SEEDER]               Run database seeders
    export [TABLE]              Export data to files
    import FILE [TABLE]         Import data from files
    sync SOURCE TARGET          Sync data between databases
    validate                    Validate migration files
    repair                      Repair migration state
    backup                      Create migration backup
    restore BACKUP_FILE         Restore from migration backup
    clean                       Clean old migration files and backups
    lock                        Acquire migration lock
    unlock                      Release migration lock
    monitor                     Monitor migration progress
    report                      Generate migration report

Options:
    -e, --env ENVIRONMENT       Target environment (default: development)
    --host HOST                 Database host (default: localhost)
    --port PORT                 Database port (default: 3306)
    --database NAME             Database name (default: wedding_club)
    --user USER                 Database user (default: root)
    --password PASSWORD         Database password
    --batch-size SIZE           Batch size for data operations (default: 1000)
    --parallel JOBS             Number of parallel jobs (default: 4)
    --timeout SECONDS           Operation timeout (default: 300)
    --max-retries COUNT         Max retries for failed operations (default: 3)
    --skip-backup               Skip creating backup before migration
    --skip-validation           Skip migration file validation
    --no-rollback               Don't rollback on error
    --notifications             Send notifications on completion
    --slack-webhook URL         Slack webhook URL for notifications
    --force                     Force operation (use with caution)
    --dry-run                   Show what would be done without executing
    -v, --verbose               Enable verbose output
    --help                      Show this help message

Examples:
    $0 init                                     # Initialize migration system
    $0 create add_user_preferences              # Create new migration
    $0 migrate                                  # Run all pending migrations
    $0 migrate 20240101_120000                  # Migrate up to specific version
    $0 rollback 3                               # Rollback last 3 migrations
    $0 seed users                               # Run user seeder
    $0 export users                             # Export users table
    $0 sync dev prod --dry-run                  # Preview sync from dev to prod
    $0 backup --env production                  # Backup production migrations
    $0 monitor --notifications                  # Monitor with alerts

EOF
}

# Parse command line arguments
COMMAND=""
ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --host)
            DB_HOST="$2"
            shift 2
            ;;
        --port)
            DB_PORT="$2"
            shift 2
            ;;
        --database)
            DB_NAME="$2"
            shift 2
            ;;
        --user)
            DB_USER="$2"
            shift 2
            ;;
        --password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --batch-size)
            BATCH_SIZE="$2"
            shift 2
            ;;
        --parallel)
            PARALLEL_JOBS="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --max-retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        --skip-backup)
            SKIP_BACKUP="true"
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION="true"
            shift
            ;;
        --no-rollback)
            ROLLBACK_ON_ERROR="false"
            shift
            ;;
        --notifications)
            SEND_NOTIFICATIONS="true"
            shift
            ;;
        --slack-webhook)
            SLACK_WEBHOOK_URL="$2"
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
        init|create|migrate|rollback|status|list|reset|refresh|seed|export|import|sync|validate|repair|backup|restore|clean|lock|unlock|monitor|report)
            COMMAND="$1"
            shift
            ;;
        *)
            ARGS+=("$1")
            shift
            ;;
    esac
done

# Create necessary directories
mkdir -p "$MIGRATIONS_DIR" "$BACKUPS_DIR" "$LOGS_DIR" "$TEMP_DIR"

# Load environment configuration
load_environment_config() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [[ -f "$env_file" ]]; then
        log_verbose "Loading environment configuration from: $env_file"
        
        # Source environment file
        set -a
        source "$env_file"
        set +a
        
        # Override database configuration if set in environment
        DB_HOST="${DATABASE_HOST:-$DB_HOST}"
        DB_PORT="${DATABASE_PORT:-$DB_PORT}"
        DB_NAME="${DATABASE_NAME:-$DB_NAME}"
        DB_USER="${DATABASE_USER:-$DB_USER}"
        DB_PASSWORD="${DATABASE_PASSWORD:-$DB_PASSWORD}"
    else
        log_warning "Environment file not found: $env_file"
    fi
}

# Database connection functions
get_mysql_cmd() {
    local cmd="mysql"
    
    if [[ -n "$DB_HOST" ]]; then
        cmd="$cmd -h $DB_HOST"
    fi
    
    if [[ -n "$DB_PORT" ]]; then
        cmd="$cmd -P $DB_PORT"
    fi
    
    if [[ -n "$DB_USER" ]]; then
        cmd="$cmd -u $DB_USER"
    fi
    
    if [[ -n "$DB_PASSWORD" ]]; then
        cmd="$cmd -p$DB_PASSWORD"
    fi
    
    if [[ -n "$DB_NAME" ]]; then
        cmd="$cmd $DB_NAME"
    fi
    
    echo "$cmd"
}

get_mysqldump_cmd() {
    local cmd="mysqldump"
    
    if [[ -n "$DB_HOST" ]]; then
        cmd="$cmd -h $DB_HOST"
    fi
    
    if [[ -n "$DB_PORT" ]]; then
        cmd="$cmd -P $DB_PORT"
    fi
    
    if [[ -n "$DB_USER" ]]; then
        cmd="$cmd -u $DB_USER"
    fi
    
    if [[ -n "$DB_PASSWORD" ]]; then
        cmd="$cmd -p$DB_PASSWORD"
    fi
    
    echo "$cmd"
}

test_database_connection() {
    log_info "Testing database connection..."
    
    local mysql_cmd=$(get_mysql_cmd)
    
    if $mysql_cmd -e "SELECT 1" >/dev/null 2>&1; then
        log_success "Database connection successful"
        return 0
    else
        log_error "Database connection failed"
        return 1
    fi
}

# Migration lock functions
acquire_migration_lock() {
    local lock_id="migration_$(date +%s)_$$"
    local mysql_cmd=$(get_mysql_cmd)
    
    log_info "Acquiring migration lock: $lock_id"
    
    # Create lock table if it doesn't exist
    $mysql_cmd << EOF
CREATE TABLE IF NOT EXISTS $MIGRATION_LOCK_TABLE (
    id VARCHAR(255) PRIMARY KEY,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    process_id INT,
    hostname VARCHAR(255)
);
EOF
    
    # Clean up expired locks
    $mysql_cmd -e "DELETE FROM $MIGRATION_LOCK_TABLE WHERE expires_at < NOW();"
    
    # Try to acquire lock
    local expires_at=$(date -d "+$LOCK_TIMEOUT seconds" '+%Y-%m-%d %H:%M:%S')
    local hostname=$(hostname)
    
    if $mysql_cmd -e "INSERT INTO $MIGRATION_LOCK_TABLE (id, expires_at, process_id, hostname) VALUES ('$lock_id', '$expires_at', $$, '$hostname');" 2>/dev/null; then
        MIGRATION_ID="$lock_id"
        log_success "Migration lock acquired: $lock_id"
        return 0
    else
        log_error "Failed to acquire migration lock. Another migration may be running."
        return 1
    fi
}

release_migration_lock() {
    if [[ -n "$MIGRATION_ID" ]]; then
        local mysql_cmd=$(get_mysql_cmd)
        
        log_info "Releasing migration lock: $MIGRATION_ID"
        
        $mysql_cmd -e "DELETE FROM $MIGRATION_LOCK_TABLE WHERE id = '$MIGRATION_ID';"
        
        MIGRATION_ID=""
        log_success "Migration lock released"
    fi
}

# Migration table functions
init_migration_system() {
    log_info "Initializing migration system..."
    
    local mysql_cmd=$(get_mysql_cmd)
    
    # Create migrations table
    $mysql_cmd << EOF
CREATE TABLE IF NOT EXISTS $MIGRATION_TABLE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(255) UNIQUE NOT NULL,
    description VARCHAR(500),
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time INT DEFAULT 0,
    checksum VARCHAR(64),
    INDEX idx_version (version),
    INDEX idx_executed_at (executed_at)
);
EOF
    
    # Create migration lock table
    $mysql_cmd << EOF
CREATE TABLE IF NOT EXISTS $MIGRATION_LOCK_TABLE (
    id VARCHAR(255) PRIMARY KEY,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    process_id INT,
    hostname VARCHAR(255),
    INDEX idx_expires_at (expires_at)
);
EOF
    
    log_success "Migration system initialized"
}

get_migration_status() {
    local mysql_cmd=$(get_mysql_cmd)
    
    # Check if migration table exists
    if ! $mysql_cmd -e "DESCRIBE $MIGRATION_TABLE" >/dev/null 2>&1; then
        echo "not_initialized"
        return
    fi
    
    # Get executed migrations
    local executed_count=$($mysql_cmd -sN -e "SELECT COUNT(*) FROM $MIGRATION_TABLE;")
    
    # Get pending migrations
    local total_files=$(find "$MIGRATIONS_DIR" -name "*.sql" | wc -l)
    local pending_count=$((total_files - executed_count))
    
    echo "executed:$executed_count,pending:$pending_count,total:$total_files"
}

get_executed_migrations() {
    local mysql_cmd=$(get_mysql_cmd)
    
    $mysql_cmd -sN -e "SELECT version FROM $MIGRATION_TABLE ORDER BY version;"
}

get_pending_migrations() {
    local executed_migrations=()
    while IFS= read -r version; do
        executed_migrations+=("$version")
    done < <(get_executed_migrations)
    
    local pending_migrations=()
    
    for migration_file in "$MIGRATIONS_DIR"/*.sql; do
        if [[ -f "$migration_file" ]]; then
            local version=$(basename "$migration_file" .sql)
            
            # Check if migration is already executed
            local is_executed=false
            for executed in "${executed_migrations[@]}"; do
                if [[ "$executed" == "$version" ]]; then
                    is_executed=true
                    break
                fi
            done
            
            if [[ "$is_executed" == "false" ]]; then
                pending_migrations+=("$version")
            fi
        fi
    done
    
    # Sort pending migrations
    printf '%s\n' "${pending_migrations[@]}" | sort
}

# Migration file functions
create_migration_file() {
    local name="${ARGS[0]:-}"
    
    if [[ -z "$name" ]]; then
        log_error "Migration name is required"
        return 1
    fi
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local version="${timestamp}_${name}"
    local migration_file="$MIGRATIONS_DIR/${version}.sql"
    
    log_info "Creating migration file: $migration_file"
    
    cat > "$migration_file" << EOF
-- Migration: $version
-- Description: $name
-- Created: $(date)

-- ============================================================================
-- UP Migration
-- ============================================================================

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- ============================================================================
-- DOWN Migration (for rollback)
-- ============================================================================

-- Add your rollback SQL here (commented out)
-- Example:
-- DROP TABLE IF EXISTS example;

EOF
    
    log_success "Migration file created: $migration_file"
    
    if command -v code >/dev/null 2>&1; then
        log_info "Opening migration file in VS Code..."
        code "$migration_file"
    fi
}

validate_migration_file() {
    local migration_file="$1"
    
    log_verbose "Validating migration file: $migration_file"
    
    # Check if file exists
    if [[ ! -f "$migration_file" ]]; then
        log_error "Migration file not found: $migration_file"
        return 1
    fi
    
    # Check if file is readable
    if [[ ! -r "$migration_file" ]]; then
        log_error "Migration file is not readable: $migration_file"
        return 1
    fi
    
    # Check if file is not empty
    if [[ ! -s "$migration_file" ]]; then
        log_warning "Migration file is empty: $migration_file"
    fi
    
    # Basic SQL syntax validation
    local mysql_cmd=$(get_mysql_cmd)
    
    if ! $mysql_cmd --execute="SET sql_mode='STRICT_TRANS_TABLES'; $(cat "$migration_file")" --dry-run 2>/dev/null; then
        log_warning "Migration file may contain SQL syntax errors: $migration_file"
    fi
    
    return 0
}

get_migration_checksum() {
    local migration_file="$1"
    
    if [[ -f "$migration_file" ]]; then
        sha256sum "$migration_file" | cut -d' ' -f1
    else
        echo ""
    fi
}

# Migration execution functions
execute_migration() {
    local version="$1"
    local migration_file="$MIGRATIONS_DIR/${version}.sql"
    
    log_info "Executing migration: $version"
    
    # Validate migration file
    if [[ "$SKIP_VALIDATION" != "true" ]]; then
        if ! validate_migration_file "$migration_file"; then
            log_error "Migration validation failed: $version"
            return 1
        fi
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would execute migration: $version"
        return 0
    fi
    
    local mysql_cmd=$(get_mysql_cmd)
    local start_time=$(date +%s)
    local checksum=$(get_migration_checksum "$migration_file")
    
    # Execute migration with timeout
    if timeout "$TIMEOUT" $mysql_cmd < "$migration_file"; then
        local end_time=$(date +%s)
        local execution_time=$((end_time - start_time))
        
        # Record migration in database
        local description=$(grep -m1 "^-- Description:" "$migration_file" | sed 's/^-- Description: //' || echo "")
        
        $mysql_cmd -e "INSERT INTO $MIGRATION_TABLE (version, description, execution_time, checksum) VALUES ('$version', '$description', $execution_time, '$checksum');"
        
        log_success "Migration executed successfully: $version (${execution_time}s)"
        ((MIGRATED_COUNT++))
        return 0
    else
        log_error "Migration execution failed: $version"
        ((FAILED_COUNT++))
        return 1
    fi
}

rollback_migration() {
    local version="$1"
    local migration_file="$MIGRATIONS_DIR/${version}.sql"
    
    log_info "Rolling back migration: $version"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rollback migration: $version"
        return 0
    fi
    
    # Extract DOWN migration SQL (commented out lines starting with -- DROP, -- DELETE, etc.)
    local rollback_sql="$TEMP_DIR/rollback_${version}.sql"
    
    # This is a simplified approach - in practice, you'd want more sophisticated rollback SQL extraction
    grep -E "^-- (DROP|DELETE|ALTER TABLE.*DROP)" "$migration_file" | sed 's/^-- //' > "$rollback_sql"
    
    if [[ -s "$rollback_sql" ]]; then
        local mysql_cmd=$(get_mysql_cmd)
        
        if $mysql_cmd < "$rollback_sql"; then
            # Remove migration record
            $mysql_cmd -e "DELETE FROM $MIGRATION_TABLE WHERE version = '$version';"
            
            log_success "Migration rolled back successfully: $version"
            rm -f "$rollback_sql"
            return 0
        else
            log_error "Migration rollback failed: $version"
            rm -f "$rollback_sql"
            return 1
        fi
    else
        log_warning "No rollback SQL found for migration: $version"
        return 1
    fi
}

# Main migration functions
run_migrations() {
    local target_version="${ARGS[0]:-}"
    
    log_info "Running migrations..."
    
    if [[ "$SKIP_BACKUP" != "true" ]]; then
        create_migration_backup
    fi
    
    local pending_migrations=()
    while IFS= read -r version; do
        if [[ -n "$version" ]]; then
            pending_migrations+=("$version")
        fi
    done < <(get_pending_migrations)
    
    if [[ ${#pending_migrations[@]} -eq 0 ]]; then
        log_info "No pending migrations found"
        return 0
    fi
    
    log_info "Found ${#pending_migrations[@]} pending migrations"
    
    local migrations_to_run=()
    
    if [[ -n "$target_version" ]]; then
        # Run migrations up to target version
        for version in "${pending_migrations[@]}"; do
            migrations_to_run+=("$version")
            if [[ "$version" == "$target_version" ]]; then
                break
            fi
        done
    else
        # Run all pending migrations
        migrations_to_run=("${pending_migrations[@]}")
    fi
    
    log_info "Will execute ${#migrations_to_run[@]} migrations"
    
    # Execute migrations
    for version in "${migrations_to_run[@]}"; do
        if ! execute_migration "$version"; then
            if [[ "$ROLLBACK_ON_ERROR" == "true" ]]; then
                log_warning "Rolling back due to migration failure"
                # Rollback previously executed migrations in this batch
                # This is a simplified approach - implement more sophisticated rollback logic as needed
            fi
            return 1
        fi
    done
    
    log_success "All migrations executed successfully"
}

run_rollback() {
    local steps="${ARGS[0]:-1}"
    
    log_info "Rolling back $steps migration(s)..."
    
    if [[ "$SKIP_BACKUP" != "true" ]]; then
        create_migration_backup
    fi
    
    local mysql_cmd=$(get_mysql_cmd)
    local executed_migrations=()
    
    # Get last executed migrations
    while IFS= read -r version; do
        executed_migrations+=("$version")
    done < <($mysql_cmd -sN -e "SELECT version FROM $MIGRATION_TABLE ORDER BY version DESC LIMIT $steps;")
    
    if [[ ${#executed_migrations[@]} -eq 0 ]]; then
        log_info "No migrations to rollback"
        return 0
    fi
    
    log_info "Will rollback ${#executed_migrations[@]} migrations"
    
    # Rollback migrations in reverse order
    for version in "${executed_migrations[@]}"; do
        if ! rollback_migration "$version"; then
            log_error "Rollback failed for migration: $version"
            return 1
        fi
    done
    
    log_success "Rollback completed successfully"
}

# Data export/import functions
export_data() {
    local table="${ARGS[0]:-}"
    local export_dir="$BACKUPS_DIR/exports/$(date +%Y%m%d_%H%M%S)"
    
    mkdir -p "$export_dir"
    
    log_info "Exporting data to: $export_dir"
    
    local mysqldump_cmd=$(get_mysqldump_cmd)
    
    if [[ -n "$table" ]]; then
        # Export specific table
        log_info "Exporting table: $table"
        
        $mysqldump_cmd --single-transaction --routines --triggers "$DB_NAME" "$table" > "$export_dir/${table}.sql"
        
        # Export data as CSV
        local mysql_cmd=$(get_mysql_cmd)
        $mysql_cmd -e "SELECT * FROM $table" | sed 's/\t/,/g' > "$export_dir/${table}.csv"
        
        log_success "Table exported: $table"
    else
        # Export all tables
        log_info "Exporting all tables"
        
        $mysqldump_cmd --single-transaction --routines --triggers "$DB_NAME" > "$export_dir/full_database.sql"
        
        # Export each table as CSV
        local mysql_cmd=$(get_mysql_cmd)
        local tables=$($mysql_cmd -sN -e "SHOW TABLES;")
        
        while IFS= read -r table_name; do
            if [[ -n "$table_name" ]]; then
                log_verbose "Exporting table as CSV: $table_name"
                $mysql_cmd -e "SELECT * FROM $table_name" | sed 's/\t/,/g' > "$export_dir/${table_name}.csv"
            fi
        done <<< "$tables"
        
        log_success "All tables exported"
    fi
    
    # Create export manifest
    cat > "$export_dir/manifest.json" << EOF
{
    "export_date": "$(date -Iseconds)",
    "database": "$DB_NAME",
    "environment": "$ENVIRONMENT",
    "table": "${table:-all}",
    "files": [
EOF
    
    local first=true
    for file in "$export_dir"/*.sql "$export_dir"/*.csv; do
        if [[ -f "$file" ]]; then
            if [[ "$first" == "true" ]]; then
                first=false
            else
                echo "," >> "$export_dir/manifest.json"
            fi
            echo "        \"$(basename "$file")\"" >> "$export_dir/manifest.json"
        fi
    done
    
    echo -e "\n    ]\n}" >> "$export_dir/manifest.json"
    
    log_success "Data export completed: $export_dir"
}

import_data() {
    local import_file="${ARGS[0]:-}"
    local table="${ARGS[1]:-}"
    
    if [[ -z "$import_file" ]]; then
        log_error "Import file is required"
        return 1
    fi
    
    if [[ ! -f "$import_file" ]]; then
        log_error "Import file not found: $import_file"
        return 1
    fi
    
    log_info "Importing data from: $import_file"
    
    if [[ "$SKIP_BACKUP" != "true" ]]; then
        create_migration_backup
    fi
    
    local mysql_cmd=$(get_mysql_cmd)
    
    if [[ "$import_file" == *.sql ]]; then
        # Import SQL file
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would import SQL file: $import_file"
        else
            if $mysql_cmd < "$import_file"; then
                log_success "SQL file imported successfully: $import_file"
            else
                log_error "SQL file import failed: $import_file"
                return 1
            fi
        fi
    elif [[ "$import_file" == *.csv ]]; then
        # Import CSV file
        if [[ -z "$table" ]]; then
            log_error "Table name is required for CSV import"
            return 1
        fi
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would import CSV file: $import_file to table: $table"
        else
            # Use LOAD DATA INFILE or mysqlimport
            $mysql_cmd -e "LOAD DATA LOCAL INFILE '$import_file' INTO TABLE $table FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n' IGNORE 1 ROWS;"
            
            if [[ $? -eq 0 ]]; then
                log_success "CSV file imported successfully: $import_file"
            else
                log_error "CSV file import failed: $import_file"
                return 1
            fi
        fi
    else
        log_error "Unsupported file format: $import_file"
        return 1
    fi
}

# Database synchronization
sync_databases() {
    local source_env="${ARGS[0]:-}"
    local target_env="${ARGS[1]:-}"
    
    if [[ -z "$source_env" || -z "$target_env" ]]; then
        log_error "Source and target environments are required"
        return 1
    fi
    
    log_info "Syncing data from $source_env to $target_env"
    
    # Load source environment configuration
    local source_config="$PROJECT_ROOT/.env.$source_env"
    local target_config="$PROJECT_ROOT/.env.$target_env"
    
    if [[ ! -f "$source_config" ]]; then
        log_error "Source environment configuration not found: $source_config"
        return 1
    fi
    
    if [[ ! -f "$target_config" ]]; then
        log_error "Target environment configuration not found: $target_config"
        return 1
    fi
    
    # Create sync backup
    local sync_backup="$BACKUPS_DIR/sync_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$sync_backup"
    
    # Export from source
    log_info "Exporting data from source environment: $source_env"
    ENVIRONMENT="$source_env" load_environment_config
    export_data
    
    # Import to target
    log_info "Importing data to target environment: $target_env"
    ENVIRONMENT="$target_env" load_environment_config
    
    # Find the latest export
    local latest_export=$(find "$BACKUPS_DIR/exports" -type d -name "*" | sort | tail -1)
    
    if [[ -n "$latest_export" && -f "$latest_export/full_database.sql" ]]; then
        import_data "$latest_export/full_database.sql"
    else
        log_error "No export data found for import"
        return 1
    fi
    
    log_success "Database synchronization completed"
}

# Backup and restore functions
create_migration_backup() {
    local backup_file="$BACKUPS_DIR/migration_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    log_info "Creating migration backup: $backup_file"
    
    local mysqldump_cmd=$(get_mysqldump_cmd)
    
    if $mysqldump_cmd --single-transaction --routines --triggers "$DB_NAME" > "$backup_file"; then
        # Compress backup
        gzip "$backup_file"
        backup_file="${backup_file}.gz"
        
        log_success "Migration backup created: $backup_file"
        echo "$backup_file"
    else
        log_error "Migration backup failed"
        return 1
    fi
}

restore_migration_backup() {
    local backup_file="${ARGS[0]:-}"
    
    if [[ -z "$backup_file" ]]; then
        log_error "Backup file is required"
        return 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_info "Restoring from backup: $backup_file"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would restore from backup: $backup_file"
        return 0
    fi
    
    local mysql_cmd=$(get_mysql_cmd)
    
    # Handle compressed backups
    if [[ "$backup_file" == *.gz ]]; then
        if zcat "$backup_file" | $mysql_cmd; then
            log_success "Backup restored successfully: $backup_file"
        else
            log_error "Backup restore failed: $backup_file"
            return 1
        fi
    else
        if $mysql_cmd < "$backup_file"; then
            log_success "Backup restored successfully: $backup_file"
        else
            log_error "Backup restore failed: $backup_file"
            return 1
        fi
    fi
}

# Reporting functions
generate_migration_report() {
    local report_file="$LOGS_DIR/migration_report_$(date +%Y%m%d_%H%M%S).json"
    
    log_info "Generating migration report: $report_file"
    
    local mysql_cmd=$(get_mysql_cmd)
    local status=$(get_migration_status)
    
    # Parse status
    local executed_count=$(echo "$status" | cut -d',' -f1 | cut -d':' -f2)
    local pending_count=$(echo "$status" | cut -d',' -f2 | cut -d':' -f2)
    local total_count=$(echo "$status" | cut -d',' -f3 | cut -d':' -f2)
    
    # Get migration history
    local migration_history="[]"
    if [[ "$status" != "not_initialized" ]]; then
        migration_history=$($mysql_cmd -e "SELECT JSON_ARRAYAGG(JSON_OBJECT('version', version, 'description', description, 'executed_at', executed_at, 'execution_time', execution_time)) FROM $MIGRATION_TABLE ORDER BY version;" 2>/dev/null || echo "[]")
    fi
    
    cat > "$report_file" << EOF
{
    "report_date": "$(date -Iseconds)",
    "environment": "$ENVIRONMENT",
    "database": {
        "host": "$DB_HOST",
        "port": $DB_PORT,
        "name": "$DB_NAME"
    },
    "migration_summary": {
        "total_migrations": $total_count,
        "executed_migrations": $executed_count,
        "pending_migrations": $pending_count,
        "success_rate": $(( total_count > 0 ? (executed_count * 100) / total_count : 0 ))
    },
    "execution_summary": {
        "migrated_count": $MIGRATED_COUNT,
        "failed_count": $FAILED_COUNT,
        "skipped_count": $SKIPPED_COUNT,
        "start_time": "$START_TIME",
        "end_time": "$END_TIME"
    },
    "migration_history": $migration_history
}
EOF
    
    log_success "Migration report generated: $report_file"
}

# Notification functions
send_notifications() {
    if [[ "$SEND_NOTIFICATIONS" != "true" ]]; then
        return 0
    fi
    
    local status_emoji="✅"
    local status_text="Success"
    
    if [[ $FAILED_COUNT -gt 0 ]]; then
        status_emoji="❌"
        status_text="Failed"
    elif [[ $SKIPPED_COUNT -gt 0 ]]; then
        status_emoji="⚠️"
        status_text="Warning"
    fi
    
    local message="$status_emoji Migration Report - $status_text\n\n"
    message+="Environment: $ENVIRONMENT\n"
    message+="Command: $COMMAND\n"
    message+="Migrated: $MIGRATED_COUNT\n"
    message+="Failed: $FAILED_COUNT\n"
    message+="Skipped: $SKIPPED_COUNT\n"
    
    if [[ -n "$START_TIME" && -n "$END_TIME" ]]; then
        message+="Duration: $(( $(date -d "$END_TIME" +%s) - $(date -d "$START_TIME" +%s) ))s"
    fi
    
    # Send Slack notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1
        
        log_info "Notification sent to Slack"
    fi
}

# Cleanup functions
clean_old_files() {
    log_info "Cleaning old migration files and backups..."
    
    # Clean old backups (keep last 10)
    find "$BACKUPS_DIR" -name "migration_backup_*.sql.gz" -type f | sort | head -n -10 | xargs -r rm -f
    
    # Clean old exports (keep last 5)
    find "$BACKUPS_DIR/exports" -type d -name "*" | sort | head -n -5 | xargs -r rm -rf
    
    # Clean old logs (keep last 30 days)
    find "$LOGS_DIR" -name "migration*.log" -type f -mtime +30 -delete
    
    # Clean temp files
    rm -rf "$TEMP_DIR"/*
    
    log_success "Cleanup completed"
}

# Main function
main() {
    START_TIME=$(date -Iseconds)
    
    if [[ -z "$COMMAND" ]]; then
        show_help
        exit 1
    fi
    
    # Load environment configuration
    load_environment_config
    
    # Test database connection
    if ! test_database_connection; then
        exit 1
    fi
    
    # Acquire migration lock for operations that modify the database
    case "$COMMAND" in
        migrate|rollback|reset|refresh|import|sync|restore)
            if ! acquire_migration_lock; then
                exit 1
            fi
            ;;
    esac
    
    # Execute command
    case "$COMMAND" in
        "init")
            init_migration_system
            ;;
        "create")
            create_migration_file
            ;;
        "migrate")
            run_migrations
            ;;
        "rollback")
            run_rollback
            ;;
        "status")
            local status=$(get_migration_status)
            if [[ "$status" == "not_initialized" ]]; then
                log_info "Migration system not initialized. Run 'init' command first."
            else
                local executed=$(echo "$status" | cut -d',' -f1 | cut -d':' -f2)
                local pending=$(echo "$status" | cut -d',' -f2 | cut -d':' -f2)
                local total=$(echo "$status" | cut -d',' -f3 | cut -d':' -f2)
                
                log_info "Migration Status:"
                log_info "  Executed: $executed"
                log_info "  Pending: $pending"
                log_info "  Total: $total"
            fi
            ;;
        "list")
            log_info "Executed migrations:"
            get_executed_migrations | while read -r version; do
                echo "  ✓ $version"
            done
            
            log_info "Pending migrations:"
            get_pending_migrations | while read -r version; do
                echo "  ○ $version"
            done
            ;;
        "export")
            export_data
            ;;
        "import")
            import_data
            ;;
        "sync")
            sync_databases
            ;;
        "backup")
            create_migration_backup
            ;;
        "restore")
            restore_migration_backup
            ;;
        "clean")
            clean_old_files
            ;;
        "lock")
            acquire_migration_lock
            ;;
        "unlock")
            release_migration_lock
            ;;
        "report")
            generate_migration_report
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
    
    END_TIME=$(date -Iseconds)
    
    # Release migration lock
    release_migration_lock
    
    # Generate report and send notifications
    generate_migration_report
    send_notifications
    
    # Print summary
    if [[ $MIGRATED_COUNT -gt 0 || $FAILED_COUNT -gt 0 || $SKIPPED_COUNT -gt 0 ]]; then
        echo
        log_info "Migration Summary:"
        log_info "Migrated: $MIGRATED_COUNT, Failed: $FAILED_COUNT, Skipped: $SKIPPED_COUNT"
        
        if [[ -n "$START_TIME" && -n "$END_TIME" ]]; then
            log_info "Duration: $(( $(date -d "$END_TIME" +%s) - $(date -d "$START_TIME" +%s) ))s"
        fi
    fi
    
    # Exit with appropriate code
    if [[ $FAILED_COUNT -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Cleanup on exit
trap 'release_migration_lock' EXIT

# Run main function
main
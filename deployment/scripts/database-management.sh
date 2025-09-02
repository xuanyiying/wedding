#!/bin/bash

# Wedding Club Database Management Script
# This script provides database backup, restore, and migration functionality

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-development}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/database}"
VERBOSE="${VERBOSE:-false}"
FORCE="${FORCE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

# Help function
show_help() {
    cat << EOF
Wedding Club Database Management Script

Usage: $0 [OPTIONS] COMMAND [ARGS]

Commands:
    backup [ENV]            Create database backup
    restore FILE [ENV]      Restore database from backup
    migrate [ENV]           Run database migrations
    seed [ENV]              Seed database with initial data
    reset [ENV]             Reset database (drop and recreate)
    status [ENV]            Show database status
    list-backups            List available backups
    cleanup-backups         Clean up old backups
    export-schema [ENV]     Export database schema
    import-data FILE [ENV]  Import data from file

Options:
    -e, --env ENV           Environment (development, staging, production, test)
    -b, --backup-dir DIR    Backup directory (default: ./backups/database)
    -f, --force             Force operation without confirmation
    -v, --verbose           Enable verbose output
    --help                  Show this help message

Environments:
    development             Local development database
    staging                 Staging database
    production              Production database
    test                    Test database

Examples:
    $0 backup production                    # Backup production database
    $0 restore backup_20231201_120000.sql  # Restore from backup
    $0 migrate staging                      # Run migrations on staging
    $0 reset test                           # Reset test database
    $0 status                               # Show development database status

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
        -b|--backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -f|--force)
            FORCE="true"
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
        backup|restore|migrate|seed|reset|status|list-backups|cleanup-backups|export-schema|import-data)
            COMMAND="$1"
            shift
            # Collect remaining arguments
            while [[ $# -gt 0 ]]; do
                ARGS+=("$1")
                shift
            done
            break
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

# Load environment configuration
load_env_config() {
    local env="$1"
    local env_file="$PROJECT_ROOT/deployment/environments/.env.$env"
    
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        log_info "Run: ./scripts/setup-environment.sh init $env"
        exit 1
    fi
    
    # Source environment file
    set -a  # automatically export all variables
    source "$env_file"
    set +a
    
    log_verbose "Loaded configuration for environment: $env"
}

# Validate database connection
validate_db_connection() {
    log_verbose "Validating database connection"
    
    if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" >/dev/null 2>&1; then
        log_error "Cannot connect to database"
        log_error "Host: $DB_HOST:$DB_PORT, User: $DB_USER, Database: $DB_NAME"
        exit 1
    fi
    
    log_verbose "Database connection validated"
}

# Create backup directory
ensure_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        log_verbose "Created backup directory: $BACKUP_DIR"
    fi
}

# Generate backup filename
generate_backup_filename() {
    local env="$1"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    echo "${env}_backup_${timestamp}.sql"
}

# Backup database
backup_database() {
    local env="${ARGS[0]:-$ENVIRONMENT}"
    
    log_info "Creating database backup for environment: $env"
    
    load_env_config "$env"
    validate_db_connection
    ensure_backup_dir
    
    local backup_file="$BACKUP_DIR/$(generate_backup_filename "$env")"
    
    log_info "Backing up database to: $backup_file"
    
    # Create backup with mysqldump
    if ! mysqldump \
        -h"$DB_HOST" \
        -P"$DB_PORT" \
        -u"$DB_USER" \
        -p"$DB_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --add-drop-database \
        --databases "$DB_NAME" > "$backup_file"; then
        log_error "Database backup failed"
        rm -f "$backup_file"
        exit 1
    fi
    
    # Compress backup
    log_info "Compressing backup file"
    gzip "$backup_file"
    backup_file="${backup_file}.gz"
    
    # Generate backup info
    local info_file="${backup_file%.sql.gz}.info"
    cat > "$info_file" << EOF
Backup Information
==================
Environment: $env
Database: $DB_NAME
Host: $DB_HOST:$DB_PORT
User: $DB_USER
Created: $(date)
File: $(basename "$backup_file")
Size: $(du -h "$backup_file" | cut -f1)
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo 'N/A')
Created By: $(whoami)
EOF
    
    log_success "Database backup completed: $backup_file"
    log_info "Backup size: $(du -h "$backup_file" | cut -f1)"
}

# Restore database
restore_database() {
    if [[ ${#ARGS[@]} -eq 0 ]]; then
        log_error "Backup file not specified"
        log_info "Usage: $0 restore BACKUP_FILE [ENV]"
        exit 1
    fi
    
    local backup_file="${ARGS[0]}"
    local env="${ARGS[1]:-$ENVIRONMENT}"
    
    # Handle relative paths
    if [[ ! "$backup_file" =~ ^/ ]]; then
        backup_file="$BACKUP_DIR/$backup_file"
    fi
    
    log_info "Restoring database from backup: $backup_file"
    log_info "Target environment: $env"
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    load_env_config "$env"
    validate_db_connection
    
    # Confirmation for production
    if [[ "$env" == "prod" && "$FORCE" != "true" ]]; then
        log_warning "You are about to restore the PRODUCTION database!"
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Restore cancelled"
            exit 0
        fi
    fi
    
    # Determine if file is compressed
    local restore_cmd
    if [[ "$backup_file" =~ \.gz$ ]]; then
        restore_cmd="zcat '$backup_file'"
    else
        restore_cmd="cat '$backup_file'"
    fi
    
    log_info "Starting database restore"
    
    # Restore database
    if ! eval "$restore_cmd" | mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD"; then
        log_error "Database restore failed"
        exit 1
    fi
    
    log_success "Database restore completed successfully"
}

# Run database migrations
migrate_database() {
    local env="${ARGS[0]:-$ENVIRONMENT}"
    
    log_info "Running database migrations for environment: $env"
    
    load_env_config "$env"
    
    # Change to server directory
    cd "$PROJECT_ROOT/server"
    
    # Check if migrations directory exists
    if [[ ! -d "migrations" ]]; then
        log_error "Migrations directory not found: $PROJECT_ROOT/server/migrations"
        exit 1
    fi
    
    # Run migrations using npm script
    if ! npm run migrate; then
        log_error "Database migration failed"
        exit 1
    fi
    
    log_success "Database migrations completed successfully"
}

# Seed database
seed_database() {
    local env="${ARGS[0]:-$ENVIRONMENT}"
    
    log_info "Seeding database for environment: $env"
    
    load_env_config "$env"
    
    # Change to server directory
    cd "$PROJECT_ROOT/server"
    
    # Check if seeders directory exists
    if [[ ! -d "seeders" ]]; then
        log_error "Seeders directory not found: $PROJECT_ROOT/server/seeders"
        exit 1
    fi
    
    # Run seeders using npm script
    if ! npm run seed; then
        log_error "Database seeding failed"
        exit 1
    fi
    
    log_success "Database seeding completed successfully"
}

# Reset database
reset_database() {
    local env="${ARGS[0]:-$ENVIRONMENT}"
    
    log_info "Resetting database for environment: $env"
    
    load_env_config "$env"
    validate_db_connection
    
    # Confirmation for production
    if [[ "$env" == "production" && "$FORCE" != "true" ]]; then
        log_error "Cannot reset production database without --force flag"
        log_warning "This operation will DESTROY all data in the production database!"
        exit 1
    fi
    
    # Confirmation for other environments
    if [[ "$FORCE" != "true" ]]; then
        log_warning "This will DESTROY all data in the $env database!"
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Reset cancelled"
            exit 0
        fi
    fi
    
    log_info "Dropping database: $DB_NAME"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;"
    
    log_info "Creating database: $DB_NAME"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
    log_success "Database reset completed"
    
    # Run migrations after reset
    log_info "Running migrations after reset"
    migrate_database "$env"
}

# Show database status
show_database_status() {
    local env="${ARGS[0]:-$ENVIRONMENT}"
    
    log_info "Database status for environment: $env"
    
    load_env_config "$env"
    validate_db_connection
    
    echo "Environment: $env"
    echo "Host: $DB_HOST:$DB_PORT"
    echo "Database: $DB_NAME"
    echo "User: $DB_USER"
    echo ""
    
    # Get database size
    local db_size=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "
        SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'DB Size (MB)'
        FROM information_schema.tables
        WHERE table_schema='$DB_NAME';
    " -s -N)
    
    echo "Database Size: ${db_size} MB"
    
    # Get table count
    local table_count=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "
        SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME';
    " -s -N)
    
    echo "Tables: $table_count"
    
    # Show tables with row counts
    echo ""
    echo "Table Information:"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "
        SELECT 
            table_name AS 'Table',
            table_rows AS 'Rows',
            ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
        FROM information_schema.tables 
        WHERE table_schema='$DB_NAME'
        ORDER BY (data_length + index_length) DESC;
    "
}

# List available backups
list_backups() {
    log_info "Available database backups:"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_warning "Backup directory does not exist: $BACKUP_DIR"
        return 0
    fi
    
    local backups=("$BACKUP_DIR"/*.sql.gz)
    
    if [[ ! -e "${backups[0]}" ]]; then
        log_warning "No backups found in: $BACKUP_DIR"
        return 0
    fi
    
    echo ""
    printf "%-30s %-15s %-10s %-20s\n" "Filename" "Environment" "Size" "Created"
    printf "%-30s %-15s %-10s %-20s\n" "--------" "-----------" "----" "-------"
    
    for backup in "${backups[@]}"; do
        if [[ -f "$backup" ]]; then
            local filename=$(basename "$backup")
            local env=$(echo "$filename" | cut -d'_' -f1)
            local size=$(du -h "$backup" | cut -f1)
            local created=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$backup" 2>/dev/null || stat -c "%y" "$backup" | cut -d' ' -f1-2)
            
            printf "%-30s %-15s %-10s %-20s\n" "$filename" "$env" "$size" "$created"
        fi
    done
}

# Cleanup old backups
cleanup_backups() {
    local retention_days="${ARGS[0]:-30}"
    
    log_info "Cleaning up backups older than $retention_days days"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_warning "Backup directory does not exist: $BACKUP_DIR"
        return 0
    fi
    
    local deleted_count=0
    
    # Find and delete old backups
    while IFS= read -r -d '' backup; do
        log_verbose "Deleting old backup: $(basename "$backup")"
        rm -f "$backup"
        # Also delete corresponding .info file
        local info_file="${backup%.sql.gz}.info"
        [[ -f "$info_file" ]] && rm -f "$info_file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$retention_days" -print0)
    
    if [[ $deleted_count -eq 0 ]]; then
        log_info "No old backups found to delete"
    else
        log_success "Deleted $deleted_count old backup(s)"
    fi
}

# Export database schema
export_schema() {
    local env="${ARGS[0]:-$ENVIRONMENT}"
    
    log_info "Exporting database schema for environment: $env"
    
    load_env_config "$env"
    validate_db_connection
    ensure_backup_dir
    
    local schema_file="$BACKUP_DIR/${env}_schema_$(date +"%Y%m%d_%H%M%S").sql"
    
    # Export schema only (no data)
    if ! mysqldump \
        -h"$DB_HOST" \
        -P"$DB_PORT" \
        -u"$DB_USER" \
        -p"$DB_PASSWORD" \
        --no-data \
        --routines \
        --triggers \
        --events \
        "$DB_NAME" > "$schema_file"; then
        log_error "Schema export failed"
        rm -f "$schema_file"
        exit 1
    fi
    
    log_success "Schema exported to: $schema_file"
}

# Import data from file
import_data() {
    if [[ ${#ARGS[@]} -eq 0 ]]; then
        log_error "Data file not specified"
        log_info "Usage: $0 import-data DATA_FILE [ENV]"
        exit 1
    fi
    
    local data_file="${ARGS[0]}"
    local env="${ARGS[1]:-$ENVIRONMENT}"
    
    log_info "Importing data from: $data_file"
    log_info "Target environment: $env"
    
    if [[ ! -f "$data_file" ]]; then
        log_error "Data file not found: $data_file"
        exit 1
    fi
    
    load_env_config "$env"
    validate_db_connection
    
    # Import data
    if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$data_file"; then
        log_error "Data import failed"
        exit 1
    fi
    
    log_success "Data import completed successfully"
}

# Main function
main() {
    case "$COMMAND" in
        backup)
            backup_database
            ;;
        restore)
            restore_database
            ;;
        migrate)
            migrate_database
            ;;
        seed)
            seed_database
            ;;
        reset)
            reset_database
            ;;
        status)
            show_database_status
            ;;
        list-backups)
            list_backups
            ;;
        cleanup-backups)
            cleanup_backups
            ;;
        export-schema)
            export_schema
            ;;
        import-data)
            import_data
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
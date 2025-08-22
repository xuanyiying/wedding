#!/bin/bash

# Wedding Club Environment Setup Script
# This script helps manage environment configurations for different deployment environments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-development}"
FORCE_OVERWRITE="${FORCE_OVERWRITE:-false}"
VERBOSE="${VERBOSE:-false}"

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
Wedding Club Environment Setup Script

Usage: $0 [OPTIONS] COMMAND

Commands:
    init ENV            Initialize environment configuration
    validate ENV        Validate environment configuration
    copy ENV            Copy environment configuration to active
    list                List available environments
    clean               Clean up temporary files

Options:
    -f, --force         Force overwrite existing files
    -v, --verbose       Enable verbose output
    --help              Show this help message

Environments:
    development         Local development environment
    staging             Staging environment
    production          Production environment
    test                Testing environment

Examples:
    $0 init development     # Initialize development environment
    $0 validate production  # Validate production configuration
    $0 copy staging         # Copy staging config to active
    $0 list                 # List all environments

EOF
}

# Parse command line arguments
COMMAND=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE_OVERWRITE="true"
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
        init|validate|copy|list|clean)
            COMMAND="$1"
            shift
            if [[ $# -gt 0 && ! $1 =~ ^- ]]; then
                ENVIRONMENT="$1"
                shift
            fi
            ;;
        *)
            if [[ -z "$COMMAND" ]]; then
                log_error "Unknown command: $1"
                show_help
                exit 1
            fi
            ;;
    esac
done

if [[ -z "$COMMAND" ]]; then
    log_error "No command specified"
    show_help
    exit 1
fi

# Environment templates
create_development_env() {
    cat > "$1" << 'EOF'
# Wedding Club - Development Environment Configuration

# Application Settings
NODE_ENV=development
PORT=3000
FRONTEND_PORT=8080
API_BASE_URL=http://localhost:3000/api/v1

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=wedding_club_dev
DB_USER=wedding_dev
DB_PASSWORD=dev_password_123
DB_CONNECTION_LIMIT=10
DB_TIMEOUT=60000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TIMEOUT=5000

# JWT Configuration
JWT_SECRET=dev_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf
UPLOAD_DEST=./uploads

# MinIO Configuration (Object Storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=wedding-club-dev
MINIO_USE_SSL=false

# Email Configuration (Development - use Mailtrap or similar)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
SMTP_FROM=noreply@wedding-club.dev
SMTP_FROM_NAME=Wedding Club Dev

# Logging Configuration
LOG_LEVEL=debug
LOG_FORMAT=dev
LOG_FILE=./logs/app.log

# Security Settings
CORS_ORIGIN=http://localhost:8080
CORS_CREDENTIALS=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Development Tools
ENABLE_SWAGGER=true
ENABLE_DEBUG=true
ENABLE_HOT_RELOAD=true

# External Services (Development)
PAYMENT_GATEWAY_URL=https://sandbox.payment-provider.com
PAYMENT_GATEWAY_KEY=dev_payment_key
PAYMENT_GATEWAY_SECRET=dev_payment_secret

# Monitoring (Optional in development)
PROMETHEUS_ENABLED=false
PROMETHEUS_PORT=9090

# Session Configuration
SESSION_SECRET=dev_session_secret_change_in_production
SESSION_MAX_AGE=86400000

EOF
}

create_staging_env() {
    cat > "$1" << 'EOF'
# Wedding Club - Staging Environment Configuration

# Application Settings
NODE_ENV=staging
PORT=3000
FRONTEND_PORT=8080
API_BASE_URL=https://api-staging.wedding-club.com/api/v1

# Database Configuration
DB_HOST=mysql-staging
DB_PORT=3306
DB_NAME=wedding_club_staging
DB_USER=wedding_staging
DB_PASSWORD=CHANGE_ME_STAGING_DB_PASSWORD
DB_CONNECTION_LIMIT=20
DB_TIMEOUT=60000

# Redis Configuration
REDIS_HOST=redis-staging
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_STAGING_REDIS_PASSWORD
REDIS_DB=0
REDIS_TIMEOUT=5000

# JWT Configuration
JWT_SECRET=CHANGE_ME_STAGING_JWT_SECRET
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf
UPLOAD_DEST=./uploads

# MinIO Configuration (Object Storage)
MINIO_ENDPOINT=minio-staging
MINIO_PORT=9000
MINIO_ACCESS_KEY=CHANGE_ME_STAGING_MINIO_ACCESS
MINIO_SECRET_KEY=CHANGE_ME_STAGING_MINIO_SECRET
MINIO_BUCKET=wedding-club-staging
MINIO_USE_SSL=true

# Email Configuration (Staging)
SMTP_HOST=smtp.staging-mail-service.com
SMTP_PORT=587
SMTP_USER=CHANGE_ME_STAGING_SMTP_USER
SMTP_PASS=CHANGE_ME_STAGING_SMTP_PASS
SMTP_FROM=noreply@staging.wedding-club.com
SMTP_FROM_NAME=Wedding Club Staging

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=combined
LOG_FILE=./logs/app.log

# Security Settings
CORS_ORIGIN=https://staging.wedding-club.com
CORS_CREDENTIALS=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=200

# Development Tools
ENABLE_SWAGGER=true
ENABLE_DEBUG=false
ENABLE_HOT_RELOAD=false

# External Services (Staging)
PAYMENT_GATEWAY_URL=https://sandbox.payment-provider.com
PAYMENT_GATEWAY_KEY=CHANGE_ME_STAGING_PAYMENT_KEY
PAYMENT_GATEWAY_SECRET=CHANGE_ME_STAGING_PAYMENT_SECRET

# Monitoring
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# Session Configuration
SESSION_SECRET=CHANGE_ME_STAGING_SESSION_SECRET
SESSION_MAX_AGE=86400000

# SSL Configuration
SSL_CERT_PATH=/etc/ssl/certs/staging.wedding-club.com.crt
SSL_KEY_PATH=/etc/ssl/private/staging.wedding-club.com.key

EOF
}

create_production_env() {
    cat > "$1" << 'EOF'
# Wedding Club - Production Environment Configuration

# Application Settings
NODE_ENV=production
PORT=3000
FRONTEND_PORT=8080
API_BASE_URL=https://api.wedding-club.com/api/v1

# Database Configuration
DB_HOST=mysql-primary
DB_PORT=3306
DB_NAME=wedding_club_prod
DB_USER=wedding_prod
DB_PASSWORD=CHANGE_ME_PRODUCTION_DB_PASSWORD
DB_CONNECTION_LIMIT=50
DB_TIMEOUT=60000

# Database Replica (Read-only)
DB_REPLICA_HOST=mysql-replica
DB_REPLICA_PORT=3306
DB_REPLICA_USER=wedding_replica
DB_REPLICA_PASSWORD=CHANGE_ME_PRODUCTION_DB_REPLICA_PASSWORD

# Redis Configuration
REDIS_HOST=redis-primary
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_PRODUCTION_REDIS_PASSWORD
REDIS_DB=0
REDIS_TIMEOUT=5000

# Redis Cluster (if using cluster)
REDIS_CLUSTER_NODES=redis-node1:6379,redis-node2:6379,redis-node3:6379

# JWT Configuration
JWT_SECRET=CHANGE_ME_PRODUCTION_JWT_SECRET
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf
UPLOAD_DEST=./uploads

# MinIO Configuration (Object Storage)
MINIO_ENDPOINT=minio-primary
MINIO_PORT=9000
MINIO_ACCESS_KEY=CHANGE_ME_PRODUCTION_MINIO_ACCESS
MINIO_SECRET_KEY=CHANGE_ME_PRODUCTION_MINIO_SECRET
MINIO_BUCKET=wedding-club-prod
MINIO_USE_SSL=true

# Email Configuration (Production)
SMTP_HOST=smtp.production-mail-service.com
SMTP_PORT=587
SMTP_USER=CHANGE_ME_PRODUCTION_SMTP_USER
SMTP_PASS=CHANGE_ME_PRODUCTION_SMTP_PASS
SMTP_FROM=noreply@wedding-club.com
SMTP_FROM_NAME=Wedding Club

# Logging Configuration
LOG_LEVEL=warn
LOG_FORMAT=combined
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=100m
LOG_MAX_FILES=10

# Security Settings
CORS_ORIGIN=https://wedding-club.com
CORS_CREDENTIALS=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=500

# Development Tools (Disabled in production)
ENABLE_SWAGGER=false
ENABLE_DEBUG=false
ENABLE_HOT_RELOAD=false

# External Services (Production)
PAYMENT_GATEWAY_URL=https://api.payment-provider.com
PAYMENT_GATEWAY_KEY=CHANGE_ME_PRODUCTION_PAYMENT_KEY
PAYMENT_GATEWAY_SECRET=CHANGE_ME_PRODUCTION_PAYMENT_SECRET

# Monitoring
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
GRAFANA_ENABLED=true
GRAFANA_PORT=3001

# Session Configuration
SESSION_SECRET=CHANGE_ME_PRODUCTION_SESSION_SECRET
SESSION_MAX_AGE=86400000

# SSL Configuration
SSL_CERT_PATH=/etc/ssl/certs/wedding-club.com.crt
SSL_KEY_PATH=/etc/ssl/private/wedding-club.com.key

# Performance Settings
CLUSTER_WORKERS=0  # 0 = auto (number of CPU cores)
KEEP_ALIVE_TIMEOUT=65000
HEADERS_TIMEOUT=66000

# Health Check Configuration
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH=/health
HEALTH_CHECK_INTERVAL=30000

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30

EOF
}

create_test_env() {
    cat > "$1" << 'EOF'
# Wedding Club - Test Environment Configuration

# Application Settings
NODE_ENV=test
PORT=3001
FRONTEND_PORT=8081
API_BASE_URL=http://localhost:3001/api/v1

# Database Configuration (Test)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=wedding_club_test
DB_USER=wedding_test
DB_PASSWORD=test_password_123
DB_CONNECTION_LIMIT=5
DB_TIMEOUT=30000

# Redis Configuration (Test)
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=
REDIS_DB=1
REDIS_TIMEOUT=3000

# JWT Configuration (Test)
JWT_SECRET=test_jwt_secret_key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=24h

# File Upload Configuration (Test)
UPLOAD_MAX_SIZE=5242880  # 5MB
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png
UPLOAD_DEST=./test-uploads

# MinIO Configuration (Test)
MINIO_ENDPOINT=localhost
MINIO_PORT=9001
MINIO_ACCESS_KEY=testuser
MINIO_SECRET_KEY=testpass123
MINIO_BUCKET=wedding-club-test
MINIO_USE_SSL=false

# Email Configuration (Test - Mock)
SMTP_HOST=localhost
SMTP_PORT=1025  # MailHog or similar
SMTP_USER=
SMTP_PASS=
SMTP_FROM=test@wedding-club.test
SMTP_FROM_NAME=Wedding Club Test

# Logging Configuration (Test)
LOG_LEVEL=error
LOG_FORMAT=simple
LOG_FILE=./test-logs/app.log

# Security Settings (Test)
CORS_ORIGIN=http://localhost:8081
CORS_CREDENTIALS=true
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=1000

# Development Tools (Test)
ENABLE_SWAGGER=false
ENABLE_DEBUG=true
ENABLE_HOT_RELOAD=false

# External Services (Test - Mock)
PAYMENT_GATEWAY_URL=http://localhost:3002/mock-payment
PAYMENT_GATEWAY_KEY=test_payment_key
PAYMENT_GATEWAY_SECRET=test_payment_secret

# Monitoring (Disabled in test)
PROMETHEUS_ENABLED=false

# Session Configuration (Test)
SESSION_SECRET=test_session_secret
SESSION_MAX_AGE=3600000  # 1 hour

# Test-specific Settings
TEST_TIMEOUT=30000
TEST_DB_RESET=true
TEST_PARALLEL=false

EOF
}

# Initialize environment
init_environment() {
    local env="$1"
    local env_file="$PROJECT_ROOT/.env.$env"
    
    log_info "Initializing $env environment configuration"
    
    if [[ -f "$env_file" && "$FORCE_OVERWRITE" != "true" ]]; then
        log_error "Environment file already exists: $env_file"
        log_info "Use --force to overwrite existing file"
        exit 1
    fi
    
    case "$env" in
        development)
            create_development_env "$env_file"
            ;;
        staging)
            create_staging_env "$env_file"
            ;;
        production)
            create_production_env "$env_file"
            ;;
        test)
            create_test_env "$env_file"
            ;;
        *)
            log_error "Unknown environment: $env"
            log_info "Supported environments: development, staging, production, test"
            exit 1
            ;;
    esac
    
    log_success "Environment configuration created: $env_file"
    log_warning "Please review and update the configuration values marked with 'CHANGE_ME'"
}

# Validate environment configuration
validate_environment() {
    local env="$1"
    local env_file="$PROJECT_ROOT/.env.$env"
    
    log_info "Validating $env environment configuration"
    
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        log_info "Run: $0 init $env"
        exit 1
    fi
    
    local errors=0
    
    # Check for placeholder values
    if grep -q "CHANGE_ME" "$env_file"; then
        log_warning "Found placeholder values that need to be updated:"
        grep -n "CHANGE_ME" "$env_file" | while read -r line; do
            log_warning "  Line: $line"
        done
        ((errors++))
    fi
    
    # Check for required variables
    local required_vars=("NODE_ENV" "PORT" "DB_HOST" "DB_NAME" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$env_file"; then
            log_error "Missing required variable: $var"
            ((errors++))
        fi
    done
    
    # Check for empty critical values
    local critical_vars=("JWT_SECRET" "DB_PASSWORD")
    for var in "${critical_vars[@]}"; do
        local value=$(grep "^$var=" "$env_file" | cut -d'=' -f2- | tr -d '"')
        if [[ -z "$value" ]]; then
            log_error "Critical variable is empty: $var"
            ((errors++))
        fi
    done
    
    if [[ $errors -eq 0 ]]; then
        log_success "Environment configuration is valid"
    else
        log_error "Found $errors validation errors"
        exit 1
    fi
}

# Copy environment configuration
copy_environment() {
    local env="$1"
    local source_file="$PROJECT_ROOT/.env.$env"
    local target_file="$PROJECT_ROOT/.env"
    
    log_info "Copying $env environment configuration to active"
    
    if [[ ! -f "$source_file" ]]; then
        log_error "Source environment file not found: $source_file"
        exit 1
    fi
    
    if [[ -f "$target_file" && "$FORCE_OVERWRITE" != "true" ]]; then
        log_error "Active environment file already exists: $target_file"
        log_info "Use --force to overwrite existing file"
        exit 1
    fi
    
    cp "$source_file" "$target_file"
    log_success "Environment configuration copied to: $target_file"
    log_info "Active environment is now: $env"
}

# List available environments
list_environments() {
    log_info "Available environment configurations:"
    
    local envs=("development" "staging" "production" "test")
    for env in "${envs[@]}"; do
        local env_file="$PROJECT_ROOT/.env.$env"
        if [[ -f "$env_file" ]]; then
            local status="✓ Configured"
            local color="$GREEN"
        else
            local status="✗ Not configured"
            local color="$RED"
        fi
        echo -e "  ${color}$env${NC} - $status"
    done
    
    # Show active environment
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        local active_env=$(grep "^NODE_ENV=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 | tr -d '"')
        echo -e "\n${BLUE}Active environment:${NC} $active_env"
    else
        echo -e "\n${YELLOW}No active environment configured${NC}"
    fi
}

# Clean up temporary files
clean_environment() {
    log_info "Cleaning up temporary files"
    
    local temp_dirs=("test-uploads" "test-logs")
    for dir in "${temp_dirs[@]}"; do
        if [[ -d "$PROJECT_ROOT/$dir" ]]; then
            rm -rf "$PROJECT_ROOT/$dir"
            log_verbose "Removed directory: $dir"
        fi
    done
    
    # Clean up backup files
    find "$PROJECT_ROOT" -name ".env.*.bak" -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Main function
main() {
    case "$COMMAND" in
        init)
            init_environment "$ENVIRONMENT"
            ;;
        validate)
            validate_environment "$ENVIRONMENT"
            ;;
        copy)
            copy_environment "$ENVIRONMENT"
            ;;
        list)
            list_environments
            ;;
        clean)
            clean_environment
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
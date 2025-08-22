#!/bin/bash

# Wedding Club Configuration Management Script
# This script provides comprehensive configuration management for different environments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_ROOT/configs"
ENV_DIR="$PROJECT_ROOT/environments"
TEMPLATE_DIR="$PROJECT_ROOT/templates"
BACKUP_DIR="$PROJECT_ROOT/config-backups"
VERBOSE="${VERBOSE:-false}"
FORCE="${FORCE:-false}"
DRY_RUN="${DRY_RUN:-false}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"
VAULT_ADDR="${VAULT_ADDR:-}"
VAULT_TOKEN="${VAULT_TOKEN:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Supported environments
ENVIRONMENTS=("development" "staging" "production" "test" "local")

# Configuration templates
declare -A CONFIG_TEMPLATES=(
    ["database"]="database.yml"
    ["redis"]="redis.yml"
    ["api"]="api.yml"
    ["frontend"]="frontend.yml"
    ["nginx"]="nginx.conf"
    ["docker"]="docker-compose.yml"
    ["monitoring"]="monitoring.yml"
    ["logging"]="logging.yml"
    ["security"]="security.yml"
)

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
        echo -e "${PURPLE}[VERBOSE]${NC} $message"
    fi
}

# Help function
show_help() {
    cat << EOF
Wedding Club Configuration Management Script

Usage: $0 [OPTIONS] [COMMAND] [ARGS...]

Commands:
    init [ENV]                  Initialize configuration for environment
    generate [ENV] [TEMPLATE]   Generate configuration from template
    validate [ENV]              Validate configuration files
    deploy [ENV]                Deploy configuration to environment
    backup [ENV]                Backup current configuration
    restore [ENV] [BACKUP]      Restore configuration from backup
    encrypt [FILE]              Encrypt configuration file
    decrypt [FILE]              Decrypt configuration file
    diff [ENV1] [ENV2]          Compare configurations between environments
    sync [SOURCE] [TARGET]      Sync configuration between environments
    template [ACTION] [NAME]    Manage configuration templates
    secrets [ACTION] [ENV]      Manage secrets for environment
    vault [ACTION] [PATH]       Interact with HashiCorp Vault
    env [ACTION] [ENV]          Manage environment variables
    list [TYPE]                 List configurations, environments, or templates
    clean [ENV]                 Clean up old configuration files
    migrate [FROM] [TO]         Migrate configuration between versions
    watch [ENV]                 Watch for configuration changes
    status [ENV]                Show configuration status
    health [ENV]                Check configuration health

Template Actions:
    create [NAME]               Create new template
    update [NAME]               Update existing template
    delete [NAME]               Delete template
    list                        List all templates

Secrets Actions:
    set [KEY] [VALUE]           Set secret value
    get [KEY]                   Get secret value
    delete [KEY]                Delete secret
    list                        List all secrets
    rotate [KEY]                Rotate secret value

Vault Actions:
    read [PATH]                 Read from Vault
    write [PATH] [DATA]         Write to Vault
    delete [PATH]               Delete from Vault
    list [PATH]                 List Vault paths

Environment Actions:
    set [KEY] [VALUE]           Set environment variable
    get [KEY]                   Get environment variable
    unset [KEY]                 Unset environment variable
    export [FILE]               Export environment to file
    import [FILE]               Import environment from file

Options:
    -e, --env ENV               Target environment
    --config-dir DIR            Configuration directory (default: ./configs)
    --template-dir DIR          Template directory (default: ./templates)
    --backup-dir DIR            Backup directory (default: ./config-backups)
    --encryption-key KEY        Encryption key for sensitive data
    --vault-addr ADDR           HashiCorp Vault address
    --vault-token TOKEN         HashiCorp Vault token
    --force                     Force operation without confirmation
    --dry-run                   Show what would be done without executing
    -v, --verbose               Enable verbose output
    --help                      Show this help message

Examples:
    $0 init production                          # Initialize production config
    $0 generate staging database                # Generate database config for staging
    $0 validate production                      # Validate production configuration
    $0 deploy staging --dry-run                 # Preview staging deployment
    $0 backup production                        # Backup production config
    $0 encrypt configs/production/secrets.yml   # Encrypt secrets file
    $0 diff staging production                  # Compare staging vs production
    $0 secrets set production DB_PASSWORD      # Set database password
    $0 vault read secret/wedding-club/prod     # Read from Vault
    $0 env export production                    # Export production env vars

EOF
}

# Parse command line arguments
COMMAND=""
ARGS=()
ENVIRONMENT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --config-dir)
            CONFIG_DIR="$2"
            shift 2
            ;;
        --template-dir)
            TEMPLATE_DIR="$2"
            shift 2
            ;;
        --backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        --encryption-key)
            ENCRYPTION_KEY="$2"
            shift 2
            ;;
        --vault-addr)
            VAULT_ADDR="$2"
            shift 2
            ;;
        --vault-token)
            VAULT_TOKEN="$2"
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
        init|generate|validate|deploy|backup|restore|encrypt|decrypt|diff|sync|template|secrets|vault|env|list|clean|migrate|watch|status|health)
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
mkdir -p "$CONFIG_DIR" "$ENV_DIR" "$TEMPLATE_DIR" "$BACKUP_DIR"

# Utility functions
is_valid_environment() {
    local env="$1"
    for valid_env in "${ENVIRONMENTS[@]}"; do
        if [[ "$env" == "$valid_env" ]]; then
            return 0
        fi
    done
    return 1
}

get_timestamp() {
    date +"%Y%m%d_%H%M%S"
}

confirm_action() {
    if [[ "$FORCE" == "true" ]]; then
        return 0
    fi
    
    local message="$1"
    echo -n "$message (y/N): "
    read -r response
    case "$response" in
        [yY]|[yY][eE][sS])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

encrypt_file() {
    local file="$1"
    local output="${file}.enc"
    
    if [[ -z "$ENCRYPTION_KEY" ]]; then
        log_error "Encryption key not provided"
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would encrypt: $file -> $output"
        return 0
    fi
    
    if command -v openssl >/dev/null 2>&1; then
        openssl enc -aes-256-cbc -salt -in "$file" -out "$output" -k "$ENCRYPTION_KEY"
        log_success "File encrypted: $output"
    else
        log_error "OpenSSL not available for encryption"
        return 1
    fi
}

decrypt_file() {
    local file="$1"
    local output="${file%.enc}"
    
    if [[ -z "$ENCRYPTION_KEY" ]]; then
        log_error "Encryption key not provided"
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would decrypt: $file -> $output"
        return 0
    fi
    
    if command -v openssl >/dev/null 2>&1; then
        openssl enc -aes-256-cbc -d -in "$file" -out "$output" -k "$ENCRYPTION_KEY"
        log_success "File decrypted: $output"
    else
        log_error "OpenSSL not available for decryption"
        return 1
    fi
}

# Initialize configuration for environment
init_config() {
    local env="${ARGS[0]:-$ENVIRONMENT}"
    
    if [[ -z "$env" ]]; then
        log_error "Environment not specified"
        return 1
    fi
    
    if ! is_valid_environment "$env"; then
        log_error "Invalid environment: $env"
        return 1
    fi
    
    local env_dir="$CONFIG_DIR/$env"
    
    if [[ -d "$env_dir" ]] && [[ "$FORCE" != "true" ]]; then
        if ! confirm_action "Environment $env already exists. Overwrite?"; then
            log_info "Initialization cancelled"
            return 0
        fi
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would initialize configuration for environment: $env"
        return 0
    fi
    
    log_info "Initializing configuration for environment: $env"
    
    # Create environment directory structure
    mkdir -p "$env_dir"/{database,redis,api,frontend,nginx,monitoring,logging,security}
    
    # Create basic configuration files
    cat > "$env_dir/.env" << EOF
# Environment: $env
# Generated: $(date)

NODE_ENV=$env
ENVIRONMENT=$env

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=wedding_club_$env
DB_USER=wedding_user
DB_PASSWORD=

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API Configuration
API_HOST=localhost
API_PORT=5000
API_SECRET_KEY=
JWT_SECRET=

# Frontend Configuration
FRONTEND_HOST=localhost
FRONTEND_PORT=3000
API_BASE_URL=http://localhost:5000

# External Services
EMAIL_SERVICE_API_KEY=
PAYMENT_GATEWAY_API_KEY=
CLOUD_STORAGE_ACCESS_KEY=
CLOUD_STORAGE_SECRET_KEY=

# Monitoring
MONITORING_ENABLED=true
LOG_LEVEL=info

# Security
SSL_ENABLED=false
CSRF_PROTECTION=true
RATE_LIMITING=true
EOF
    
    # Generate configuration files from templates
    for template_name in "${!CONFIG_TEMPLATES[@]}"; do
        generate_config_from_template "$env" "$template_name"
    done
    
    log_success "Configuration initialized for environment: $env"
}

# Generate configuration from template
generate_config_from_template() {
    local env="$1"
    local template_name="$2"
    local template_file="$TEMPLATE_DIR/${CONFIG_TEMPLATES[$template_name]}"
    local output_dir="$CONFIG_DIR/$env"
    local output_file="$output_dir/${CONFIG_TEMPLATES[$template_name]}"
    
    if [[ ! -f "$template_file" ]]; then
        log_verbose "Template not found: $template_file"
        return 0
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would generate: $output_file from $template_file"
        return 0
    fi
    
    log_verbose "Generating configuration: $output_file"
    
    # Load environment variables
    if [[ -f "$output_dir/.env" ]]; then
        set -a
        source "$output_dir/.env"
        set +a
    fi
    
    # Process template with environment variable substitution
    envsubst < "$template_file" > "$output_file"
    
    log_verbose "Generated: $output_file"
}

# Generate configuration
generate_config() {
    local env="${ARGS[0]:-$ENVIRONMENT}"
    local template_name="${ARGS[1]:-}"
    
    if [[ -z "$env" ]]; then
        log_error "Environment not specified"
        return 1
    fi
    
    if ! is_valid_environment "$env"; then
        log_error "Invalid environment: $env"
        return 1
    fi
    
    if [[ -n "$template_name" ]]; then
        if [[ -z "${CONFIG_TEMPLATES[$template_name]:-}" ]]; then
            log_error "Invalid template: $template_name"
            return 1
        fi
        generate_config_from_template "$env" "$template_name"
    else
        log_info "Generating all configurations for environment: $env"
        for template_name in "${!CONFIG_TEMPLATES[@]}"; do
            generate_config_from_template "$env" "$template_name"
        done
    fi
    
    log_success "Configuration generation completed"
}

# Validate configuration
validate_config() {
    local env="${ARGS[0]:-$ENVIRONMENT}"
    
    if [[ -z "$env" ]]; then
        log_error "Environment not specified"
        return 1
    fi
    
    if ! is_valid_environment "$env"; then
        log_error "Invalid environment: $env"
        return 1
    fi
    
    local env_dir="$CONFIG_DIR/$env"
    local validation_errors=0
    
    log_info "Validating configuration for environment: $env"
    
    # Check if environment directory exists
    if [[ ! -d "$env_dir" ]]; then
        log_error "Environment directory not found: $env_dir"
        return 1
    fi
    
    # Validate .env file
    if [[ -f "$env_dir/.env" ]]; then
        log_verbose "Validating environment file: $env_dir/.env"
        
        # Check for required variables
        local required_vars=("NODE_ENV" "DB_HOST" "DB_NAME" "API_PORT" "FRONTEND_PORT")
        for var in "${required_vars[@]}"; do
            if ! grep -q "^$var=" "$env_dir/.env"; then
                log_error "Missing required variable: $var"
                ((validation_errors++))
            fi
        done
        
        # Check for empty critical variables
        local critical_vars=("DB_PASSWORD" "JWT_SECRET" "API_SECRET_KEY")
        for var in "${critical_vars[@]}"; do
            if grep -q "^$var=$" "$env_dir/.env"; then
                log_warning "Empty critical variable: $var"
            fi
        done
    else
        log_error "Environment file not found: $env_dir/.env"
        ((validation_errors++))
    fi
    
    # Validate YAML files
    for yaml_file in "$env_dir"/*.yml "$env_dir"/*.yaml; do
        if [[ -f "$yaml_file" ]]; then
            log_verbose "Validating YAML file: $yaml_file"
            
            if command -v yq >/dev/null 2>&1; then
                if ! yq eval '.' "$yaml_file" >/dev/null 2>&1; then
                    log_error "Invalid YAML syntax: $yaml_file"
                    ((validation_errors++))
                fi
            elif command -v python3 >/dev/null 2>&1; then
                if ! python3 -c "import yaml; yaml.safe_load(open('$yaml_file'))" 2>/dev/null; then
                    log_error "Invalid YAML syntax: $yaml_file"
                    ((validation_errors++))
                fi
            fi
        fi
    done
    
    # Validate JSON files
    for json_file in "$env_dir"/*.json; do
        if [[ -f "$json_file" ]]; then
            log_verbose "Validating JSON file: $json_file"
            
            if command -v jq >/dev/null 2>&1; then
                if ! jq '.' "$json_file" >/dev/null 2>&1; then
                    log_error "Invalid JSON syntax: $json_file"
                    ((validation_errors++))
                fi
            elif command -v python3 >/dev/null 2>&1; then
                if ! python3 -c "import json; json.load(open('$json_file'))" 2>/dev/null; then
                    log_error "Invalid JSON syntax: $json_file"
                    ((validation_errors++))
                fi
            fi
        fi
    done
    
    # Validate Nginx configuration
    if [[ -f "$env_dir/nginx.conf" ]]; then
        log_verbose "Validating Nginx configuration"
        
        if command -v nginx >/dev/null 2>&1; then
            if ! nginx -t -c "$env_dir/nginx.conf" 2>/dev/null; then
                log_error "Invalid Nginx configuration: $env_dir/nginx.conf"
                ((validation_errors++))
            fi
        fi
    fi
    
    if [[ $validation_errors -eq 0 ]]; then
        log_success "Configuration validation passed for environment: $env"
        return 0
    else
        log_error "Configuration validation failed with $validation_errors errors"
        return 1
    fi
}

# Deploy configuration
deploy_config() {
    local env="${ARGS[0]:-$ENVIRONMENT}"
    
    if [[ -z "$env" ]]; then
        log_error "Environment not specified"
        return 1
    fi
    
    if ! is_valid_environment "$env"; then
        log_error "Invalid environment: $env"
        return 1
    fi
    
    local env_dir="$CONFIG_DIR/$env"
    
    if [[ ! -d "$env_dir" ]]; then
        log_error "Environment directory not found: $env_dir"
        return 1
    fi
    
    # Validate configuration before deployment
    if ! validate_config "$env"; then
        log_error "Configuration validation failed. Deployment aborted."
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would deploy configuration for environment: $env"
        return 0
    fi
    
    log_info "Deploying configuration for environment: $env"
    
    # Backup current configuration
    backup_config "$env"
    
    # Deploy environment file
    if [[ -f "$env_dir/.env" ]]; then
        cp "$env_dir/.env" "$PROJECT_ROOT/.env"
        log_verbose "Deployed environment file"
    fi
    
    # Deploy Docker Compose configuration
    if [[ -f "$env_dir/docker-compose.yml" ]]; then
        cp "$env_dir/docker-compose.yml" "$PROJECT_ROOT/docker-compose.yml"
        log_verbose "Deployed Docker Compose configuration"
    fi
    
    # Deploy Nginx configuration
    if [[ -f "$env_dir/nginx.conf" ]]; then
        if [[ -d "/etc/nginx" ]]; then
            sudo cp "$env_dir/nginx.conf" "/etc/nginx/sites-available/wedding-club"
            sudo ln -sf "/etc/nginx/sites-available/wedding-club" "/etc/nginx/sites-enabled/"
            log_verbose "Deployed Nginx configuration"
        fi
    fi
    
    # Deploy application configurations
    for config_file in "$env_dir"/*.yml "$env_dir"/*.yaml "$env_dir"/*.json; do
        if [[ -f "$config_file" ]]; then
            local filename=$(basename "$config_file")
            cp "$config_file" "$PROJECT_ROOT/configs/$filename"
            log_verbose "Deployed configuration: $filename"
        fi
    done
    
    log_success "Configuration deployment completed for environment: $env"
}

# Backup configuration
backup_config() {
    local env="${ARGS[0]:-$ENVIRONMENT}"
    local timestamp=$(get_timestamp)
    
    if [[ -z "$env" ]]; then
        log_error "Environment not specified"
        return 1
    fi
    
    local env_dir="$CONFIG_DIR/$env"
    local backup_file="$BACKUP_DIR/${env}_config_${timestamp}.tar.gz"
    
    if [[ ! -d "$env_dir" ]]; then
        log_error "Environment directory not found: $env_dir"
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would create backup: $backup_file"
        return 0
    fi
    
    log_info "Creating configuration backup for environment: $env"
    
    tar -czf "$backup_file" -C "$CONFIG_DIR" "$env"
    
    log_success "Configuration backup created: $backup_file"
}

# Restore configuration
restore_config() {
    local env="${ARGS[0]:-$ENVIRONMENT}"
    local backup_file="${ARGS[1]:-}"
    
    if [[ -z "$env" ]]; then
        log_error "Environment not specified"
        return 1
    fi
    
    if [[ -z "$backup_file" ]]; then
        # Find latest backup
        backup_file=$(ls -t "$BACKUP_DIR/${env}_config_"*.tar.gz 2>/dev/null | head -1)
        if [[ -z "$backup_file" ]]; then
            log_error "No backup found for environment: $env"
            return 1
        fi
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would restore from backup: $backup_file"
        return 0
    fi
    
    if ! confirm_action "Restore configuration for $env from $backup_file?"; then
        log_info "Restore cancelled"
        return 0
    fi
    
    log_info "Restoring configuration for environment: $env"
    
    # Backup current configuration before restore
    backup_config "$env"
    
    # Extract backup
    tar -xzf "$backup_file" -C "$CONFIG_DIR"
    
    log_success "Configuration restored for environment: $env"
}

# Compare configurations
diff_config() {
    local env1="${ARGS[0]:-}"
    local env2="${ARGS[1]:-}"
    
    if [[ -z "$env1" ]] || [[ -z "$env2" ]]; then
        log_error "Two environments must be specified for comparison"
        return 1
    fi
    
    local env1_dir="$CONFIG_DIR/$env1"
    local env2_dir="$CONFIG_DIR/$env2"
    
    if [[ ! -d "$env1_dir" ]]; then
        log_error "Environment directory not found: $env1_dir"
        return 1
    fi
    
    if [[ ! -d "$env2_dir" ]]; then
        log_error "Environment directory not found: $env2_dir"
        return 1
    fi
    
    log_info "Comparing configurations: $env1 vs $env2"
    
    if command -v diff >/dev/null 2>&1; then
        diff -r "$env1_dir" "$env2_dir" || true
    else
        log_error "diff command not available"
        return 1
    fi
}

# List configurations
list_configs() {
    local type="${ARGS[0]:-environments}"
    
    case "$type" in
        "environments")
            log_info "Available environments:"
            for env_dir in "$CONFIG_DIR"/*/; do
                if [[ -d "$env_dir" ]]; then
                    local env_name=$(basename "$env_dir")
                    echo "  - $env_name"
                fi
            done
            ;;
        "templates")
            log_info "Available templates:"
            for template_name in "${!CONFIG_TEMPLATES[@]}"; do
                echo "  - $template_name: ${CONFIG_TEMPLATES[$template_name]}"
            done
            ;;
        "backups")
            log_info "Available backups:"
            for backup_file in "$BACKUP_DIR"/*.tar.gz; do
                if [[ -f "$backup_file" ]]; then
                    local backup_name=$(basename "$backup_file")
                    local backup_date=$(stat -c %y "$backup_file" 2>/dev/null || stat -f %Sm "$backup_file" 2>/dev/null || echo "Unknown")
                    echo "  - $backup_name ($backup_date)"
                fi
            done
            ;;
        *)
            log_error "Invalid list type: $type"
            return 1
            ;;
    esac
}

# Show configuration status
show_status() {
    local env="${ARGS[0]:-$ENVIRONMENT}"
    
    if [[ -z "$env" ]]; then
        log_info "Configuration Management Status"
        echo
        echo "Environments:"
        list_configs "environments"
        echo
        echo "Templates:"
        list_configs "templates"
        echo
        echo "Recent Backups:"
        ls -lt "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -5 | while read -r line; do
            echo "  $line"
        done
        return 0
    fi
    
    if ! is_valid_environment "$env"; then
        log_error "Invalid environment: $env"
        return 1
    fi
    
    local env_dir="$CONFIG_DIR/$env"
    
    log_info "Configuration status for environment: $env"
    
    if [[ -d "$env_dir" ]]; then
        echo "Status: Configured"
        echo "Location: $env_dir"
        echo "Files:"
        find "$env_dir" -type f | while read -r file; do
            local rel_path=${file#$env_dir/}
            local file_size=$(stat -c %s "$file" 2>/dev/null || stat -f %z "$file" 2>/dev/null || echo "0")
            local file_date=$(stat -c %y "$file" 2>/dev/null || stat -f %Sm "$file" 2>/dev/null || echo "Unknown")
            echo "  - $rel_path (${file_size} bytes, $file_date)"
        done
    else
        echo "Status: Not configured"
    fi
}

# Main function
main() {
    if [[ -z "$COMMAND" ]]; then
        show_help
        exit 1
    fi
    
    case "$COMMAND" in
        "init")
            init_config
            ;;
        "generate")
            generate_config
            ;;
        "validate")
            validate_config
            ;;
        "deploy")
            deploy_config
            ;;
        "backup")
            backup_config
            ;;
        "restore")
            restore_config
            ;;
        "encrypt")
            if [[ ${#ARGS[@]} -eq 0 ]]; then
                log_error "File path required for encryption"
                exit 1
            fi
            encrypt_file "${ARGS[0]}"
            ;;
        "decrypt")
            if [[ ${#ARGS[@]} -eq 0 ]]; then
                log_error "File path required for decryption"
                exit 1
            fi
            decrypt_file "${ARGS[0]}"
            ;;
        "diff")
            diff_config
            ;;
        "list")
            list_configs
            ;;
        "status")
            show_status
            ;;
        "health")
            validate_config
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
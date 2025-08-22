#!/bin/bash

# Wedding Club User Management Script
# This script provides comprehensive user management for the Wedding Club application

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOGS_DIR="$PROJECT_ROOT/logs"
CONFIG_DIR="$PROJECT_ROOT/config"
TEMP_DIR="$PROJECT_ROOT/temp/users"
VERBOSE="${VERBOSE:-false}"
DRY_RUN="${DRY_RUN:-false}"
ENVIRONMENT="${ENVIRONMENT:-development}"
FORCE="${FORCE:-false}"
BATCH_SIZE="${BATCH_SIZE:-100}"
MAX_RETRIES="${MAX_RETRIES:-3}"
TIMEOUT="${TIMEOUT:-30}"
SEND_EMAIL="${SEND_EMAIL:-false}"
EMAIL_TEMPLATE_DIR="$PROJECT_ROOT/templates/email"
SESSION_TIMEOUT="${SESSION_TIMEOUT:-3600}"
PASSWORD_MIN_LENGTH="${PASSWORD_MIN_LENGTH:-8}"
MAX_LOGIN_ATTEMPTS="${MAX_LOGIN_ATTEMPTS:-5}"
LOCKOUT_DURATION="${LOCKOUT_DURATION:-900}"
TWO_FACTOR_ENABLED="${TWO_FACTOR_ENABLED:-false}"
AUDIT_ENABLED="${AUDIT_ENABLED:-true}"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-wedding_club}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"

# API configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api}"
API_KEY="${API_KEY:-}"
JWT_SECRET="${JWT_SECRET:-}"
JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-24h}"

# Email configuration
SMTP_HOST="${SMTP_HOST:-localhost}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
FROM_EMAIL="${FROM_EMAIL:-noreply@weddingclub.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# User roles
ROLES=("admin" "moderator" "vendor" "customer" "guest")

# User status
STATUSES=("active" "inactive" "suspended" "pending" "banned")

# Logging functions
log_info() {
    local message="$1"
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $message" >> "$LOGS_DIR/user-management.log"
}

log_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $message" >> "$LOGS_DIR/user-management.log"
}

log_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $message" >> "$LOGS_DIR/user-management.log"
}

log_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $message" >> "$LOGS_DIR/user-management.log"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        local message="$1"
        echo -e "${PURPLE}[VERBOSE]${NC} $(date '+%Y-%m-%d %H:%M:%S') $message"
        echo "$(date '+%Y-%m-%d %H:%M:%S') [VERBOSE] $message" >> "$LOGS_DIR/user-management.log"
    fi
}

# Help function
show_help() {
    cat << EOF
Wedding Club User Management Script

Usage: $0 [OPTIONS] [COMMAND] [ARGS...]

Commands:
    create EMAIL [OPTIONS]          Create new user account
    update USER_ID [OPTIONS]        Update user account
    delete USER_ID                  Delete user account
    activate USER_ID                Activate user account
    deactivate USER_ID              Deactivate user account
    suspend USER_ID [REASON]        Suspend user account
    unsuspend USER_ID               Unsuspend user account
    ban USER_ID [REASON]            Ban user account
    unban USER_ID                   Unban user account
    reset-password USER_ID          Reset user password
    change-password USER_ID         Change user password
    set-role USER_ID ROLE           Set user role
    add-permission USER_ID PERM     Add permission to user
    remove-permission USER_ID PERM  Remove permission from user
    list [OPTIONS]                  List users
    search QUERY                    Search users
    show USER_ID                    Show user details
    sessions USER_ID                Show user sessions
    login-history USER_ID           Show user login history
    export [FORMAT]                 Export users data
    import FILE                     Import users data
    bulk-update FILE                Bulk update users
    cleanup                         Clean inactive users
    audit [USER_ID]                 Show audit log
    stats                           Show user statistics
    validate                        Validate user data
    backup                          Backup user data
    restore FILE                    Restore user data
    send-email USER_ID TEMPLATE     Send email to user
    broadcast TEMPLATE [ROLE]       Broadcast email to users
    2fa-enable USER_ID              Enable 2FA for user
    2fa-disable USER_ID             Disable 2FA for user
    2fa-reset USER_ID               Reset 2FA for user
    token-generate USER_ID          Generate API token
    token-revoke TOKEN_ID           Revoke API token
    token-list USER_ID              List user tokens

Create Options:
    --name NAME                     Full name
    --role ROLE                     User role (admin, moderator, vendor, customer, guest)
    --password PASSWORD             Password (will prompt if not provided)
    --phone PHONE                   Phone number
    --company COMPANY               Company name
    --address ADDRESS               Address
    --send-welcome                  Send welcome email
    --verify-email                  Require email verification
    --temp-password                 Generate temporary password

Update Options:
    --name NAME                     Update full name
    --email EMAIL                   Update email address
    --phone PHONE                   Update phone number
    --company COMPANY               Update company name
    --address ADDRESS               Update address
    --role ROLE                     Update user role
    --status STATUS                 Update user status

List Options:
    --role ROLE                     Filter by role
    --status STATUS                 Filter by status
    --limit LIMIT                   Limit results (default: 50)
    --offset OFFSET                 Offset results (default: 0)
    --sort FIELD                    Sort by field (id, name, email, created_at)
    --order ORDER                   Sort order (asc, desc)
    --format FORMAT                 Output format (table, json, csv)

Global Options:
    -e, --env ENVIRONMENT           Target environment (default: development)
    --host HOST                     Database host (default: localhost)
    --port PORT                     Database port (default: 3306)
    --database NAME                 Database name (default: wedding_club)
    --user USER                     Database user (default: root)
    --password PASSWORD             Database password
    --api-url URL                   API base URL
    --api-key KEY                   API key for authentication
    --batch-size SIZE               Batch size for operations (default: 100)
    --timeout SECONDS               Operation timeout (default: 30)
    --send-email                    Enable email notifications
    --smtp-host HOST                SMTP server host
    --smtp-port PORT                SMTP server port
    --smtp-user USER                SMTP username
    --smtp-password PASSWORD        SMTP password
    --from-email EMAIL              From email address
    --force                         Force operation (use with caution)
    --dry-run                       Show what would be done without executing
    -v, --verbose                   Enable verbose output
    --help                          Show this help message

Examples:
    $0 create john@example.com --name "John Doe" --role customer
    $0 update 123 --role vendor --status active
    $0 list --role admin --format json
    $0 search "john"
    $0 reset-password 123 --send-email
    $0 bulk-update users.csv
    $0 export csv
    $0 audit 123
    $0 broadcast welcome_email customer
    $0 2fa-enable 123

EOF
}

# Parse command line arguments
COMMAND=""
ARGS=()
CREATE_OPTIONS=()
UPDATE_OPTIONS=()
LIST_OPTIONS=()

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
        --api-url)
            API_BASE_URL="$2"
            shift 2
            ;;
        --api-key)
            API_KEY="$2"
            shift 2
            ;;
        --batch-size)
            BATCH_SIZE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --send-email)
            SEND_EMAIL="true"
            shift
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
        # Create options
        --name)
            CREATE_OPTIONS+=("--name" "$2")
            UPDATE_OPTIONS+=("--name" "$2")
            shift 2
            ;;
        --role)
            CREATE_OPTIONS+=("--role" "$2")
            UPDATE_OPTIONS+=("--role" "$2")
            LIST_OPTIONS+=("--role" "$2")
            shift 2
            ;;
        --phone)
            CREATE_OPTIONS+=("--phone" "$2")
            UPDATE_OPTIONS+=("--phone" "$2")
            shift 2
            ;;
        --company)
            CREATE_OPTIONS+=("--company" "$2")
            UPDATE_OPTIONS+=("--company" "$2")
            shift 2
            ;;
        --address)
            CREATE_OPTIONS+=("--address" "$2")
            UPDATE_OPTIONS+=("--address" "$2")
            shift 2
            ;;
        --send-welcome)
            CREATE_OPTIONS+=("--send-welcome")
            shift
            ;;
        --verify-email)
            CREATE_OPTIONS+=("--verify-email")
            shift
            ;;
        --temp-password)
            CREATE_OPTIONS+=("--temp-password")
            shift
            ;;
        # Update options
        --email)
            UPDATE_OPTIONS+=("--email" "$2")
            shift 2
            ;;
        --status)
            UPDATE_OPTIONS+=("--status" "$2")
            LIST_OPTIONS+=("--status" "$2")
            shift 2
            ;;
        # List options
        --limit)
            LIST_OPTIONS+=("--limit" "$2")
            shift 2
            ;;
        --offset)
            LIST_OPTIONS+=("--offset" "$2")
            shift 2
            ;;
        --sort)
            LIST_OPTIONS+=("--sort" "$2")
            shift 2
            ;;
        --order)
            LIST_OPTIONS+=("--order" "$2")
            shift 2
            ;;
        --format)
            LIST_OPTIONS+=("--format" "$2")
            shift 2
            ;;
        create|update|delete|activate|deactivate|suspend|unsuspend|ban|unban|reset-password|change-password|set-role|add-permission|remove-permission|list|search|show|sessions|login-history|export|import|bulk-update|cleanup|audit|stats|validate|backup|restore|send-email|broadcast|2fa-enable|2fa-disable|2fa-reset|token-generate|token-revoke|token-list)
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
mkdir -p "$LOGS_DIR" "$TEMP_DIR" "$EMAIL_TEMPLATE_DIR"

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
        API_BASE_URL="${API_URL:-$API_BASE_URL}"
        JWT_SECRET="${JWT_SECRET_KEY:-$JWT_SECRET}"
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

# API functions
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    local headers=()
    
    if [[ -n "$API_KEY" ]]; then
        headers+=("Authorization: Bearer $API_KEY")
    fi
    
    headers+=("Content-Type: application/json")
    
    local curl_cmd="curl -s -X $method"
    
    for header in "${headers[@]}"; do
        curl_cmd="$curl_cmd -H '$header'"
    done
    
    if [[ -n "$data" ]]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$API_BASE_URL$endpoint'"
    
    log_verbose "API Request: $curl_cmd"
    
    eval "$curl_cmd"
}

# Validation functions
validate_email() {
    local email="$1"
    
    if [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

validate_password() {
    local password="$1"
    
    if [[ ${#password} -lt $PASSWORD_MIN_LENGTH ]]; then
        log_error "Password must be at least $PASSWORD_MIN_LENGTH characters long"
        return 1
    fi
    
    # Check for at least one uppercase letter
    if [[ ! "$password" =~ [A-Z] ]]; then
        log_error "Password must contain at least one uppercase letter"
        return 1
    fi
    
    # Check for at least one lowercase letter
    if [[ ! "$password" =~ [a-z] ]]; then
        log_error "Password must contain at least one lowercase letter"
        return 1
    fi
    
    # Check for at least one digit
    if [[ ! "$password" =~ [0-9] ]]; then
        log_error "Password must contain at least one digit"
        return 1
    fi
    
    # Check for at least one special character
    if [[ ! "$password" =~ [^a-zA-Z0-9] ]]; then
        log_error "Password must contain at least one special character"
        return 1
    fi
    
    return 0
}

validate_role() {
    local role="$1"
    
    for valid_role in "${ROLES[@]}"; do
        if [[ "$role" == "$valid_role" ]]; then
            return 0
        fi
    done
    
    log_error "Invalid role: $role. Valid roles: ${ROLES[*]}"
    return 1
}

validate_status() {
    local status="$1"
    
    for valid_status in "${STATUSES[@]}"; do
        if [[ "$status" == "$valid_status" ]]; then
            return 0
        fi
    done
    
    log_error "Invalid status: $status. Valid statuses: ${STATUSES[*]}"
    return 1
}

# Password functions
generate_password() {
    local length="${1:-12}"
    
    # Generate password with uppercase, lowercase, digits, and special characters
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-$length
}

hash_password() {
    local password="$1"
    
    # Use bcrypt for password hashing (requires bcrypt command)
    if command -v bcrypt >/dev/null 2>&1; then
        bcrypt "$password"
    else
        # Fallback to openssl
        echo -n "$password" | openssl dgst -sha256 -binary | openssl base64
    fi
}

# Email functions
send_email() {
    local to_email="$1"
    local subject="$2"
    local body="$3"
    local template="${4:-}"
    
    if [[ "$SEND_EMAIL" != "true" ]]; then
        log_verbose "Email sending disabled, skipping email to: $to_email"
        return 0
    fi
    
    log_info "Sending email to: $to_email"
    
    # Use template if provided
    if [[ -n "$template" && -f "$EMAIL_TEMPLATE_DIR/$template.html" ]]; then
        body=$(cat "$EMAIL_TEMPLATE_DIR/$template.html")
    fi
    
    # Send email using sendmail or SMTP
    if command -v sendmail >/dev/null 2>&1; then
        {
            echo "To: $to_email"
            echo "From: $FROM_EMAIL"
            echo "Subject: $subject"
            echo "Content-Type: text/html; charset=UTF-8"
            echo ""
            echo "$body"
        } | sendmail "$to_email"
    else
        log_warning "sendmail not available, email not sent"
    fi
}

# User management functions
create_user() {
    local email="${ARGS[0]:-}"
    
    if [[ -z "$email" ]]; then
        log_error "Email address is required"
        return 1
    fi
    
    if ! validate_email "$email"; then
        log_error "Invalid email address: $email"
        return 1
    fi
    
    # Parse create options
    local name=""
    local role="customer"
    local password=""
    local phone=""
    local company=""
    local address=""
    local send_welcome=false
    local verify_email=false
    local temp_password=false
    
    local i=0
    while [[ $i -lt ${#CREATE_OPTIONS[@]} ]]; do
        case "${CREATE_OPTIONS[$i]}" in
            "--name")
                name="${CREATE_OPTIONS[$((i+1))]}"
                i=$((i+2))
                ;;
            "--role")
                role="${CREATE_OPTIONS[$((i+1))]}"
                i=$((i+2))
                ;;
            "--password")
                password="${CREATE_OPTIONS[$((i+1))]}"
                i=$((i+2))
                ;;
            "--phone")
                phone="${CREATE_OPTIONS[$((i+1))]}"
                i=$((i+2))
                ;;
            "--company")
                company="${CREATE_OPTIONS[$((i+1))]}"
                i=$((i+2))
                ;;
            "--address")
                address="${CREATE_OPTIONS[$((i+1))]}"
                i=$((i+2))
                ;;
            "--send-welcome")
                send_welcome=true
                i=$((i+1))
                ;;
            "--verify-email")
                verify_email=true
                i=$((i+1))
                ;;
            "--temp-password")
                temp_password=true
                i=$((i+1))
                ;;
            *)
                i=$((i+1))
                ;;
        esac
    done
    
    # Validate role
    if ! validate_role "$role"; then
        return 1
    fi
    
    # Generate password if not provided
    if [[ -z "$password" ]]; then
        if [[ "$temp_password" == "true" ]]; then
            password=$(generate_password 12)
            log_info "Generated temporary password: $password"
        else
            echo -n "Enter password for $email: "
            read -s password
            echo
            
            if ! validate_password "$password"; then
                return 1
            fi
        fi
    fi
    
    log_info "Creating user: $email"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would create user: $email with role: $role"
        return 0
    fi
    
    # Check if user already exists
    local mysql_cmd=$(get_mysql_cmd)
    local existing_user=$($mysql_cmd -sN -e "SELECT id FROM users WHERE email = '$email';")
    
    if [[ -n "$existing_user" ]]; then
        log_error "User already exists: $email"
        return 1
    fi
    
    # Hash password
    local password_hash=$(hash_password "$password")
    
    # Create user in database
    local user_id=$($mysql_cmd -sN -e "
        INSERT INTO users (email, name, password_hash, role, phone, company, address, status, email_verified, created_at) 
        VALUES ('$email', '$name', '$password_hash', '$role', '$phone', '$company', '$address', 'active', $(if [[ "$verify_email" == "true" ]]; then echo "0"; else echo "1"; fi), NOW());
        SELECT LAST_INSERT_ID();
    ")
    
    if [[ -n "$user_id" ]]; then
        log_success "User created successfully: $email (ID: $user_id)"
        
        # Send welcome email
        if [[ "$send_welcome" == "true" ]]; then
            send_email "$email" "Welcome to Wedding Club" "Welcome to Wedding Club! Your account has been created." "welcome"
        fi
        
        # Send verification email
        if [[ "$verify_email" == "true" ]]; then
            send_email "$email" "Verify your email" "Please verify your email address." "verify_email"
        fi
        
        # Log audit event
        if [[ "$AUDIT_ENABLED" == "true" ]]; then
            log_audit_event "user_created" "$user_id" "User created: $email"
        fi
        
        echo "$user_id"
    else
        log_error "Failed to create user: $email"
        return 1
    fi
}

update_user() {
    local user_id="${ARGS[0]:-}"
    
    if [[ -z "$user_id" ]]; then
        log_error "User ID is required"
        return 1
    fi
    
    # Check if user exists
    local mysql_cmd=$(get_mysql_cmd)
    local existing_user=$($mysql_cmd -sN -e "SELECT email FROM users WHERE id = '$user_id';")
    
    if [[ -z "$existing_user" ]]; then
        log_error "User not found: $user_id"
        return 1
    fi
    
    log_info "Updating user: $user_id ($existing_user)"
    
    # Parse update options
    local updates=()
    local i=0
    
    while [[ $i -lt ${#UPDATE_OPTIONS[@]} ]]; do
        case "${UPDATE_OPTIONS[$i]}" in
            "--name")
                updates+=("name = '${UPDATE_OPTIONS[$((i+1))]}'") 
                i=$((i+2))
                ;;
            "--email")
                local new_email="${UPDATE_OPTIONS[$((i+1))]}"
                if validate_email "$new_email"; then
                    updates+=("email = '$new_email'")
                else
                    log_error "Invalid email address: $new_email"
                    return 1
                fi
                i=$((i+2))
                ;;
            "--role")
                local new_role="${UPDATE_OPTIONS[$((i+1))]}"
                if validate_role "$new_role"; then
                    updates+=("role = '$new_role'")
                else
                    return 1
                fi
                i=$((i+2))
                ;;
            "--phone")
                updates+=("phone = '${UPDATE_OPTIONS[$((i+1))]}'") 
                i=$((i+2))
                ;;
            "--company")
                updates+=("company = '${UPDATE_OPTIONS[$((i+1))]}'") 
                i=$((i+2))
                ;;
            "--address")
                updates+=("address = '${UPDATE_OPTIONS[$((i+1))]}'") 
                i=$((i+2))
                ;;
            "--status")
                local new_status="${UPDATE_OPTIONS[$((i+1))]}"
                if validate_status "$new_status"; then
                    updates+=("status = '$new_status'")
                else
                    return 1
                fi
                i=$((i+2))
                ;;
            *)
                i=$((i+1))
                ;;
        esac
    done
    
    if [[ ${#updates[@]} -eq 0 ]]; then
        log_error "No updates specified"
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would update user: $user_id with: ${updates[*]}"
        return 0
    fi
    
    # Build update query
    local update_query="UPDATE users SET "
    local first=true
    
    for update in "${updates[@]}"; do
        if [[ "$first" == "true" ]]; then
            first=false
        else
            update_query="$update_query, "
        fi
        update_query="$update_query$update"
    done
    
    update_query="$update_query, updated_at = NOW() WHERE id = '$user_id';"
    
    # Execute update
    if $mysql_cmd -e "$update_query"; then
        log_success "User updated successfully: $user_id"
        
        # Log audit event
        if [[ "$AUDIT_ENABLED" == "true" ]]; then
            log_audit_event "user_updated" "$user_id" "User updated: ${updates[*]}"
        fi
    else
        log_error "Failed to update user: $user_id"
        return 1
    fi
}

delete_user() {
    local user_id="${ARGS[0]:-}"
    
    if [[ -z "$user_id" ]]; then
        log_error "User ID is required"
        return 1
    fi
    
    # Check if user exists
    local mysql_cmd=$(get_mysql_cmd)
    local existing_user=$($mysql_cmd -sN -e "SELECT email FROM users WHERE id = '$user_id';")
    
    if [[ -z "$existing_user" ]]; then
        log_error "User not found: $user_id"
        return 1
    fi
    
    log_info "Deleting user: $user_id ($existing_user)"
    
    if [[ "$FORCE" != "true" ]]; then
        echo -n "Are you sure you want to delete user $user_id ($existing_user)? [y/N]: "
        read -r confirmation
        
        if [[ "$confirmation" != "y" && "$confirmation" != "Y" ]]; then
            log_info "User deletion cancelled"
            return 0
        fi
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would delete user: $user_id ($existing_user)"
        return 0
    fi
    
    # Soft delete (update status to deleted)
    if $mysql_cmd -e "UPDATE users SET status = 'deleted', deleted_at = NOW() WHERE id = '$user_id';"; then
        log_success "User deleted successfully: $user_id"
        
        # Log audit event
        if [[ "$AUDIT_ENABLED" == "true" ]]; then
            log_audit_event "user_deleted" "$user_id" "User deleted: $existing_user"
        fi
    else
        log_error "Failed to delete user: $user_id"
        return 1
    fi
}

list_users() {
    log_info "Listing users..."
    
    # Parse list options
    local role_filter=""
    local status_filter=""
    local limit="50"
    local offset="0"
    local sort_field="id"
    local sort_order="asc"
    local output_format="table"
    
    local i=0
    while [[ $i -lt ${#LIST_OPTIONS[@]} ]]; do
        case "${LIST_OPTIONS[$i]}" in
            "--role")
                role_filter="${LIST_OPTIONS[$((i+1))]}"
                i=$((i+2))
                ;;
            "--status")
                status_filter="${LIST_OPTIONS[$((i+1))]}"
                i=$((i+2))
                ;;
            "--limit")
                limit="${LIST_OPTIONS[$((i+1))]}"
                i=$((i+2))
                ;;
            "--offset")
                offset="${LIST_OPTIONS[$((i+1))]}"
                i=$((i+2))
                ;;
            "--sort")
                sort_field="${LIST_OPTIONS[$((i+1))]}"
                i=$((i+2))
                ;;
            "--order")
                sort_order="${LIST_OPTIONS[$((i+1))]}"
                i=$((i+2))
                ;;
            "--format")
                output_format="${LIST_OPTIONS[$((i+1))]}"
                i=$((i+2))
                ;;
            *)
                i=$((i+1))
                ;;
        esac
    done
    
    # Build query
    local query="SELECT id, email, name, role, status, created_at FROM users WHERE 1=1"
    
    if [[ -n "$role_filter" ]]; then
        query="$query AND role = '$role_filter'"
    fi
    
    if [[ -n "$status_filter" ]]; then
        query="$query AND status = '$status_filter'"
    fi
    
    query="$query ORDER BY $sort_field $sort_order LIMIT $limit OFFSET $offset;"
    
    local mysql_cmd=$(get_mysql_cmd)
    
    case "$output_format" in
        "json")
            $mysql_cmd -e "$query" --json
            ;;
        "csv")
            $mysql_cmd -e "$query" --batch --raw | tr '\t' ','
            ;;
        "table"|*)
            $mysql_cmd -e "$query" --table
            ;;
    esac
}

show_user() {
    local user_id="${ARGS[0]:-}"
    
    if [[ -z "$user_id" ]]; then
        log_error "User ID is required"
        return 1
    fi
    
    log_info "Showing user details: $user_id"
    
    local mysql_cmd=$(get_mysql_cmd)
    
    $mysql_cmd -e "SELECT * FROM users WHERE id = '$user_id';" --vertical
}

# Audit functions
log_audit_event() {
    local event_type="$1"
    local user_id="$2"
    local description="$3"
    local ip_address="${4:-}"
    local user_agent="${5:-}"
    
    if [[ "$AUDIT_ENABLED" != "true" ]]; then
        return 0
    fi
    
    local mysql_cmd=$(get_mysql_cmd)
    
    $mysql_cmd -e "
        INSERT INTO audit_logs (event_type, user_id, description, ip_address, user_agent, created_at) 
        VALUES ('$event_type', '$user_id', '$description', '$ip_address', '$user_agent', NOW());
    " 2>/dev/null || true
}

show_audit_log() {
    local user_id="${ARGS[0]:-}"
    
    log_info "Showing audit log..."
    
    local mysql_cmd=$(get_mysql_cmd)
    local query="SELECT * FROM audit_logs"
    
    if [[ -n "$user_id" ]]; then
        query="$query WHERE user_id = '$user_id'"
    fi
    
    query="$query ORDER BY created_at DESC LIMIT 100;"
    
    $mysql_cmd -e "$query" --table
}

# Statistics functions
show_user_stats() {
    log_info "Showing user statistics..."
    
    local mysql_cmd=$(get_mysql_cmd)
    
    echo "User Statistics:"
    echo "================="
    
    # Total users
    local total_users=$($mysql_cmd -sN -e "SELECT COUNT(*) FROM users WHERE status != 'deleted';")
    echo "Total Users: $total_users"
    
    # Users by role
    echo ""
    echo "Users by Role:"
    $mysql_cmd -e "SELECT role, COUNT(*) as count FROM users WHERE status != 'deleted' GROUP BY role ORDER BY count DESC;" --table
    
    # Users by status
    echo ""
    echo "Users by Status:"
    $mysql_cmd -e "SELECT status, COUNT(*) as count FROM users GROUP BY status ORDER BY count DESC;" --table
    
    # Recent registrations
    echo ""
    echo "Recent Registrations (Last 30 days):"
    local recent_registrations=$($mysql_cmd -sN -e "SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);")
    echo "$recent_registrations users"
    
    # Active users (logged in last 30 days)
    echo ""
    echo "Active Users (Last 30 days):"
    local active_users=$($mysql_cmd -sN -e "SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);" 2>/dev/null || echo "N/A")
    echo "$active_users users"
}

# Main function
main() {
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
    
    # Execute command
    case "$COMMAND" in
        "create")
            create_user
            ;;
        "update")
            update_user
            ;;
        "delete")
            delete_user
            ;;
        "list")
            list_users
            ;;
        "show")
            show_user
            ;;
        "audit")
            show_audit_log
            ;;
        "stats")
            show_user_stats
            ;;
        *)
            log_error "Command not implemented yet: $COMMAND"
            log_info "Available commands: create, update, delete, list, show, audit, stats"
            exit 1
            ;;
    esac
}

# Run main function
main
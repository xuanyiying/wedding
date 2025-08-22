#!/bin/bash

# Wedding Club Production Deployment Script
# This script automates the deployment process for the Wedding Club application

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
SKIP_HEALTH_CHECK="${SKIP_HEALTH_CHECK:-false}"
FORCE_DEPLOY="${FORCE_DEPLOY:-false}"
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
Wedding Club Production Deployment Script

Usage: $0 [OPTIONS]

Options:
    -e, --env ENV           Deployment environment (default: production)
    -s, --skip-backup       Skip backup creation
    -h, --skip-health       Skip health checks
    -f, --force             Force deployment even if health checks fail
    -v, --verbose           Enable verbose output
    --help                  Show this help message

Environment Variables:
    DEPLOY_ENV              Deployment environment
    SKIP_BACKUP             Skip backup creation (true/false)
    SKIP_HEALTH_CHECK       Skip health checks (true/false)
    FORCE_DEPLOY            Force deployment (true/false)
    VERBOSE                 Enable verbose output (true/false)

Examples:
    $0                      # Deploy to production with default settings
    $0 -e staging           # Deploy to staging environment
    $0 -f -v                # Force deploy with verbose output
    $0 --skip-backup        # Deploy without creating backup

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            DEPLOY_ENV="$2"
            shift 2
            ;;
        -s|--skip-backup)
            SKIP_BACKUP="true"
            shift
            ;;
        -h|--skip-health)
            SKIP_HEALTH_CHECK="true"
            shift
            ;;
        -f|--force)
            FORCE_DEPLOY="true"
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
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
validate_environment() {
    log_info "Validating deployment environment: $DEPLOY_ENV"
    
    case $DEPLOY_ENV in
        production|staging)
            log_verbose "Environment '$DEPLOY_ENV' is valid"
            ;;
        *)
            log_error "Invalid environment: $DEPLOY_ENV. Must be 'production' or 'staging'"
            exit 1
            ;;
    esac
    
    # Check required files
    local compose_file="docker-compose.${DEPLOY_ENV}.yml"
    if [[ ! -f "$PROJECT_ROOT/$compose_file" ]]; then
        log_error "Docker compose file not found: $compose_file"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running or not accessible"
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "docker-compose is not installed or not in PATH"
        exit 1
    fi
    
    log_success "Environment validation completed"
}

# Create backup
create_backup() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        log_warning "Skipping backup creation"
        return 0
    fi
    
    log_info "Creating deployment backup"
    
    local backup_dir="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)_${DEPLOY_ENV}"
    mkdir -p "$backup_dir"
    
    # Backup current configuration
    local compose_file="docker-compose.${DEPLOY_ENV}.yml"
    if [[ -f "$PROJECT_ROOT/$compose_file" ]]; then
        cp "$PROJECT_ROOT/$compose_file" "$backup_dir/docker-compose.yml"
        log_verbose "Backed up Docker compose configuration"
    fi
    
    # Backup environment files
    if [[ -f "$PROJECT_ROOT/.env.${DEPLOY_ENV}" ]]; then
        cp "$PROJECT_ROOT/.env.${DEPLOY_ENV}" "$backup_dir/.env"
        log_verbose "Backed up environment configuration"
    fi
    
    # Get current container status
    docker-compose -f "$PROJECT_ROOT/$compose_file" ps > "$backup_dir/containers.txt" 2>/dev/null || true
    
    # Get current images
    docker images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}" | grep wedding > "$backup_dir/images.txt" || true
    
    # Create deployment info
    cat > "$backup_dir/deployment_info.txt" << EOF
Deployment Backup Information
============================
Environment: $DEPLOY_ENV
Backup Created: $(date)
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo 'N/A')
Git Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'N/A')
Deployed By: $(whoami)
Host: $(hostname)
EOF
    
    log_success "Backup created at: $backup_dir"
    echo "$backup_dir" > "$PROJECT_ROOT/.last_backup"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks"
    
    # Check disk space
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        log_error "Insufficient disk space. Available: ${available_space}KB, Required: ${required_space}KB"
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            exit 1
        else
            log_warning "Continuing deployment despite insufficient disk space (forced)"
        fi
    fi
    
    # Check if ports are available
    local ports=("80" "443" "3000" "8080")
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_verbose "Port $port is in use (expected for running services)"
        fi
    done
    
    # Validate Docker images exist
    local compose_file="docker-compose.${DEPLOY_ENV}.yml"
    log_verbose "Checking if required Docker images are available"
    
    # This would typically check if the images specified in docker-compose exist
    # For now, we'll just validate the compose file syntax
    if ! docker-compose -f "$PROJECT_ROOT/$compose_file" config >/dev/null 2>&1; then
        log_error "Docker compose configuration is invalid"
        exit 1
    fi
    
    log_success "Pre-deployment checks completed"
}

# Deploy application
deploy_application() {
    log_info "Starting application deployment"
    
    local compose_file="docker-compose.${DEPLOY_ENV}.yml"
    cd "$PROJECT_ROOT"
    
    # Pull latest images
    log_info "Pulling latest Docker images"
    if ! docker-compose -f "$compose_file" pull; then
        log_error "Failed to pull Docker images"
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            exit 1
        else
            log_warning "Continuing deployment despite image pull failure (forced)"
        fi
    fi
    
    # Stop existing services
    log_info "Stopping existing services"
    docker-compose -f "$compose_file" down --remove-orphans || true
    
    # Start services
    log_info "Starting services"
    if ! docker-compose -f "$compose_file" up -d; then
        log_error "Failed to start services"
        
        # Attempt rollback if backup exists
        if [[ -f "$PROJECT_ROOT/.last_backup" ]]; then
            local backup_dir=$(cat "$PROJECT_ROOT/.last_backup")
            log_warning "Attempting automatic rollback to: $backup_dir"
            
            if [[ -f "$backup_dir/docker-compose.yml" ]]; then
                cp "$backup_dir/docker-compose.yml" "$PROJECT_ROOT/$compose_file"
                docker-compose -f "$compose_file" up -d || true
                log_warning "Rollback attempted. Please verify service status manually."
            fi
        fi
        
        exit 1
    fi
    
    log_success "Application deployment completed"
}

# Health checks
run_health_checks() {
    if [[ "$SKIP_HEALTH_CHECK" == "true" ]]; then
        log_warning "Skipping health checks"
        return 0
    fi
    
    log_info "Running health checks"
    
    local max_attempts=10
    local attempt=1
    local health_passed=false
    
    # Wait for services to start
    log_info "Waiting for services to initialize..."
    sleep 30
    
    while [[ $attempt -le $max_attempts ]]; do
        log_verbose "Health check attempt $attempt/$max_attempts"
        
        local all_healthy=true
        
        # Check web frontend
        if ! curl -f -m 10 http://localhost:8080/health >/dev/null 2>&1; then
            log_verbose "Frontend health check failed"
            all_healthy=false
        fi
        
        # Check API backend
        if ! curl -f -m 10 http://localhost:3000/api/v1/health >/dev/null 2>&1; then
            log_verbose "API health check failed"
            all_healthy=false
        fi
        
        # Check database connectivity (through API)
        if ! curl -f -m 10 http://localhost:3000/api/v1/health/db >/dev/null 2>&1; then
            log_verbose "Database connectivity check failed"
            all_healthy=false
        fi
        
        if [[ "$all_healthy" == "true" ]]; then
            health_passed=true
            break
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log_verbose "Health check failed, waiting 30 seconds before retry..."
            sleep 30
        fi
        
        ((attempt++))
    done
    
    if [[ "$health_passed" == "true" ]]; then
        log_success "All health checks passed"
    else
        log_error "Health checks failed after $max_attempts attempts"
        
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            # Show service logs for debugging
            log_info "Showing recent service logs for debugging:"
            docker-compose -f "docker-compose.${DEPLOY_ENV}.yml" logs --tail=20
            exit 1
        else
            log_warning "Continuing despite health check failures (forced)"
        fi
    fi
}

# Post-deployment tasks
post_deployment_tasks() {
    log_info "Running post-deployment tasks"
    
    # Clean up old Docker images
    log_info "Cleaning up old Docker images"
    docker image prune -f >/dev/null 2>&1 || true
    
    # Clean up old backups (keep last 10)
    if [[ -d "$PROJECT_ROOT/backups" ]]; then
        log_info "Cleaning up old backups"
        cd "$PROJECT_ROOT/backups"
        ls -t | tail -n +11 | xargs -r rm -rf
    fi
    
    # Update deployment record
    local deployment_record="$PROJECT_ROOT/.deployment_history"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $DEPLOY_ENV - $(git rev-parse HEAD 2>/dev/null || echo 'N/A') - $(whoami)" >> "$deployment_record"
    
    # Show deployment summary
    log_info "Deployment Summary:"
    echo "  Environment: $DEPLOY_ENV"
    echo "  Deployed at: $(date)"
    echo "  Git commit: $(git rev-parse HEAD 2>/dev/null || echo 'N/A')"
    echo "  Deployed by: $(whoami)"
    
    # Show running services
    log_info "Running services:"
    docker-compose -f "docker-compose.${DEPLOY_ENV}.yml" ps
    
    log_success "Post-deployment tasks completed"
}

# Main deployment function
main() {
    log_info "Starting Wedding Club deployment to $DEPLOY_ENV environment"
    log_info "Deployment started at: $(date)"
    
    # Trap to ensure cleanup on exit
    trap 'log_error "Deployment interrupted"; exit 1' INT TERM
    
    validate_environment
    create_backup
    pre_deployment_checks
    deploy_application
    run_health_checks
    post_deployment_tasks
    
    log_success "🎉 Wedding Club deployment to $DEPLOY_ENV completed successfully!"
    
    if [[ "$DEPLOY_ENV" == "production" ]]; then
        log_info "Production URL: https://wedding.example.com"
    else
        log_info "Staging URL: https://staging.wedding.example.com"
    fi
}

# Run main function
main "$@"
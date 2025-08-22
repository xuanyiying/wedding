#!/bin/bash

# Wedding Club Container Management Script
# This script provides comprehensive Docker container management for the Wedding Club application

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
LOGS_DIR="$PROJECT_ROOT/logs"
BACKUP_DIR="$PROJECT_ROOT/container-backups"
MONITORING_DIR="$PROJECT_ROOT/monitoring"
VERBOSE="${VERBOSE:-false}"
FORCE="${FORCE:-false}"
DRY_RUN="${DRY_RUN:-false}"
ENVIRONMENT="${ENVIRONMENT:-development}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-30}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-3}"
CONTAINER_RESTART_POLICY="${CONTAINER_RESTART_POLICY:-unless-stopped}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Service definitions
declare -A SERVICES=(
    ["frontend"]="wedding-frontend"
    ["backend"]="wedding-backend"
    ["database"]="wedding-mysql"
    ["redis"]="wedding-redis"
    ["nginx"]="wedding-nginx"
    ["minio"]="wedding-minio"
    ["prometheus"]="wedding-prometheus"
    ["grafana"]="wedding-grafana"
)

# Port mappings
declare -A SERVICE_PORTS=(
    ["frontend"]="3000"
    ["backend"]="5000"
    ["database"]="3306"
    ["redis"]="6379"
    ["nginx"]="80,443"
    ["minio"]="9000,9001"
    ["prometheus"]="9090"
    ["grafana"]="3001"
)

# Health check endpoints
declare -A HEALTH_ENDPOINTS=(
    ["frontend"]="http://localhost:3000/health"
    ["backend"]="http://localhost:5000/health"
    ["nginx"]="http://localhost/health"
    ["minio"]="http://localhost:9000/minio/health/live"
    ["prometheus"]="http://localhost:9090/-/healthy"
    ["grafana"]="http://localhost:3001/api/health"
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
Wedding Club Container Management Script

Usage: $0 [OPTIONS] [COMMAND] [ARGS...]

Commands:
    start [SERVICE]             Start containers (all or specific service)
    stop [SERVICE]              Stop containers (all or specific service)
    restart [SERVICE]           Restart containers (all or specific service)
    status [SERVICE]            Show container status
    logs [SERVICE] [LINES]      Show container logs
    exec [SERVICE] [COMMAND]    Execute command in container
    shell [SERVICE]             Open shell in container
    build [SERVICE]             Build container images
    pull [SERVICE]              Pull latest container images
    push [SERVICE]              Push container images to registry
    clean                       Clean up unused containers and images
    prune                       Remove all unused Docker resources
    backup [SERVICE]            Backup container data
    restore [SERVICE] [BACKUP]  Restore container data from backup
    scale [SERVICE] [COUNT]     Scale service to specified replica count
    update [SERVICE]            Update service to latest version
    health [SERVICE]            Check container health
    monitor                     Start monitoring dashboard
    stats [SERVICE]             Show container resource usage
    inspect [SERVICE]           Inspect container configuration
    network [ACTION]            Manage Docker networks
    volume [ACTION]             Manage Docker volumes
    registry [ACTION]           Manage container registry
    compose [ACTION]            Docker Compose operations
    swarm [ACTION]              Docker Swarm operations
    security [ACTION]           Security scanning and management
    migrate [FROM] [TO]         Migrate containers between environments
    rollback [SERVICE]          Rollback service to previous version
    deploy [ENVIRONMENT]        Deploy to specific environment
    undeploy [ENVIRONMENT]      Remove deployment from environment

Network Actions:
    create [NAME]               Create Docker network
    remove [NAME]               Remove Docker network
    list                        List Docker networks
    inspect [NAME]              Inspect Docker network
    connect [NETWORK] [CONTAINER] Connect container to network
    disconnect [NETWORK] [CONTAINER] Disconnect container from network

Volume Actions:
    create [NAME]               Create Docker volume
    remove [NAME]               Remove Docker volume
    list                        List Docker volumes
    inspect [NAME]              Inspect Docker volume
    backup [NAME]               Backup Docker volume
    restore [NAME] [BACKUP]     Restore Docker volume

Registry Actions:
    login [REGISTRY]            Login to container registry
    logout [REGISTRY]           Logout from container registry
    tag [IMAGE] [TAG]           Tag container image
    push [IMAGE]                Push image to registry
    pull [IMAGE]                Pull image from registry
    list [REGISTRY]             List images in registry

Compose Actions:
    up                          Start services with docker-compose
    down                        Stop services with docker-compose
    build                       Build services with docker-compose
    pull                        Pull services with docker-compose
    logs                        Show logs with docker-compose
    ps                          List services with docker-compose
    config                      Validate docker-compose configuration

Swarm Actions:
    init                        Initialize Docker Swarm
    join [TOKEN] [MANAGER]      Join Docker Swarm
    leave                       Leave Docker Swarm
    deploy [STACK]              Deploy stack to Swarm
    remove [STACK]              Remove stack from Swarm
    services                    List Swarm services
    nodes                       List Swarm nodes

Security Actions:
    scan [IMAGE]                Scan image for vulnerabilities
    sign [IMAGE]                Sign container image
    verify [IMAGE]              Verify container image signature
    policy [ACTION]             Manage security policies
    secrets [ACTION]            Manage Docker secrets
    configs [ACTION]            Manage Docker configs

Options:
    -e, --env ENVIRONMENT       Target environment (default: development)
    --compose-file FILE         Docker Compose file (default: docker-compose.yml)
    --logs-dir DIR              Logs directory (default: ./logs)
    --backup-dir DIR            Backup directory (default: ./container-backups)
    --health-timeout SECONDS    Health check timeout (default: 30)
    --health-retries COUNT      Health check retries (default: 3)
    --restart-policy POLICY     Container restart policy (default: unless-stopped)
    --force                     Force operation without confirmation
    --dry-run                   Show what would be done without executing
    -v, --verbose               Enable verbose output
    --help                      Show this help message

Examples:
    $0 start                                    # Start all services
    $0 start frontend                           # Start frontend service only
    $0 logs backend 100                         # Show last 100 lines of backend logs
    $0 exec backend "npm run test"              # Run tests in backend container
    $0 shell database                           # Open MySQL shell
    $0 scale frontend 3                         # Scale frontend to 3 replicas
    $0 health                                   # Check health of all services
    $0 backup database                          # Backup database data
    $0 clean --force                            # Clean up without confirmation
    $0 deploy production                        # Deploy to production environment
    $0 security scan wedding-backend:latest     # Scan backend image for vulnerabilities

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
        --compose-file)
            DOCKER_COMPOSE_FILE="$2"
            shift 2
            ;;
        --logs-dir)
            LOGS_DIR="$2"
            shift 2
            ;;
        --backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        --health-timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        --health-retries)
            HEALTH_CHECK_RETRIES="$2"
            shift 2
            ;;
        --restart-policy)
            CONTAINER_RESTART_POLICY="$2"
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
        start|stop|restart|status|logs|exec|shell|build|pull|push|clean|prune|backup|restore|scale|update|health|monitor|stats|inspect|network|volume|registry|compose|swarm|security|migrate|rollback|deploy|undeploy)
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
mkdir -p "$LOGS_DIR" "$BACKUP_DIR" "$MONITORING_DIR"

# Utility functions
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker is not installed or not in PATH"
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        return 1
    fi
    
    return 0
}

check_docker_compose() {
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        log_error "Docker Compose is not installed or not in PATH"
        return 1
    fi
    
    return 0
}

get_compose_command() {
    if command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
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

is_service_running() {
    local service="$1"
    local container_name="${SERVICES[$service]:-$service}"
    
    if docker ps --format "table {{.Names}}" | grep -q "^$container_name$"; then
        return 0
    else
        return 1
    fi
}

wait_for_service() {
    local service="$1"
    local timeout="${2:-$HEALTH_CHECK_TIMEOUT}"
    local retries="${3:-$HEALTH_CHECK_RETRIES}"
    
    log_info "Waiting for service: $service"
    
    for ((i=1; i<=retries; i++)); do
        if check_service_health "$service"; then
            log_success "Service $service is healthy"
            return 0
        fi
        
        if [[ $i -lt $retries ]]; then
            log_verbose "Health check attempt $i/$retries failed, retrying in ${timeout}s..."
            sleep "$timeout"
        fi
    done
    
    log_error "Service $service failed health check after $retries attempts"
    return 1
}

check_service_health() {
    local service="$1"
    local container_name="${SERVICES[$service]:-$service}"
    local health_endpoint="${HEALTH_ENDPOINTS[$service]:-}"
    
    # Check if container is running
    if ! is_service_running "$service"; then
        log_verbose "Container $container_name is not running"
        return 1
    fi
    
    # Check container health status
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
    if [[ "$health_status" == "healthy" ]]; then
        return 0
    elif [[ "$health_status" == "unhealthy" ]]; then
        return 1
    fi
    
    # Check HTTP endpoint if available
    if [[ -n "$health_endpoint" ]]; then
        if command -v curl >/dev/null 2>&1; then
            if curl -f -s --max-time 10 "$health_endpoint" >/dev/null 2>&1; then
                return 0
            fi
        fi
    fi
    
    # Check if container is responsive
    if docker exec "$container_name" echo "health check" >/dev/null 2>&1; then
        return 0
    fi
    
    return 1
}

# Start containers
start_containers() {
    local service="${ARGS[0]:-}"
    local compose_cmd=$(get_compose_command)
    
    if ! check_docker || ! check_docker_compose; then
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        if [[ -n "$service" ]]; then
            log_info "Would start service: $service"
        else
            log_info "Would start all services"
        fi
        return 0
    fi
    
    log_info "Starting containers..."
    
    if [[ -n "$service" ]]; then
        log_info "Starting service: $service"
        $compose_cmd -f "$DOCKER_COMPOSE_FILE" up -d "$service"
        
        # Wait for service to be healthy
        if [[ -n "${SERVICES[$service]:-}" ]]; then
            wait_for_service "$service"
        fi
    else
        log_info "Starting all services"
        $compose_cmd -f "$DOCKER_COMPOSE_FILE" up -d
        
        # Wait for all services to be healthy
        for service_name in "${!SERVICES[@]}"; do
            wait_for_service "$service_name" &
        done
        wait
    fi
    
    log_success "Containers started successfully"
}

# Stop containers
stop_containers() {
    local service="${ARGS[0]:-}"
    local compose_cmd=$(get_compose_command)
    
    if ! check_docker || ! check_docker_compose; then
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        if [[ -n "$service" ]]; then
            log_info "Would stop service: $service"
        else
            log_info "Would stop all services"
        fi
        return 0
    fi
    
    log_info "Stopping containers..."
    
    if [[ -n "$service" ]]; then
        log_info "Stopping service: $service"
        $compose_cmd -f "$DOCKER_COMPOSE_FILE" stop "$service"
    else
        log_info "Stopping all services"
        $compose_cmd -f "$DOCKER_COMPOSE_FILE" stop
    fi
    
    log_success "Containers stopped successfully"
}

# Restart containers
restart_containers() {
    local service="${ARGS[0]:-}"
    
    log_info "Restarting containers..."
    
    stop_containers "$service"
    sleep 2
    start_containers "$service"
    
    log_success "Containers restarted successfully"
}

# Show container status
show_status() {
    local service="${ARGS[0]:-}"
    local compose_cmd=$(get_compose_command)
    
    if ! check_docker || ! check_docker_compose; then
        return 1
    fi
    
    log_info "Container Status"
    echo
    
    if [[ -n "$service" ]]; then
        $compose_cmd -f "$DOCKER_COMPOSE_FILE" ps "$service"
    else
        $compose_cmd -f "$DOCKER_COMPOSE_FILE" ps
    fi
    
    echo
    log_info "Docker System Information"
    docker system df
}

# Show container logs
show_logs() {
    local service="${ARGS[0]:-}"
    local lines="${ARGS[1]:-100}"
    local compose_cmd=$(get_compose_command)
    
    if ! check_docker || ! check_docker_compose; then
        return 1
    fi
    
    if [[ -z "$service" ]]; then
        log_error "Service name required for logs command"
        return 1
    fi
    
    log_info "Showing logs for service: $service (last $lines lines)"
    
    $compose_cmd -f "$DOCKER_COMPOSE_FILE" logs --tail="$lines" -f "$service"
}

# Execute command in container
exec_command() {
    local service="${ARGS[0]:-}"
    local command="${ARGS[1]:-bash}"
    local container_name="${SERVICES[$service]:-$service}"
    
    if ! check_docker; then
        return 1
    fi
    
    if [[ -z "$service" ]]; then
        log_error "Service name required for exec command"
        return 1
    fi
    
    if ! is_service_running "$service"; then
        log_error "Service $service is not running"
        return 1
    fi
    
    log_info "Executing command in $service: $command"
    
    docker exec -it "$container_name" $command
}

# Open shell in container
open_shell() {
    local service="${ARGS[0]:-}"
    
    if [[ -z "$service" ]]; then
        log_error "Service name required for shell command"
        return 1
    fi
    
    # Try different shells
    local shells=("bash" "sh" "zsh")
    for shell in "${shells[@]}"; do
        if exec_command "$service" "$shell"; then
            return 0
        fi
    done
    
    log_error "Could not open shell in service: $service"
    return 1
}

# Build container images
build_images() {
    local service="${ARGS[0]:-}"
    local compose_cmd=$(get_compose_command)
    
    if ! check_docker || ! check_docker_compose; then
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        if [[ -n "$service" ]]; then
            log_info "Would build service: $service"
        else
            log_info "Would build all services"
        fi
        return 0
    fi
    
    log_info "Building container images..."
    
    if [[ -n "$service" ]]; then
        log_info "Building service: $service"
        $compose_cmd -f "$DOCKER_COMPOSE_FILE" build "$service"
    else
        log_info "Building all services"
        $compose_cmd -f "$DOCKER_COMPOSE_FILE" build
    fi
    
    log_success "Container images built successfully"
}

# Pull container images
pull_images() {
    local service="${ARGS[0]:-}"
    local compose_cmd=$(get_compose_command)
    
    if ! check_docker || ! check_docker_compose; then
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        if [[ -n "$service" ]]; then
            log_info "Would pull service: $service"
        else
            log_info "Would pull all services"
        fi
        return 0
    fi
    
    log_info "Pulling container images..."
    
    if [[ -n "$service" ]]; then
        log_info "Pulling service: $service"
        $compose_cmd -f "$DOCKER_COMPOSE_FILE" pull "$service"
    else
        log_info "Pulling all services"
        $compose_cmd -f "$DOCKER_COMPOSE_FILE" pull
    fi
    
    log_success "Container images pulled successfully"
}

# Clean up containers and images
clean_containers() {
    if ! check_docker; then
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would clean up unused containers and images"
        return 0
    fi
    
    if ! confirm_action "Clean up unused containers and images?"; then
        log_info "Cleanup cancelled"
        return 0
    fi
    
    log_info "Cleaning up unused containers and images..."
    
    # Remove stopped containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused networks
    docker network prune -f
    
    # Remove unused volumes (with confirmation)
    if confirm_action "Also remove unused volumes?"; then
        docker volume prune -f
    fi
    
    log_success "Cleanup completed"
}

# Prune all Docker resources
prune_docker() {
    if ! check_docker; then
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would prune all unused Docker resources"
        return 0
    fi
    
    if ! confirm_action "Remove ALL unused Docker resources (containers, images, networks, volumes)?"; then
        log_info "Prune cancelled"
        return 0
    fi
    
    log_info "Pruning all unused Docker resources..."
    
    docker system prune -a -f --volumes
    
    log_success "Docker system pruned"
}

# Check container health
check_health() {
    local service="${ARGS[0]:-}"
    
    if ! check_docker; then
        return 1
    fi
    
    log_info "Checking container health..."
    
    local overall_health=0
    
    if [[ -n "$service" ]]; then
        if check_service_health "$service"; then
            log_success "Service $service is healthy"
        else
            log_error "Service $service is unhealthy"
            overall_health=1
        fi
    else
        for service_name in "${!SERVICES[@]}"; do
            if check_service_health "$service_name"; then
                log_success "Service $service_name is healthy"
            else
                log_error "Service $service_name is unhealthy"
                overall_health=1
            fi
        done
    fi
    
    if [[ $overall_health -eq 0 ]]; then
        log_success "All services are healthy"
    else
        log_error "Some services are unhealthy"
    fi
    
    return $overall_health
}

# Show container statistics
show_stats() {
    local service="${ARGS[0]:-}"
    
    if ! check_docker; then
        return 1
    fi
    
    log_info "Container Resource Usage"
    
    if [[ -n "$service" ]]; then
        local container_name="${SERVICES[$service]:-$service}"
        docker stats --no-stream "$container_name"
    else
        docker stats --no-stream
    fi
}

# Scale service
scale_service() {
    local service="${ARGS[0]:-}"
    local count="${ARGS[1]:-1}"
    local compose_cmd=$(get_compose_command)
    
    if ! check_docker || ! check_docker_compose; then
        return 1
    fi
    
    if [[ -z "$service" ]]; then
        log_error "Service name required for scale command"
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would scale service $service to $count replicas"
        return 0
    fi
    
    log_info "Scaling service $service to $count replicas..."
    
    $compose_cmd -f "$DOCKER_COMPOSE_FILE" up -d --scale "$service=$count" "$service"
    
    log_success "Service $service scaled to $count replicas"
}

# Main function
main() {
    if [[ -z "$COMMAND" ]]; then
        show_help
        exit 1
    fi
    
    case "$COMMAND" in
        "start")
            start_containers
            ;;
        "stop")
            stop_containers
            ;;
        "restart")
            restart_containers
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "exec")
            exec_command
            ;;
        "shell")
            open_shell
            ;;
        "build")
            build_images
            ;;
        "pull")
            pull_images
            ;;
        "clean")
            clean_containers
            ;;
        "prune")
            prune_docker
            ;;
        "health")
            check_health
            ;;
        "stats")
            show_stats
            ;;
        "scale")
            scale_service
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
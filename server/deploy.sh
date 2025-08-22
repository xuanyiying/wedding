#!/bin/bash

# Wedding Club Server Deployment Script
# This script handles deployment to various environments with Node.js runtime support

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
ENVIRONMENT="production"
DEPLOY_PATH="/opt/wedding-club"
SERVICE_NAME="wedding-club-server"
USER="www-data"
RESTART_SERVICE=true
BACKUP_PREVIOUS=true

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -e, --env ENVIRONMENT     Target environment (production, staging, development) [default: production]"
    echo "  -p, --path PATH          Deployment path [default: /opt/wedding-club]"
    echo "  -u, --user USER          Service user [default: www-data]"
    echo "  -s, --service SERVICE    Service name [default: wedding-club-server]"
    echo "  --no-restart             Don't restart service after deployment"
    echo "  --no-backup              Don't backup previous deployment"
    echo "  --local                  Deploy to local environment"
    echo "  --remote HOST            Deploy to remote host via SSH"
    echo "  -h, --help               Show this help message"
    echo
    echo "Examples:"
    echo "  $0                                    # Deploy to local production"
    echo "  $0 --env staging --path /opt/staging  # Deploy to staging environment"
    echo "  $0 --remote user@server.com          # Deploy to remote server"
    echo "  $0 --local --no-restart              # Local deployment without service restart"
}

# Parse command line arguments
REMOTE_HOST=""
LOCAL_DEPLOY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -p|--path)
            DEPLOY_PATH="$2"
            shift 2
            ;;
        -u|--user)
            USER="$2"
            shift 2
            ;;
        -s|--service)
            SERVICE_NAME="$2"
            shift 2
            ;;
        --no-restart)
            RESTART_SERVICE=false
            shift
            ;;
        --no-backup)
            BACKUP_PREVIOUS=false
            shift
            ;;
        --local)
            LOCAL_DEPLOY=true
            shift
            ;;
        --remote)
            REMOTE_HOST="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_status "Starting Wedding Club Server deployment..."
print_status "Environment: $ENVIRONMENT"
print_status "Deploy path: $DEPLOY_PATH"
print_status "Service user: $USER"

# Check if build exists
if [ ! -d "dist" ]; then
    print_error "Build directory 'dist' not found. Please run build.sh first."
    exit 1
fi

# Function to deploy locally
deploy_local() {
    print_status "Deploying to local environment..."
    
    # Create deployment directory
    if [ ! -d "$DEPLOY_PATH" ]; then
        print_status "Creating deployment directory: $DEPLOY_PATH"
        sudo mkdir -p "$DEPLOY_PATH"
        sudo chown "$USER:$USER" "$DEPLOY_PATH"
    fi
    
    # Backup previous deployment
    if [ "$BACKUP_PREVIOUS" = true ] && [ -d "$DEPLOY_PATH/current" ]; then
        print_status "Backing up previous deployment..."
        BACKUP_DIR="$DEPLOY_PATH/backup-$(date +%Y%m%d-%H%M%S)"
        sudo mv "$DEPLOY_PATH/current" "$BACKUP_DIR"
        print_success "Previous deployment backed up to: $BACKUP_DIR"
        
        # Keep only last 5 backups
        print_status "Cleaning old backups (keeping last 5)..."
        sudo find "$DEPLOY_PATH" -name "backup-*" -type d | sort -r | tail -n +6 | sudo xargs rm -rf
    fi
    
    # Copy new deployment
    print_status "Copying new deployment files..."
    sudo cp -r dist "$DEPLOY_PATH/current"
    sudo chown -R "$USER:$USER" "$DEPLOY_PATH/current"
    
    # Copy environment-specific configuration
    copy_environment_config "$DEPLOY_PATH/current"
    
    # Set up systemd service if it doesn't exist
    setup_systemd_service
    
    # Restart service if requested
    if [ "$RESTART_SERVICE" = true ]; then
        restart_service
    fi
}

# Function to deploy to remote host
deploy_remote() {
    print_status "Deploying to remote host: $REMOTE_HOST"
    
    # Check if SSH connection works
    if ! ssh -o ConnectTimeout=10 "$REMOTE_HOST" "echo 'SSH connection successful'"; then
        print_error "Failed to connect to remote host: $REMOTE_HOST"
        exit 1
    fi
    
    # Create deployment archive
    print_status "Creating deployment archive..."
    ARCHIVE_NAME="wedding-club-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$ARCHIVE_NAME" -C dist .
    
    # Copy archive to remote host
    print_status "Copying deployment archive to remote host..."
    scp "$ARCHIVE_NAME" "$REMOTE_HOST:/tmp/"
    
    # Copy this deployment script to remote host
    scp "$0" "$REMOTE_HOST:/tmp/deploy-remote.sh"
    
    # Execute deployment on remote host
    print_status "Executing deployment on remote host..."
    ssh "$REMOTE_HOST" << EOF
set -e

# Extract archive
cd /tmp
tar -xzf "$ARCHIVE_NAME"

# Run deployment script
chmod +x deploy-remote.sh
sudo ./deploy-remote.sh --local --env "$ENVIRONMENT" --path "$DEPLOY_PATH" --user "$USER" --service "$SERVICE_NAME" $([ "$RESTART_SERVICE" = false ] && echo "--no-restart") $([ "$BACKUP_PREVIOUS" = false ] && echo "--no-backup")

# Cleanup
rm -f "$ARCHIVE_NAME" deploy-remote.sh
EOF
    
    # Cleanup local archive
    rm -f "$ARCHIVE_NAME"
}

# Function to copy environment-specific configuration
copy_environment_config() {
    local target_dir="$1"
    
    print_status "Setting up environment configuration for: $ENVIRONMENT"
    
    # Copy environment-specific .env file if it exists
    if [ -f ".env.$ENVIRONMENT" ]; then
        sudo cp ".env.$ENVIRONMENT" "$target_dir/.env"
        print_status "Copied .env.$ENVIRONMENT to .env"
    elif [ -f ".env.example" ]; then
        sudo cp ".env.example" "$target_dir/.env"
        print_warning "No .env.$ENVIRONMENT found, using .env.example"
        print_warning "Please update $target_dir/.env with correct values"
    else
        print_warning "No environment configuration found"
    fi
    
    # Set correct permissions
    sudo chmod 600 "$target_dir/.env" 2>/dev/null || true
    
    # Copy PM2 ecosystem file if it exists
    if [ -f "ecosystem.$ENVIRONMENT.config.js" ]; then
        sudo cp "ecosystem.$ENVIRONMENT.config.js" "$target_dir/ecosystem.config.js"
        print_status "Copied ecosystem.$ENVIRONMENT.config.js"
    fi
}

# Function to set up systemd service
setup_systemd_service() {
    local service_file="/etc/systemd/system/$SERVICE_NAME.service"
    
    if [ ! -f "$service_file" ]; then
        print_status "Creating systemd service: $SERVICE_NAME"
        
        sudo tee "$service_file" > /dev/null << EOF
[Unit]
Description=Wedding Club Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DEPLOY_PATH/current
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=$ENVIRONMENT
EnvironmentFile=$DEPLOY_PATH/current/.env

# Logging
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$SERVICE_NAME

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DEPLOY_PATH

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable "$SERVICE_NAME"
        print_success "Systemd service created and enabled"
    else
        print_status "Systemd service already exists"
    fi
}

# Function to restart service
restart_service() {
    print_status "Restarting service: $SERVICE_NAME"
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        sudo systemctl restart "$SERVICE_NAME"
        print_status "Service restarted"
    else
        sudo systemctl start "$SERVICE_NAME"
        print_status "Service started"
    fi
    
    # Wait a moment and check service status
    sleep 3
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_success "Service is running successfully"
    else
        print_error "Service failed to start. Check logs with: journalctl -u $SERVICE_NAME"
        exit 1
    fi
}

# Function to show deployment status
show_deployment_status() {
    print_success "Deployment completed successfully!"
    echo
    echo "Deployment Summary:"
    echo "  - Environment: $ENVIRONMENT"
    echo "  - Deploy path: $DEPLOY_PATH/current"
    echo "  - Service name: $SERVICE_NAME"
    echo "  - Service user: $USER"
    echo "  - Deploy time: $(date)"
    echo
    echo "Useful commands:"
    echo "  - Check service status: systemctl status $SERVICE_NAME"
    echo "  - View service logs: journalctl -u $SERVICE_NAME -f"
    echo "  - Restart service: sudo systemctl restart $SERVICE_NAME"
    echo "  - Stop service: sudo systemctl stop $SERVICE_NAME"
    echo
    
    if [ "$LOCAL_DEPLOY" = true ]; then
        echo "Application should be accessible at the configured port."
    fi
}

# Main deployment logic
if [ -n "$REMOTE_HOST" ]; then
    deploy_remote
else
    deploy_local
fi

show_deployment_status

print_success "Wedding Club Server deployment completed!"
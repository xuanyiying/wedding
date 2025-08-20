#!/bin/bash

# 腾讯云生产环境一键部署脚本
# 作者: Wedding Team
# 版本: 2.0
# 更新时间: 2025-01-20

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$SCRIPT_DIR/logs"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
LOG_FILE="$LOG_DIR/tencent-deploy-$TIMESTAMP.log"
BACKUP_DIR="$SCRIPT_DIR/backups/$TIMESTAMP"

# 加载环境变量
if [[ -f "$SCRIPT_DIR/.env.prod" ]]; then
    source "$SCRIPT_DIR/.env.prod"
else
    echo -e "${RED}错误: 未找到生产环境配置文件 .env.prod${NC}"
    exit 1
fi

# 创建必要目录
mkdir -p "$LOG_DIR" "$BACKUP_DIR"

# 日志函数
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "$*"
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    log "SUCCESS" "$*"
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    log "WARNING" "$*"
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    log "ERROR" "$*"
    echo -e "${RED}[ERROR]${NC} $*"
}

# 错误处理函数
handle_error() {
    local exit_code=$?
    local line_number=$1
    log_error "脚本在第 $line_number 行失败，退出码: $exit_code"
    log_error "部署失败，请检查日志文件: $LOG_FILE"
    cleanup_on_failure
    exit $exit_code
}

# 失败时清理函数
cleanup_on_failure() {
    log_warning "执行失败清理操作..."
    # 这里可以添加失败时的清理逻辑
}

# 设置错误陷阱
trap 'handle_error $LINENO' ERR

# 检查必要工具
check_dependencies() {
    log_info "检查依赖工具..."
    
    local missing_tools=()
    
    for tool in ssh scp docker docker-compose git; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "缺少必要工具: ${missing_tools[*]}"
        log_error "请安装缺少的工具后重试"
        exit 1
    fi
    
    log_success "所有依赖工具检查通过"
}

# 检查服务器连接
check_server_connection() {
    log_info "检查服务器连接..."
    
    if ! sshpass -p "$SSH_PASS" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "echo 'Connection test successful'" &>/dev/null; then
        log_error "无法连接到服务器 $SERVER_IP"
        log_error "请检查服务器IP、用户名和密码是否正确"
        exit 1
    fi
    
    log_success "服务器连接检查通过"
}

# 服务器环境准备
prepare_server_environment() {
    log_info "准备服务器环境..."
    
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" << 'EOF'
        # 更新系统
        apt-get update -y
        
        # 安装必要软件
        apt-get install -y curl wget git unzip
        
        # 安装Docker
        if ! command -v docker &> /dev/null; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            systemctl enable docker
            systemctl start docker
        fi
        
        # 安装Docker Compose
        if ! command -v docker-compose &> /dev/null; then
            curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi
        
        # 创建部署目录
        mkdir -p /root/wedding
        
        # 配置防火墙
        ufw allow 22
        ufw allow 80
        ufw allow 443
        ufw allow 8080
        ufw allow 3000
        ufw allow 9000
        ufw allow 9001
        ufw --force enable
EOF
    
    log_success "服务器环境准备完成"
}

# 构建Docker镜像
build_images() {
    log_info "构建Docker镜像..."
    
    cd "$PROJECT_ROOT"
    
    # 构建API镜像
    log_info "构建API镜像..."
    docker build -f server/Dockerfile -t "$API_IMAGE_NAME:$API_IMAGE_TAG" server/
    
    # 构建Web镜像
    log_info "构建Web镜像..."
    docker build -f web/Dockerfile.prod -t "$WEB_IMAGE_NAME:$WEB_IMAGE_TAG" web/
    
    log_success "Docker镜像构建完成"
}

# 保存并传输镜像
transfer_images() {
    log_info "传输Docker镜像到服务器..."
    
    local temp_dir="/tmp/wedding-images-$TIMESTAMP"
    mkdir -p "$temp_dir"
    
    # 保存镜像
    log_info "保存Docker镜像..."
    docker save "$API_IMAGE_NAME:$API_IMAGE_TAG" | gzip > "$temp_dir/api-image.tar.gz"
    docker save "$WEB_IMAGE_NAME:$WEB_IMAGE_TAG" | gzip > "$temp_dir/web-image.tar.gz"
    
    # 传输镜像到服务器
    log_info "上传镜像到服务器..."
    sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no "$temp_dir"/*.tar.gz "$SSH_USER@$SERVER_IP:/tmp/"
    
    # 在服务器上加载镜像
    log_info "在服务器上加载镜像..."
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" << EOF
        cd /tmp
        docker load < api-image.tar.gz
        docker load < web-image.tar.gz
        rm -f *.tar.gz
EOF
    
    # 清理本地临时文件
    rm -rf "$temp_dir"
    
    log_success "Docker镜像传输完成"
}

# 传输部署文件
transfer_deployment_files() {
    log_info "传输部署文件到服务器..."
    
    # 传输docker-compose文件
    sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no "$SCRIPT_DIR/docker-compose-prod.yml" "$SSH_USER@$SERVER_IP:/root/wedding/docker-compose.yml"
    
    # 传输环境变量文件
    sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no "$SCRIPT_DIR/.env.prod" "$SSH_USER@$SERVER_IP:/root/wedding/.env"
    
    # 传输nginx配置
    sshpass -p "$SSH_PASS" scp -r -o StrictHostKeyChecking=no "$SCRIPT_DIR/nginx" "$SSH_USER@$SERVER_IP:/root/wedding/"
    
    log_success "部署文件传输完成"
}

# 备份现有部署
backup_existing_deployment() {
    log_info "备份现有部署..."
    
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" << EOF
        if [[ -d "/root/wedding" ]]; then
            mkdir -p "/root/wedding-backups"
            tar -czf "/root/wedding-backups/wedding-backup-$TIMESTAMP.tar.gz" -C "/root" wedding/ 2>/dev/null || true
            echo "备份已保存到: /root/wedding-backups/wedding-backup-$TIMESTAMP.tar.gz"
        fi
EOF
    
    log_success "现有部署备份完成"
}

# 部署服务
deploy_services() {
    log_info "部署服务到生产环境..."
    
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" << 'EOF'
        cd /root/wedding
        
        # 停止现有服务
        docker-compose down --remove-orphans 2>/dev/null || true
        
        # 创建日志目录
        mkdir -p logs/{api,nginx,mysql,redis,minio}
        
        # 启动服务
        docker-compose up -d
        
        # 等待服务启动
        echo "等待服务启动..."
        sleep 30
        
        # 检查服务状态
        docker-compose ps
EOF
    
    log_success "服务部署完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "健康检查尝试 $attempt/$max_attempts"
        
        # 检查Web服务
        if curl -f -s "http://$SERVER_IP:$WEB_PORT" > /dev/null; then
            log_success "Web服务健康检查通过"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "健康检查失败，服务可能未正常启动"
            return 1
        fi
        
        sleep 10
        ((attempt++))
    done
    
    # 检查API服务
    if curl -f -s "http://$SERVER_IP:3000/health" > /dev/null; then
        log_success "API服务健康检查通过"
    else
        log_warning "API服务健康检查失败，请检查服务状态"
    fi
    
    log_success "健康检查完成"
}

# 显示部署信息
show_deployment_info() {
    log_info "部署完成！访问信息:"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}🎉 Wedding平台部署成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${BLUE}Web应用:${NC} http://$SERVER_IP:$WEB_PORT"
    echo -e "${BLUE}API服务:${NC} http://$SERVER_IP:3000"
    echo -e "${BLUE}MinIO控制台:${NC} http://$SERVER_IP:9001"
    echo -e "${BLUE}服务器IP:${NC} $SERVER_IP"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${YELLOW}MinIO登录信息:${NC}"
    echo -e "${BLUE}用户名:${NC} $MINIO_ROOT_USER"
    echo -e "${BLUE}密码:${NC} $MINIO_ROOT_PASSWORD"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${YELLOW}部署日志:${NC} $LOG_FILE"
    echo -e "${YELLOW}备份位置:${NC} /root/wedding-backups/wedding-backup-$TIMESTAMP.tar.gz"
    echo -e "${GREEN}========================================${NC}"
}

# 主函数
main() {
    log_info "开始腾讯云生产环境部署..."
    log_info "部署时间: $(date)"
    log_info "目标服务器: $SERVER_IP"
    
    check_dependencies
    check_server_connection
    prepare_server_environment
    backup_existing_deployment
    build_images
    transfer_images
    transfer_deployment_files
    deploy_services
    health_check
    show_deployment_info
    
    log_success "腾讯云生产环境部署完成！"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
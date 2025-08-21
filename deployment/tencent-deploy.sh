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
BACKUP_DIR="$SCRIPT_DIR/backups/$TIMESTAMP"

# 创建必要目录
mkdir -p "$LOG_DIR" "$BACKUP_DIR"

# 设置日志文件路径
LOG_FILE="$LOG_DIR/tencent-deploy-$TIMESTAMP.log"

# 确保日志文件可以创建
touch "$LOG_FILE" 2>/dev/null || {
    echo "警告: 无法创建日志文件 $LOG_FILE，将只输出到控制台"
    LOG_FILE="/dev/null"
}

# 加载环境变量
if [[ -f "$SCRIPT_DIR/.env.production" ]]; then
    source "$SCRIPT_DIR/.env.production"
else
    echo -e "${RED}错误: 未找到生产环境配置文件 .env.production${NC}"
    exit 1
fi

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
    
    for tool in ssh scp docker docker-compose git sshpass; do
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

# 检查配置文件
check_configuration() {
    log_info "检查配置文件..."
    
    # 检查必要的环境变量
    local required_vars=("SERVER_IP" "SSH_USER" "SSH_PASS" "WEB_PORT" "API_IMAGE_NAME" "WEB_IMAGE_NAME" "API_IMAGE_TAG" "WEB_IMAGE_TAG")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "缺少必要的环境变量: ${missing_vars[*]}"
        log_error "请检查 .env.production 文件"
        exit 1
    fi
    
    # 检查必要的文件
    local required_files=("$SCRIPT_DIR/docker-compose-production.yml" "$SCRIPT_DIR/nginx/nginx-prod.conf")
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "缺少必要文件: $file"
            exit 1
        fi
    done
    
    log_success "配置文件检查通过"
}

# SSH连接执行函数
execute_ssh_command() {
    local command="$1"
    local description="${2:-执行SSH命令}"
    local silent="${3:-false}"
    
    if [[ "$silent" != "true" ]]; then
        log_info "$description"
    fi
    
    if ! sshpass -p "$SSH_PASS" ssh -o ConnectTimeout=60 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "$command"; then
        if [[ "$silent" != "true" ]]; then
            log_error "SSH命令执行失败: $description"
        fi
        return 1
    fi
    
    return 0
}

# 检查服务器连接
check_server_connection() {
    log_info "检查服务器连接..."
    
    if ! execute_ssh_command "echo 'Connection test successful'" "测试服务器连接" "true" &>/dev/null; then
        log_error "无法连接到服务器 $SERVER_IP"
        log_error "请检查服务器IP、用户名和密码是否正确"
        exit 1
    fi
    
    log_success "服务器连接检查通过"
}

# 验证服务器环境
verify_server_environment() {
    log_info "验证服务器环境..."
    
    # 检查Docker
    if ! execute_ssh_command "docker --version" "检查Docker安装" "true" &>/dev/null; then
        log_error "Docker未正确安装或无法访问"
        return 1
    fi
    
    # 检查Docker Compose
    if ! execute_ssh_command "docker-compose --version" "检查Docker Compose安装" "true" &>/dev/null; then
        log_error "Docker Compose未正确安装或无法访问"
        return 1
    fi
    
    # 检查部署目录
    if ! execute_ssh_command "test -d \$HOME/wedding" "检查部署目录" "true" &>/dev/null; then
        log_warning "部署目录不存在，将在部署过程中创建"
    fi
    
    log_success "服务器环境验证通过"
}

# 服务器环境准备
prepare_server_environment() {
    log_info "准备服务器环境..."
    
    # 检测操作系统类型
    log_info "检测服务器操作系统类型..."
    local os_type
    if execute_ssh_command "which apt-get" "检测apt-get" "true" &>/dev/null; then
        os_type="debian"
        log_info "检测到Debian/Ubuntu系统"
    elif execute_ssh_command "which yum" "检测yum" "true" &>/dev/null; then
        os_type="rhel"
        log_info "检测到CentOS/RHEL系统"
    elif execute_ssh_command "which dnf" "检测dnf" "true" &>/dev/null; then
        os_type="fedora"
        log_info "检测到Fedora系统"
    else
        log_error "无法检测操作系统类型，请手动配置包管理器"
        return 1
    fi
    
    # 根据操作系统类型更新系统和安装基础软件
    case "$os_type" in
        "debian")
            execute_ssh_command "sudo apt-get update -y && sudo apt-get install -y curl wget git unzip" "更新系统并安装基础软件"
            ;;
        "rhel")
            execute_ssh_command "sudo yum update -y && sudo yum install -y curl wget git unzip" "更新系统并安装基础软件"
            ;;
        "fedora")
            execute_ssh_command "sudo dnf update -y && sudo dnf install -y curl wget git unzip" "更新系统并安装基础软件"
            ;;
        *)
            log_error "不支持的操作系统类型: $os_type"
            return 1
            ;;
    esac
    
    # 安装Docker
    execute_ssh_command "
        if ! command -v docker &> /dev/null; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo systemctl enable docker
            sudo systemctl start docker
            sudo usermod -aG docker \$USER
            rm -f get-docker.sh
        else
            echo 'Docker已安装，跳过安装步骤'
        fi
    " "安装Docker"
    
    # 安装Docker Compose
    execute_ssh_command "
        if ! command -v docker-compose &> /dev/null; then
            echo '安装Docker Compose...'
            sudo curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)' -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            # 创建软链接到常用路径
            sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
            echo 'Docker Compose安装完成'
        else
            echo 'Docker Compose已安装，跳过安装步骤'
        fi
        # 验证安装
        docker-compose --version
    " "安装Docker Compose"
    
    # 创建部署目录
    execute_ssh_command "mkdir -p \$HOME/wedding \$HOME/wedding-backups \$HOME/wedding/logs" "创建部署目录"
    
    # 配置防火墙
    case "$os_type" in
        "debian")
            execute_ssh_command "
                sudo ufw allow 22
                sudo ufw allow 80
                sudo ufw allow 443
                sudo ufw allow 8080
                sudo ufw allow 3000
                sudo ufw allow 9000
                sudo ufw allow 9001
                sudo ufw --force enable
            " "配置防火墙规则"
            ;;
        "rhel"|"fedora")
            execute_ssh_command "
                sudo systemctl start firewalld
                sudo systemctl enable firewalld
                sudo firewall-cmd --permanent --add-port=22/tcp
                sudo firewall-cmd --permanent --add-port=80/tcp
                sudo firewall-cmd --permanent --add-port=443/tcp
                sudo firewall-cmd --permanent --add-port=8080/tcp
                sudo firewall-cmd --permanent --add-port=3000/tcp
                sudo firewall-cmd --permanent --add-port=9000/tcp
                sudo firewall-cmd --permanent --add-port=9001/tcp
                sudo firewall-cmd --reload
            " "配置防火墙规则"
            ;;
        *)
            log_warning "未知操作系统类型，跳过防火墙配置"
            ;;
    esac
    
    log_success "服务器环境准备完成"
}

# 构建Docker镜像（在远程服务器上）
build_images() {
    log_info "在远程服务器上构建Docker镜像..."
    
    # 设置远程部署目录
    local REMOTE_DEPLOY_DIR="\$HOME/wedding"
    
    # 构建API镜像
    log_info "构建API镜像..."
    execute_ssh_command "cd $REMOTE_DEPLOY_DIR && docker build -f server/Dockerfile -t $API_IMAGE_NAME:$API_IMAGE_TAG server/" "构建API镜像"
    
    # 构建Web镜像
    log_info "构建Web镜像..."
    execute_ssh_command "cd $REMOTE_DEPLOY_DIR && docker build -f web/Dockerfile.prod -t $WEB_IMAGE_NAME:$WEB_IMAGE_TAG web/" "构建Web镜像"
    
    log_success "Docker镜像构建完成"
}

# SCP文件传输函数
transfer_file() {
    local local_path="$1"
    local remote_path="$2"
    local description="${3:-传输文件}"
    
    log_info "$description"
    
    if ! sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no -o ConnectTimeout=30 "$local_path" "$SSH_USER@$SERVER_IP:$remote_path"; then
        log_error "文件传输失败: $description"
        return 1
    fi
    
    return 0
}

# 保存并传输镜像
transfer_images() {
    log_info "传输Docker镜像到服务器..."
    
    local temp_dir="/tmp/wedding-images-$TIMESTAMP"
    mkdir -p "$temp_dir"
    
    # 保存镜像
    log_info "保存API镜像..."
    if ! docker save "$API_IMAGE_NAME:$API_IMAGE_TAG" | gzip > "$temp_dir/api-image.tar.gz"; then
        log_error "API镜像保存失败"
        rm -rf "$temp_dir"
        return 1
    fi
    
    log_info "保存Web镜像..."
    if ! docker save "$WEB_IMAGE_NAME:$WEB_IMAGE_TAG" | gzip > "$temp_dir/web-image.tar.gz"; then
        log_error "Web镜像保存失败"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # 传输镜像到服务器
    transfer_file "$temp_dir/api-image.tar.gz" "/tmp/api-image.tar.gz" "上传API镜像到服务器"
    transfer_file "$temp_dir/web-image.tar.gz" "/tmp/web-image.tar.gz" "上传Web镜像到服务器"
    
    # 在服务器上加载镜像
    execute_ssh_command "
        cd /tmp
        echo '加载API镜像...'
        docker load < api-image.tar.gz
        echo '加载Web镜像...'
        docker load < web-image.tar.gz
        echo '清理临时文件...'
        rm -f api-image.tar.gz web-image.tar.gz
        echo '镜像加载完成'
    " "在服务器上加载Docker镜像"
    
    # 清理本地临时文件
    rm -rf "$temp_dir"
    
    log_success "Docker镜像传输完成"
}

# 从Git仓库拉取项目源代码
transfer_source_code() {
    log_info "从Git仓库拉取项目源代码..."
    
    # 在服务器上克隆或更新Git仓库
    execute_ssh_command "
        cd \$HOME
        if [[ -d 'wedding/.git' ]]; then
            echo '更新现有Git仓库...'
            cd wedding
            git fetch origin
            git reset --hard origin/main
            git pull origin main
            echo 'Git仓库更新完成'
        else
            echo '克隆Git仓库...'
            rm -rf wedding
            git clone https://github.com/xuanyiying/wedding.git wedding
            cd wedding
            echo 'Git仓库克隆完成'
        fi
        echo '当前分支和提交信息:'
        git branch -v
        git log --oneline -5
        ls -la
    " "从Git仓库获取源代码"
    
    log_success "项目源代码获取完成"
}

# 传输部署文件
transfer_deployment_files() {
    log_info "传输部署文件到服务器..."
    
    # 传输docker-compose文件
    transfer_file "$SCRIPT_DIR/docker-compose-production.yml" "\$HOME/wedding/docker-compose.yml" "传输Docker Compose配置文件"
    
    # 传输环境变量文件
    transfer_file "$SCRIPT_DIR/.env.production" "\$HOME/wedding/.env" "传输环境变量配置文件"
    
    # 传输nginx配置目录
    log_info "传输Nginx配置目录"
    if ! sshpass -p "$SSH_PASS" scp -r -o StrictHostKeyChecking=no -o ConnectTimeout=30 "$SCRIPT_DIR/nginx" "$SSH_USER@$SERVER_IP:\$HOME/wedding/"; then
        log_error "Nginx配置目录传输失败"
        return 1
    fi
    
    log_success "部署文件传输完成"
}

# 备份现有部署
backup_existing_deployment() {
    log_info "备份现有部署..."
    
    execute_ssh_command "
        if [[ -d '\$HOME/wedding' ]]; then
            mkdir -p '\$HOME/wedding-backups'
            echo '正在创建备份...'
            if tar -czf '\$HOME/wedding-backups/wedding-backup-$TIMESTAMP.tar.gz' -C '\$HOME' wedding/ 2>/dev/null; then
                echo '备份已保存到: \$HOME/wedding-backups/wedding-backup-$TIMESTAMP.tar.gz'
                ls -lh '\$HOME/wedding-backups/wedding-backup-$TIMESTAMP.tar.gz'
            else
                echo '备份创建失败，但继续部署过程'
            fi
        else
            echo '未找到现有部署，跳过备份步骤'
        fi
    " "备份现有部署"
    
    log_success "现有部署备份完成"
}

# 部署服务
deploy_services() {
    log_info "部署服务到生产环境..."
    
    # 停止现有服务
    execute_ssh_command "
        cd \$HOME/wedding
        echo '停止现有服务...'
        docker-compose down --remove-orphans 2>/dev/null || true
        echo '清理未使用的Docker资源...'
        docker system prune -f 2>/dev/null || true
    " "停止现有服务"
    
    # 创建必要目录
    execute_ssh_command "
        cd \$HOME/wedding
        echo '创建日志目录...'
        mkdir -p logs/{api,nginx,mysql,redis,minio}
        mkdir -p data/{mysql,redis,minio}
        mkdir -p uploads
        echo '设置目录权限...'
        chmod -R 755 logs data uploads
    " "创建必要目录和设置权限"
    
    # 启动服务
    execute_ssh_command "
        cd \$HOME/wedding
        echo '启动Docker Compose服务...'
        docker-compose up -d
        echo '等待服务初始化...'
        sleep 30
        echo '检查服务状态:'
        docker-compose ps
        echo '检查服务日志:'
        docker-compose logs --tail=10
    " "启动Docker Compose服务"
    
    log_success "服务部署完成"
}

# 健康检查
health_check() {
    log_info "开始健康检查..."
    
    # 首先验证SSH连接
    if ! execute_ssh_command "echo 'SSH连接正常'" "验证SSH连接" "true" &>/dev/null; then
        log_error "SSH连接失败，无法进行健康检查"
        log_error "请检查服务器连接状态和网络配置"
        return 1
    fi
    
    # 检查服务是否已部署
    if ! execute_ssh_command "test -f \$HOME/wedding/docker-compose.yml" "检查部署状态" "true" &>/dev/null; then
        log_warning "服务尚未部署到服务器"
        log_info "请先运行完整部署命令: ./tencent-deploy.sh"
        return 0
    fi
    
    local max_attempts=60
    local attempt=1
    local web_healthy=false
    local api_healthy=false
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "健康检查尝试 $attempt/$max_attempts"
        
        # 检查容器状态
        local container_status
        if execute_ssh_command "test -f \$HOME/wedding/docker-compose.yml" "检查配置文件" "true" &>/dev/null; then
            if execute_ssh_command "cd \$HOME/wedding && docker-compose ps --format 'table {{.Name}}\t{{.Status}}' | grep -v 'NAME'" "检查容器状态" "true" &>/dev/null; then
                container_status=$(sshpass -p "$SSH_PASS" ssh -o ConnectTimeout=30 -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "cd \$HOME/wedding && docker-compose ps --format 'table {{.Name}}\t{{.Status}}' | grep -v 'NAME'" 2>/dev/null || echo "")
                if [[ -n "$container_status" ]]; then
                    log_info "容器状态:"
                    echo "$container_status" | while read -r line; do
                        log_info "  $line"
                    done
                else
                    log_warning "容器状态为空，服务可能尚未启动"
                fi
            else
                log_warning "无法获取容器状态，docker-compose命令执行失败"
            fi
        else
            log_warning "未找到docker-compose.yml配置文件，服务可能尚未部署"
        fi
        
        # 检查Web服务
        if [[ "$web_healthy" == "false" ]]; then
            if curl -f -s --connect-timeout 5 --max-time 10 "http://$SERVER_IP:$WEB_PORT" > /dev/null 2>&1; then
                log_success "Web服务健康检查通过 (端口: $WEB_PORT)"
                web_healthy=true
            else
                log_warning "Web服务尚未就绪 (端口: $WEB_PORT)"
            fi
        fi
        
        # 检查API服务
        if [[ "$api_healthy" == "false" ]]; then
            if curl -f -s --connect-timeout 5 --max-time 10 "http://$SERVER_IP:3000/health" > /dev/null 2>&1; then
                log_success "API服务健康检查通过 (端口: 3000)"
                api_healthy=true
            else
                log_warning "API服务尚未就绪 (端口: 3000)"
            fi
        fi
        
        # 如果所有服务都健康，退出循环
        if [[ "$web_healthy" == "true" && "$api_healthy" == "true" ]]; then
            log_success "所有服务健康检查通过"
            return 0
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "健康检查失败，服务可能未正常启动"
            log_error "Web服务状态: $([[ "$web_healthy" == "true" ]] && echo "健康" || echo "异常")"
            log_error "API服务状态: $([[ "$api_healthy" == "true" ]] && echo "健康" || echo "异常")"
            
            # 显示服务日志以便调试
            log_info "显示服务日志:"
            execute_ssh_command "cd \$HOME/wedding && docker-compose logs --tail=50" "获取服务日志" 2>/dev/null || true
            
            return 1
        fi
        
        sleep 10
        ((attempt++))
    done
    
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
    echo -e "${YELLOW}备份位置:${NC} \$HOME/wedding-backups/wedding-backup-$TIMESTAMP.tar.gz"
    echo -e "${GREEN}========================================${NC}"
    
    # 显示服务状态和系统信息
    execute_ssh_command "
        echo -e '${YELLOW}Docker容器状态:${NC}'
        cd \$HOME/wedding
        docker-compose ps
        
        echo ''
        echo -e '${YELLOW}系统资源使用情况:${NC}'
        echo '内存使用:'
        free -h
        echo '磁盘使用:'
        df -h /
        echo 'Docker镜像:'
        docker images | head -10
    " "显示服务状态和系统信息"
    
    # 输出CI/CD友好的状态信息
    if [[ "${CI:-false}" == "true" ]]; then
        echo "::set-output name=deployment_status::success"
        echo "::set-output name=web_url::http://$SERVER_IP:$WEB_PORT"
        echo "::set-output name=api_url::http://$SERVER_IP:3000"
        echo "::set-output name=deployment_time::$(date -Iseconds)"
        echo "::set-output name=server_ip::$SERVER_IP"
        echo "::set-output name=backup_file::\$HOME/wedding-backups/wedding-backup-$TIMESTAMP.tar.gz"
    fi
    
    # 生成部署报告
    local report_file="$LOG_DIR/deployment-report-$TIMESTAMP.json"
    cat > "$report_file" << EOF
{
  "deployment_id": "$TIMESTAMP",
  "status": "success",
  "timestamp": "$(date -Iseconds)",
  "server_ip": "$SERVER_IP",
  "services": {
    "web": {
      "url": "http://$SERVER_IP:$WEB_PORT",
      "port": $WEB_PORT,
      "image": "$WEB_IMAGE_NAME:$WEB_IMAGE_TAG"
    },
    "api": {
      "url": "http://$SERVER_IP:3000",
      "port": 3000,
      "image": "$API_IMAGE_NAME:$API_IMAGE_TAG"
    },
    "minio": {
      "console_url": "http://$SERVER_IP:9001",
      "api_port": 9000,
      "console_port": 9001
    }
  },
  "backup_file": "\$HOME/wedding-backups/wedding-backup-$TIMESTAMP.tar.gz",
  "log_file": "$LOG_FILE"
}
EOF
    
    log_info "部署报告已生成: $report_file"
}

# 回滚部署
rollback_deployment() {
    local backup_file="$1"
    
    log_warning "开始回滚部署..."
    
    # 如果没有指定备份文件，查找最新的备份
    if [[ -z "$backup_file" ]]; then
        log_info "查找最新的备份文件..."
        backup_file=$(execute_ssh_command "ls -t \$HOME/wedding-backups/wedding-backup-*.tar.gz 2>/dev/null | head -n1" "查找最新备份文件" 2>/dev/null || echo "")
        
        if [[ -z "$backup_file" ]]; then
            log_error "未找到备份文件，无法回滚"
            return 1
        fi
        
        log_info "找到备份文件: $backup_file"
    fi
    
    # 停止当前服务
    execute_ssh_command "
        cd \$HOME/wedding
        echo '停止当前服务...'
        docker-compose down --remove-orphans 2>/dev/null || true
    " "停止当前服务"
    
    # 备份当前状态并恢复
    execute_ssh_command "
        # 备份当前状态
        if [[ -d '\$HOME/wedding' ]]; then
            echo '备份当前状态...'
            mv '\$HOME/wedding' '\$HOME/wedding-rollback-backup-$TIMESTAMP'
        fi
        
        # 检查备份文件是否存在
        if [[ ! -f '$backup_file' ]]; then
            echo '错误: 备份文件不存在: $backup_file'
            exit 1
        fi
        
        # 恢复备份
        echo '从备份恢复...'
        cd \$HOME
        tar -xzf '$backup_file'
        echo '已从备份恢复: $backup_file'
    " "恢复备份文件"
    
    # 重启服务
    execute_ssh_command "
        cd \$HOME/wedding
        echo '重启服务...'
        docker-compose up -d
        echo '等待服务启动...'
        sleep 30
        echo '检查服务状态:'
        docker-compose ps
    " "重启服务"
    
    log_success "回滚完成"
}

# 主函数
main() {
    log_info "开始腾讯云生产环境部署..."
    log_info "部署时间: $(date)"
    log_info "目标服务器: $SERVER_IP"
    
    # 显示部署配置
    if [[ "$VERBOSE" == "true" ]]; then
        log_info "部署配置:"
        log_info "  跳过构建: $SKIP_BUILD"
        log_info "  跳过备份: $SKIP_BACKUP"
        log_info "  强制部署: $FORCE_DEPLOY"
        log_info "  CI模式: ${CI:-false}"
    fi
    
    # 设置回滚陷阱
    trap 'log_error "部署失败，开始回滚..."; rollback_deployment; exit 1' ERR
    
    # 健康检查模式跳过本地依赖检查
    if [[ "${HEALTH_CHECK_ONLY:-false}" != "true" ]]; then
        check_dependencies
    fi
    
    check_configuration
    check_server_connection
    
    # 健康检查模式跳过环境准备
    if [[ "${HEALTH_CHECK_ONLY:-false}" != "true" ]]; then
        verify_server_environment
        prepare_server_environment
    fi
    
    # 条件执行备份
    if [[ "$SKIP_BACKUP" == "false" ]]; then
        backup_existing_deployment
    else
        log_warning "跳过备份步骤"
    fi
    
    # 条件执行构建
    if [[ "$SKIP_BUILD" == "false" ]]; then
        transfer_source_code
        build_images
    else
        log_warning "跳过镜像构建步骤"
        log_info "假设镜像已存在于服务器上"
    fi
    
    transfer_deployment_files
    deploy_services
    health_check
    show_deployment_info
    
    # 移除回滚陷阱
    trap - ERR
    
    log_success "腾讯云生产环境部署完成！"
    
    # CI/CD环境下的额外输出
    if [[ "${CI:-false}" == "true" ]]; then
        echo "::notice title=部署成功::Wedding平台已成功部署到 $SERVER_IP"
        echo "::set-output name=exit_code::0"
    fi
}

# 显示帮助信息
show_help() {
    echo "腾讯云生产环境一键部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help              显示此帮助信息"
    echo "  -v, --verbose           详细输出模式"
    echo "  --skip-build           跳过镜像构建步骤"
    echo "  --skip-backup          跳过备份步骤"
    echo "  --force                强制部署（跳过确认）"
    echo "  --rollback             回滚到最新备份"
    echo "  --health-check-only    仅执行健康检查"
    echo "  --dry-run              模拟运行（不执行实际部署）"
    echo ""
    echo "环境变量:"
    echo "  CI=true                启用CI/CD模式"
    echo "  SKIP_CONFIRMATION=true 跳过用户确认"
    echo ""
    echo "示例:"
    echo "  $0                     # 标准部署"
    echo "  $0 --skip-build        # 跳过构建步骤的部署"
    echo "  $0 --rollback          # 回滚部署"
    echo "  CI=true $0 --force     # CI/CD环境中的强制部署"
}

# 解析命令行参数
parse_arguments() {
    SKIP_BUILD=false
    SKIP_BACKUP=false
    FORCE_DEPLOY=false
    ROLLBACK_ONLY=false
    HEALTH_CHECK_ONLY=false
    DRY_RUN=false
    VERBOSE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                set -x
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --force)
                FORCE_DEPLOY=true
                shift
                ;;
            --rollback)
                ROLLBACK_ONLY=true
                shift
                ;;
            --health-check-only)
                HEALTH_CHECK_ONLY=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 用户确认
confirm_deployment() {
    if [[ "${CI:-false}" == "true" ]] || [[ "${SKIP_CONFIRMATION:-false}" == "true" ]] || [[ "$FORCE_DEPLOY" == "true" ]]; then
        return 0
    fi
    
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}部署确认${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${BLUE}目标服务器:${NC} $SERVER_IP"
    echo -e "${BLUE}部署时间:${NC} $(date)"
    echo -e "${BLUE}API镜像:${NC} $API_IMAGE_NAME:$API_IMAGE_TAG"
    echo -e "${BLUE}Web镜像:${NC} $WEB_IMAGE_NAME:$WEB_IMAGE_TAG"
    echo -e "${YELLOW}========================================${NC}"
    
    read -p "确认要部署到生产环境吗？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "部署已取消"
        exit 0
    fi
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    parse_arguments "$@"
    
    if [[ "$ROLLBACK_ONLY" == "true" ]]; then
        log_info "执行回滚操作..."
        rollback_deployment
        exit 0
    fi
    
    if [[ "$HEALTH_CHECK_ONLY" == "true" ]]; then
        log_info "执行健康检查..."
        health_check
        exit 0
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "模拟运行模式 - 不会执行实际部署"
        echo "将要执行的步骤:"
        echo "1. 检查依赖工具"
        echo "2. 检查配置文件"
        echo "3. 检查服务器连接"
        [[ "$SKIP_BACKUP" == "false" ]] && echo "4. 备份现有部署"
        [[ "$SKIP_BUILD" == "false" ]] && echo "5. 构建Docker镜像"
        echo "6. 传输镜像和配置文件"
        echo "7. 部署服务"
        echo "8. 健康检查"
        echo "9. 显示部署信息"
        exit 0
    fi
    
    confirm_deployment
    main
fi
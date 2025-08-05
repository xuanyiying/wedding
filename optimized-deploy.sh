#!/bin/bash

# 婚礼应用优化部署脚本
# 适用于项目已克隆到服务器的情况
# 支持多种部署模式和管理功能

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
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

# 全局变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
SERVER_IP=""
OS=""
VER=""

# 显示帮助信息
show_help() {
    echo "婚礼应用优化部署脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  deploy, -d     执行完整部署（默认）"
    echo "  quick, -q      快速部署（跳过系统更新）"
    echo "  start, -s      启动服务"
    echo "  stop, -t       停止服务"
    echo "  restart, -r    重启服务"
    echo "  status, -st    查看服务状态"
    echo "  logs, -l       查看服务日志"
    echo "  backup, -b     备份当前部署"
    echo "  clean, -c      清理 Docker 资源"
    echo "  update, -u     更新并重启服务"
    echo "  check, -ch     检查项目结构和环境"
    echo "  env, -e        重新生成环境文件"
    echo "  help, -h       显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0 deploy      # 完整部署"
    echo "  $0 quick       # 快速部署"
    echo "  $0 status      # 查看状态"
    echo "  $0 logs        # 查看日志"
    echo
}

# 检查项目结构
check_project_structure() {
    log_info "检查项目结构..."
    
    local required_files=(
        "docker-compose.yml"
        "server/Dockerfile"
        "web/Dockerfile"
        "server/package.json"
        "web/package.json"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$PROJECT_DIR/$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        log_error "缺少必要的项目文件:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        log_error "请确保在正确的项目目录中运行此脚本"
        exit 1
    fi
    
    log_success "项目结构检查通过"
}

# 检测操作系统
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        log_error "无法检测操作系统"
        exit 1
    fi
    log_info "检测到操作系统: $OS $VER"
}

# 检查是否为 root 用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "检测到 root 用户，建议使用普通用户运行此脚本"
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 获取服务器 IP
get_server_ip() {
    # 尝试多种方法获取公网 IP
    SERVER_IP=$(curl -s --connect-timeout 10 ifconfig.me 2>/dev/null || \
                curl -s --connect-timeout 10 ipinfo.io/ip 2>/dev/null || \
                curl -s --connect-timeout 10 icanhazip.com 2>/dev/null)
    
    if [[ -z "$SERVER_IP" ]]; then
        # 如果无法获取公网 IP，使用内网 IP
        SERVER_IP=$(hostname -I | awk '{print $1}')
    fi
    
    log_info "服务器 IP: $SERVER_IP"
}

# 安装 Docker
install_docker() {
    if command -v docker &> /dev/null; then
        log_success "Docker 已安装: $(docker --version)"
        return
    fi

    log_info "开始安装 Docker..."
    
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        # Ubuntu/Debian 安装
        sudo apt-get update
        sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
        
        # 添加 Docker 官方 GPG 密钥
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        
        # 添加 Docker 仓库
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io
        
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"OpenCloudOS"* ]] || [[ $OS == *"Rocky"* ]] || [[ $OS == *"AlmaLinux"* ]]; then
        # CentOS/RHEL/OpenCloudOS/Rocky/AlmaLinux 安装
        if command -v dnf &> /dev/null; then
            sudo dnf install -y dnf-utils
            sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo dnf install -y docker-ce docker-ce-cli containerd.io
        else
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io
        fi
        sudo systemctl start docker
        sudo systemctl enable docker
    else
        log_warning "未明确支持的操作系统: $OS，尝试使用通用安装方法"
        # 尝试使用 Docker 官方安装脚本
        if curl -fsSL https://get.docker.com -o get-docker.sh; then
            sudo sh get-docker.sh
            rm get-docker.sh
            sudo systemctl start docker
            sudo systemctl enable docker
        else
            log_error "Docker 安装失败，请手动安装 Docker"
            exit 1
        fi
    fi
    
    # 将当前用户添加到 docker 组
    sudo usermod -aG docker $USER
    log_success "Docker 安装完成"
    log_warning "请重新登录以使 Docker 组权限生效，或运行: newgrp docker"
}

# 安装 Docker Compose
install_docker_compose() {
    if command -v docker-compose &> /dev/null && docker-compose --version &> /dev/null; then
        log_success "Docker Compose 已安装且可用: $(docker-compose --version)"
        return
    fi

    log_info "安装 Docker Compose..."
    
    local install_success=false
    local compose_path="/usr/local/bin/docker-compose"

    # 方法1: 从 GitHub 下载最新版本
    log_info "尝试从 GitHub 下载最新版本..."
    local COMPOSE_VERSION
    COMPOSE_VERSION=$(curl -s --connect-timeout 30 https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4 2>/dev/null)
    
    if [[ -n "$COMPOSE_VERSION" ]]; then
        log_info "获取到最新版本: $COMPOSE_VERSION"
        local download_url="https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)"
        
        if sudo curl -L --connect-timeout 30 --retry 3 "$download_url" -o "$compose_path"; then
            sudo chmod +x "$compose_path"
            if sudo "$compose_path" --version &> /dev/null; then
                sudo ln -sf "$compose_path" /usr/bin/docker-compose
                log_success "Docker Compose 从 GitHub 安装成功"
                install_success=true
            fi
        fi
    fi
    
    # 方法2: 使用包管理器安装
    if [[ "$install_success" == "false" ]]; then
        log_info "GitHub 下载失败，尝试使用包管理器安装..."
        
        if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
            sudo apt-get install -y docker-compose && install_success=true
        elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"OpenCloudOS"* ]] || [[ $OS == *"Rocky"* ]] || [[ $OS == *"AlmaLinux"* ]]; then
            if command -v dnf &> /dev/null; then
                sudo dnf install -y docker-compose && install_success=true
            else
                sudo yum install -y docker-compose && install_success=true
            fi
        fi
    fi
    
    if [[ "$install_success" == "false" ]]; then
        log_error "Docker Compose 安装失败，请手动安装"
        exit 1
    fi
    
    log_success "Docker Compose 安装完成: $(docker-compose --version)"
}

# 检查端口占用
check_ports() {
    local ports=("80" "443" "3000" "8000" "3306" "6379" "9000" "9001")
    local occupied_ports=()
    
    log_info "检查端口占用情况..."
    
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep ":$port " > /dev/null 2>&1; then
            occupied_ports+=("$port")
        fi
    done
    
    if [ ${#occupied_ports[@]} -gt 0 ]; then
        log_warning "以下端口已被占用: ${occupied_ports[*]}"
        read -p "是否继续部署？这可能导致服务冲突 (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_success "所有必需端口都可用"
    fi
}

# 创建环境文件
create_env_files() {
    log_info "创建环境配置文件..."
    
    # 确保在项目目录中
    cd "$PROJECT_DIR"
    
    # 创建 server .env 文件
    if [[ ! -f "./server/.env" ]] || [[ "$1" == "force" ]]; then
        log_info "创建 server/.env 文件"
        mkdir -p server
        cat > ./server/.env << EOF
# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=wedding_host
DB_USER=wedding
DB_PASSWORD=wedding123

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379

# MinIO 配置
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=rustfsadmin
MINIO_SECRET_KEY=rustfssecret123
MINIO_BUCKET=wedding-files

# JWT 配置
JWT_SECRET=wedding-super-secret-jwt-key-$(date +%s)
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=8000
NODE_ENV=production

# CORS 配置
CORS_ORIGIN=http://$SERVER_IP
EOF
        log_success "server/.env 文件创建完成"
    else
        log_info "server/.env 文件已存在，跳过创建"
    fi
    
    # 创建 web .env 文件
    if [[ ! -f "./web/.env" ]] || [[ "$1" == "force" ]]; then
        log_info "创建 web/.env 文件"
        mkdir -p web
        cat > ./web/.env << EOF
# API 配置
VITE_API_BASE_URL=http://$SERVER_IP/api
VITE_APP_TITLE=婚礼主持人平台

# 环境配置
VITE_NODE_ENV=production
EOF
        log_success "web/.env 文件创建完成"
    else
        log_info "web/.env 文件已存在，跳过创建"
    fi
}

# 创建并启用交换文件
setup_swap() {
    if free | awk '/^Swap:/{exit !$2}'; then
        log_info "检测到已存在的交换分区，跳过创建"
        return
    fi

    log_info "未检测到交换分区，开始创建交换文件..."
    local swap_size="2G"
    local swap_file="/swapfile"

    sudo fallocate -l $swap_size $swap_file
    sudo chmod 600 $swap_file
    sudo mkswap $swap_file
    sudo swapon $swap_file

    # 持久化交换文件
    if ! grep -q "$swap_file none swap sw 0 0" /etc/fstab; then
        echo "$swap_file none swap sw 0 0" | sudo tee -a /etc/fstab
    fi

    log_success "2G 交换文件创建并启用成功"
}

# 备份当前部署
backup_deployment() {
    local backup_dir="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
    log_info "创建部署备份到: $backup_dir"
    
    mkdir -p "$backup_dir"
    
    # 备份环境文件
    if [[ -f "$PROJECT_DIR/server/.env" ]]; then
        cp "$PROJECT_DIR/server/.env" "$backup_dir/server.env"
    fi
    if [[ -f "$PROJECT_DIR/web/.env" ]]; then
        cp "$PROJECT_DIR/web/.env" "$backup_dir/web.env"
    fi
    
    # 备份数据库（如果容器正在运行）
    if docker-compose ps mysql 2>/dev/null | grep -q "Up"; then
        log_info "备份数据库..."
        docker-compose exec -T mysql mysqldump -u wedding -pwedding123 wedding_host > "$backup_dir/database.sql" 2>/dev/null || log_warning "数据库备份失败"
    fi
    
    log_success "备份完成: $backup_dir"
}

# 构建和启动服务
deploy_services() {
    log_info "开始构建和启动服务..."
    
    # 确保在项目目录中
    cd "$PROJECT_DIR"
    
    # 停止现有服务
    log_info "停止现有服务..."
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # 清理未使用的镜像和容器
    log_info "清理 Docker 资源..."
    docker system prune -f || true
    
    # 构建镜像
    log_info "构建应用镜像..."
    docker-compose build --no-cache
    
    # 启动服务
    log_info "启动所有服务..."
    docker-compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    log_info "检查服务状态..."
    docker-compose ps
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    cd "$PROJECT_DIR"
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "健康检查 ($attempt/$max_attempts)..."
        
        # 检查容器状态
        local running_containers=$(docker-compose ps --services --filter "status=running" 2>/dev/null | wc -l)
        local total_containers=$(docker-compose ps --services 2>/dev/null | wc -l)
        
        if [[ $running_containers -eq $total_containers ]] && [[ $total_containers -gt 0 ]]; then
            log_success "所有服务运行正常"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_error "健康检查失败，部分服务未正常启动"
    docker-compose ps
    return 1
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo
    echo "======================================"
    echo "         部署成功！"
    echo "======================================"
    echo
    echo "🌐 访问地址："
    echo "   Web 应用: http://$SERVER_IP"
    echo "   API 服务: http://$SERVER_IP:8000"
    echo "   MinIO 控制台: http://$SERVER_IP:9001"
    echo "     用户名: rustfsadmin"
    echo "     密码: rustfssecret123"
    echo
    echo "🔧 管理命令："
    echo "   查看状态: $0 status"
    echo "   查看日志: $0 logs"
    echo "   重启服务: $0 restart"
    echo "   停止服务: $0 stop"
    echo "   备份数据: $0 backup"
    echo
    echo "📋 服务状态："
    cd "$PROJECT_DIR" && docker-compose ps
    echo
    echo "🎉 恭喜！婚礼应用已成功部署！"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    cd "$PROJECT_DIR"
    docker-compose up -d
    sleep 10
    docker-compose ps
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    cd "$PROJECT_DIR"
    docker-compose down
    log_success "服务已停止"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    cd "$PROJECT_DIR"
    docker-compose restart
    sleep 10
    docker-compose ps
}

# 查看服务状态
show_status() {
    cd "$PROJECT_DIR"
    echo "=== 服务状态 ==="
    docker-compose ps
    echo
    echo "=== 系统资源使用 ==="
    docker stats --no-stream
}

# 查看日志
show_logs() {
    cd "$PROJECT_DIR"
    echo "=== 最近日志 ==="
    docker-compose logs --tail=50 -f
}

# 清理资源
clean_resources() {
    log_info "清理 Docker 资源..."
    cd "$PROJECT_DIR"
    docker-compose down --remove-orphans
    docker system prune -f
    docker volume prune -f
    log_success "清理完成"
}

# 更新服务
update_services() {
    log_info "更新服务..."
    cd "$PROJECT_DIR"
    backup_deployment
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    sleep 30
    health_check
}

# 系统更新（可选）
update_system() {
    log_info "更新系统包..."
    
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        sudo apt-get update -y
        sudo apt-get upgrade -y
        sudo apt-get install -y curl wget git unzip net-tools
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"OpenCloudOS"* ]] || [[ $OS == *"Rocky"* ]] || [[ $OS == *"AlmaLinux"* ]]; then
        if command -v dnf &> /dev/null; then
            sudo dnf update -y
            sudo dnf install -y curl wget git unzip net-tools
        else
            sudo yum update -y
            sudo yum install -y curl wget git unzip net-tools
        fi
    fi
    
    log_success "系统更新完成"
}

# 主函数
main() {
    local action="${1:-deploy}"
    
    case $action in
        deploy|-d)
            echo "=== 婚礼应用完整部署 ==="
            echo
            
            check_root
            detect_os
            check_project_structure
            get_server_ip
            update_system
            install_docker
            install_docker_compose
            setup_swap
            check_ports
            create_env_files
            backup_deployment
            deploy_services
            
            if health_check; then
                show_deployment_info
            else
                log_error "部署过程中出现问题，请检查日志"
                exit 1
            fi
            ;;
        quick|-q)
            echo "=== 婚礼应用快速部署 ==="
            echo
            
            check_root
            detect_os
            check_project_structure
            get_server_ip
            install_docker
            install_docker_compose
            check_ports
            create_env_files
            deploy_services
            
            if health_check; then
                show_deployment_info
            else
                log_error "部署过程中出现问题，请检查日志"
                exit 1
            fi
            ;;
        start|-s)
            start_services
            ;;
        stop|-t)
            stop_services
            ;;
        restart|-r)
            restart_services
            ;;
        status|-st)
            show_status
            ;;
        logs|-l)
            show_logs
            ;;
        backup|-b)
            backup_deployment
            ;;
        clean|-c)
            clean_resources
            ;;
        update|-u)
            update_services
            ;;
        check|-ch)
            check_project_structure
            log_success "项目检查完成"
            ;;
        env|-e)
            get_server_ip
            create_env_files force
            log_success "环境文件重新生成完成"
            ;;
        help|-h)
            show_help
            ;;
        *)
            log_error "未知选项: $action"
            show_help
            exit 1
            ;;
    esac
}

# 错误处理
trap 'log_error "脚本执行过程中发生错误"' ERR

# 如果脚本被直接执行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
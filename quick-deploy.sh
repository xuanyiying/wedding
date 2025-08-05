#!/bin/bash

# 婚礼应用腾讯云服务器快速部署脚本
# 适用于全新的腾讯云服务器环境

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

# 显示欢迎信息
show_welcome() {
    clear
    echo "======================================"
    echo "    婚礼应用腾讯云快速部署脚本"
    echo "======================================"
    echo
    echo "此脚本将自动完成以下操作："
    echo "✓ 系统环境检测和更新"
    echo "✓ Docker 和 Docker Compose 安装"
    echo "✓ 防火墙端口配置"
    echo "✓ 应用服务部署"
    echo "✓ 健康检查和状态验证"
    echo
    read -p "按 Enter 键开始部署，或 Ctrl+C 取消..." -r
    echo
}

# 检查网络连接
check_network() {
    log_info "检查网络连接..."
    
    local test_urls=("google.com" "github.com" "docker.com" "get.docker.com")
    local network_ok=false
    
    for url in "${test_urls[@]}"; do
        if curl -s --connect-timeout 10 --max-time 15 "$url" > /dev/null 2>&1; then
            log_success "网络连接正常 ($url)"
            network_ok=true
            break
        fi
    done
    
    if [[ "$network_ok" == "false" ]]; then
        log_error "网络连接失败，请检查网络设置"
        log_info "可能的解决方案："
        echo "  1. 检查防火墙设置"
        echo "  2. 检查 DNS 配置"
        echo "  3. 检查代理设置"
        echo "  4. 联系网络管理员"
        exit 1
    fi
}

# 检测系统信息
detect_system() {
    log_info "检测系统信息..."
    
    # 检测操作系统
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        log_error "无法检测操作系统"
        exit 1
    fi
    
    # 检测架构
    ARCH=$(uname -m)
    
    # 检测内存
    MEM_GB=$(free -g | awk '/^Mem:/{print $2}')
    
    # 检测磁盘空间
    DISK_GB=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    
    log_info "系统信息："
    echo "  操作系统: $OS $VER"
    echo "  架构: $ARCH"
    echo "  内存: ${MEM_GB}GB"
    echo "  可用磁盘: ${DISK_GB}GB"
    
    # 检查最低要求
    if [[ $MEM_GB -lt 2 ]]; then
        log_warning "内存不足 2GB，可能影响性能"
    fi
    
    if [[ $DISK_GB -lt 10 ]]; then
        log_error "磁盘空间不足 10GB，无法继续部署"
        exit 1
    fi
}

# 更新系统
update_system() {
    log_info "更新系统包..."
    
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -y
        apt-get upgrade -y
        apt-get install -y curl wget git unzip net-tools
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"OpenCloudOS"* ]] || [[ $OS == *"Rocky"* ]] || [[ $OS == *"AlmaLinux"* ]]; then
        if command -v dnf &> /dev/null; then
            dnf update -y
            dnf install -y curl wget git unzip net-tools
        else
            yum update -y
            yum install -y curl wget git unzip net-tools
        fi
    fi
    
    log_success "系统更新完成"
}

# 配置防火墙
setup_firewall() {
    log_info "配置防火墙..."
    
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        # Ubuntu/Debian 使用 ufw
        if command -v ufw &> /dev/null; then
            ufw --force enable
            ufw allow 22/tcp   # SSH
            ufw allow 80/tcp   # HTTP
            ufw allow 443/tcp  # HTTPS
            ufw allow 3000/tcp # Web dev
            ufw allow 8000/tcp # API
            ufw allow 9001/tcp # MinIO Console
            log_success "UFW 防火墙配置完成"
        fi
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"OpenCloudOS"* ]] || [[ $OS == *"Rocky"* ]] || [[ $OS == *"AlmaLinux"* ]]; then
        # CentOS/RHEL/OpenCloudOS/Rocky/AlmaLinux 使用 firewalld
        if command -v firewall-cmd &> /dev/null; then
            systemctl start firewalld
            systemctl enable firewalld
            firewall-cmd --permanent --add-port=22/tcp
            firewall-cmd --permanent --add-port=80/tcp
            firewall-cmd --permanent --add-port=443/tcp
            firewall-cmd --permanent --add-port=3000/tcp
            firewall-cmd --permanent --add-port=8000/tcp
            firewall-cmd --permanent --add-port=9001/tcp
            firewall-cmd --reload
            log_success "Firewalld 防火墙配置完成"
        fi
    fi
}

# 安装 Docker
install_docker() {
    if command -v docker &> /dev/null; then
        log_success "Docker 已安装: $(docker --version)"
        return
    fi
    
    log_info "安装 Docker..."
    
    # 尝试多种安装方法
    local install_success=false
    
    # 方法1: 使用官方安装脚本
    log_info "尝试使用官方安装脚本..."
    for i in {1..3}; do
        if curl -fsSL --connect-timeout 30 --retry 3 https://get.docker.com -o get-docker.sh; then
            if sh get-docker.sh; then
                rm -f get-docker.sh
                install_success=true
                break
            fi
            rm -f get-docker.sh
        fi
        log_warning "第 $i 次尝试失败，等待 10 秒后重试..."
        sleep 10
    done
    
    # 方法2: 如果官方脚本失败，尝试包管理器安装
    if [[ "$install_success" == "false" ]]; then
        log_info "官方脚本失败，尝试使用包管理器安装..."
        
        if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
            apt-get update
            apt-get install -y docker.io
            install_success=true
        elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"OpenCloudOS"* ]] || [[ $OS == *"Rocky"* ]] || [[ $OS == *"AlmaLinux"* ]]; then
            if command -v dnf &> /dev/null; then
                dnf install -y docker
            else
                yum install -y docker
            fi
            install_success=true
        fi
    fi
    
    if [[ "$install_success" == "false" ]]; then
        log_error "Docker 安装失败，请检查网络连接或手动安装"
        exit 1
    fi
    
    # 启动 Docker 服务
    systemctl start docker
    systemctl enable docker
    
    # 添加当前用户到 docker 组
    usermod -aG docker $USER
    
    log_success "Docker 安装完成"
}

# 安装 Docker Compose
install_docker_compose() {
    # 1. 优先检查命令是否直接可用
    if command -v docker-compose &> /dev/null && docker-compose --version &> /dev/null; then
        log_success "Docker Compose 已安装且可用: $(docker-compose --version)"
        return
    fi

    log_info "Docker Compose 命令不可用，开始检查和安装..."
    
    local install_success=false
    local compose_path="/usr/local/bin/docker-compose"

    # 2. 检查已知路径的文件是否存在且可用
    if [[ -f "$compose_path" ]]; then
        log_info "在 '$compose_path' 发现 docker-compose 文件，尝试修复..."
        # 确保有执行权限
        chmod +x "$compose_path"
        # 验证文件是否能正常执行
        if "$compose_path" --version &> /dev/null; then
            log_success "已修复 '$compose_path' 的权限并验证成功。"
            # 确保软链接存在，使其在 PATH 中可用
            ln -sf "$compose_path" /usr/bin/docker-compose
            log_success "Docker Compose 已可用: $($compose_path --version)"
            return
        else
            log_warning "'$compose_path' 文件已损坏，将进行清理和重装。"
            rm -f "$compose_path"
        fi
    fi

    # 3. 如果上述检查和修复都失败，则执行安装流程
    log_info "开始执行安装流程..."

    # 方法1: 从 GitHub 下载最新版本
    log_info "尝试从 GitHub 下载最新版本..."
    for i in {1..3}; do
        local COMPOSE_VERSION
        COMPOSE_VERSION=$(curl -s --connect-timeout 30 https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'\"' -f4 2>/dev/null)
        
        if [[ -z "$COMPOSE_VERSION" ]]; then
            log_warning "无法获取最新的 Docker Compose 版本号。"
        else
            log_info "获取到最新版本: $COMPOSE_VERSION"
            local download_url="https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)"
            log_info "下载地址: $download_url"

            if curl -L --connect-timeout 30 --retry 3 "$download_url" -o "$compose_path"; then
                log_info "下载完成，设置执行权限..."
                chmod +x "$compose_path"
                
                if [[ ! -x "$compose_path" ]]; then
                    log_error "设置执行权限失败！请检查文件系统权限或 SELinux/AppArmor 设置。"
                else
                    log_info "验证安装..."
                    if "$compose_path" --version &> /dev/null; then
                        ln -sf "$compose_path" /usr/bin/docker-compose
                        log_success "Docker Compose 从 GitHub 安装成功。"
                        install_success=true
                        break
                    else
                        log_error "Docker Compose 验证失败，文件可能已损坏。"
                        rm -f "$compose_path"
                    fi
                fi
            else
                log_warning "从 GitHub 下载失败。"
            fi
        fi
        
        log_warning "第 $i 次尝试失败，等待 10 秒后重试..."
        sleep 10
    done
    
    # 方法2: 使用包管理器安装
    if [[ "$install_success" == "false" ]]; then
        log_info "GitHub 下载失败，尝试使用包管理器安装..."
        
        if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
            apt-get install -y docker-compose && install_success=true
        elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"OpenCloudOS"* ]] || [[ $OS == *"Rocky"* ]] || [[ $OS == *"AlmaLinux"* ]]; then
            if command -v dnf &> /dev/null; then
                dnf install -y docker-compose && install_success=true
            else
                yum install -y docker-compose && install_success=true
            fi
        fi
        if [[ "$install_success" == "true" ]]; then
            log_success "通过包管理器安装 Docker Compose 成功。"
        fi
    fi
    
    # 方法3: 使用 pip 安装
    if [[ "$install_success" == "false" ]]; then
        log_info "包管理器安装失败，尝试使用 pip 安装..."
        
        # 安装 pip
        if ! command -v pip3 &> /dev/null; then
            log_info "安装 pip3..."
            if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
                apt-get install -y python3-pip
            elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"OpenCloudOS"* ]] || [[ $OS == *"Rocky"* ]] || [[ $OS == *"AlmaLinux"* ]]; then
                if command -v dnf &> /dev/null; then
                    dnf install -y python3-pip
                else
                    yum install -y python3-pip
                fi
            fi
        fi
        
        # 使用 pip 安装 docker-compose
        if command -v pip3 &> /dev/null; then
            pip3 install docker-compose && install_success=true
            if [[ "$install_success" == "true" ]]; then
                log_success "通过 pip3 安装 Docker Compose 成功。"
            fi
        fi
    fi
    
    if [[ "$install_success" == "false" ]]; then
        log_error "所有 Docker Compose 安装方法均失败，请检查网络连接或手动安装。"
        exit 1
    fi
    
    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose 安装完成: $(docker-compose --version)"
    else
        log_error "Docker Compose 安装后仍无法找到命令，请检查 PATH 环境变量。"
        exit 1
    fi
}

# 获取服务器 IP
get_server_ip() {
    # 尝试多种方法获取公网 IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || curl -s icanhazip.com 2>/dev/null)
    
    if [[ -z "$SERVER_IP" ]]; then
        # 如果无法获取公网 IP，使用内网 IP
        SERVER_IP=$(hostname -I | awk '{print $1}')
    fi
    
    log_info "服务器 IP: $SERVER_IP"
}

# 创建环境配置
setup_environment() {
    log_info "创建环境配置文件..."
    
    # 创建 server .env
    mkdir -p server
    cat > server/.env << EOF
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
    
    # 创建 web .env
    mkdir -p web
    cat > web/.env << EOF
# API 配置
VITE_API_BASE_URL=http://$SERVER_IP/api
VITE_APP_TITLE=婚礼主持人平台

# 环境配置
VITE_NODE_ENV=production
EOF
    
    log_success "环境配置文件创建完成"
}

# 创建并启用交换文件
setup_swap() {
    if free | awk '/^Swap:/{exit !$2}'; then
        log_info "检测到已存在的交换分区，跳过创建。"
        return
    fi

    log_info "未检测到交换分区，开始创建交换文件..."
    local swap_size="2G"
    local swap_file="/swapfile"

    fallocate -l $swap_size $swap_file
    chmod 600 $swap_file
    mkswap $swap_file
    swapon $swap_file

    # 持久化交换文件
    if ! grep -q "$swap_file none swap sw 0 0" /etc/fstab; then
        echo "$swap_file none swap sw 0 0" >> /etc/fstab
    fi

    log_success "2G 交换文件创建并启用成功。"
}

# 部署应用
deploy_application() {
    log_info "部署应用服务..."
    
    # 停止现有服务
    /usr/local/bin/docker-compose down --remove-orphans 2>/dev/null || true
    
    # 清理资源
    docker system prune -f
    
    # 构建并启动服务
    log_info "构建应用镜像..."
    /usr/local/bin/docker-compose build --no-cache
    
    log_info "启动所有服务..."
    /usr/local/bin/docker-compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 60
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "健康检查 ($attempt/$max_attempts)..."
        
        # 检查容器状态
        local running_containers=$(/usr/local/bin/docker-compose ps --services --filter "status=running" | wc -l)
        local total_containers=$(/usr/local/bin/docker-compose ps --services | wc -l)
        
        if [[ $running_containers -eq $total_containers ]]; then
            log_success "所有服务运行正常"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_error "健康检查失败，部分服务未正常启动"
    /usr/local/bin/docker-compose ps
    return 1
}

# 显示部署结果
show_result() {
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
    echo "   查看状态: docker-compose ps"
    echo "   查看日志: docker-compose logs -f"
    echo "   重启服务: docker-compose restart"
    echo "   停止服务: docker-compose down"
    echo
    echo "📋 服务状态："
    docker-compose ps
    echo
    echo "🎉 恭喜！婚礼应用已成功部署到腾讯云服务器！"
}

# 主函数
main() {
    # 检查是否为 root 用户
    if [[ $EUID -ne 0 ]]; then
        log_error "请使用 root 用户运行此脚本"
        echo "使用命令: sudo $0"
        exit 1
    fi
    
    # 显示欢迎信息
    show_welcome
    
    # 执行部署步骤
    check_network
    detect_system
    update_system
    setup_firewall
    setup_swap
    install_docker
    install_docker_compose
    get_server_ip
    setup_environment
    deploy_application
    
    # 健康检查
    if health_check; then
        show_result
    else
        log_error "部署过程中出现问题，请检查日志"
        echo "查看日志命令: docker-compose logs"
        exit 1
    fi
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查上述输出"' ERR

# 执行主函数
main "$@"
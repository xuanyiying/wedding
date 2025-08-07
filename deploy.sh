#!/bin/bash

# 婚礼应用自动化部署脚本
# 适用于腾讯云服务器 Ubuntu/CentOS

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 检测操作系统
detect_os() {
    # 首先检查是否为macOS
    if [[ "$(uname)" == "Darwin" ]]; then
        OS="macOS"
        VER=$(sw_vers -productVersion 2>/dev/null || echo "Unknown")
        log_info "检测到操作系统: $OS $VER"
        log_warning "macOS环境检测到，请确保已安装Docker Desktop"
        return
    fi
    
    # Linux系统检测
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    elif [[ -f /etc/redhat-release ]]; then
        OS=$(cat /etc/redhat-release | awk '{print $1}')
        VER=$(cat /etc/redhat-release | grep -oE '[0-9]+\.[0-9]+' | head -1)
    elif [[ -f /etc/debian_version ]]; then
        OS="Debian"
        VER=$(cat /etc/debian_version)
    elif command -v lsb_release &> /dev/null; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    else
        # 通用检测
        OS=$(uname -s)
        VER=$(uname -r)
        log_warning "使用通用系统检测: $OS $VER"
    fi
    
    log_info "检测到操作系统: $OS $VER"
}

# 安装 Docker
install_docker() {
    if command -v docker &> /dev/null; then
        log_success "Docker 已安装"
        docker --version
        return
    fi

    # macOS特殊处理
    if [[ $OS == "macOS" ]]; then
        log_error "检测到macOS系统，请手动安装Docker Desktop"
        log_info "请访问 https://www.docker.com/products/docker-desktop 下载并安装Docker Desktop"
        log_info "安装完成后请重新运行此脚本"
        exit 1
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
    # macOS特殊处理
    if [[ $OS == "macOS" ]]; then
        if command -v docker-compose &> /dev/null; then
            log_success "Docker Compose 已安装且可用: $(docker-compose --version)"
            return
        else
            log_error "macOS系统上未找到docker-compose命令"
            log_info "Docker Compose通常随Docker Desktop一起安装"
            log_info "请检查Docker Desktop是否正在运行，或重新安装Docker Desktop"
            exit 1
        fi
    fi

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
        sudo chmod +x "$compose_path"
        # 验证文件是否能正常执行
        if sudo "$compose_path" --version &> /dev/null; then
            log_success "已修复 '$compose_path' 的权限并验证成功。"
            # 确保软链接存在，使其在 PATH 中可用
            sudo ln -sf "$compose_path" /usr/bin/docker-compose
            log_success "Docker Compose 已可用: $(sudo $compose_path --version)"
            return
        else
            log_warning "'$compose_path' 文件已损坏，将进行清理和重装。"
            sudo rm -f "$compose_path"
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

            if sudo curl -L --connect-timeout 30 --retry 3 "$download_url" -o "$compose_path"; then
                log_info "下载完成，设置执行权限..."
                sudo chmod +x "$compose_path"
                
                if [[ ! -x "$compose_path" ]]; then
                    log_error "设置执行权限失败！请检查文件系统权限或 SELinux/AppArmor 设置。"
                else
                    log_info "验证安装..."
                    if sudo "$compose_path" --version &> /dev/null; then
                        sudo ln -sf "$compose_path" /usr/bin/docker-compose
                        log_success "Docker Compose 从 GitHub 安装成功。"
                        install_success=true
                        break
                    else
                        log_error "Docker Compose 验证失败，文件可能已损坏。"
                        sudo rm -f "$compose_path"
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
            sudo apt-get install -y docker-compose && install_success=true
        elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"OpenCloudOS"* ]] || [[ $OS == *"Rocky"* ]] || [[ $OS == *"AlmaLinux"* ]]; then
            if command -v dnf &> /dev/null; then
                sudo dnf install -y docker-compose && install_success=true
            else
                sudo yum install -y docker-compose && install_success=true
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
                sudo apt-get install -y python3-pip
            elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"OpenCloudOS"* ]] || [[ $OS == *"Rocky"* ]] || [[ $OS == *"AlmaLinux"* ]]; then
                if command -v dnf &> /dev/null; then
                    sudo dnf install -y python3-pip
                else
                    sudo yum install -y python3-pip
                fi
            fi
        fi
        
        # 使用 pip 安装 docker-compose
        if command -v pip3 &> /dev/null; then
            sudo pip3 install docker-compose && install_success=true
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

# 检查端口占用
check_ports() {
    local ports=("80" "443" "3000" "5173" "3306" "6379" "9000" "9001")
    local occupied_ports=()
    
    log_info "检查端口占用情况..."
    
    for port in "${ports[@]}"; do
        if netstat -tuln | grep ":$port " > /dev/null 2>&1; then
            occupied_ports+=("$port")
        fi
    done
    
    if [ ${#occupied_ports[@]} -gt 0 ]; then
        log_warning "以下端口已被占用: ${occupied_ports[*]}"
        log_info "端口说明:"
        log_info "  80/443: Caddy反向代理 (HTTP/HTTPS)"
        log_info "  3000: Node.js后端API服务"
        log_info "  5173: Vite前端开发服务器"
        log_info "  3306: MySQL数据库"
        log_info "  6379: Redis缓存"
        log_info "  9000/9001: MinIO对象存储 (API/控制台)"
        read -p "是否继续部署？这可能导致服务冲突 (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_success "所有必需端口都可用"
    fi
}

# 检查Docker网络配置
check_docker_network() {
    log_info "检查Docker网络配置..."
    
    # 清理已存在的wedding-net网络
    if docker network ls --format "table {{.Name}}\t{{.Driver}}" | grep -q "wedding-net"; then
        log_info "发现已存在的wedding-net网络，将进行清理"
        # 停止使用该网络的容器
        docker-compose down --remove-orphans 2>/dev/null || true
        # 强制删除网络
        docker network rm wedding-net 2>/dev/null || true
        sleep 2
    fi
    
    # 清理所有未使用的网络
    log_info "清理未使用的Docker网络..."
    docker network prune -f 2>/dev/null || true
    
    # 检查可用的子网范围
    log_info "检查网络子网可用性..."
    local test_subnets=("172.20.0.0/16" "172.21.0.0/16" "172.22.0.0/16" "172.23.0.0/16" "10.20.0.0/16")
    AVAILABLE_SUBNET=""
    AVAILABLE_GATEWAY=""
    
    for subnet in "${test_subnets[@]}"; do
        local network_prefix=$(echo $subnet | cut -d'/' -f1 | cut -d'.' -f1-2)
        local gateway="${network_prefix}.0.1"
        
        # 检查路由表冲突
        if ! ip route | grep -q "$network_prefix"; then
            # 检查Docker网络冲突
            if ! docker network ls --format "table {{.Name}}\t{{.Subnet}}" | grep -q "$network_prefix"; then
                AVAILABLE_SUBNET="$subnet"
                AVAILABLE_GATEWAY="$gateway"
                log_success "找到可用子网: $subnet (网关: $gateway)"
                break
            fi
        fi
    done
    
    if [[ -z "$AVAILABLE_SUBNET" ]]; then
        log_error "无法找到可用的网络子网，请手动清理网络冲突"
        log_info "当前Docker网络:"
        docker network ls
        log_info "当前路由表:"
        ip route | grep -E "172\.|10\."
        exit 1
    fi
    
    log_success "Docker网络检查完成，将使用子网: $AVAILABLE_SUBNET"
}

# 创建环境文件
create_env_files() {
    log_info "创建环境配置文件..."
    
    # 获取服务器IP地址
    local server_ip
    if [[ $OS == "macOS" ]]; then
        server_ip="localhost"
    else
        # 尝试获取公网IP
        server_ip=$(curl -s --connect-timeout 10 ifconfig.me 2>/dev/null || curl -s --connect-timeout 10 ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}' || echo "localhost")
    fi
    
    log_info "检测到服务器IP: $server_ip"
    
    # 创建 server .env 文件
    if [[ ! -f "./server/.env" ]]; then
        log_info "创建 server/.env 文件"
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
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3000
NODE_ENV=production

# CORS 配置
CORS_ORIGIN=http://$server_ip
EOF
        log_success "server/.env 文件创建完成"
    else
        log_info "server/.env 文件已存在，跳过创建"
    fi
    
    # 创建 web .env 文件
    if [[ ! -f "./web/.env" ]]; then
        log_info "创建 web/.env 文件"
        cat > ./web/.env << EOF
# API 配置
VITE_API_BASE_URL=/api
VITE_APP_TITLE=婚礼主持人平台

# 环境配置
VITE_NODE_ENV=production
EOF
        log_success "web/.env 文件创建完成"
    else
        log_info "web/.env 文件已存在，跳过创建"
    fi
}

# 构建和启动服务
deploy_services() {
    log_info "开始构建和启动服务..."
    
    # 停止现有服务
    log_info "停止现有服务..."
    docker-compose down --remove-orphans || true
    
    # 清理未使用的镜像和容器
    log_info "清理 Docker 资源..."
    docker system prune -f || true
    
    # 创建自定义网络（如果不存在）
    log_info "创建Docker网络..."
    if ! docker network ls | grep -q "wedding-net"; then
        if [[ -z "$AVAILABLE_SUBNET" ]] || [[ -z "$AVAILABLE_GATEWAY" ]]; then
            log_error "未找到可用的网络子网配置"
            exit 1
        fi
        
        docker network create \
            --driver bridge \
            --subnet="$AVAILABLE_SUBNET" \
            --gateway="$AVAILABLE_GATEWAY" \
            --opt com.docker.network.bridge.name=wedding-br0 \
            --opt com.docker.network.driver.mtu=1500 \
            wedding-net || {
            log_error "创建Docker网络失败，子网: $AVAILABLE_SUBNET"
            log_info "尝试清理网络冲突..."
            docker network prune -f 2>/dev/null || true
            exit 1
        }
        log_success "Docker网络创建成功，使用子网: $AVAILABLE_SUBNET"
    else
        log_info "Docker网络已存在"
    fi
    
    # 构建镜像
    log_info "构建应用镜像..."
    docker-compose build --no-cache
    
    # 分阶段启动服务以确保依赖关系
    log_info "启动基础设施服务..."
    docker-compose up -d mysql redis minio
    
    # 等待基础设施服务健康检查通过
    log_info "等待基础设施服务就绪..."
    wait_for_service_health "mysql" 60
    wait_for_service_health "redis" 30
    wait_for_service_health "minio" 30
    
    # 启动应用服务
    log_info "启动应用服务..."
    docker-compose up -d server
    wait_for_service_health "server" 60
    
    # 启动前端服务
    log_info "启动前端服务..."
    docker-compose up -d web
    wait_for_service_health "web" 30
    
    # 启动反向代理
    log_info "启动反向代理服务..."
    docker-compose up -d caddy
    
    # 初始化数据库，增加重试机制
    log_info "执行数据库初始化..."
    local max_retries=5
    local attempt=1
    until docker-compose exec -T server npm run db:init; do
        if [ $attempt -eq $max_retries ]; then
            log_error "数据库初始化失败，已达到最大重试次数。"
            log_info "请检查 'server' 服务日志以获取详细信息: docker-compose logs server"
            exit 1
        fi
        log_warning "数据库初始化失败，将在 10 秒后重试 (尝试次数: $attempt/$max_retries)..."
        sleep 10
        attempt=$((attempt+1))
    done
    log_success "数据库初始化成功。"
    
    # 检查服务状态
    log_info "检查服务状态..."
    docker-compose ps
}

# 等待服务健康检查通过
wait_for_service_health() {
    local service_name=$1
    local timeout=${2:-30}
    local elapsed=0
    local interval=5
    
    log_info "等待 $service_name 服务健康检查通过..."
    
    while [ $elapsed -lt $timeout ]; do
        local health_status=$(docker-compose ps --format "table {{.Service}}\t{{.Status}}" | grep "$service_name" | awk '{print $2}')
        
        if echo "$health_status" | grep -q "healthy"; then
            log_success "$service_name 服务健康检查通过"
            return 0
        elif echo "$health_status" | grep -q "unhealthy"; then
            log_error "$service_name 服务健康检查失败"
            docker-compose logs --tail=20 "$service_name"
            return 1
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        log_info "等待 $service_name 健康检查... ($elapsed/${timeout}s)"
    done
    
    log_warning "$service_name 服务健康检查超时，但继续部署"
    return 0
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local services=("mysql:3306" "redis:6379" "minio:9000" "server:3000" "web:5173")
    local failed_services=()
    
    # 检查容器状态
    log_info "检查容器运行状态..."
    local containers=("wedding_mysql" "wedding_redis" "wedding_minio" "wedding_server" "wedding_web" "wedding_caddy")
    for container in "${containers[@]}"; do
        if ! docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container.*Up"; then
            failed_services+=("$container")
        fi
    done
    
    # 检查端口连通性
    log_info "检查服务端口连通性..."
    for service in "${services[@]}"; do
        local name=$(echo $service | cut -d':' -f1)
        local port=$(echo $service | cut -d':' -f2)
        
        if ! docker-compose exec -T $name nc -z localhost $port 2>/dev/null; then
            failed_services+=("$name:$port")
        fi
    done
    
    # 检查网络连通性
    log_info "检查服务间网络连通性..."
    if docker-compose exec -T server nc -z mysql 3306 2>/dev/null; then
        log_success "Server -> MySQL 连接正常"
    else
        failed_services+=("server->mysql")
    fi
    
    if docker-compose exec -T server nc -z redis 6379 2>/dev/null; then
        log_success "Server -> Redis 连接正常"
    else
        failed_services+=("server->redis")
    fi
    
    if docker-compose exec -T server nc -z minio 9000 2>/dev/null; then
        log_success "Server -> MinIO 连接正常"
    else
        failed_services+=("server->minio")
    fi
    
    # 检查HTTP服务
    log_info "检查HTTP服务可访问性..."
    if curl -f -s http://localhost:3000/api/health >/dev/null 2>&1; then
        log_success "API服务健康检查通过"
    else
        failed_services+=("api-health")
    fi
    
    if curl -f -s http://localhost:5173 >/dev/null 2>&1; then
        log_success "Web服务健康检查通过"
    else
        failed_services+=("web-health")
    fi
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        log_error "以下服务健康检查失败: ${failed_services[*]}"
        log_info "查看服务日志:"
        for service in "${failed_services[@]}"; do
            local service_name=$(echo $service | cut -d':' -f1 | cut -d'-' -f1)
            if docker-compose ps --services | grep -q "$service_name"; then
                echo "=== $service_name 日志 ==="
                docker-compose logs --tail=20 $service_name
            fi
        done
        
        # 显示网络诊断信息
        log_info "网络诊断信息:"
        docker network ls
        docker network inspect wedding-net 2>/dev/null || log_warning "wedding-net网络不存在"
        
        return 1
    else
        log_success "所有服务健康检查通过"
        return 0
    fi
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

    sudo fallocate -l $swap_size $swap_file
    sudo chmod 600 $swap_file
    sudo mkswap $swap_file
    sudo swapon $swap_file

    # 持久化交换文件
    if ! grep -q "$swap_file none swap sw 0 0" /etc/fstab; then
        echo "$swap_file none swap sw 0 0" | sudo tee -a /etc/fstab
    fi

    log_success "2G 交换文件创建并启用成功。"
}

# 云服务器环境配置
setup_cloud_server() {
    if [[ $OS == "macOS" ]]; then
        log_info "macOS环境，跳过云服务器配置"
        return
    fi

    log_info "配置云服务器环境..."
    
    # 检查并配置防火墙
    configure_firewall
    
    # 优化系统参数
    optimize_system_params
    
    # 检查系统资源
    check_system_resources
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙规则..."
    
    # 检查防火墙状态
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian UFW
        log_info "检测到UFW防火墙"
        sudo ufw --force enable
        sudo ufw allow 22/tcp comment 'SSH'
        sudo ufw allow 80/tcp comment 'HTTP'
        sudo ufw allow 443/tcp comment 'HTTPS'
        sudo ufw allow 3000/tcp comment 'API Server'
        sudo ufw allow 9001/tcp comment 'MinIO Console'
        log_success "UFW防火墙规则配置完成"
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL firewalld
        log_info "检测到firewalld防火墙"
        sudo systemctl enable firewalld
        sudo systemctl start firewalld
        sudo firewall-cmd --permanent --add-port=22/tcp
        sudo firewall-cmd --permanent --add-port=80/tcp
        sudo firewall-cmd --permanent --add-port=443/tcp
        sudo firewall-cmd --permanent --add-port=3000/tcp
        sudo firewall-cmd --permanent --add-port=9001/tcp
        sudo firewall-cmd --reload
        log_success "firewalld防火墙规则配置完成"
    else
        log_warning "未检测到支持的防火墙，请手动配置以下端口: 22, 80, 443, 3000, 9001"
    fi
}

# 优化系统参数
optimize_system_params() {
    log_info "优化系统参数..."
    
    # 优化内核参数
    cat > /tmp/docker-sysctl.conf << EOF
# Docker优化参数
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
vm.max_map_count = 262144
fs.file-max = 65536
EOF
    
    sudo cp /tmp/docker-sysctl.conf /etc/sysctl.d/99-docker.conf
    sudo sysctl -p /etc/sysctl.d/99-docker.conf
    
    log_success "系统参数优化完成"
}

# 检查系统资源
check_system_resources() {
    log_info "检查系统资源..."
    
    # 检查内存
    local total_mem=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [ $total_mem -lt 1024 ]; then
        log_warning "系统内存不足1GB ($total_mem MB)，建议至少2GB内存"
        log_info "将创建交换文件以增加虚拟内存"
        setup_swap
    else
        log_success "系统内存充足: ${total_mem}MB"
    fi
    
    # 检查磁盘空间
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $disk_usage -gt 80 ]; then
        log_warning "磁盘使用率过高: ${disk_usage}%，建议清理磁盘空间"
    else
        log_success "磁盘空间充足，使用率: ${disk_usage}%"
    fi
    
    # 检查CPU核心数
    local cpu_cores=$(nproc)
    log_info "CPU核心数: $cpu_cores"
    if [ $cpu_cores -lt 2 ]; then
        log_warning "CPU核心数较少，可能影响性能"
    fi
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo
    echo "=== 服务访问信息 ==="
    
    # 获取服务器IP地址
    local server_ip
    if [[ $OS == "macOS" ]]; then
        server_ip="localhost"
    else
        # 优先显示公网IP
        server_ip=$(curl -s --connect-timeout 10 ifconfig.me 2>/dev/null || curl -s --connect-timeout 10 ipinfo.io/ip 2>/dev/null)
        if [[ -z "$server_ip" ]]; then
            server_ip=$(hostname -I | awk '{print $1}')
            log_warning "无法获取公网IP，显示内网IP: $server_ip"
        else
            log_info "显示公网IP: $server_ip"
        fi
    fi
    
    echo "🌐 Web 应用: http://$server_ip (通过Caddy反向代理)"
    echo "🔧 API 服务: http://$server_ip:3000"
    echo "📊 MinIO 控制台: http://$server_ip:9001"
    echo "   用户名: rustfsadmin"
    echo "   密码: rustfssecret123"
    echo "🗄️  MySQL 数据库: $server_ip:3306"
    echo "   数据库: wedding_host"
    echo "   用户名: wedding"
    echo "   密码: wedding123"
    echo "🔴 Redis 缓存: $server_ip:6379"
    echo
    echo "=== Docker 网络信息 ==="
    echo "网络名称: wedding-net"
    echo "网络类型: bridge"
    echo "子网范围: ${AVAILABLE_SUBNET:-动态分配}"
    echo "网关地址: ${AVAILABLE_GATEWAY:-动态分配}"
    echo "网桥名称: wedding-br0"
    echo
    echo "=== 服务间通信 ==="
    echo "• Server 连接 MySQL: mysql:3306"
    echo "• Server 连接 Redis: redis:6379"
    echo "• Server 连接 MinIO: minio:9000"
    echo "• Web 连接 Server: server:3000"
    echo "• Caddy 代理 Web: web:5173"
    echo "• Caddy 代理 Server: server:3000"
    echo
    echo "=== 管理命令 ==="
    echo "查看服务状态: docker-compose ps"
    echo "查看服务日志: docker-compose logs -f [service_name]"
    echo "查看网络信息: docker network inspect wedding-net"
    echo "重启服务: docker-compose restart [service_name]"
    echo "停止所有服务: docker-compose down"
    echo "更新并重启: ./deploy.sh update"
    echo "健康检查: ./deploy.sh status"
    echo
}

# 显示故障排除信息
show_troubleshooting_info() {
    echo
    echo "=== 故障排除指南 ==="
    echo "如果遇到问题，请检查以下几点："
    echo
    echo "1. 🔍 检查服务状态:"
    echo "   docker-compose ps"
    echo "   docker-compose logs [service_name]"
    echo
    echo "2. 🌐 检查网络连接:"
    echo "   docker network ls"
    echo "   docker network inspect wedding-net"
    echo
    echo "3. 🔧 重启服务:"
    echo "   docker-compose restart [service_name]"
    echo "   docker-compose down && docker-compose up -d"
    echo
    echo "4. 🧹 清理和重建:"
    echo "   docker-compose down -v"
    echo "   docker system prune -f"
    echo "   ./deploy.sh"
    echo
    echo "5. 📊 检查资源使用:"
    echo "   docker stats"
    echo "   df -h"
    echo "   free -h"
    echo
    echo "6. 🔒 检查权限:"
    echo "   sudo usermod -aG docker \$USER"
    echo "   newgrp docker"
    echo
    echo "7. 🌐 网络问题:"
    echo "   检查Docker网络子网是否与现有网络冲突"
    echo "   检查防火墙设置是否阻止了必要端口"
    echo
    echo "8. 🔥 云服务器防火墙配置:"
    if command -v ufw &> /dev/null; then
        echo "   sudo ufw status"
        echo "   sudo ufw allow 80/tcp"
        echo "   sudo ufw allow 443/tcp"
        echo "   sudo ufw allow 3000/tcp"
    elif command -v firewall-cmd &> /dev/null; then
        echo "   sudo firewall-cmd --list-all"
        echo "   sudo firewall-cmd --permanent --add-port=80/tcp"
        echo "   sudo firewall-cmd --permanent --add-port=443/tcp"
        echo "   sudo firewall-cmd --permanent --add-port=3000/tcp"
        echo "   sudo firewall-cmd --reload"
    fi
    echo
    echo "9. 🌍 云服务器安全组配置:"
    echo "   确保云服务器安全组开放以下端口:"
    echo "   - 22 (SSH)"
    echo "   - 80 (HTTP)"
    echo "   - 443 (HTTPS)"
    echo "   - 3000 (API服务)"
    echo "   - 9001 (MinIO控制台)"
    echo
    echo "10. 📝 查看详细日志:"
    echo "    journalctl -u docker.service"
    echo "    docker-compose logs --follow"
    echo
    echo "11. 🔄 重新获取公网IP:"
    echo "    curl ifconfig.me"
    echo "    如果CORS错误，请检查server/.env中的CORS_ORIGIN配置"
    echo
}

# 备份当前部署
backup_deployment() {
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    log_info "创建部署备份到: $backup_dir"
    
    mkdir -p "$backup_dir"
    
    # 备份环境文件
    if [[ -f "./server/.env" ]]; then
        cp "./server/.env" "$backup_dir/server.env"
    fi
    if [[ -f "./web/.env" ]]; then
        cp "./web/.env" "$backup_dir/web.env"
    fi
    
    # 备份数据库（如果容器正在运行）
    if docker-compose ps mysql | grep -q "Up"; then
        log_info "备份数据库..."
        docker-compose exec -T mysql mysqldump -u wedding -pwedding123 wedding_host > "$backup_dir/database.sql" 2>/dev/null || log_warning "数据库备份失败"
    fi
    
    log_success "备份完成: $backup_dir"
}

# 显示使用帮助
show_help() {
    echo "婚礼应用自动化部署脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  deploy, -d     执行完整部署（默认）"
    echo "  start, -s      启动服务"
    echo "  stop, -t       停止服务"
    echo "  restart, -r    重启服务"
    echo "  status, -st    查看服务状态"
    echo "  logs, -l       查看服务日志"
    echo "  backup, -b     备份当前部署"
    echo "  clean, -c      清理 Docker 资源"
    echo "  update, -u     更新并重启服务"
    echo "  help, -h       显示此帮助信息"
    echo
}

# 启动服务
start_services() {
    log_info "启动服务..."
    docker-compose up -d
    sleep 10
    docker-compose ps
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    docker-compose down
    log_success "服务已停止"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    docker-compose restart
    sleep 10
    docker-compose ps
}

# 查看服务状态
show_status() {
    echo "=== 服务状态 ==="
    docker-compose ps
    echo
    echo "=== 系统资源使用 ==="
    docker stats --no-stream
}

# 查看日志
show_logs() {
    echo "=== 最近日志 ==="
    docker-compose logs --tail=50 -f
}

# 清理资源
clean_resources() {
    log_info "清理 Docker 资源..."
    docker-compose down --remove-orphans
    docker system prune -f
    docker volume prune -f
    log_success "清理完成"
}

# 更新服务
update_services() {
    log_info "更新服务..."
    backup_deployment
    docker-compose down
    docker-compose build
    docker-compose up -d
    sleep 30
    health_check
}

# 主函数
main() {
    local action="${1:-deploy}"
    
    case $action in
        deploy|-d)
            echo "=== 婚礼应用自动化部署脚本 ==="
            echo
            
            # 检查 root 用户
            check_root
            
            # 检测操作系统
            detect_os
            
            # 云服务器环境配置
            setup_cloud_server
            
            # 安装 Docker
            install_docker
            
            # 安装 Docker Compose
            install_docker_compose
            
            # 检查端口
            check_ports
            
            # 检查Docker网络配置
            check_docker_network
            
            # 创建环境文件
            create_env_files
            
            # 备份现有部署
            backup_deployment
            
            # 部署服务
            deploy_services
            
            # 健康检查
            if health_check; then
                show_deployment_info
            else
                log_error "部署过程中出现问题，请检查日志"
                show_troubleshooting_info
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

# 如果脚本被直接执行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
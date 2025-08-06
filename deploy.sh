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

# 安装 Docker
install_docker() {
    if command -v docker &> /dev/null; then
        log_success "Docker 已安装"
        docker --version
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
    local ports=("80" "443" "3000" "8000" "3306" "6379" "9000" "9001")
    local occupied_ports=()
    
    log_info "检查端口占用情况..."
    
    for port in "${ports[@]}"; do
        if netstat -tuln | grep ":$port " > /dev/null 2>&1; then
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
PORT=8000
NODE_ENV=production

# CORS 配置
CORS_ORIGIN=http://114.132.225.94
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
VITE_API_BASE_URL=http://114.132.225.94/api
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
    
    # 构建镜像
    log_info "构建应用镜像..."
    docker-compose build --no-cache
    
    # 启动服务
    log_info "启动所有服务..."
    docker-compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30

    # 初始化数据库
    log_info "执行数据库初始化..."
    docker-compose exec -T server npm run db:init
    
    # 检查服务状态
    log_info "检查服务状态..."
    docker-compose ps
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local services=("mysql:3306" "redis:6379" "minio:9000" "server:8000" "web:3000")
    local failed_services=()
    
    for service in "${services[@]}"; do
        local name=$(echo $service | cut -d':' -f1)
        local port=$(echo $service | cut -d':' -f2)
        
        if ! docker-compose exec -T $name nc -z localhost $port 2>/dev/null; then
            failed_services+=("$name")
        fi
    done
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        log_error "以下服务健康检查失败: ${failed_services[*]}"
        log_info "查看服务日志:"
        for service in "${failed_services[@]}"; do
            echo "=== $service 日志 ==="
            docker-compose logs --tail=20 $service
        done
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

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo
    echo "=== 服务访问信息 ==="
    echo "🌐 Web 应用: http://$(hostname -I | awk '{print $1}')"
    echo "🔧 API 服务: http://$(hostname -I | awk '{print $1}'):8000"
    echo "📊 MinIO 控制台: http://$(hostname -I | awk '{print $1}'):9001"
    echo "   用户名: rustfsadmin"
    echo "   密码: rustfssecret123"
    echo
    echo "=== 管理命令 ==="
    echo "查看服务状态: docker-compose ps"
    echo "查看服务日志: docker-compose logs -f [service_name]"
    echo "重启服务: docker-compose restart [service_name]"
    echo "停止所有服务: docker-compose down"
    echo "更新并重启: ./deploy.sh"
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
    docker-compose build --no-cache
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
            
            # 安装 Docker
            install_docker
            
            # 安装 Docker Compose
            install_docker_compose

            # 配置交换文件
            setup_swap
            
            # 检查端口
            check_ports
            
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
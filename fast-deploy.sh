#!/bin/bash

# 婚礼应用高效快速部署脚本
# 针对构建速度和部署效率进行优化

set -e

# 全局变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
SERVER_IP=""
OS=""
VER=""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

log_progress() {
    echo -e "${CYAN}[PROGRESS]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "婚礼应用高效快速部署脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  fast, -f       快速部署（默认，跳过系统更新）"
    echo "  full, -F       完整部署（包含系统更新）"
    echo "  build, -b      仅重新构建应用"
    echo "  start, -s      启动服务"
    echo "  stop, -t       停止服务"
    echo "  restart, -r    重启服务"
    echo "  status, -st    查看服务状态"
    echo "  logs, -l       查看服务日志"
    echo "  clean, -c      清理 Docker 资源"
    echo "  optimize, -o   优化 Docker 配置"
    echo "  help, -h       显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0 fast        # 快速部署（推荐）"
    echo "  $0 build       # 仅重新构建"
    echo "  $0 status      # 查看状态"
    echo
}

# 显示欢迎信息
show_welcome() {
    clear
    echo "======================================"
    echo "    婚礼应用高效快速部署脚本"
    echo "======================================"
    echo
    echo "🚀 优化特性："
    echo "✓ 智能构建缓存"
    echo "✓ 并行构建优化"
    echo "✓ 实时进度显示"
    echo "✓ 网络加速配置"
    echo "✓ 资源使用优化"
    echo
}

# 检查项目结构
check_project_structure() {
    log_step "检查项目结构..."
    
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

# 获取服务器 IP
get_server_ip() {
    log_step "获取服务器 IP..."
    # 尝试多种方法获取公网 IP
    SERVER_IP=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || \
                curl -s --connect-timeout 5 ipinfo.io/ip 2>/dev/null || \
                curl -s --connect-timeout 5 icanhazip.com 2>/dev/null)
    
    if [[ -z "$SERVER_IP" ]]; then
        # 如果无法获取公网 IP，使用内网 IP
        SERVER_IP=$(hostname -I | awk '{print $1}')
    fi
    
    log_info "服务器 IP: $SERVER_IP"
}

# 优化 Docker 配置
optimize_docker() {
    log_step "优化 Docker 配置..."
    
    # 创建 Docker daemon 配置
    local docker_config="/etc/docker/daemon.json"
    
    if [[ ! -f "$docker_config" ]]; then
        log_info "创建 Docker daemon 配置文件..."
        sudo mkdir -p /etc/docker
        sudo tee "$docker_config" > /dev/null << EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ],
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5,
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "live-restore": true,
  "userland-proxy": false,
  "experimental": false,
  "metrics-addr": "127.0.0.1:9323",
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
EOF
        
        # 重启 Docker 服务
        log_info "重启 Docker 服务以应用配置..."
        sudo systemctl restart docker
        sleep 5
        log_success "Docker 配置优化完成"
    else
        log_info "Docker 配置文件已存在，跳过优化"
    fi
}

# 安装 Docker（快速版本）
install_docker_fast() {
    if command -v docker &> /dev/null; then
        log_success "Docker 已安装: $(docker --version)"
        return
    fi

    log_step "快速安装 Docker..."
    
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        # 使用官方便捷脚本
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        rm get-docker.sh
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"Rocky"* ]] || [[ $OS == *"AlmaLinux"* ]]; then
        if command -v dnf &> /dev/null; then
            sudo dnf install -y docker-ce docker-ce-cli containerd.io
        else
            sudo yum install -y docker-ce docker-ce-cli containerd.io
        fi
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
    
    # 添加当前用户到 docker 组
    sudo usermod -aG docker $USER
    log_success "Docker 安装完成"
}

# 安装 Docker Compose（快速版本）
install_docker_compose_fast() {
    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose 已安装: $(docker-compose --version)"
        return
    fi

    log_step "快速安装 Docker Compose..."
    
    # 直接下载最新版本
    local compose_version="v2.24.0"  # 使用稳定版本
    local compose_url="https://github.com/docker/compose/releases/download/${compose_version}/docker-compose-$(uname -s)-$(uname -m)"
    
    sudo curl -L "$compose_url" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log_success "Docker Compose 安装完成: $(docker-compose --version)"
}

# 创建优化的 Dockerfile
create_optimized_dockerfiles() {
    log_step "创建优化的 Dockerfile..."
    
    # 备份原始文件
    if [[ -f "$PROJECT_DIR/server/Dockerfile" ]]; then
        cp "$PROJECT_DIR/server/Dockerfile" "$PROJECT_DIR/server/Dockerfile.backup"
    fi
    if [[ -f "$PROJECT_DIR/web/Dockerfile" ]]; then
        cp "$PROJECT_DIR/web/Dockerfile" "$PROJECT_DIR/web/Dockerfile.backup"
    fi
    
    # 创建优化的 server Dockerfile
    cat > "$PROJECT_DIR/server/Dockerfile.optimized" << 'EOF'
# 多阶段构建优化版本
FROM node:18-alpine AS base

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖（使用缓存优化）
RUN npm ci --only=production --silent && npm cache clean --force

# 开发阶段
FROM base AS dev
RUN npm ci --silent
COPY . .
RUN npm run build

# 生产阶段
FROM base AS production
COPY --from=dev /app/dist ./dist
COPY --from=dev /app/package*.json ./

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# 更改文件所有权
USER nodejs

EXPOSE 8000

CMD ["npm", "start"]
EOF
    
    # 创建优化的 web Dockerfile
    cat > "$PROJECT_DIR/web/Dockerfile.optimized" << 'EOF'
# 多阶段构建优化版本
FROM node:18-alpine AS base

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --silent && npm cache clean --force

# 构建阶段
FROM base AS builder
COPY . .
RUN npm run build

# 生产阶段 - 使用 nginx 提供静态文件服务
FROM nginx:alpine AS production

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
RUN echo 'server {\n\
    listen 3000;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location /api {\n\
        proxy_pass http://server:8000;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
EOF
    
    log_success "优化的 Dockerfile 创建完成"
}

# 创建环境文件
create_env_files() {
    log_step "创建环境配置文件..."
    
    # 确保在项目目录中
    cd "$PROJECT_DIR"
    
    # 创建 server .env 文件
    if [[ ! -f "./server/.env" ]]; then
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
    if [[ ! -f "./web/.env" ]]; then
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

# 创建优化的 docker-compose 文件
create_optimized_compose() {
    log_step "创建优化的 docker-compose 配置..."
    
    # 备份原始文件
    if [[ -f "$PROJECT_DIR/docker-compose.yml" ]]; then
        cp "$PROJECT_DIR/docker-compose.yml" "$PROJECT_DIR/docker-compose.yml.backup"
    fi
    
    cat > "$PROJECT_DIR/docker-compose.fast.yml" << 'EOF'
services:
  # 基础设施服务
  mysql:
    image: mysql:8.0
    container_name: wedding_mysql
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: wedding_host
      MYSQL_USER: wedding
      MYSQL_PASSWORD: wedding123
      MYSQL_INITDB_SKIP_TZINFO: 1
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    command: >
      --default-authentication-plugin=mysql_native_password
      --innodb-buffer-pool-size=256M
      --innodb-log-file-size=64M
      --innodb-flush-method=O_DIRECT
      --innodb-flush-log-at-trx-commit=2
      --sync-binlog=0
    networks:
      - wedding-net
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  redis:
    image: redis:7-alpine
    container_name: wedding_redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 128M
        reservations:
          memory: 64M
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: >
      redis-server
      --appendonly yes
      --appendfsync everysec
      --maxmemory 100mb
      --maxmemory-policy allkeys-lru
    networks:
      - wedding-net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: wedding_minio
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
    environment:
      MINIO_ROOT_USER: rustfsadmin
      MINIO_ROOT_PASSWORD: rustfssecret123
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    networks:
      - wedding-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      timeout: 5s
      retries: 5

  # 应用服务
  server:
    build:
      context: ./server
      dockerfile: Dockerfile.optimized
      args:
        BUILDKIT_INLINE_CACHE: 1
    container_name: wedding_server
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    ports:
      - "8000:8000"
    env_file:
      - ./server/.env
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    networks:
      - wedding-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      timeout: 10s
      retries: 5
      start_period: 30s

  web:
    build:
      context: ./web
      dockerfile: Dockerfile.optimized
      args:
        BUILDKIT_INLINE_CACHE: 1
    container_name: wedding_web
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
    ports:
      - "3000:3000"
    env_file:
      - ./web/.env
    depends_on:
      server:
        condition: service_healthy
    networks:
      - wedding-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      timeout: 5s
      retries: 5

  caddy:
    image: caddy:2-alpine
    container_name: wedding_caddy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 128M
        reservations:
          memory: 64M
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      web:
        condition: service_healthy
      server:
        condition: service_healthy
    networks:
      - wedding-net

networks:
  wedding-net:
    driver: bridge
    driver_opts:
      com.docker.network.driver.mtu: 1450

volumes:
  mysql_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  caddy_data:
    driver: local
  caddy_config:
    driver: local
EOF
    
    log_success "优化的 docker-compose 配置创建完成"
}

# 预拉取基础镜像
pull_base_images() {
    log_step "预拉取基础镜像..."
    
    local images=(
        "node:18-alpine"
        "nginx:alpine"
        "mysql:8.0"
        "redis:7-alpine"
        "minio/minio:latest"
        "caddy:2-alpine"
    )
    
    for image in "${images[@]}"; do
        log_progress "拉取镜像: $image"
        docker pull "$image" &
    done
    
    # 等待所有拉取完成
    wait
    log_success "基础镜像拉取完成"
}

# 构建应用镜像（并行优化）
build_application() {
    log_step "构建应用镜像..."
    
    cd "$PROJECT_DIR"
    
    # 启用 BuildKit 以获得更好的构建性能
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
    
    # 使用优化的 compose 文件构建
    log_progress "开始并行构建..."
    
    # 显示构建进度
    docker-compose -f docker-compose.fast.yml build --parallel --progress=plain
    
    log_success "应用镜像构建完成"
}

# 启动服务（优化版本）
start_services() {
    log_step "启动服务..."
    
    cd "$PROJECT_DIR"
    
    # 使用优化的 compose 文件
    docker-compose -f docker-compose.fast.yml up -d
    
    log_success "服务启动完成"
}

# 健康检查（增强版本）
health_check() {
    log_step "执行健康检查..."
    
    cd "$PROJECT_DIR"
    
    local max_attempts=60  # 增加等待时间
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_progress "健康检查 ($attempt/$max_attempts)..."
        
        # 检查所有服务的健康状态
        local healthy_services=$(docker-compose -f docker-compose.fast.yml ps --format "table {{.Service}}\t{{.Status}}" | grep -c "healthy" || echo "0")
        local total_services=5  # mysql, redis, minio, server, web
        
        if [[ $healthy_services -eq $total_services ]]; then
            log_success "所有服务健康检查通过"
            return 0
        fi
        
        # 显示当前状态
        if [[ $((attempt % 10)) -eq 0 ]]; then
            log_info "当前服务状态:"
            docker-compose -f docker-compose.fast.yml ps
        fi
        
        sleep 5
        ((attempt++))
    done
    
    log_error "健康检查超时，部分服务可能未正常启动"
    docker-compose -f docker-compose.fast.yml ps
    return 1
}

# 显示部署信息
show_deployment_info() {
    log_success "🎉 部署完成！"
    echo
    echo "======================================"
    echo "         快速部署成功！"
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
    echo
    echo "📊 性能优化："
    echo "   ✓ 使用了多阶段构建"
    echo "   ✓ 启用了 Docker BuildKit"
    echo "   ✓ 配置了镜像加速"
    echo "   ✓ 优化了资源限制"
    echo "   ✓ 启用了健康检查"
    echo
    echo "📋 服务状态："
    cd "$PROJECT_DIR" && docker-compose -f docker-compose.fast.yml ps
    echo
}

# 查看服务状态
show_status() {
    cd "$PROJECT_DIR"
    echo "=== 服务状态 ==="
    docker-compose -f docker-compose.fast.yml ps
    echo
    echo "=== 资源使用情况 ==="
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# 查看日志
show_logs() {
    cd "$PROJECT_DIR"
    echo "=== 服务日志 ==="
    docker-compose -f docker-compose.fast.yml logs --tail=50 -f
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    cd "$PROJECT_DIR"
    docker-compose -f docker-compose.fast.yml down
    log_success "服务已停止"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    cd "$PROJECT_DIR"
    docker-compose -f docker-compose.fast.yml restart
    sleep 10
    docker-compose -f docker-compose.fast.yml ps
}

# 清理资源
clean_resources() {
    log_info "清理 Docker 资源..."
    cd "$PROJECT_DIR"
    docker-compose -f docker-compose.fast.yml down --remove-orphans
    docker system prune -f
    docker volume prune -f
    log_success "清理完成"
}

# 系统更新（可选）
update_system() {
    log_step "更新系统包..."
    
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        sudo apt-get update -y
        sudo apt-get upgrade -y
        sudo apt-get install -y curl wget git unzip net-tools htop
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"Rocky"* ]] || [[ $OS == *"AlmaLinux"* ]]; then
        if command -v dnf &> /dev/null; then
            sudo dnf update -y
            sudo dnf install -y curl wget git unzip net-tools htop
        else
            sudo yum update -y
            sudo yum install -y curl wget git unzip net-tools htop
        fi
    fi
    
    log_success "系统更新完成"
}

# 主函数
main() {
    local action="${1:-fast}"
    
    case $action in
        fast|-f)
            show_welcome
            echo "🚀 开始快速部署..."
            echo
            
            detect_os
            check_project_structure
            get_server_ip
            install_docker_fast
            install_docker_compose_fast
            optimize_docker
            create_env_files
            create_optimized_dockerfiles
            create_optimized_compose
            pull_base_images
            build_application
            start_services
            
            if health_check; then
                show_deployment_info
            else
                log_error "部署过程中出现问题，请检查日志"
                exit 1
            fi
            ;;
        full|-F)
            show_welcome
            echo "🔧 开始完整部署..."
            echo
            
            detect_os
            check_project_structure
            update_system
            get_server_ip
            install_docker_fast
            install_docker_compose_fast
            optimize_docker
            create_env_files
            create_optimized_dockerfiles
            create_optimized_compose
            pull_base_images
            build_application
            start_services
            
            if health_check; then
                show_deployment_info
            else
                log_error "部署过程中出现问题，请检查日志"
                exit 1
            fi
            ;;
        build|-b)
            echo "🔨 重新构建应用..."
            check_project_structure
            create_optimized_dockerfiles
            create_optimized_compose
            build_application
            log_success "构建完成"
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
        clean|-c)
            clean_resources
            ;;
        optimize|-o)
            optimize_docker
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
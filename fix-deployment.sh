#!/bin/bash

# Wedding Client 部署修复脚本
# 解决Docker Hub连接超时问题，使用本地已有镜像

set -euo pipefail

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/deployment/.env.production"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 错误处理
error_exit() {
    log_error "$1"
    exit 1
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    command -v docker >/dev/null 2>&1 || error_exit "Docker 未安装"
    command -v docker-compose >/dev/null 2>&1 || error_exit "Docker Compose 未安装"
    
    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker 服务未运行"
    fi
    
    log_success "依赖检查完成"
}

# 检查现有镜像
check_existing_images() {
    log_info "检查现有Docker镜像..."
    
    echo "当前可用镜像:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}"
    
    # 检查必需的镜像是否存在
    local required_images=("nginx:alpine" "mysql:8.0" "redis:7-alpine" "minio/minio")
    local missing_images=()
    
    for image in "${required_images[@]}"; do
        if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${image}$"; then
            missing_images+=("$image")
        fi
    done
    
    if [ ${#missing_images[@]} -eq 0 ]; then
        log_success "所有必需镜像都已存在"
    else
        log_warning "缺少镜像: ${missing_images[*]}"
    fi
}

# 创建修复版本的docker-compose文件
create_fixed_compose() {
    log_info "创建修复版本的docker-compose配置..."
    
    # 备份原文件
    if [ -f "$COMPOSE_FILE" ]; then
        cp "$COMPOSE_FILE" "$COMPOSE_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "已备份原配置文件"
    fi
    
    # 创建修复版本，移除可能导致拉取失败的配置
    cat > "$COMPOSE_FILE.fixed" << 'EOF'
# Wedding Club - 生产环境 Docker Compose 配置 (修复版本)
# 使用本地已有镜像，避免网络拉取问题

services:
  # Web前端服务
  web:
    build:
      context: ../web
      dockerfile: Dockerfile.prod
    container_name: wedding-web
    restart: unless-stopped
    volumes:
      - web_static:/usr/share/nginx/html
    networks:
      - wedding-prod-net
    labels:
      - "com.wedding.service=web"
      - "com.wedding.environment=production"

  # Nginx 负载均衡器和反向代理
  nginx:
    image: nginx:alpine
    container_name: wedding-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./logs/nginx:/var/log/nginx
      - nginx_cache:/var/cache/nginx
      - web_static:/usr/share/nginx/html:ro
    depends_on:
      - web
      - api
    networks:
      - wedding-prod-net
    environment:
      - TZ=Asia/Shanghai
    labels:
      - "com.wedding.service=nginx"
      - "com.wedding.environment=production"

  # API服务器
  api:
    build:
      context: ../server
      dockerfile: Dockerfile.prod
      args:
        NODE_ENV: production
    container_name: wedding-api
    restart: unless-stopped
    environment:
      # 数据库配置
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=wedding_club
      - DB_USERNAME=wedding_user
      - DB_PASSWORD=${DB_PASSWORD}
      
      # Redis配置
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      
      # MinIO配置
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - MINIO_BUCKET=wedding-files
      
      # JWT配置
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      
      # 应用配置
      - NODE_ENV=production
      - PORT=3000
      - LOG_LEVEL=info
      - CORS_ORIGIN=${CORS_ORIGIN}
      - TZ=Asia/Shanghai
    volumes:
      - ./logs/api:/app/logs
      - ./uploads:/app/uploads
    depends_on:
      - mysql
      - redis
      - minio
    networks:
      - wedding-prod-net
    labels:
      - "com.wedding.service=api"
      - "com.wedding.environment=production"

  # MySQL数据库
  mysql:
    image: mysql:8.0
    container_name: wedding-mysql
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=wedding_club
      - MYSQL_USER=wedding_user
      - MYSQL_PASSWORD=${DB_PASSWORD}
      - TZ=Asia/Shanghai
    volumes:
      - mysql_data:/var/lib/mysql
      - ./logs/mysql:/var/log/mysql
    ports:
      - "3306:3306"
    networks:
      - wedding-prod-net
    labels:
      - "com.wedding.service=mysql"
      - "com.wedding.environment=production"

  # Redis缓存服务
  redis:
    image: redis:7-alpine
    container_name: wedding-redis
    restart: unless-stopped
    environment:
      - TZ=Asia/Shanghai
    volumes:
      - redis_data:/data
      - ./logs/redis:/var/log/redis
    ports:
      - "6379:6379"
    networks:
      - wedding-prod-net
    command: redis-server --requirepass ${REDIS_PASSWORD}
    labels:
      - "com.wedding.service=redis"
      - "com.wedding.environment=production"

  # MinIO对象存储
  minio:
    image: minio/minio:latest
    container_name: wedding-minio
    restart: unless-stopped
    environment:
      - MINIO_ROOT_USER=${MINIO_ACCESS_KEY}
      - MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY}
      - TZ=Asia/Shanghai
    volumes:
      - minio_data:/data
      - ./logs/minio:/var/log/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    networks:
      - wedding-prod-net
    command: server /data --console-address ":9001"
    labels:
      - "com.wedding.service=minio"
      - "com.wedding.environment=production"

# 网络配置
networks:
  wedding-prod-net:
    driver: bridge
    labels:
      - "com.wedding.network=main"
      - "com.wedding.environment=production"

# 数据卷配置
volumes:
  mysql_data:
    driver: local
    labels:
      - "com.wedding.volume=mysql"
      - "com.wedding.environment=production"
  
  redis_data:
    driver: local
    labels:
      - "com.wedding.volume=redis"
      - "com.wedding.environment=production"
  
  minio_data:
    driver: local
    labels:
      - "com.wedding.volume=minio"
      - "com.wedding.environment=production"
  
  nginx_cache:
    driver: local
    labels:
      - "com.wedding.volume=nginx-cache"
      - "com.wedding.environment=production"
  
  web_static:
    driver: local
    labels:
      - "com.wedding.volume=web-static"
      - "com.wedding.environment=production"
EOF

    log_success "修复版本配置文件已创建: $COMPOSE_FILE.fixed"
}

# 停止现有服务
stop_existing_services() {
    log_info "停止现有服务..."
    
    # 尝试停止可能运行的服务
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
    docker-compose -f "$COMPOSE_FILE.fixed" down --remove-orphans 2>/dev/null || true
    
    # 强制停止相关容器
    local containers=("wedding-nginx" "wedding-api" "wedding-mysql" "wedding-redis" "wedding-minio" "wedding-web")
    for container in "${containers[@]}"; do
        if docker ps -q -f name="$container" | grep -q .; then
            log_info "停止容器: $container"
            docker stop "$container" 2>/dev/null || true
            docker rm "$container" 2>/dev/null || true
        fi
    done
    
    log_success "现有服务已停止"
}

# 使用本地镜像部署
deploy_with_local_images() {
    log_info "使用本地镜像部署应用..."
    
    cd "$PROJECT_ROOT"
    
    # 加载环境变量
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
        log_info "已加载环境变量"
    else
        log_warning "环境变量文件不存在: $ENV_FILE"
    fi
    
    # 使用修复版本的配置文件部署
    log_info "启动服务..."
    if docker-compose -f "$COMPOSE_FILE.fixed" up -d --build --no-deps; then
        log_success "服务启动成功"
    else
        error_exit "服务启动失败"
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=12
    local attempt=1
    
    # 等待服务启动
    log_info "等待服务初始化..."
    sleep 30
    
    while [ $attempt -le $max_attempts ]; do
        log_info "健康检查尝试 $attempt/$max_attempts"
        
        local healthy_services=0
        local total_services=5
        
        # 检查容器状态
        if docker ps --format "{{.Names}}" | grep -q "wedding-nginx"; then
            ((healthy_services++))
            log_info "✓ Nginx 容器运行正常"
        fi
        
        if docker ps --format "{{.Names}}" | grep -q "wedding-api"; then
            ((healthy_services++))
            log_info "✓ API 容器运行正常"
        fi
        
        if docker ps --format "{{.Names}}" | grep -q "wedding-mysql"; then
            ((healthy_services++))
            log_info "✓ MySQL 容器运行正常"
        fi
        
        if docker ps --format "{{.Names}}" | grep -q "wedding-redis"; then
            ((healthy_services++))
            log_info "✓ Redis 容器运行正常"
        fi
        
        if docker ps --format "{{.Names}}" | grep -q "wedding-minio"; then
            ((healthy_services++))
            log_info "✓ MinIO 容器运行正常"
        fi
        
        if [ $healthy_services -eq $total_services ]; then
            log_success "所有服务健康检查通过"
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            log_info "等待30秒后重试..."
            sleep 30
        fi
        
        ((attempt++))
    done
    
    log_error "健康检查失败，显示服务状态:"
    docker-compose -f "$COMPOSE_FILE.fixed" ps
    docker-compose -f "$COMPOSE_FILE.fixed" logs --tail=20
}

# 显示部署状态
show_deployment_status() {
    log_info "部署状态信息:"
    
    echo "=========================================="
    echo "部署时间: $(date)"
    echo "项目路径: $PROJECT_ROOT"
    echo "=========================================="
    
    echo "服务状态:"
    docker-compose -f "$COMPOSE_FILE.fixed" ps
    
    echo "=========================================="
    echo "访问地址:"
    echo "  前端: http://114.132.225.94:8080"
    echo "  API: http://114.132.225.94:3000"
    echo "  MinIO控制台: http://114.132.225.94:9001"
    echo "=========================================="
}

# 清理资源
cleanup() {
    log_info "清理Docker资源..."
    
    # 清理未使用的镜像和容器
    docker system prune -f >/dev/null 2>&1 || true
    
    log_success "清理完成"
}

# 主函数
main() {
    log_info "开始修复Wedding Client部署问题"
    
    # 信号处理
    trap 'log_error "部署被中断"; exit 1' INT TERM
    
    check_dependencies
    check_existing_images
    create_fixed_compose
    stop_existing_services
    deploy_with_local_images
    health_check
    show_deployment_status
    cleanup
    
    log_success "🎉 Wedding Client部署修复完成！"
    
    echo ""
    log_info "如果需要恢复原配置，请运行:"
    echo "  mv $COMPOSE_FILE.backup.* $COMPOSE_FILE"
    echo ""
    log_info "如果修复版本工作正常，可以替换原配置:"
    echo "  mv $COMPOSE_FILE.fixed $COMPOSE_FILE"
}

# 显示帮助信息
show_help() {
    echo "Wedding Client 部署修复脚本"
    echo ""
    echo "使用方法:"
    echo "  $0                # 执行修复部署"
    echo "  $0 --help         # 显示帮助信息"
    echo ""
    echo "此脚本解决以下问题:"
    echo "  1. Docker Hub连接超时"
    echo "  2. 使用本地已有镜像"
    echo "  3. 简化配置避免网络问题"
    echo "  4. 自动健康检查和状态显示"
}

# 检查帮助参数
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    show_help
    exit 0
fi

# 执行主函数
main "$@"
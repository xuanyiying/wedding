#!/bin/bash

# 云服务器快速部署脚本
# 专为腾讯云、阿里云等云服务器环境优化

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a /tmp/wedding-deploy.log
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a /tmp/wedding-deploy.log
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a /tmp/wedding-deploy.log
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a /tmp/wedding-deploy.log
}

# 初始化日志
echo "=== 婚礼应用云服务器部署日志 ===" > /tmp/wedding-deploy.log
echo "部署时间: $(date)" >> /tmp/wedding-deploy.log
echo "服务器信息: $(uname -a)" >> /tmp/wedding-deploy.log
echo "========================================" >> /tmp/wedding-deploy.log

# 检查网络连接
check_network() {
    log_info "检查网络连接..."
    
    if ! ping -c 1 8.8.8.8 &> /dev/null; then
        log_error "网络连接失败，请检查网络设置"
        exit 1
    fi
    
    if ! curl -s --connect-timeout 10 ifconfig.me &> /dev/null; then
        log_warning "无法获取公网IP，可能影响CORS配置"
    fi
    
    log_success "网络连接正常"
}

# 检查系统要求
check_system_requirements() {
    log_info "检查系统要求..."
    
    # 检查内存
    local total_mem=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [ $total_mem -lt 512 ]; then
        log_error "系统内存不足512MB，无法运行Docker容器"
        exit 1
    elif [ $total_mem -lt 1024 ]; then
        log_warning "系统内存较少($total_mem MB)，建议至少1GB"
    else
        log_success "系统内存充足: ${total_mem}MB"
    fi
    
    # 检查磁盘空间
    local disk_free=$(df / | awk 'NR==2 {print $4}')
    local disk_free_gb=$((disk_free / 1024 / 1024))
    if [ $disk_free_gb -lt 2 ]; then
        log_error "磁盘空间不足2GB，无法完成部署"
        exit 1
    else
        log_success "磁盘空间充足: ${disk_free_gb}GB可用"
    fi
}

# 获取公网IP
get_public_ip() {
    log_info "获取服务器公网IP..."
    
    local public_ip
    public_ip=$(curl -s --connect-timeout 10 ifconfig.me 2>/dev/null || \
                curl -s --connect-timeout 10 ipinfo.io/ip 2>/dev/null || \
                curl -s --connect-timeout 10 icanhazip.com 2>/dev/null)
    
    if [[ -z "$public_ip" ]]; then
        log_warning "无法自动获取公网IP，使用内网IP"
        public_ip=$(hostname -I | awk '{print $1}')
    fi
    
    echo "$public_ip"
}

# 配置环境变量
setup_environment() {
    local public_ip=$1
    log_info "配置环境变量 (IP: $public_ip)..."
    
    # 创建server环境文件
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
CORS_ORIGIN=http://$public_ip
EOF
    
    # 创建web环境文件
    cat > ./web/.env << EOF
# API 配置
VITE_API_BASE_URL=/api
VITE_APP_TITLE=婚礼主持人平台

# 环境配置
VITE_NODE_ENV=production
EOF
    
    log_success "环境变量配置完成"
}

# 快速部署
quick_deploy() {
    log_info "开始快速部署..."
    
    # 停止现有服务
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # 清理Docker资源
    docker system prune -f 2>/dev/null || true
    
    # 构建并启动服务
    log_info "构建Docker镜像..."
    docker-compose build --no-cache
    
    log_info "启动服务..."
    docker-compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 初始化数据库
    log_info "初始化数据库..."
    local max_retries=3
    local attempt=1
    
    while [ $attempt -le $max_retries ]; do
        if docker-compose exec -T server npm run db:init; then
            log_success "数据库初始化成功"
            break
        else
            log_warning "数据库初始化失败，重试 $attempt/$max_retries"
            sleep 10
            attempt=$((attempt + 1))
        fi
    done
    
    if [ $attempt -gt $max_retries ]; then
        log_error "数据库初始化失败，请检查日志"
        return 1
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local failed_services=()
    
    # 检查容器状态
    local containers=("wedding_mysql" "wedding_redis" "wedding_minio" "wedding_server" "wedding_web" "wedding_caddy")
    for container in "${containers[@]}"; do
        if ! docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container.*Up"; then
            failed_services+=("$container")
        fi
    done
    
    # 检查HTTP服务
    sleep 10  # 等待服务完全启动
    
    if ! curl -f -s http://localhost:3000/api/health >/dev/null 2>&1; then
        failed_services+=("api-health")
    fi
    
    if ! curl -f -s http://localhost:5173 >/dev/null 2>&1; then
        failed_services+=("web-health")
    fi
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        log_error "健康检查失败的服务: ${failed_services[*]}"
        return 1
    else
        log_success "所有服务健康检查通过"
        return 0
    fi
}

# 显示部署结果
show_result() {
    local public_ip=$1
    
    echo
    echo "=== 🎉 部署完成！==="
    echo
    echo "📱 访问地址:"
    echo "   Web应用: http://$public_ip"
    echo "   API服务: http://$public_ip:3000"
    echo "   MinIO控制台: http://$public_ip:9001"
    echo
    echo "🔑 MinIO登录信息:"
    echo "   用户名: rustfsadmin"
    echo "   密码: rustfssecret123"
    echo
    echo "🗄️ 数据库信息:"
    echo "   地址: $public_ip:3306"
    echo "   数据库: wedding_host"
    echo "   用户名: wedding"
    echo "   密码: wedding123"
    echo
    echo "📋 常用命令:"
    echo "   查看服务状态: docker-compose ps"
    echo "   查看日志: docker-compose logs [服务名]"
    echo "   重启服务: docker-compose restart [服务名]"
    echo "   停止服务: docker-compose down"
    echo
    echo "📝 部署日志已保存到: /tmp/wedding-deploy.log"
    echo
}

# 主函数
main() {
    echo "=== 婚礼应用云服务器快速部署 ==="
    echo
    
    # 检查是否在正确目录
    if [[ ! -f "docker-compose.yml" ]]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先运行 ./deploy.sh 安装Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose未安装，请先运行 ./deploy.sh 安装Docker Compose"
        exit 1
    fi
    
    # 执行部署步骤
    check_network
    check_system_requirements
    
    local public_ip
    public_ip=$(get_public_ip)
    log_info "使用IP地址: $public_ip"
    
    setup_environment "$public_ip"
    
    if quick_deploy && health_check; then
        show_result "$public_ip"
        log_success "部署成功完成！"
    else
        log_error "部署失败，请检查错误信息"
        echo
        echo "=== 故障排除建议 ==="
        echo "1. 查看详细日志: cat /tmp/wedding-deploy.log"
        echo "2. 查看容器状态: docker-compose ps"
        echo "3. 查看服务日志: docker-compose logs"
        echo "4. 重新部署: ./deploy.sh"
        echo
        exit 1
    fi
}

# 运行主函数
main "$@"
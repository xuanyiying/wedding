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

# 清理Docker资源
cleanup_docker() {
    log_info "清理Docker资源..."
    
    # 停止并删除现有容器
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # 删除未使用的网络
    docker network prune -f 2>/dev/null || true
    
    # 清理系统资源
    docker system prune -f 2>/dev/null || true
    
    log_success "Docker资源清理完成"
}

# 快速部署
quick_deploy() {
    log_info "开始快速部署..."
    
    # 清理Docker资源
    cleanup_docker
    
    # 构建并启动服务
    log_info "构建Docker镜像..."
    if ! docker-compose build --no-cache; then
        log_error "Docker镜像构建失败"
        return 1
    fi
    
    log_info "启动服务..."
    if ! docker-compose up -d; then
        log_error "服务启动失败"
        return 1
    fi
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 15
    
    # 检查关键服务状态
    log_info "检查关键服务状态..."
    local critical_services=("mysql" "redis" "server")
    local max_wait=120
    local wait_time=0
    
    while [ $wait_time -lt $max_wait ]; do
        local all_running=true
        for service in "${critical_services[@]}"; do
            if ! docker-compose ps "$service" | grep -q "Up"; then
                all_running=false
                break
            fi
        done
        
        if $all_running; then
            log_success "关键服务已启动"
            break
        fi
        
        sleep 10
        wait_time=$((wait_time + 10))
        log_info "等待关键服务启动... ($wait_time/$max_wait 秒)"
    done
    
    if [ $wait_time -ge $max_wait ]; then
        log_error "关键服务启动超时"
        docker-compose ps
        return 1
    fi
    
    # 等待数据库完全就绪
    log_info "等待数据库完全就绪..."
    local db_ready=false
    local db_attempts=0
    
    while [ $db_attempts -lt 12 ]; do
        if docker-compose exec -T mysql mysqladmin ping -h localhost -u root -pwedding123 &>/dev/null; then
            log_success "数据库已就绪"
            db_ready=true
            break
        fi
        sleep 10
        db_attempts=$((db_attempts + 1))
        log_info "等待数据库就绪... ($db_attempts/12)"
    done
    
    if ! $db_ready; then
        log_error "数据库未能就绪"
        return 1
    fi
    
    # 初始化数据库
    log_info "初始化数据库..."
    local max_retries=3
    local attempt=1
    
    while [ $attempt -le $max_retries ]; do
        log_info "尝试数据库初始化 ($attempt/$max_retries)"
        
        # 检查server容器是否健康
        if ! docker-compose ps server | grep -q "Up"; then
            log_error "server容器未运行"
            return 1
        fi
        
        # 尝试初始化数据库
        if docker-compose exec -T server npm run db:init; then
            log_success "数据库初始化成功"
            return 0
        else
            log_warning "数据库初始化失败，重试 $attempt/$max_retries"
            if [ $attempt -lt $max_retries ]; then
                sleep 20
            fi
            attempt=$((attempt + 1))
        fi
    done
    
    log_error "数据库初始化失败"
    log_info "查看服务状态: docker-compose ps"
    log_info "查看server日志: docker-compose logs server"
    log_info "查看mysql日志: docker-compose logs mysql"
    return 1
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local failed_services=()
    
    # 检查容器状态
    log_info "检查容器运行状态..."
    local services=("mysql" "redis" "minio" "server" "web" "caddy")
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up"; then
            log_success "$service 服务运行正常"
        else
            log_error "$service 服务未运行"
            failed_services+=("$service")
        fi
    done
    
    # 如果有容器未运行，直接返回失败
    if [ ${#failed_services[@]} -gt 0 ]; then
        log_error "以下服务未正常运行: ${failed_services[*]}"
        log_info "查看详细状态: docker-compose ps"
        return 1
    fi
    
    # 等待服务完全启动
    log_info "等待服务完全启动..."
    sleep 15
    
    # 检查HTTP服务可访问性
    log_info "检查HTTP服务可访问性..."
    
    # 检查API服务
    local api_attempts=0
    while [ $api_attempts -lt 3 ]; do
        if curl -f -s http://localhost:3000/api/health >/dev/null 2>&1; then
            log_success "API服务健康检查通过"
            break
        else
            api_attempts=$((api_attempts + 1))
            if [ $api_attempts -lt 3 ]; then
                log_warning "API服务检查失败，重试 $api_attempts/3"
                sleep 10
            else
                log_error "API服务健康检查失败"
                failed_services+=("api-health")
            fi
        fi
    done
    
    # 检查Web服务
    local web_attempts=0
    while [ $web_attempts -lt 3 ]; do
        if curl -f -s http://localhost:5173 >/dev/null 2>&1; then
            log_success "Web服务健康检查通过"
            break
        else
            web_attempts=$((web_attempts + 1))
            if [ $web_attempts -lt 3 ]; then
                log_warning "Web服务检查失败，重试 $web_attempts/3"
                sleep 10
            else
                log_error "Web服务健康检查失败"
                failed_services+=("web-health")
            fi
        fi
    done
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        log_error "健康检查失败的服务: ${failed_services[*]}"
        log_info "故障排除建议:"
        log_info "1. 查看服务状态: docker-compose ps"
        log_info "2. 查看服务日志: docker-compose logs [服务名]"
        log_info "3. 重启失败的服务: docker-compose restart [服务名]"
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
    log_info "开始云服务器快速部署..."
    
    # 检查网络连接
    if ! check_network; then
        log_error "网络连接检查失败，请检查网络设置"
        exit 1
    fi
    
    # 检查系统资源
    if ! check_system_requirements; then
        log_error "系统资源检查失败，请确保有足够的资源"
        exit 1
    fi
    
    local public_ip
    public_ip=$(get_public_ip)
    log_info "使用IP地址: $public_ip"
    
    setup_environment "$public_ip"
    
    # 快速部署
    log_info "开始快速部署流程..."
    local deploy_success=false
    if quick_deploy; then
        deploy_success=true
    else
        log_error "快速部署失败"
        log_info "正在收集错误信息..."
        
        # 显示当前服务状态
        log_info "当前服务状态:"
        docker-compose ps || true
        
        # 显示最近的错误日志
        log_info "最近的错误日志:"
        docker-compose logs --tail=20 || true
    fi
    
    # 健康检查
    log_info "开始健康检查..."
    local health_success=false
    if health_check; then
        health_success=true
    else
        log_warning "健康检查失败，但服务可能仍在启动中"
        log_info "您可以稍后手动检查服务状态"
        
        # 显示当前状态供用户参考
        log_info "当前服务状态:"
        docker-compose ps || true
    fi
    
    # 根据部署和健康检查结果决定后续操作
    if $deploy_success && $health_success; then
        show_result "$public_ip"
        log_success "部署成功完成！"
    elif $deploy_success; then
        log_warning "部署完成但健康检查失败，服务可能需要更多时间启动"
        show_result "$public_ip"
        log_info "请稍后检查服务状态: docker-compose ps"
        log_info "如果服务未正常启动，请查看日志: docker-compose logs [服务名]"
    else
        log_error "部署失败，请检查错误信息"
        echo
        echo "=== 故障排除建议 ==="
        echo "1. 查看详细日志: cat /tmp/wedding-deploy.log"
        echo "2. 查看容器状态: docker-compose ps"
        echo "3. 查看服务日志: docker-compose logs"
        echo "4. 重新部署: ./deploy.sh"
        echo "5. 检查系统资源: free -h && df -h"
        echo "6. 检查Docker状态: docker system info"
        echo
        exit 1
    fi
}

# 运行主函数
main "$@"
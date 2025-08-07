#!/bin/bash

# 腾讯云服务器部署脚本
# 服务器信息
SERVER_IP="114.132.225.94"
SERVER_USER="root"
SERVER_PASSWORD="lhins-3vhwz99j"
DEPLOY_DIR="/root/wedding"
WEB_PORT="8080"

# 颜色输出
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

# 检查依赖
check_dependencies() {
    log_info "检查本地依赖..."
    
    if ! command -v sshpass &> /dev/null; then
        log_error "sshpass 未安装，请先安装: brew install sshpass (macOS) 或 apt-get install sshpass (Ubuntu)"
        exit 1
    fi
    
    if ! command -v rsync &> /dev/null; then
        log_error "rsync 未安装，请先安装"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 测试服务器连接
test_connection() {
    log_info "测试服务器连接..."
    
    if sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$SERVER_USER@$SERVER_IP" "echo 'Connection successful'"; then
        log_success "服务器连接成功"
    else
        log_error "无法连接到服务器 $SERVER_IP"
        exit 1
    fi
}

# 准备服务器环境
setup_server() {
    log_info "准备服务器环境..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
        # 更新系统
        apt-get update
        
        # 安装Docker
        if ! command -v docker &> /dev/null; then
            echo "安装Docker..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            systemctl start docker
            systemctl enable docker
        fi
        
        # 安装Docker Compose
        if ! command -v docker-compose &> /dev/null; then
            echo "安装Docker Compose..."
            curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi
        
        # 创建部署目录
        mkdir -p /root/wedding
        
        # 配置防火墙
        ufw allow 22/tcp
        ufw allow 8080/tcp
        ufw allow 3000/tcp
        ufw allow 3306/tcp
        ufw allow 6379/tcp
        ufw allow 9000/tcp
        ufw allow 9001/tcp
        
        echo "服务器环境准备完成"
EOF
    
    log_success "服务器环境准备完成"
}

# 上传项目文件
upload_files() {
    log_info "上传项目文件到服务器..."
    
    # 创建临时目录
    TEMP_DIR="/tmp/wedding-deploy"
    rm -rf "$TEMP_DIR"
    mkdir -p "$TEMP_DIR"
    
    # 复制必要文件
    cp -r server "$TEMP_DIR/"
    cp -r web "$TEMP_DIR/"
    cp deployment/docker-compose-tencent.yml "$TEMP_DIR/docker-compose.yml"
    cp deployment/nginx-tencent.conf "$TEMP_DIR/nginx.conf"
    
    # 上传到服务器
    sshpass -p "$SERVER_PASSWORD" rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no" "$TEMP_DIR/" "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/"
    
    # 清理临时目录
    rm -rf "$TEMP_DIR"
    
    log_success "文件上传完成"
}

# 构建和启动服务
deploy_services() {
    log_info "构建和启动服务..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << EOF
        cd $DEPLOY_DIR
        
        # 停止现有服务
        echo "停止现有服务..."
        docker-compose down --remove-orphans
        
        # 清理旧镜像
        echo "清理旧镜像..."
        docker system prune -f
        
        # 构建镜像
        echo "构建镜像..."
        docker-compose build --no-cache
        
        # 启动服务
        echo "启动服务..."
        docker-compose up -d
        
        # 等待服务启动
        echo "等待服务启动..."
        sleep 60
        
        # 检查服务状态
        echo "检查服务状态..."
        docker-compose ps
        
        echo "部署完成"
EOF
    
    log_success "服务部署完成"
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."
    
    # 检查容器状态
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << EOF
        cd $DEPLOY_DIR
        echo "=== 容器状态 ==="
        docker-compose ps
        
        echo "\n=== 服务日志 ==="
        docker-compose logs --tail=100 nginx
        docker-compose logs --tail=100 web
        docker-compose logs --tail=100 server
EOF
    
    # 测试HTTP访问
    log_info "测试HTTP访问..."
    
    if curl -f -s "http://$SERVER_IP:$WEB_PORT/health" > /dev/null; then
        log_success "健康检查通过"
    else
        log_warning "健康检查失败，请检查服务状态"
    fi
    
    if curl -f -s "http://$SERVER_IP:$WEB_PORT/" > /dev/null; then
        log_success "前端服务访问正常"
    else
        log_warning "前端服务访问失败"
    fi
    
    if curl -f -s "http://$SERVER_IP:$WEB_PORT/api/health" > /dev/null; then
        log_success "API服务访问正常"
    else
        log_warning "API服务访问失败"
    fi
}

# 显示访问信息
show_access_info() {
    log_success "=== 部署完成 ==="
    echo -e "${GREEN}前端访问地址:${NC} http://$SERVER_IP:$WEB_PORT"
    echo -e "${GREEN}API访问地址:${NC} http://$SERVER_IP:$WEB_PORT/api"
    echo -e "${GREEN}MinIO控制台:${NC} http://$SERVER_IP:9001"
    echo -e "${GREEN}健康检查:${NC} http://$SERVER_IP:$WEB_PORT/health"
    echo ""
    echo -e "${YELLOW}管理命令:${NC}"
    echo "  查看服务状态: ssh root@$SERVER_IP 'cd $DEPLOY_DIR && docker-compose ps'"
    echo "  查看日志: ssh root@$SERVER_IP 'cd $DEPLOY_DIR && docker-compose logs -f'"
    echo "  重启服务: ssh root@$SERVER_IP 'cd $DEPLOY_DIR && docker-compose restart'"
    echo "  停止服务: ssh root@$SERVER_IP 'cd $DEPLOY_DIR && docker-compose down'"
}

# 主函数
main() {
    echo -e "${BLUE}=== 腾讯云Wedding项目部署脚本 ===${NC}"
    echo -e "${BLUE}服务器: $SERVER_IP${NC}"
    echo -e "${BLUE}端口: $WEB_PORT${NC}"
    echo ""
    
    # 执行部署步骤
    check_dependencies
    test_connection
    setup_server
    upload_files
    deploy_services
    
    # 等待服务完全启动
    log_info "等待服务完全启动..."
    sleep 30
    
    check_services
    show_access_info
}

# 错误处理
set -e
trap 'log_error "部署过程中发生错误，请检查日志"' ERR

# 运行主函数
main "$@"
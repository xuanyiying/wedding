#!/bin/bash

# Wedding Client 一键部署脚本
# 使用方法: ./quick-deploy.sh [setup|deploy|status|help]

set -e

# 配置变量
SERVER_IP="114.132.225.94"
SSH_USER="root"
REMOTE_DIR="/opt/wedding"
GITHUB_REPO="https://github.com/xuanyiying/wedding.git"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 显示帮助信息
show_help() {
    echo "Wedding Client 一键部署脚本"
    echo ""
    echo "使用方法:"
    echo "  ./quick-deploy.sh setup    - 初始化服务器环境"
    echo "  ./quick-deploy.sh deploy   - 执行部署"
    echo "  ./quick-deploy.sh status   - 检查服务状态"
    echo "  ./quick-deploy.sh logs     - 查看服务日志"
    echo "  ./quick-deploy.sh restart  - 重启服务"
    echo "  ./quick-deploy.sh help     - 显示帮助信息"
    echo ""
    echo "部署前准备:"
    echo "  1. 确保已配置 GitHub Secrets (PRODUCTION_HOST, PRODUCTION_USER, PRODUCTION_SSH_KEY)"
    echo "  2. 确保本地已配置 SSH 密钥访问服务器"
    echo "  3. 确保服务器可以访问 GitHub"
    echo ""
    echo "访问地址: http://114.132.225.94:8080"
}

# 检查SSH连接
check_ssh_connection() {
    log_step "检查SSH连接..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_USER@$SERVER_IP" exit 2>/dev/null; then
        log_success "SSH连接正常"
        return 0
    else
        log_error "SSH连接失败，请检查:"
        echo "  1. 服务器IP: $SERVER_IP"
        echo "  2. SSH用户: $SSH_USER"
        echo "  3. SSH密钥配置"
        echo "  4. 网络连接"
        echo ""
        echo "配置SSH密钥:"
        echo "  ssh-keygen -t rsa -b 4096 -C 'deploy@wedding-client'"
        echo "  ssh-copy-id $SSH_USER@$SERVER_IP"
        return 1
    fi
}

# 初始化服务器环境
setup_server() {
    log_step "初始化服务器环境..."
    
    if ! check_ssh_connection; then
        exit 1
    fi
    
    ssh "$SSH_USER@$SERVER_IP" << 'EOF'
set -e

echo "[INFO] 更新系统包..."
apt update && apt upgrade -y

echo "[INFO] 安装基础工具..."
apt install -y curl wget git htop unzip

echo "[INFO] 检查Docker安装..."
if ! command -v docker &> /dev/null; then
    echo "[INFO] 安装Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "[INFO] Docker已安装"
fi

echo "[INFO] 启动Docker服务..."
systemctl start docker
systemctl enable docker

echo "[INFO] 检查Docker Compose安装..."
if ! command -v docker-compose &> /dev/null; then
    echo "[INFO] 安装Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
else
    echo "[INFO] Docker Compose已安装"
fi

echo "[INFO] 验证Docker安装..."
docker --version
docker-compose --version

echo "[INFO] 配置防火墙..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 8080/tcp
    echo "[INFO] UFW防火墙配置完成"
fi

echo "[INFO] 创建项目目录..."
mkdir -p /opt/wedding
cd /opt/wedding

echo "[INFO] 克隆项目代码..."
if [ -d ".git" ]; then
    echo "[INFO] 项目已存在，更新代码..."
    git pull origin main
else
    echo "[INFO] 克隆新项目..."
    git clone https://github.com/xuanyiying/wedding.git .
fi

echo "[INFO] 设置权限..."
chmod +x deployment/deploy.sh
chmod +x deployment/health-check.sh

echo "[INFO] 创建必要目录..."
mkdir -p logs backups data uploads

echo "[SUCCESS] 服务器环境初始化完成"
EOF
    
    if [ $? -eq 0 ]; then
        log_success "服务器环境初始化完成"
    else
        log_error "服务器环境初始化失败"
        exit 1
    fi
}

# 执行部署
deploy_application() {
    log_step "执行应用部署..."
    
    if ! check_ssh_connection; then
        exit 1
    fi
    
    ssh "$SSH_USER@$SERVER_IP" << 'EOF'
set -e

cd /opt/wedding

echo "[INFO] 更新代码..."
git pull origin main

echo "[INFO] 停止现有服务..."
docker-compose -f deployment/docker-compose-tencent.yml down || true

echo "[INFO] 清理旧镜像..."
docker system prune -f

echo "[INFO] 构建并启动服务..."
docker-compose -f deployment/docker-compose-tencent.yml up -d --build

echo "[INFO] 等待服务启动..."
sleep 30

echo "[INFO] 检查服务状态..."
docker-compose -f deployment/docker-compose-tencent.yml ps

echo "[INFO] 执行健康检查..."
if [ -f "deployment/health-check.sh" ]; then
    ./deployment/health-check.sh
else
    echo "[WARNING] 健康检查脚本不存在，执行简单检查..."
    curl -f http://localhost:8080 || echo "[WARNING] 前端服务检查失败"
    curl -f http://localhost:8080/api/v1/health || echo "[WARNING] 后端API检查失败"
fi

echo "[SUCCESS] 应用部署完成"
echo "[INFO] 访问地址: http://114.132.225.94:8080"
EOF
    
    if [ $? -eq 0 ]; then
        log_success "应用部署完成"
        log_info "访问地址: http://114.132.225.94:8080"
    else
        log_error "应用部署失败"
        exit 1
    fi
}

# 检查服务状态
check_status() {
    log_step "检查服务状态..."
    
    if ! check_ssh_connection; then
        exit 1
    fi
    
    ssh "$SSH_USER@$SERVER_IP" << 'EOF'
cd /opt/wedding

echo "=== Docker 服务状态 ==="
docker-compose -f deployment/docker-compose-tencent.yml ps

echo ""
echo "=== 系统资源使用 ==="
echo "CPU和内存使用:"
free -h
echo ""
echo "磁盘使用:"
df -h

echo ""
echo "=== 端口监听状态 ==="
netstat -tlnp | grep -E ':(80|443|3000|3306|6379|8080|9000)'

echo ""
echo "=== 应用健康检查 ==="
echo "前端服务:"
curl -s -o /dev/null -w "HTTP状态: %{http_code}, 响应时间: %{time_total}s\n" http://localhost:8080 || echo "前端服务不可访问"

echo "后端API:"
curl -s -o /dev/null -w "HTTP状态: %{http_code}, 响应时间: %{time_total}s\n" http://localhost:8080/api/v1/health || echo "后端API不可访问"
EOF
}

# 查看服务日志
view_logs() {
    log_step "查看服务日志..."
    
    if ! check_ssh_connection; then
        exit 1
    fi
    
    echo "选择要查看的服务日志:"
    echo "1) 所有服务"
    echo "2) 前端 (web)"
    echo "3) 后端 (server)"
    echo "4) 数据库 (mysql)"
    echo "5) 缓存 (redis)"
    echo "6) 存储 (minio)"
    echo "7) 代理 (nginx)"
    read -p "请选择 (1-7): " choice
    
    case $choice in
        1) service="" ;;
        2) service="web" ;;
        3) service="server" ;;
        4) service="mysql" ;;
        5) service="redis" ;;
        6) service="minio" ;;
        7) service="nginx" ;;
        *) log_error "无效选择"; exit 1 ;;
    esac
    
    ssh "$SSH_USER@$SERVER_IP" "cd /opt/wedding && docker-compose -f deployment/docker-compose-tencent.yml logs -f --tail=100 $service"
}

# 重启服务
restart_services() {
    log_step "重启服务..."
    
    if ! check_ssh_connection; then
        exit 1
    fi
    
    ssh "$SSH_USER@$SERVER_IP" << 'EOF'
cd /opt/wedding

echo "[INFO] 重启所有服务..."
docker-compose -f deployment/docker-compose-tencent.yml restart

echo "[INFO] 等待服务启动..."
sleep 15

echo "[INFO] 检查服务状态..."
docker-compose -f deployment/docker-compose-tencent.yml ps

echo "[SUCCESS] 服务重启完成"
EOF
    
    if [ $? -eq 0 ]; then
        log_success "服务重启完成"
    else
        log_error "服务重启失败"
        exit 1
    fi
}

# 主函数
main() {
    case "${1:-help}" in
        "setup")
            setup_server
            ;;
        "deploy")
            deploy_application
            ;;
        "status")
            check_status
            ;;
        "logs")
            view_logs
            ;;
        "restart")
            restart_services
            ;;
        "help")
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 检查是否有参数
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# 执行主函数
main "$@"
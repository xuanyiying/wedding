#!/bin/bash

# 腾讯云部署脚本 - Wedding Client
# 服务器: 114.132.225.94 (公网) / 10.1.12.15 (内网)
# Web端口: 8080 (通过Nginx代理)
# 协议: HTTP
# GitHub: https://github.com/xuanyiying/wedding.git

set -e

# 配置变量
SERVER_IP="114.132.225.94"
INTERNAL_IP="10.1.12.15"
SSH_USER="root"
SSH_PASS="lhins-3vhwz99j"
DEPLOY_DIR="/root/wedding"
WEB_PORT="8080"
PROJECT_NAME="wedding"
REMOTE_DIR="/opt/wedding"
GITHUB_REPO="https://github.com/xuanyiying/wedding.git"
LOCAL_PROJECT_DIR="$(pwd)"
DEPLOYMENT_DIR="${LOCAL_PROJECT_DIR}/deployment"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

log_debug() {
    echo -e "${CYAN}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 检查依赖
check_dependencies() {
    log_step "检查本地依赖..."
    
    local missing_deps=()
    
    # 检查必要的命令
    local required_commands=("sshpass" "ssh")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少以下依赖: ${missing_deps[*]}"
        log_info "请安装缺少的依赖:"
        for dep in "${missing_deps[@]}"; do
            case $dep in
                "sshpass")
                    echo "  brew install sshpass"
                    ;;
                *)
                    echo "  请安装 $dep"
                    ;;
            esac
        done
        exit 1
    fi
    
    log_success "本地依赖检查完成"
}

# 测试服务器连接
test_connection() {
    log_step "测试服务器连接..."
    
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        log_debug "尝试连接服务器 (${retry_count}/${max_retries})..."
        
        if sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o BatchMode=no "$SSH_USER@$SERVER_IP" "echo 'Connection successful'" 2>/dev/null; then
            log_success "服务器连接成功"
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                log_warning "连接失败，${retry_count}秒后重试..."
                sleep $retry_count
            fi
        fi
    done
    
    log_error "无法连接到服务器 $SERVER_IP，请检查:"
    echo "  1. 服务器IP地址是否正确: $SERVER_IP"
    echo "  2. SSH用户名是否正确: $SSH_USER"
    echo "  3. SSH密码是否正确"
    echo "  4. 服务器防火墙是否允许SSH连接"
    echo "  5. 网络连接是否正常"
    exit 1
}

# 设置服务器环境
setup_server() {
    log_step "设置服务器环境..."
    
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" << EOF
        set -e
        
        echo "[INFO] 创建项目目录..."
        mkdir -p $REMOTE_DIR
        mkdir -p $REMOTE_DIR/logs
        mkdir -p $REMOTE_DIR/data
        mkdir -p $REMOTE_DIR/uploads
        
        echo "[INFO] 检查Docker安装状态..."
        if ! command -v docker &> /dev/null; then
            echo "[INFO] 安装Docker..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            systemctl start docker
            systemctl enable docker
            usermod -aG docker root
        else
            echo "[INFO] Docker已安装"
        fi
        
        echo "[INFO] 检查Docker Compose安装状态..."
        if ! command -v docker-compose &> /dev/null; then
            echo "[INFO] 安装Docker Compose..."
            curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
            ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
        else
            echo "[INFO] Docker Compose已安装"
        fi
        
        echo "[INFO] 启动Docker服务..."
        systemctl start docker
        systemctl enable docker
        
        echo "[INFO] 配置防火墙..."
        if command -v ufw &> /dev/null; then
            ufw --force enable
            ufw allow 22/tcp
            ufw allow $WEB_PORT/tcp
            ufw allow 80/tcp
            ufw allow 443/tcp
            echo "[INFO] UFW防火墙配置完成"
        elif command -v firewall-cmd &> /dev/null; then
            firewall-cmd --permanent --add-port=22/tcp
            firewall-cmd --permanent --add-port=$WEB_PORT/tcp
            firewall-cmd --permanent --add-port=80/tcp
            firewall-cmd --permanent --add-port=443/tcp
            firewall-cmd --reload
            echo "[INFO] Firewalld防火墙配置完成"
        else
            echo "[WARNING] 未检测到防火墙管理工具"
        fi
        
        echo "[INFO] 安装必要工具..."
        if command -v apt-get &> /dev/null; then
            apt-get update
            apt-get install -y curl wget git htop
        elif command -v yum &> /dev/null; then
            yum update -y
            yum install -y curl wget git htop
        fi
        
        echo "[SUCCESS] 服务器环境设置完成"
EOF
    
    if [ $? -eq 0 ]; then
        log_success "服务器环境设置完成"
    else
        log_error "服务器环境设置失败"
        exit 1
    fi
}

# 克隆或更新项目代码
clone_or_update_project() {
    log_step "克隆或更新项目代码..."
    
    # 分步执行，避免长时间SSH连接超时
    
    # 第一步：检查和准备项目目录
     log_info "检查项目目录..."
     sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 "$SSH_USER@$SERVER_IP" << 'EOF'
        set -e
        
        # 检查项目目录是否存在
        if [ -d "/opt/wedding" ]; then
            echo "[INFO] 项目目录已存在，准备更新..."
            cd /opt/wedding
            # 备份可能的本地修改
            git stash || true
        else
            echo "[INFO] 创建项目目录..."
            mkdir -p /opt
        fi
EOF
    
    if [ $? -ne 0 ]; then
        log_error "项目目录检查失败"
        exit 1
    fi
    
    # 第二步：克隆或更新代码
     log_info "同步代码仓库..."
     sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 "$SSH_USER@$SERVER_IP" << 'EOF'
        set -e
        
        if [ -d "/opt/wedding/.git" ]; then
            echo "[INFO] 更新现有项目代码..."
            cd /opt/wedding
            git pull origin master
            echo "[INFO] git pull 完毕..."
           
        else
            echo "[INFO] 克隆项目代码..."
            cd /opt
            rm -rf wedding
            git clone https://github.com/xuanyiying/wedding.git wedding
        fi
EOF
    
    if [ $? -ne 0 ]; then
        log_error "代码同步失败"
        exit 1
    fi
    
    # 第三步：复制配置文件
     log_info "配置部署文件..."
     sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 "$SSH_USER@$SERVER_IP" << 'EOF'
        set -e
        cd /opt/wedding
        
        echo "[INFO] 当前分支和提交信息:"
        git branch -v
        git log --oneline -5
        
        echo "[INFO] 复制部署配置文件..."
        # 使用项目中的腾讯云部署配置
        if [ -f "deployment/docker-compose-tencent.yml" ]; then
            cp deployment/docker-compose-tencent.yml docker-compose.yml
            echo "[SUCCESS] docker-compose.yml 配置完成"
        else
            echo "[ERROR] 未找到 deployment/docker-compose-tencent.yml"
            exit 1
        fi
        
        if [ -f "deployment/nginx-tencent.conf" ]; then
            cp deployment/nginx-tencent.conf nginx.conf
            echo "[SUCCESS] nginx.conf 配置完成"
        else
            echo "[ERROR] 未找到 deployment/nginx-tencent.conf"
            exit 1
        fi
        
        if [ -f "deployment/.env.tencent" ]; then
            cp deployment/.env.tencent .env
            echo "[SUCCESS] .env 配置完成"
        else
            echo "[ERROR] 未找到 deployment/.env.tencent"
            exit 1
        fi
        
        echo "[SUCCESS] 项目代码和配置文件准备完成"
EOF
    
    if [ $? -eq 0 ]; then
        log_success "项目代码克隆/更新完成"
    else
        log_error "配置文件复制失败"
        exit 1
    fi
}

# 部署服务
deploy_services() {
    log_step "部署服务..."
    
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" << EOF
        set -e
        cd $REMOTE_DIR
        
        echo "[INFO] 停止现有服务..."
        if [ -f docker-compose.yml ]; then
            docker-compose down --remove-orphans || true
        fi
        
        echo "[INFO] 清理Docker资源..."
        docker system prune -f || true
        docker volume prune -f || true
        
        echo "[INFO] 拉取最新镜像..."
        docker-compose pull || true
        
        echo "[INFO] 构建并启动服务..."
        docker-compose up -d --build
        
        echo "[INFO] 等待服务启动..."
        sleep 30
        
        echo "[INFO] 检查服务状态..."
        docker-compose ps
        
        echo "[INFO] 检查服务日志..."
        docker-compose logs --tail=20
        
        echo "[SUCCESS] 服务部署完成"
EOF
    
    if [ $? -eq 0 ]; then
        log_success "服务部署完成"
    else
        log_error "服务部署失败"
        exit 1
    fi
}

# 检查服务状态
check_services() {
    log_step "检查服务状态..."
    
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" << EOF
        cd $REMOTE_DIR
        
        echo "=== Docker Compose 服务状态 ==="
        docker-compose ps
        
        echo ""
        echo "=== 服务健康检查 ==="
        for service in \$(docker-compose ps --services); do
            echo "检查服务: \$service"
            docker-compose exec -T \$service echo "\$service is running" 2>/dev/null || echo "\$service is not responding"
        done
        
        echo ""
        echo "=== 网络连接测试 ==="
        echo "测试Web服务 (端口$WEB_PORT):"
        curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:$WEB_PORT/ || echo "Web服务连接失败"
        
        echo ""
        echo "=== 最近日志 ==="
        docker-compose logs --tail=50
        
        echo ""
        echo "=== 系统资源使用情况 ==="
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
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
    
    log_success "服务状态检查完成"
}

# 显示访问信息
show_access_info() {
    echo ""
    log_success "🎉 部署完成！访问信息："
    echo "================================"
    echo "🌐 Web应用:     http://$SERVER_IP:$WEB_PORT"
    echo "🔗 API接口:     http://$SERVER_IP:$WEB_PORT/api"
    echo "📁 MinIO控制台: http://$SERVER_IP:$WEB_PORT/minio"
    echo "❤️  健康检查:   http://$SERVER_IP:$WEB_PORT/health"
    echo "================================"
    echo "🖥️  服务器信息:"
    echo "   公网IP: $SERVER_IP"
    echo "   内网IP: $INTERNAL_IP"
    echo "   SSH用户: $SSH_USER"
    echo "   项目目录: $REMOTE_DIR"
    echo "   Web端口: $WEB_PORT"
    echo "================================"
    echo "📋 管理命令:"
    echo "   查看状态: $0 status"
    echo "   查看日志: $0 logs"
    echo "   重启服务: $0 restart"
    echo "   停止服务: $0 stop"
    echo "================================"
}

# 显示帮助信息
show_help() {
    echo "Wedding Client 腾讯云部署脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  deploy          完整部署 (默认) - 从GitHub克隆最新代码"
    echo "  status          检查服务状态"
    echo "  logs            查看服务日志"
    echo "  restart         重启服务"
    echo "  stop            停止服务"
    echo "  start           启动服务"
    echo "  update          更新代码并重启服务"
    echo "  clean           清理Docker资源"
    echo "  test            测试服务器连接"
    echo "  help            显示帮助信息"
    echo ""
    echo "特性:"
    echo "  ✅ 自动从GitHub克隆/更新代码"
    echo "  ✅ 自动配置部署环境"
    echo "  ✅ 支持服务管理和监控"
    echo "  ✅ 完整的错误处理和日志"
    echo ""
    echo "示例:"
    echo "  $0 deploy        # 完整部署"
    echo "  $0 update        # 更新代码并重启"
    echo "  $0 status        # 检查状态"
    echo "  $0 logs          # 查看日志"
    echo ""
    echo "GitHub仓库: $GITHUB_REPO"
    echo ""
}

# 服务管理功能
manage_services() {
    local action="$1"
    
    case "$action" in
        "start")
             log_step "启动服务..."
             sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "cd $REMOTE_DIR && docker-compose start"
             ;;
         "stop")
             log_step "停止服务..."
             sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "cd $REMOTE_DIR && docker-compose stop"
             ;;
         "restart")
             log_step "重启服务..."
             sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "cd $REMOTE_DIR && docker-compose restart"
             ;;
         "logs")
             log_step "查看服务日志..."
             sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "cd $REMOTE_DIR && docker-compose logs -f --tail=100"
             ;;
         "clean")
             log_step "清理Docker资源..."
             sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "cd $REMOTE_DIR && docker-compose down && docker system prune -af && docker volume prune -f"
            ;;
        *)
            log_error "未知的服务管理操作: $action"
            exit 1
            ;;
    esac
}

# 主要部署流程
main_deploy() {
    log_info "🚀 开始部署 Wedding Client 到腾讯云服务器..."
    echo "服务器: $SERVER_IP"
    echo "项目: $PROJECT_NAME"
    echo "端口: $WEB_PORT"
    echo "GitHub: $GITHUB_REPO"
    echo ""
    
    check_dependencies
    test_connection
    setup_server
    clone_or_update_project
    deploy_services
    sleep 10  # 等待服务完全启动
    check_services
    show_access_info
    
    log_success "🎉 部署完成！"
}

# 查看服务器文件内容
check_server_file() {
    local file_path="$2"
    if [ -z "$file_path" ]; then
        echo "用法: $0 check <file_path>"
        exit 1
    fi
    
    log_step "查看服务器文件: $file_path"
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" << EOF
        if [ -f "$file_path" ]; then
            echo "[INFO] 文件内容:"
            cat "$file_path"
        else
            echo "[ERROR] 文件不存在: $file_path"
        fi
EOF
}

# 修复服务器上的.env文件
fix_env_file() {
    log_step "修复服务器上的.env文件..."
    
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" << 'EOF'
        set -e
        cd /opt/wedding
        
        echo "[INFO] 备份当前.env文件..."
        if [ -f ".env" ]; then
            cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        fi
        
        echo "[INFO] 重新复制正确的.env文件..."
        if [ -f "deployment/.env.tencent" ]; then
            cp deployment/.env.tencent .env
            echo "[SUCCESS] .env文件已修复"
            echo "[INFO] 验证.env文件内容（前10行）:"
            head -10 .env
        else
            echo "[ERROR] 未找到 deployment/.env.tencent"
            exit 1
        fi
EOF
    
    if [ $? -eq 0 ]; then
        log_success ".env文件修复完成"
    else
        log_error ".env文件修复失败"
        exit 1
    fi
}

# 主函数
main() {
    local command="${1:-deploy}"
    
    case "$command" in
        "deploy")
            main_deploy
            ;;
        "status")
            test_connection
            check_services
            ;;
        "logs")
            test_connection
            manage_services "logs"
            ;;
        "restart")
            test_connection
            manage_services "restart"
            log_success "服务重启完成"
            ;;
        "stop")
            test_connection
            manage_services "stop"
            log_success "服务停止完成"
            ;;
        "start")
            test_connection
            manage_services "start"
            log_success "服务启动完成"
            ;;
        "update")
            test_connection
            clone_or_update_project
            manage_services "restart"
            log_success "服务更新完成"
            ;;
        "clean")
            test_connection
            manage_services "clean"
            log_success "清理完成"
            ;;
        "test")
            test_connection
            log_success "连接测试完成"
            ;;
        "check")
            test_connection
            check_server_file "$@"
            ;;
        "fix-env")
            test_connection
            fix_env_file
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            echo "使用 '$0 help' 查看帮助信息"
            exit 1
            ;;
    esac
}

# 错误处理
set -e
trap 'log_error "部署过程中发生错误，请检查日志"' ERR

# 运行主函数
main "$@"
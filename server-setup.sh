#!/bin/bash

# Wedding Client 服务器环境准备脚本
# 在生产服务器上运行此脚本来准备部署环境

set -e

# 配置变量
PROJECT_DIR="/opt/wedding"
GITHUB_REPO="https://github.com/xuanyiying/wedding.git"
DOCKER_COMPOSE_VERSION="2.24.0"

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

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用root用户运行此脚本"
        echo "使用方法: sudo $0"
        exit 1
    fi
}

# 检查系统信息
check_system() {
    log_step "检查系统信息..."
    
    echo "操作系统: $(lsb_release -d | cut -f2)"
    echo "内核版本: $(uname -r)"
    echo "架构: $(uname -m)"
    echo "CPU核心数: $(nproc)"
    echo "内存大小: $(free -h | grep '^Mem:' | awk '{print $2}')"
    echo "磁盘空间: $(df -h / | tail -1 | awk '{print $4}' | sed 's/G/GB/')"
    
    # 检查最低系统要求
    MEMORY_GB=$(free -g | grep '^Mem:' | awk '{print $2}')
    DISK_GB=$(df --output=avail -BG / | tail -1 | sed 's/G//')
    
    if [ "$MEMORY_GB" -lt 2 ]; then
        log_warning "内存不足2GB，可能影响性能"
    fi
    
    if [ "$DISK_GB" -lt 10 ]; then
        log_warning "磁盘空间不足10GB，可能影响部署"
    fi
    
    log_success "系统信息检查完成"
}

# 更新系统包
update_system() {
    log_step "更新系统包..."
    
    apt update
    apt upgrade -y
    
    log_success "系统包更新完成"
}

# 安装基础工具
install_basic_tools() {
    log_step "安装基础工具..."
    
    apt install -y \
        curl \
        wget \
        git \
        htop \
        unzip \
        vim \
        nano \
        tree \
        jq \
        net-tools \
        lsof \
        tcpdump \
        iotop \
        iftop \
        ncdu \
        rsync \
        screen \
        tmux \
        fail2ban \
        ufw
    
    log_success "基础工具安装完成"
}

# 安装Docker
install_docker() {
    log_step "安装Docker..."
    
    if command -v docker &> /dev/null; then
        log_info "Docker已安装，版本: $(docker --version)"
        return 0
    fi
    
    # 卸载旧版本
    apt remove -y docker docker-engine docker.io containerd runc || true
    
    # 安装依赖
    apt install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # 添加Docker官方GPG密钥
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # 添加Docker仓库
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装Docker Engine
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # 启动Docker服务
    systemctl start docker
    systemctl enable docker
    
    # 验证安装
    docker --version
    
    log_success "Docker安装完成"
}

# 安装Docker Compose
install_docker_compose() {
    log_step "安装Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        log_info "Docker Compose已安装，版本: $(docker-compose --version)"
        return 0
    fi
    
    # 下载Docker Compose
    curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # 添加执行权限
    chmod +x /usr/local/bin/docker-compose
    
    # 创建软链接
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    # 验证安装
    docker-compose --version
    
    log_success "Docker Compose安装完成"
}

# 配置防火墙
setup_firewall() {
    log_step "配置防火墙..."
    
    # 启用UFW
    ufw --force enable
    
    # 允许SSH
    ufw allow 22/tcp
    
    # 允许HTTP/HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # 允许应用端口
    ufw allow 8080/tcp  # 前端
    ufw allow 9000/tcp  # 后端API
    
    # 显示防火墙状态
    ufw status verbose
    
    log_success "防火墙配置完成"
}

# 配置Fail2Ban
setup_fail2ban() {
    log_step "配置Fail2Ban..."
    
    # 创建SSH保护配置
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF
    
    # 启动Fail2Ban服务
    systemctl start fail2ban
    systemctl enable fail2ban
    
    log_success "Fail2Ban配置完成"
}

# 创建项目目录
setup_project_directory() {
    log_step "创建项目目录..."
    
    # 创建主目录
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    
    # 创建子目录
    mkdir -p {
        logs,
        backups,
        data,
        uploads,
        ssl,
        configs
    }
    
    # 设置权限
    chown -R root:root "$PROJECT_DIR"
    chmod -R 755 "$PROJECT_DIR"
    
    log_success "项目目录创建完成: $PROJECT_DIR"
}

# 克隆项目代码
clone_project() {
    log_step "克隆项目代码..."
    
    cd "$PROJECT_DIR"
    
    if [ -d ".git" ]; then
        log_info "项目已存在，更新代码..."
        git pull origin main
    else
        log_info "克隆新项目..."
        git clone "$GITHUB_REPO" .
    fi
    
    # 设置脚本权限
    if [ -f "deployment/deploy.sh" ]; then
        chmod +x deployment/deploy.sh
    fi
    
    if [ -f "deployment/health-check.sh" ]; then
        chmod +x deployment/health-check.sh
    fi
    
    log_success "项目代码准备完成"
}

# 配置系统优化
optimize_system() {
    log_step "配置系统优化..."
    
    # 增加文件描述符限制
    cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
EOF
    
    # 配置内核参数
    cat >> /etc/sysctl.conf << 'EOF'
# 网络优化
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_max_tw_buckets = 5000

# 内存优化
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF
    
    # 应用内核参数
    sysctl -p
    
    log_success "系统优化配置完成"
}

# 配置日志轮转
setup_log_rotation() {
    log_step "配置日志轮转..."
    
    cat > /etc/logrotate.d/wedding-client << 'EOF'
/opt/wedding/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f /opt/wedding/deployment/docker-compose-tencent.yml restart nginx || true
    endscript
}
EOF
    
    log_success "日志轮转配置完成"
}

# 创建系统服务
create_systemd_service() {
    log_step "创建系统服务..."
    
    cat > /etc/systemd/system/wedding-client.service << 'EOF'
[Unit]
Description=Wedding Client Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/wedding
ExecStart=/usr/bin/docker-compose -f deployment/docker-compose-tencent.yml up -d
ExecStop=/usr/bin/docker-compose -f deployment/docker-compose-tencent.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    # 重新加载systemd
    systemctl daemon-reload
    
    log_success "系统服务创建完成"
}

# 验证安装
verify_installation() {
    log_step "验证安装..."
    
    echo "=== 系统信息 ==="
    echo "操作系统: $(lsb_release -d | cut -f2)"
    echo "内核版本: $(uname -r)"
    echo "CPU核心数: $(nproc)"
    echo "内存大小: $(free -h | grep '^Mem:' | awk '{print $2}')"
    echo "磁盘空间: $(df -h / | tail -1 | awk '{print $4}')"
    echo ""
    
    echo "=== 软件版本 ==="
    echo "Docker: $(docker --version)"
    echo "Docker Compose: $(docker-compose --version)"
    echo "Git: $(git --version)"
    echo ""
    
    echo "=== 服务状态 ==="
    echo "Docker: $(systemctl is-active docker)"
    echo "UFW: $(systemctl is-active ufw)"
    echo "Fail2Ban: $(systemctl is-active fail2ban)"
    echo ""
    
    echo "=== 网络端口 ==="
    netstat -tlnp | grep -E ':(22|80|443|8080|9000)' || echo "暂无监听端口"
    echo ""
    
    echo "=== 项目目录 ==="
    ls -la "$PROJECT_DIR"
    echo ""
    
    log_success "安装验证完成"
}

# 显示后续步骤
show_next_steps() {
    log_success "服务器环境准备完成！"
    echo ""
    echo "=== 后续步骤 ==="
    echo "1. 配置环境变量:"
    echo "   cp $PROJECT_DIR/deployment-config.env $PROJECT_DIR/.env"
    echo "   vim $PROJECT_DIR/.env  # 修改配置"
    echo ""
    echo "2. 执行部署:"
    echo "   cd $PROJECT_DIR"
    echo "   ./deployment/deploy.sh"
    echo ""
    echo "3. 或使用快速部署脚本:"
    echo "   ./quick-deploy.sh deploy"
    echo ""
    echo "4. 检查服务状态:"
    echo "   ./quick-deploy.sh status"
    echo ""
    echo "5. 查看服务日志:"
    echo "   ./quick-deploy.sh logs"
    echo ""
    echo "=== 访问地址 ==="
    echo "前端: http://$(curl -s ifconfig.me):8080"
    echo "后端API: http://$(curl -s ifconfig.me):8080/api/v1"
    echo ""
    echo "=== 管理命令 ==="
    echo "启动服务: systemctl start wedding-client"
    echo "停止服务: systemctl stop wedding-client"
    echo "重启服务: systemctl restart wedding-client"
    echo "开机自启: systemctl enable wedding-client"
    echo ""
}

# 主函数
main() {
    echo "======================================"
    echo "Wedding Client 服务器环境准备脚本"
    echo "======================================"
    echo ""
    
    check_root
    check_system
    update_system
    install_basic_tools
    install_docker
    install_docker_compose
    setup_firewall
    setup_fail2ban
    setup_project_directory
    clone_project
    optimize_system
    setup_log_rotation
    create_systemd_service
    verify_installation
    show_next_steps
    
    echo ""
    echo "======================================"
    echo "服务器环境准备完成！"
    echo "======================================"
}

# 执行主函数
main "$@"
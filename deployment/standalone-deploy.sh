#!/bin/bash

# Wedding Application Standalone Deployment Script
# 婚礼应用独立部署脚本
# Author: Auto-generated
# Version: 1.0
# Description: Cross-platform deployment script for wedding application without Docker

set -euo pipefail

# 全局变量配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
LOG_FILE="${LOG_DIR}/standalone-deploy-$(date +%Y%m%d-%H%M%S).log"
CONFIG_DIR="${SCRIPT_DIR}"
DATA_DIR="${SCRIPT_DIR}/data"
WEB_DIR="${SCRIPT_DIR}/../web"
SERVER_DIR="${SCRIPT_DIR}/../server"

# 服务配置
MYSQL_ROOT_PASSWORD="wedding_root_2024"
MYSQL_DATABASE="wedding_db"
MYSQL_USER="wedding_user"
MYSQL_PASSWORD="wedding_pass_2024"
REDIS_PASSWORD="redis_pass_2024"
MINIO_ROOT_USER="minioadmin"
MINIO_ROOT_PASSWORD="minioadmin123"
NGINX_PORT="80"
API_PORT="3000"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "$*"
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    log "SUCCESS" "$*"
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    log "WARNING" "$*"
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    log "ERROR" "$*"
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

# 错误处理
error_exit() {
    log_error "$1"
    exit 1
}

# 检测操作系统
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
        
        # 处理特殊的操作系统标识
        case "$OS" in
            "opencloudos"|"openeuler"|"anolis")
                OS="centos"  # 这些发行版基于RHEL/CentOS，使用相同的包管理器
                log_info "检测到 $ID，将作为 CentOS 兼容系统处理"
                ;;
        esac
    elif [[ -f /etc/redhat-release ]]; then
        OS="centos"
    elif [[ -f /etc/debian_version ]]; then
        OS="debian"
    else
        error_exit "无法检测操作系统类型"
    fi
    
    log_info "检测到操作系统: $OS $OS_VERSION"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "此脚本需要root权限运行，请使用sudo"
    fi
}

# 创建必要目录
create_directories() {
    log_info "创建必要的目录结构..."
    
    mkdir -p "$LOG_DIR"
    mkdir -p "$DATA_DIR"/{mysql,redis,minio,web,api}
    mkdir -p /etc/systemd/system
    mkdir -p /var/log/wedding
    
    log_success "目录结构创建完成"
}

# 安装系统依赖
install_system_dependencies() {
    log_info "安装系统依赖包..."
    
    case "$OS" in
        ubuntu|debian)
            apt-get update
            apt-get install -y curl wget gnupg2 software-properties-common \
                build-essential git unzip supervisor logrotate \
                ca-certificates lsb-release apt-transport-https
            ;;
        centos|rhel|fedora|opencloudos|openeuler|anolis)
            # 首先尝试安装 EPEL 仓库（如果可用）
            if command -v dnf &> /dev/null; then
                dnf update -y
                dnf install -y epel-release || log_warning "EPEL仓库安装失败，继续使用默认仓库"
                dnf install -y curl wget gnupg2 \
                    gcc gcc-c++ make git unzip supervisor logrotate \
                    ca-certificates
            else
                yum update -y
                yum install -y epel-release || log_warning "EPEL仓库安装失败，继续使用默认仓库"
                yum install -y curl wget gnupg2 \
                    gcc gcc-c++ make git unzip supervisor logrotate \
                    ca-certificates
            fi
            ;;
        *)
            error_exit "不支持的操作系统: $OS。支持的系统: Ubuntu, Debian, CentOS, RHEL, Fedora, OpenCloudOS, OpenEuler, Anolis"
            ;;
    esac
    
    log_success "系统依赖安装完成"
}

# 安装Node.js
install_nodejs() {
    log_info "安装Node.js..."
    
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        log_info "Node.js已安装: $node_version"
        return 0
    fi
    
    case "$OS" in
        ubuntu|debian)
            # 安装Node.js 18.x for Debian/Ubuntu
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
            ;;
        centos|rhel|fedora|opencloudos|openeuler|anolis)
            # 对于RHEL系列，使用NodeSource仓库或直接安装
            if curl -fsSL https://rpm.nodesource.com/setup_18.x | bash - 2>/dev/null; then
                if command -v dnf &> /dev/null; then
                    dnf install -y nodejs npm
                else
                    yum install -y nodejs npm
                fi
            else
                log_warning "NodeSource仓库安装失败，尝试从默认仓库安装"
                if command -v dnf &> /dev/null; then
                    dnf install -y nodejs npm
                else
                    yum install -y nodejs npm
                fi
            fi
            ;;
    esac
    
    # 验证安装
    if ! command -v node &> /dev/null; then
        error_exit "Node.js安装失败"
    fi
    
    log_success "Node.js安装完成: $(node --version)"
}

# 安装MySQL
install_mysql() {
    log_info "安装和配置MySQL..."
    
    case "$OS" in
        ubuntu|debian)
            # 预设MySQL root密码
            echo "mysql-server mysql-server/root_password password $MYSQL_ROOT_PASSWORD" | debconf-set-selections
            echo "mysql-server mysql-server/root_password_again password $MYSQL_ROOT_PASSWORD" | debconf-set-selections
            
            apt-get install -y mysql-server mysql-client
            ;;
        centos|rhel|fedora|opencloudos|openeuler|anolis)
            if command -v dnf &> /dev/null; then
                dnf install -y mysql-server mysql || dnf install -y mariadb-server mariadb
            else
                yum install -y mysql-server mysql || yum install -y mariadb-server mariadb
            fi
            ;;
    esac
    
    # 启动MySQL服务
    systemctl enable mysql || systemctl enable mysqld
    systemctl start mysql || systemctl start mysqld
    
    # 等待MySQL启动
    sleep 10
    
    # 配置MySQL
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" || \
    mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$MYSQL_ROOT_PASSWORD'; CREATE DATABASE IF NOT EXISTS $MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE USER IF NOT EXISTS '$MYSQL_USER'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON $MYSQL_DATABASE.* TO '$MYSQL_USER'@'localhost';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"
    
    log_success "MySQL安装和配置完成"
}

# 安装Redis
install_redis() {
    log_info "安装和配置Redis..."
    
    case "$OS" in
        ubuntu|debian)
            apt-get install -y redis-server
            ;;
        centos|rhel|fedora|opencloudos|openeuler|anolis)
            if command -v dnf &> /dev/null; then
                dnf install -y redis
            else
                yum install -y redis
            fi
            ;;
    esac
    
    # 配置Redis
    cat > /etc/redis/redis.conf << EOF
bind 127.0.0.1
port 6379
requirepass $REDIS_PASSWORD
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
dir $DATA_DIR/redis
logfile /var/log/redis/redis-server.log
EOF
    
    # 创建Redis数据目录
    mkdir -p /var/log/redis
    chown redis:redis /var/log/redis
    chown redis:redis "$DATA_DIR/redis"
    
    # 启动Redis服务
    systemctl enable redis-server || systemctl enable redis
    systemctl start redis-server || systemctl start redis
    
    log_success "Redis安装和配置完成"
}

# 安装MinIO
install_minio() {
    log_info "安装和配置MinIO..."
    
    # 下载MinIO
    wget https://dl.min.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio
    chmod +x /usr/local/bin/minio
    
    # 创建MinIO用户
    useradd -r -s /sbin/nologin minio || true
    
    # 创建MinIO配置和数据目录
    mkdir -p /etc/minio
    mkdir -p "$DATA_DIR/minio"
    chown minio:minio "$DATA_DIR/minio"
    
    # 创建MinIO配置文件
    cat > /etc/minio/minio.conf << EOF
MINIO_ROOT_USER=$MINIO_ROOT_USER
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
MINIO_VOLUMES="$DATA_DIR/minio"
MINIO_OPTS="--console-address :9001"
EOF
    
    # 创建MinIO systemd服务
    cat > /etc/systemd/system/minio.service << EOF
[Unit]
Description=MinIO
Documentation=https://docs.min.io
Wants=network-online.target
After=network-online.target
AssertFileIsExecutable=/usr/local/bin/minio

[Service]
WorkingDirectory=/usr/local/

User=minio
Group=minio
ProtectProc=invisible

EnvironmentFile=/etc/minio/minio.conf
ExecStartPre=/bin/bash -c "if [ -z \"\${MINIO_VOLUMES}\" ]; then echo \"Variable MINIO_VOLUMES not set in /etc/minio/minio.conf\"; exit 1; fi"
ExecStart=/usr/local/bin/minio server \$MINIO_OPTS \$MINIO_VOLUMES

# Let systemd restart this service always
Restart=always

# Specifies the maximum file descriptor number that can be opened by this process
LimitNOFILE=65536

# Specifies the maximum number of threads this process can create
TasksMax=infinity

# Disable timeout logic and wait until process is stopped
TimeoutStopSec=infinity
SendSIGKILL=no

[Install]
WantedBy=multi-user.target
EOF
    
    # 启动MinIO服务
    systemctl daemon-reload
    systemctl enable minio
    systemctl start minio
    
    log_success "MinIO安装和配置完成"
}

# 安装Nginx
install_nginx() {
    log_info "安装和配置Nginx..."
    
    case "$OS" in
        ubuntu|debian)
            apt-get install -y nginx
            ;;
        centos|rhel|fedora|opencloudos|openeuler|anolis)
            if command -v dnf &> /dev/null; then
                dnf install -y nginx
            else
                yum install -y nginx
            fi
            ;;
    esac
    
    # 复制Nginx配置文件
    if [[ -f "$SCRIPT_DIR/nginx/nginx-prod.conf" ]]; then
        cp "$SCRIPT_DIR/nginx/nginx-prod.conf" /etc/nginx/nginx.conf
    fi
    
    if [[ -f "$SCRIPT_DIR/nginx/conf.d/default.conf" ]]; then
        mkdir -p /etc/nginx/conf.d
        cp "$SCRIPT_DIR/nginx/conf.d/default.conf" /etc/nginx/conf.d/
    fi
    
    # 测试Nginx配置
    nginx -t || error_exit "Nginx配置文件有误"
    
    # 启动Nginx服务
    systemctl enable nginx
    systemctl start nginx
    
    log_success "Nginx安装和配置完成"
}

# 部署后端API
deploy_api() {
    log_info "部署后端API服务..."
    
    if [[ ! -d "$SERVER_DIR" ]]; then
        error_exit "后端代码目录不存在: $SERVER_DIR"
    fi
    
    cd "$SERVER_DIR"
    
    # 安装依赖
    npm install --production
    
    # 构建项目
    npm run build || log_warning "构建命令失败，跳过构建步骤"
    
    # 创建环境配置文件
    cat > .env << EOF
NODE_ENV=production
PORT=$API_PORT
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$MYSQL_DATABASE
DB_USER=$MYSQL_USER
DB_PASSWORD=$MYSQL_PASSWORD
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=$MINIO_ROOT_USER
MINIO_SECRET_KEY=$MINIO_ROOT_PASSWORD
MINIO_USE_SSL=false
JWT_SECRET=wedding_jwt_secret_2024
EOF
    
    # 创建systemd服务
    cat > /etc/systemd/system/wedding-api.service << EOF
[Unit]
Description=Wedding API Service
After=network.target mysql.service redis.service minio.service

[Service]
Type=simple
User=root
WorkingDirectory=$SERVER_DIR
EnvironmentFile=$SERVER_DIR/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=wedding-api

[Install]
WantedBy=multi-user.target
EOF
    
    # 启动API服务
    systemctl daemon-reload
    systemctl enable wedding-api
    systemctl start wedding-api
    
    log_success "后端API服务部署完成"
}

# 部署前端
deploy_frontend() {
    log_info "部署前端应用..."
    
    if [[ ! -d "$WEB_DIR" ]]; then
        error_exit "前端代码目录不存在: $WEB_DIR"
    fi
    
    cd "$WEB_DIR"
    
    # 安装依赖
    npm install
    
    # 构建生产版本
    npm run build
    
    # 复制构建文件到Nginx目录
    rm -rf "$DATA_DIR/web"/*
    cp -r dist/* "$DATA_DIR/web/"
    
    # 设置权限
    chown -R www-data:www-data "$DATA_DIR/web" || chown -R nginx:nginx "$DATA_DIR/web"
    
    log_success "前端应用部署完成"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙规则..."
    
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian
        ufw allow 22/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw --force enable
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL/Fedora
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
    fi
    
    log_success "防火墙配置完成"
}

# 配置日志轮转
configure_logrotate() {
    log_info "配置日志轮转..."
    
    cat > /etc/logrotate.d/wedding << EOF
/var/log/wedding/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        systemctl reload wedding-api || true
    endscript
}

$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
    
    log_success "日志轮转配置完成"
}

# 健康检查
health_check() {
    log_info "执行服务健康检查..."
    
    local failed_services=()
    
    # 检查MySQL
    if ! systemctl is-active --quiet mysql && ! systemctl is-active --quiet mysqld; then
        failed_services+=("MySQL")
    fi
    
    # 检查Redis
    if ! systemctl is-active --quiet redis-server && ! systemctl is-active --quiet redis; then
        failed_services+=("Redis")
    fi
    
    # 检查MinIO
    if ! systemctl is-active --quiet minio; then
        failed_services+=("MinIO")
    fi
    
    # 检查Nginx
    if ! systemctl is-active --quiet nginx; then
        failed_services+=("Nginx")
    fi
    
    # 检查API服务
    if ! systemctl is-active --quiet wedding-api; then
        failed_services+=("Wedding API")
    fi
    
    if [[ ${#failed_services[@]} -eq 0 ]]; then
        log_success "所有服务运行正常"
        return 0
    else
        log_error "以下服务运行异常: ${failed_services[*]}"
        return 1
    fi
}

# 显示部署信息
show_deployment_info() {
    log_info "部署完成！服务信息如下："
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${GREEN}        婚礼应用部署完成${NC}"
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${BLUE}前端访问地址:${NC} http://$(hostname -I | awk '{print $1}')"
    echo -e "${BLUE}API服务地址:${NC} http://$(hostname -I | awk '{print $1}'):$API_PORT"
    echo -e "${BLUE}MinIO控制台:${NC} http://$(hostname -I | awk '{print $1}'):9001"
    echo -e "${BLUE}数据库信息:${NC}"
    echo -e "  - 主机: localhost:3306"
    echo -e "  - 数据库: $MYSQL_DATABASE"
    echo -e "  - 用户: $MYSQL_USER"
    echo -e "${BLUE}Redis信息:${NC}"
    echo -e "  - 主机: localhost:6379"
    echo -e "${BLUE}日志目录:${NC} $LOG_DIR"
    echo -e "${GREEN}===========================================${NC}"
}

# 主函数
main() {
    log_info "开始婚礼应用独立部署..."
    
    # 检查运行环境
    check_root
    detect_os
    create_directories
    
    # 安装系统组件
    install_system_dependencies
    install_nodejs
    install_mysql
    install_redis
    install_minio
    install_nginx
    
    # 部署应用
    deploy_api
    deploy_frontend
    
    # 配置系统
    configure_firewall
    configure_logrotate
    
    # 健康检查
    if health_check; then
        show_deployment_info
        log_success "婚礼应用部署成功完成！"
    else
        log_error "部署完成但存在服务异常，请检查日志"
        exit 1
    fi
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
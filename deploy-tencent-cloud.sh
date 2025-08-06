#!/bin/bash

# 腾讯云服务器部署脚本 - OpenCloudOS 9.4
# 使用方法: ./deploy-tencent-cloud.sh

set -e

echo "🚀 开始部署婚礼网站到腾讯云服务器..."

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用root用户或sudo权限运行此脚本"
    exit 1
fi

# 更新系统包
echo "📦 更新系统包..."
yum update -y

# 安装必要的工具
echo "🔧 安装必要工具..."
yum install -y curl wget git vim net-tools firewalld

# 安装Docker
echo "🐳 安装Docker..."
if ! command -v docker &> /dev/null; then
    # 卸载旧版本
    yum remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine
    
    # 安装Docker CE
    yum install -y yum-utils
    yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # 启动Docker服务
    systemctl start docker
    systemctl enable docker
    
    echo "✅ Docker安装完成"
else
    echo "✅ Docker已安装"
fi

# 安装Docker Compose
echo "🔧 安装Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    echo "✅ Docker Compose安装完成"
else
    echo "✅ Docker Compose已安装"
fi

# 配置防火墙
echo "🔥 配置防火墙..."
systemctl start firewalld
systemctl enable firewalld

# 开放必要端口
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=5173/tcp
firewall-cmd --reload

echo "✅ 防火墙配置完成"

# 创建应用目录
APP_DIR="/opt/wedding-client"
echo "📁 创建应用目录: $APP_DIR"
mkdir -p $APP_DIR
cd $APP_DIR

# 如果是首次部署，需要克隆代码
if [ ! -d ".git" ]; then
    echo "📥 请手动上传代码到 $APP_DIR 目录"
    echo "或者使用以下命令克隆代码:"
    echo "git clone <your-repository-url> ."
    echo ""
    echo "上传完成后，请运行以下命令继续部署:"
    echo "cd $APP_DIR && ./deploy-tencent-cloud.sh --continue"
    
    if [ "$1" != "--continue" ]; then
        exit 0
    fi
fi

# 检查必要文件
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 未找到docker-compose.yml文件，请确保代码已正确上传"
    exit 1
fi

# 创建环境变量文件
echo "⚙️ 配置环境变量..."

# 创建server环境变量
cat > server/.env << EOF
# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=wedding_host
DB_USERNAME=wedding
DB_PASSWORD=wedding123
DB_DIALECT=mysql

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 服务器配置
PORT=3000
NODE_ENV=production
API_HOST=server

# 文件上传配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=104857600

# MinIO配置
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=rustfsadmin
MINIO_SECRET_KEY=rustfssecret123
MINIO_BUCKET=wedding-media
MINIO_USE_SSL=false

# CORS配置
CORS_ORIGIN=*
CORS_CREDENTIALS=true

# 日志配置
LOG_LEVEL=info
EOF

# 创建web环境变量
cat > web/.env << EOF
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_TITLE=Wedding Club
VITE_APP_DESCRIPTION=专业婚礼策划平台
EOF

echo "✅ 环境变量配置完成"

# 构建和启动服务
echo "🏗️ 构建和启动服务..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 检查服务健康状态
echo "🏥 检查服务健康状态..."
for i in {1..10}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ 后端服务启动成功"
        break
    fi
    echo "等待后端服务启动... ($i/10)"
    sleep 5
done

for i in {1..10}; do
    if curl -f http://localhost:5173 > /dev/null 2>&1; then
        echo "✅ 前端服务启动成功"
        break
    fi
    echo "等待前端服务启动... ($i/10)"
    sleep 5
done

# 显示部署信息
echo ""
echo "🎉 部署完成！"
echo "📊 服务状态:"
docker-compose ps
echo ""
echo "🌐 访问地址:"
echo "前端: http://$(curl -s ifconfig.me):5173"
echo "后端API: http://$(curl -s ifconfig.me):3000"
echo "后端健康检查: http://$(curl -s ifconfig.me):3000/health"
echo "MinIO控制台: http://$(curl -s ifconfig.me):9001"
echo ""
echo "📝 常用命令:"
echo "查看日志: docker-compose logs -f [service_name]"
echo "重启服务: docker-compose restart [service_name]"
echo "停止服务: docker-compose down"
echo "更新代码: git pull && docker-compose build --no-cache && docker-compose up -d"
echo ""
echo "🔧 如需修改配置，请编辑以下文件:"
echo "- 后端配置: $APP_DIR/server/.env"
echo "- 前端配置: $APP_DIR/web/.env"
echo "- Docker配置: $APP_DIR/docker-compose.yml"

echo "✅ 腾讯云部署完成！"
#!/bin/bash

# 环境初始化脚本
set -e

ENVIRONMENT=${1:-development}

echo "初始化 ${ENVIRONMENT} 环境..."

# 创建必要的目录结构
echo "创建目录结构..."
mkdir -p deployment/{logs/{api,mysql,nginx,redis,minio},uploads/images}
mkdir -p server/dist
mkdir -p web/build

# 设置权限
chmod +x deployment/scripts/*.sh

# 检查Docker和Docker Compose
if ! command -v docker &> /dev/null; then
    echo "错误: Docker未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose未安装"
    exit 1
fi

# 构建项目
echo "构建项目..."
./deployment/deploy.sh deploy

echo "环境初始化完成!"
echo ""
echo "使用方法:"
echo "  启动服务: ./deployment/deploy.sh start"
echo "  停止服务: ./deployment/deploy.sh stop"
echo "  重启服务: ./deployment/deploy.sh restart"
echo "  查看日志: ./deployment/deploy.sh logs"
echo "  停止服务: ./deployment/scripts/deploy.sh $ENVIRONMENT down"
echo "  重启服务: ./deployment/scripts/deploy.sh $ENVIRONMENT restart"
echo "  查看日志: ./deployment/scripts/deploy.sh $ENVIRONMENT logs"
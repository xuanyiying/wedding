#!/bin/bash

# 开发环境构建脚本
# Wedding Client Development Build Script

set -e  # 遇到错误时退出

echo "🚀 开始构建开发环境..."

# 设置环境变量
export ENVIRONMENT=development
export SERVER_IP=localhost

echo "🔧 构建环境: $ENVIRONMENT"
echo "🌐 服务器IP: $SERVER_IP"

# 构建Web前端
echo "🌐 构建Web前端..."
cd ../web
npm run build

# 构建API后端
echo "⚙️  构建API后端..."
cd ../server
npm run build

# 构建Docker镜像
echo "🐳 构建Docker镜像..."
docker build \
  --build-arg ENVIRONMENT=$ENVIRONMENT \
  --build-arg SERVER_IP=$SERVER_IP \
  -t wedding-api:latest .

echo "✅ 开发环境构建完成!"
#!/bin/bash

# 开发环境启动脚本
# Wedding Client Development Environment

set -e

echo "🚀 启动 Wedding Client 开发环境..."

# 进入项目根目录
cd "$(dirname "$0")"

# 加载环境变量
source ./deployment/.env.dev

# 使用统一部署脚本启动开发环境
./deployment/deploy.sh start dev

echo "✅ 开发环境启动完成！"
echo "应用查看地址: http://$SERVER_IP:$WEB_PORT"
echo "API文档地址: http://$SERVER_IP:$API_PORT/api/v1/docs"
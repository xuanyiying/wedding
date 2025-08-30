#!/bin/bash

# 生产环境启动脚本
# Wedding Client Production Environment

set -e

echo "🚀 启动 Wedding Client 生产环境..."

# 进入项目根目录
cd "$(dirname "$0")"

# 加载环境变量
source ./deployment/.env.prod

# 使用统一部署脚本启动生产环境
./deployment/deploy.sh start prod

echo "✅ 生产环境启动完成！"
echo "应用查看地址: http://$SERVER_IP:$WEB_PORT"
echo "API文档地址: http://$SERVER_IP:$API_PORT/api/v1/docs"
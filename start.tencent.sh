#!/bin/bash

# 腾讯云环境启动脚本
# Wedding Client Tencent Cloud Environment

set -e

echo "🚀 启动 Wedding Client 腾讯云环境..."

# 进入项目根目录
cd "$(dirname "$0")"

# 加载环境变量
source ./deployment/.env.tencent

# 使用统一部署脚本启动腾讯云环境
./deployment/deploy.sh start tencent

echo "✅ 腾讯云环境启动完成！"
echo "应用查看地址: http://$SERVER_IP"
echo "API文档地址: http://$SERVER_IP/api/v1/docs"
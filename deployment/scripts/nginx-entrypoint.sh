#!/bin/bash
# Nginx 启动脚本 - 处理配置模板和环境变量

set -e

# 设置默认值
SERVER_HOST=${SERVER_HOST:-localhost}

echo "🔧 正在处理 Nginx 配置模板..."
echo "📍 服务器地址: $SERVER_HOST"

# 使用 envsubst 替换环境变量
envsubst '${SERVER_HOST}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "✅ Nginx 配置已生成"

# 测试配置
echo "🧪 测试 Nginx 配置..."
nginx -t

echo "🚀 启动 Nginx..."
exec nginx -g "daemon off;"
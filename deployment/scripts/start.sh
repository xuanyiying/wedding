#!/bin/sh

# 启动脚本
echo "Starting Wedding Application..."

# 创建必要的目录
mkdir -p /app/logs /app/uploads

# 启动nginx
echo "Starting Nginx..."
nginx -g "daemon off;" &

# 启动Node.js应用
echo "Starting Node.js server..."
cd /app/server
node index.js &

# 等待所有进程
wait
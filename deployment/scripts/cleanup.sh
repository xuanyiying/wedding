#!/bin/bash

# 清理脚本 - 清理Docker资源和日志

echo "开始清理..."

# 停止所有服务
echo "停止服务..."
docker-compose down

# 清理Docker资源
echo "清理Docker资源..."
docker system prune -f
docker volume prune -f

# 清理日志文件
echo "清理日志文件..."
find deployment/logs -name "*.log" -type f -delete
find deployment/logs -name "*.log.*" -type f -delete

# 清理临时文件
echo "清理临时文件..."
rm -rf server/dist/*
rm -rf web/build/*

echo "清理完成!"
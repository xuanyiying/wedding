#!/bin/bash
# Nginx 启动脚本 - 处理配置模板和环境变量

set -e

# 设置默认值
SERVER_HOST=${SERVER_HOST:-localhost}

echo "=== Nginx 配置生成开始 ==="
echo "服务器地址: $SERVER_HOST"
echo "当前时间: $(date)"
echo "环境变量检查:"
echo "  NODE_ENV: ${NODE_ENV:-未设置}"
echo "  API_PORT: ${API_PORT:-未设置}"
echo "  WEB_PORT: ${WEB_PORT:-未设置}"

# 检查模板文件是否存在
if [[ ! -f "/etc/nginx/conf.d/default.conf.template" ]]; then
    echo "错误: nginx配置模板文件不存在"
    exit 1
fi

echo "正在处理 Nginx 配置模板..."

# 使用 envsubst 替换环境变量
if ! envsubst '${SERVER_HOST}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf; then
    echo "错误: 配置模板处理失败"
    exit 1
fi

echo "Nginx 配置已生成"

# 验证生成的配置文件
if [[ ! -f "/etc/nginx/conf.d/default.conf" ]]; then
    echo "错误: nginx配置文件未生成"
    exit 1
fi

echo "配置文件大小: $(wc -c < /etc/nginx/conf.d/default.conf) 字节"

# 测试配置
echo "测试 Nginx 配置..."
if ! nginx -t; then
    echo "错误: nginx配置测试失败"
    cat /etc/nginx/conf.d/default.conf | head -20
    exit 1
fi

echo "Nginx 配置测试通过"
echo "=== Nginx 配置生成完成 ==="

# 检查依赖服务是否可达
echo "检查依赖服务状态..."
echo "检查前端Web服务 (wedding-web-${ENVIRONMENT:-prod}:80)..."
if ! nc -z wedding-web-${ENVIRONMENT:-prod} 80 2>/dev/null; then
    echo "警告: 前端Web服务不可达，nginx将启动但可能出现502错误"
fi

echo "检查API服务 (wedding-api-${ENVIRONMENT:-prod}:3000)..."
if ! nc -z wedding-api-${ENVIRONMENT:-prod} 3000 2>/dev/null; then
    echo "警告: API服务不可达，nginx将启动但API请求可能失败"
fi

echo "显示生成的配置文件关键部分..."
echo "=== upstream配置 ==="
grep -A 5 "upstream.*backend" /etc/nginx/conf.d/default.conf || echo "未找到upstream配置"
echo "=== location / 配置 ==="
grep -A 10 "location / {" /etc/nginx/conf.d/default.conf || echo "未找到根路径配置"

echo "启动 Nginx..."
exec nginx -g "daemon off;"
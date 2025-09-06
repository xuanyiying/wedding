#!/bin/bash
# Nginx 启动脚本 - 处理配置模板和环境变量

set -e

# 设置默认值
SERVER_HOST=${SERVER_HOST:-localhost}

echo "=== Nginx 配置生成开始 ==="
echo "服务器地址: $SERVER_HOST"
echo "当前时间: $(date)"

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

echo "启动 Nginx..."
exec nginx -g "daemon off;"
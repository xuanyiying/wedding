#!/bin/bash
# Nginx 启动脚本 - 处理配置模板和环境变量

set -e

# 设置默认值
SERVER_HOST=${SERVER_HOST:-localhost}
ENVIRONMENT=${ENVIRONMENT:-prod}

# 设置服务名称和端口的默认值
API_SERVICE_NAME=${API_SERVICE_NAME:-wedding-api-${ENVIRONMENT}}
API_SERVICE_PORT=${API_SERVICE_PORT:-3000}
WEB_SERVICE_NAME=${WEB_SERVICE_NAME:-wedding-web-${ENVIRONMENT}}
WEB_SERVICE_PORT=${WEB_SERVICE_PORT:-80}
MINIO_SERVICE_NAME=${MINIO_SERVICE_NAME:-wedding-minio-${ENVIRONMENT}}
MINIO_SERVICE_PORT=${MINIO_SERVICE_PORT:-9000}

echo "=== Nginx 配置生成开始 ==="
echo "服务器地址: $SERVER_HOST"
echo "环境: $ENVIRONMENT"
echo "API服务: $API_SERVICE_NAME:$API_SERVICE_PORT"
echo "Web服务: $WEB_SERVICE_NAME:$WEB_SERVICE_PORT"
echo "MinIO服务: $MINIO_SERVICE_NAME:$MINIO_SERVICE_PORT"
echo "当前时间: $(date)"
echo "环境变量检查:"
echo "  NODE_ENV: ${NODE_ENV:-未设置}"
echo "  ENVIRONMENT: ${ENVIRONMENT:-未设置}"

# 创建nginx缓存目录
echo "创建nginx缓存目录..."
mkdir -p /var/cache/nginx/{api,static,images,temp}
chown -R nginx:nginx /var/cache/nginx
chmod -R 755 /var/cache/nginx

# 检查模板文件是否存在
if [[ ! -f "/etc/nginx/conf.d/default.conf.template" ]]; then
    echo "错误: nginx配置模板文件不存在"
    exit 1
fi

echo "正在处理 Nginx 配置模板..."

# 使用 envsubst 替换环境变量
if ! envsubst '${SERVER_HOST} ${API_SERVICE_NAME} ${API_SERVICE_PORT} ${WEB_SERVICE_NAME} ${WEB_SERVICE_PORT} ${MINIO_SERVICE_NAME} ${MINIO_SERVICE_PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf; then
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

echo "=== Nginx 配置生成完成 ==="

# 检查依赖服务是否可达（增加重试机制和更灵活的检查）
echo "检查依赖服务状态..."
echo "检查前端Web服务 ($WEB_SERVICE_NAME:$WEB_SERVICE_PORT)..."

retry_count=0
max_retries=20
while [[ $retry_count -lt $max_retries ]]; do
    if command -v nc >/dev/null 2>&1; then
        if nc -z "$WEB_SERVICE_NAME" "$WEB_SERVICE_PORT" 2>/dev/null; then
            echo "✅ 前端Web服务可达"
            break
        else
            echo "⚠️  前端Web服务不可达，等待5秒后重试 ($((retry_count+1))/$max_retries)..."
            sleep 5
            retry_count=$((retry_count+1))
        fi
    elif command -v telnet >/dev/null 2>&1; then
        # 使用telnet作为备选方案
        if echo "quit" | timeout 5 telnet "$WEB_SERVICE_NAME" "$WEB_SERVICE_PORT" 2>/dev/null | grep -q "Connected"; then
            echo "✅ 前端Web服务可达"
            break
        else
            echo "⚠️  前端Web服务不可达，等待5秒后重试 ($((retry_count+1))/$max_retries)..."
            sleep 5
            retry_count=$((retry_count+1))
        fi
    else
        echo "跳过网络检查 (缺少nc和telnet命令)"
        break
    fi
done

if [[ $retry_count -ge $max_retries ]]; then
    echo "⚠️ 前端Web服务在多次尝试后仍不可达，nginx将启动但可能出现502错误"
fi

echo "检查API服务 ($API_SERVICE_NAME:$API_SERVICE_PORT)..."
retry_count=0
while [[ $retry_count -lt $max_retries ]]; do
    if command -v nc >/dev/null 2>&1; then
        if nc -z "$API_SERVICE_NAME" "$API_SERVICE_PORT" 2>/dev/null; then
            echo "✅ API服务可达"
            break
        else
            echo "⚠️  API服务不可达，等待5秒后重试 ($((retry_count+1))/$max_retries)..."
            sleep 5
            retry_count=$((retry_count+1))
        fi
    elif command -v telnet >/dev/null 2>&1; then
        # 使用telnet作为备选方案
        if echo "quit" | timeout 5 telnet "$API_SERVICE_NAME" "$API_SERVICE_PORT" 2>/dev/null | grep -q "Connected"; then
            echo "✅ API服务可达"
            break
        else
            echo "⚠️  API服务不可达，等待5秒后重试 ($((retry_count+1))/$max_retries)..."
            sleep 5
            retry_count=$((retry_count+1))
        fi
    else
        echo "跳过网络检查 (缺少nc和telnet命令)"
        break
    fi
done

if [[ $retry_count -ge $max_retries ]]; then
    echo "⚠️ API服务在多次尝试后仍不可达，nginx将启动但API请求可能失败"
fi

# 测试配置
echo "测试 Nginx 配置..."
if ! nginx -t; then
    echo "错误: nginx配置测试失败"
    echo "显示生成的配置文件内容:"
    cat /etc/nginx/conf.d/default.conf
    exit 1
fi

echo "Nginx 配置测试通过"

echo "显示生成的配置文件关键部分..."
echo "=== upstream配置 ==="
grep -A 10 "upstream.*backend" /etc/nginx/conf.d/default.conf || echo "未找到upstream配置"
echo "=== location / 配置 ==="
grep -A 15 "location / {" /etc/nginx/conf.d/default.conf || echo "未找到根路径配置"

echo "启动 Nginx..."
exec nginx -g "daemon off;"
#!/bin/sh
set -e

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >&2
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1"
}

# 创建nginx缓存目录
log_info "创建nginx缓存目录..."
mkdir -p /var/cache/nginx/api 2>/dev/null || true
mkdir -p /var/cache/nginx/static 2>/dev/null || true
mkdir -p /var/cache/nginx/images 2>/dev/null || true
mkdir -p /var/cache/nginx/temp 2>/dev/null || true

# 设置目录权限
chown -R nginx:nginx /var/cache/nginx 2>/dev/null || true
chmod -R 755 /var/cache/nginx 2>/dev/null || true

log_success "nginx缓存目录创建完成"

# 使用envsubst替换环境变量并生成nginx配置
log_info "替换环境变量并生成nginx配置..."

# 打印环境变量用于调试
log_info "当前环境变量："
log_info "API_SERVICE_NAME=${API_SERVICE_NAME}"
log_info "API_SERVICE_PORT=${API_SERVICE_PORT}"
log_info "WEB_SERVICE_NAME=${WEB_SERVICE_NAME}"
log_info "WEB_SERVICE_PORT=${WEB_SERVICE_PORT}"
log_info "MINIO_SERVICE_NAME=${MINIO_SERVICE_NAME}"
log_info "MINIO_SERVICE_PORT=${MINIO_SERVICE_PORT}"
log_info "SERVER_HOST=${SERVER_HOST}"

# 替换环境变量
envsubst '${API_SERVICE_NAME} ${API_SERVICE_PORT} ${WEB_SERVICE_NAME} ${WEB_SERVICE_PORT} ${MINIO_SERVICE_NAME} ${MINIO_SERVICE_PORT} ${SERVER_HOST}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# 测试nginx配置
log_info "执行nginx配置语法检查"
if nginx -t; then
    log_success "nginx配置语法检查通过"
else
    log_error "nginx配置语法检查失败"
    exit 1
fi

# 启动nginx
log_info "启动nginx服务..."
exec nginx -g 'daemon off;'
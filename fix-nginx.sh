#!/bin/bash

# Nginx配置修复脚本
# 修复生产环境nginx配置中的上游服务器地址问题

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Nginx配置修复工具${NC}"
echo -e "${BLUE}========================================${NC}"

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# 配置文件路径
NGINX_PROD_CONF="$PROJECT_ROOT/deployment/nginx/nginx.prod.conf"
NGINX_TENCENT_CONF="$PROJECT_ROOT/deployment/nginx/nginx.tencent.conf"

echo -e "${BLUE}[INFO]${NC} 开始修复nginx配置..."

# 检查配置文件是否存在
if [[ ! -f "$NGINX_PROD_CONF" ]]; then
    echo -e "${RED}[ERROR]${NC} 生产环境nginx配置文件不存在: $NGINX_PROD_CONF"
    exit 1
fi

if [[ ! -f "$NGINX_TENCENT_CONF" ]]; then
    echo -e "${RED}[ERROR]${NC} 腾讯云nginx配置文件不存在: $NGINX_TENCENT_CONF"
    exit 1
fi

# 检查docker-compose配置语法
echo -e "${BLUE}[INFO]${NC} 检查docker-compose配置语法..."

COMPOSE_TENCENT="$PROJECT_ROOT/deployment/docker-compose.tencent.yml"
ENV_TENCENT="$PROJECT_ROOT/deployment/.env.tencent"

if [[ -f "$COMPOSE_TENCENT" && -f "$ENV_TENCENT" ]]; then
    if docker-compose -f "$COMPOSE_TENCENT" --env-file "$ENV_TENCENT" config >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} 腾讯云docker-compose配置语法正确"
    else
        echo -e "${RED}✗${NC} 腾讯云docker-compose配置语法错误"
        docker-compose -f "$COMPOSE_TENCENT" --env-file "$ENV_TENCENT" config 2>&1 || true
    fi
fi

# 测试nginx配置语法（如果nginx可用）
if command -v nginx >/dev/null 2>&1; then
    echo -e "${BLUE}[INFO]${NC} 测试nginx配置语法..."
    
    # 创建临时目录测试
    TEMP_DIR=$(mktemp -d)
    cp "$NGINX_TENCENT_CONF" "$TEMP_DIR/nginx.conf"
    
    if nginx -t -c "$TEMP_DIR/nginx.conf" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} 腾讯云nginx配置语法正确"
    else
        echo -e "${YELLOW}⚠${NC} nginx配置可能有问题，请检查："
        nginx -t -c "$TEMP_DIR/nginx.conf" 2>&1 || true
    fi
    
    rm -rf "$TEMP_DIR"
else
    echo -e "${YELLOW}[WARNING]${NC} nginx未安装，跳过配置语法检查"
fi

# 检查容器服务名称匹配
echo -e "${BLUE}[INFO]${NC} 检查服务名称匹配..."

# 从docker-compose中提取服务名称
if [[ -f "$COMPOSE_TENCENT" ]]; then
    echo -e "${BLUE}Docker Compose中定义的服务:${NC}"
    grep -E "^\s+[a-zA-Z][a-zA-Z0-9_-]*:" "$COMPOSE_TENCENT" | sed 's/://g' | sed 's/^[[:space:]]*/  - /'
    
    echo -e "\n${BLUE}Nginx配置中引用的上游服务:${NC}"
    if [[ -f "$NGINX_TENCENT_CONF" ]]; then
        grep -E "server\s+[a-zA-Z]" "$NGINX_TENCENT_CONF" | sed 's/^[[:space:]]*/  - /'
    fi
fi

# 提供修复建议
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}    修复建议${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${YELLOW}如果nginx启动失败，请检查以下几点:${NC}"
echo -e "1. ${BLUE}确保所有容器正在运行:${NC}"
echo -e "   docker-compose -f deployment/docker-compose.tencent.yml ps"
echo -e ""
echo -e "2. ${BLUE}检查容器网络连接:${NC}"
echo -e "   docker network ls"
echo -e "   docker network inspect wedding-net"
echo -e ""
echo -e "3. ${BLUE}如果服务未启动，按顺序启动:${NC}"
echo -e "   # 先启动基础服务"
echo -e "   docker-compose -f deployment/docker-compose.tencent.yml up -d mysql redis minio"
echo -e "   # 等待30秒"
echo -e "   sleep 30"
echo -e "   # 启动API服务"
echo -e "   docker-compose -f deployment/docker-compose.tencent.yml up -d api"
echo -e "   # 等待20秒"
echo -e "   sleep 20"
echo -e "   # 启动Web和Nginx"
echo -e "   docker-compose -f deployment/docker-compose.tencent.yml up -d web nginx"
echo -e ""
echo -e "4. ${BLUE}查看nginx错误日志:${NC}"
echo -e "   docker logs wedding-nginx"
echo -e ""
echo -e "5. ${BLUE}重新部署（推荐）:${NC}"
echo -e "   ./quick-deploy-tencent.sh"

echo -e "\n${GREEN}[SUCCESS]${NC} 配置检查完成"
echo -e "${BLUE}如果问题持续存在，请运行诊断脚本:${NC} ./diagnose-tencent.sh"
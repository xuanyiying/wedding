#!/bin/bash
# =============================================================================
# Wedding Club - 安装日志系统依赖
# =============================================================================
# 用于安装日志轮转所需的依赖包
# 使用方法：./install-dependencies.sh
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}安装日志系统依赖${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ] && [ ! -d "server" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 进入 server 目录
cd server

echo -e "${BLUE}1. 检查当前依赖...${NC}"
if grep -q "winston-daily-rotate-file" package.json; then
    echo -e "${GREEN}✓ winston-daily-rotate-file 已在 package.json 中${NC}"
else
    echo -e "${YELLOW}⚠ winston-daily-rotate-file 未在 package.json 中${NC}"
fi
echo ""

echo -e "${BLUE}2. 安装依赖...${NC}"
npm install
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

echo -e "${BLUE}3. 验证安装...${NC}"
if [ -d "node_modules/winston-daily-rotate-file" ]; then
    echo -e "${GREEN}✓ winston-daily-rotate-file 安装成功${NC}"
else
    echo -e "${RED}✗ winston-daily-rotate-file 安装失败${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}4. 检查日志目录...${NC}"
cd ..
mkdir -p deployment/logs/api
mkdir -p deployment/logs/nginx
mkdir -p deployment/logs/mysql
mkdir -p deployment/logs/redis
mkdir -p deployment/logs/minio
echo -e "${GREEN}✓ 日志目录创建完成${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}依赖安装完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo -e "1. 重新构建镜像: ${BLUE}ENVIRONMENT=prod docker-compose build api${NC}"
echo -e "2. 重启服务: ${BLUE}ENVIRONMENT=prod docker-compose up -d api nginx${NC}"
echo -e "3. 测试日志: ${BLUE}./deployment/scripts/test-logging.sh prod${NC}"

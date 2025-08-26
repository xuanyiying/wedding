#!/bin/bash

# Nginx紧急修复脚本 - 专门解决部署异常问题

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}========================================${NC}"
echo -e "${RED}    Nginx紧急修复工具${NC}"
echo -e "${RED}========================================${NC}"

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo -e "${BLUE}[INFO]${NC} 正在修复nginx配置问题..."

# 步骤1: 停止所有服务
echo -e "${BLUE}[步骤1]${NC} 停止所有容器..."
cd "$PROJECT_ROOT"
docker-compose -f deployment/docker-compose.tencent.yml --env-file deployment/.env.tencent down --remove-orphans 2>/dev/null || true
sleep 3

# 步骤2: 检查并清理问题容器
echo -e "${BLUE}[步骤2]${NC} 清理问题容器..."
docker container prune -f >/dev/null 2>&1 || true

# 步骤3: 按正确顺序启动服务
echo -e "${BLUE}[步骤3]${NC} 按顺序启动服务..."

echo -e "${YELLOW}启动数据库和存储服务...${NC}"
docker-compose -f deployment/docker-compose.tencent.yml --env-file deployment/.env.tencent up -d mysql redis minio

echo -e "${YELLOW}等待数据库服务启动 (30秒)...${NC}"
sleep 30

echo -e "${YELLOW}启动API服务...${NC}"
docker-compose -f deployment/docker-compose.tencent.yml --env-file deployment/.env.tencent up -d api

echo -e "${YELLOW}等待API服务启动 (20秒)...${NC}"
sleep 20

echo -e "${YELLOW}启动Web服务...${NC}"
docker-compose -f deployment/docker-compose.tencent.yml --env-file deployment/.env.tencent up -d web

echo -e "${YELLOW}等待Web服务启动 (10秒)...${NC}"
sleep 10

echo -e "${YELLOW}最后启动Nginx服务...${NC}"
docker-compose -f deployment/docker-compose.tencent.yml --env-file deployment/.env.tencent up -d nginx

# 步骤4: 等待服务稳定
echo -e "${BLUE}[步骤4]${NC} 等待服务稳定..."
sleep 15

# 步骤5: 检查服务状态
echo -e "${BLUE}[步骤5]${NC} 检查服务状态..."
echo -e "${BLUE}当前容器状态:${NC}"
docker-compose -f deployment/docker-compose.tencent.yml --env-file deployment/.env.tencent ps

# 步骤6: 检查nginx日志
echo -e "\n${BLUE}[步骤6]${NC} 检查nginx日志..."
echo -e "${BLUE}Nginx最近日志:${NC}"
docker logs wedding-nginx --tail=10 2>/dev/null || echo "无法获取nginx日志"

# 步骤7: 测试服务可访问性
echo -e "\n${BLUE}[步骤7]${NC} 测试服务访问..."

# 测试健康检查端点
if curl -f -m 5 -s http://localhost/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Web服务可访问"
else
    echo -e "${RED}✗${NC} Web服务无法访问"
fi

if curl -f -m 5 -s http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API服务可访问"
else
    echo -e "${RED}✗${NC} API服务无法访问"
fi

# 显示访问地址
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}    修复完成！${NC}"
echo -e "${BLUE}========================================${NC}"

# 获取服务器IP
SERVER_IP=$(hostname -I | awk '{print $1}' || echo "localhost")

echo -e "${BLUE}访问地址:${NC}"
echo -e "  前端应用: ${GREEN}http://$SERVER_IP${NC}"
echo -e "  API服务:  ${GREEN}http://$SERVER_IP:3000${NC}"
echo -e "  MinIO控制台: ${GREEN}http://$SERVER_IP:9001${NC}"

echo -e "\n${BLUE}如果仍有问题:${NC}"
echo -e "1. 查看详细日志: ${YELLOW}docker-compose logs -f nginx${NC}"
echo -e "2. 重新部署: ${YELLOW}./quick-deploy-tencent.sh${NC}"
echo -e "3. 运行诊断: ${YELLOW}./diagnose-tencent.sh${NC}"

echo -e "\n${GREEN}🎉 紧急修复完成！${NC}"
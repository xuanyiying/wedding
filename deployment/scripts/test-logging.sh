#!/bin/bash
# =============================================================================
# Wedding Club - 日志测试脚本
# =============================================================================
# 用于测试日志系统是否正常工作
# 使用方法：./test-logging.sh [environment]
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 环境变量
ENVIRONMENT=${1:-prod}
LOGS_DIR="./deployment/logs"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}日志系统测试${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}环境: $ENVIRONMENT${NC}"
echo ""

# 检查日志目录
echo -e "${BLUE}1. 检查日志目录结构...${NC}"
if [ ! -d "$LOGS_DIR" ]; then
    echo -e "${RED}✗ 日志目录不存在${NC}"
    exit 1
fi

for dir in api nginx mysql redis minio; do
    if [ -d "$LOGS_DIR/$dir" ]; then
        echo -e "${GREEN}✓ $dir 日志目录存在${NC}"
    else
        echo -e "${YELLOW}⚠ $dir 日志目录不存在，创建中...${NC}"
        mkdir -p "$LOGS_DIR/$dir"
    fi
done
echo ""

# 检查 API 容器日志
echo -e "${BLUE}2. 检查 API 容器日志...${NC}"
CONTAINER_NAME="wedding-service-api-${ENVIRONMENT}"
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${GREEN}✓ API 容器运行中${NC}"
    
    # 显示最近的日志
    echo -e "${YELLOW}最近的容器日志:${NC}"
    docker logs --tail 10 "$CONTAINER_NAME" 2>&1 | head -20
    
    # 检查日志文件
    echo ""
    echo -e "${YELLOW}检查日志文件:${NC}"
    ls -lh "$LOGS_DIR/api/" 2>/dev/null || echo -e "${RED}✗ 无法访问日志文件${NC}"
else
    echo -e "${RED}✗ API 容器未运行${NC}"
fi
echo ""

# 检查 Nginx 日志
echo -e "${BLUE}3. 检查 Nginx 日志...${NC}"
NGINX_CONTAINER="wedding-service-nginx-${ENVIRONMENT}"
if docker ps -a --format '{{.Names}}' | grep -q "^${NGINX_CONTAINER}$"; then
    echo -e "${GREEN}✓ Nginx 容器运行中${NC}"
    
    echo -e "${YELLOW}Nginx 日志文件:${NC}"
    ls -lh "$LOGS_DIR/nginx/" 2>/dev/null || echo -e "${RED}✗ 无法访问日志文件${NC}"
else
    echo -e "${RED}✗ Nginx 容器未运行${NC}"
fi
echo ""

# 测试日志写入
echo -e "${BLUE}4. 测试日志写入...${NC}"
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${YELLOW}发送测试请求...${NC}"
    
    # 发送健康检查请求
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ 健康检查成功 (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${YELLOW}⚠ 健康检查返回 HTTP $HTTP_CODE${NC}"
    fi
    
    # 等待日志写入
    sleep 2
    
    # 检查是否有新日志
    echo -e "${YELLOW}检查新日志:${NC}"
    TODAY=$(date +%Y-%m-%d)
    
    if [ -f "$LOGS_DIR/nginx/access-${TODAY}.log" ]; then
        echo -e "${GREEN}✓ Nginx 访问日志已更新${NC}"
        tail -3 "$LOGS_DIR/nginx/access-${TODAY}.log"
    else
        echo -e "${YELLOW}⚠ 未找到今天的 Nginx 访问日志${NC}"
        ls -lh "$LOGS_DIR/nginx/" | tail -5
    fi
else
    echo -e "${RED}✗ 无法测试，容器未运行${NC}"
fi
echo ""

# 显示日志统计
echo -e "${BLUE}5. 日志统计信息...${NC}"
echo -e "${YELLOW}各服务日志大小:${NC}"
du -sh "$LOGS_DIR"/* 2>/dev/null || echo -e "${RED}✗ 无法获取统计信息${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}日志测试完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}提示:${NC}"
echo -e "- API 日志位置: $LOGS_DIR/api/"
echo -e "- Nginx 日志位置: $LOGS_DIR/nginx/"
echo -e "- 日志按天分割，格式: app-YYYY-MM-DD.log"
echo -e "- 使用 ./rotate-logs.sh 清理旧日志"

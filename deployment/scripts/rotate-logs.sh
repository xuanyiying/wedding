#!/bin/bash
# =============================================================================
# Wedding Club - 日志轮转脚本
# =============================================================================
# 用于清理旧日志文件，保留最近30天的日志
# 使用方法：./rotate-logs.sh
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志目录
LOGS_DIR="./deployment/logs"
RETENTION_DAYS=30

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}日志轮转脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查日志目录是否存在
if [ ! -d "$LOGS_DIR" ]; then
    echo -e "${RED}错误: 日志目录不存在: $LOGS_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}保留天数: $RETENTION_DAYS 天${NC}"
echo ""

# 清理 Nginx 日志
echo -e "${GREEN}清理 Nginx 日志...${NC}"
find "$LOGS_DIR/nginx" -name "access-*.log" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$LOGS_DIR/nginx" -name "error-*.log" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
echo -e "${GREEN}✓ Nginx 日志清理完成${NC}"

# 清理 API 日志
echo -e "${GREEN}清理 API 日志...${NC}"
find "$LOGS_DIR/api" -name "app-*.log" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$LOGS_DIR/api" -name "error-*.log" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$LOGS_DIR/api" -name "*.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
echo -e "${GREEN}✓ API 日志清理完成${NC}"

# 清理 MySQL 日志
echo -e "${GREEN}清理 MySQL 日志...${NC}"
find "$LOGS_DIR/mysql" -name "*.log" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
echo -e "${GREEN}✓ MySQL 日志清理完成${NC}"

# 清理 Redis 日志
echo -e "${GREEN}清理 Redis 日志...${NC}"
find "$LOGS_DIR/redis" -name "*.log" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
echo -e "${GREEN}✓ Redis 日志清理完成${NC}"

# 清理 MinIO 日志
echo -e "${GREEN}清理 MinIO 日志...${NC}"
find "$LOGS_DIR/minio" -name "*.log" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
echo -e "${GREEN}✓ MinIO 日志清理完成${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}日志轮转完成${NC}"
echo -e "${GREEN}========================================${NC}"

# 显示当前日志目录大小
echo ""
echo -e "${YELLOW}当前日志目录大小:${NC}"
du -sh "$LOGS_DIR"/* 2>/dev/null || true

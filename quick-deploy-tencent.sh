#!/bin/bash

# Wedding Club 腾讯云快速部署脚本
# 一键部署解决方案

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Wedding Club 腾讯云快速部署${NC}"
echo -e "${BLUE}========================================${NC}"

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 配置文件路径
COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-compose.tencent.yml"
ENV_FILE="$PROJECT_ROOT/deployment/.env.tencent"

echo -e "${BLUE}[INFO]${NC} 项目路径: $PROJECT_ROOT"
echo -e "${BLUE}[INFO]${NC} 配置文件: $COMPOSE_FILE"
echo -e "${BLUE}[INFO]${NC} 环境文件: $ENV_FILE"

# 检查必要文件
if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo -e "${RED}[ERROR]${NC} Docker Compose 文件不存在: $COMPOSE_FILE"
    exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
    echo -e "${RED}[ERROR]${NC} 环境配置文件不存在: $ENV_FILE"
    exit 1
fi

# 检查Docker
if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} Docker 未安装"
    exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} Docker Compose 未安装"
    exit 1
fi

# 检查Docker服务
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} Docker 服务未运行"
    exit 1
fi

echo -e "${GREEN}[SUCCESS]${NC} 依赖检查完成"

# 验证本地镜像
echo -e "${BLUE}[INFO]${NC} 检查本地Docker镜像..."
images_available=true

for image in "deployment-web:latest" "deployment-api1:latest" "mysql:8.0" "redis:7-alpine" "minio/minio:latest" "nginx:alpine"; do
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^$image$"; then
        echo -e "${GREEN}✓${NC} 找到镜像: $image"
    else
        echo -e "${YELLOW}✗${NC} 缺失镜像: $image"
        images_available=false
    fi
done

if [[ "$images_available" == "false" ]]; then
    echo -e "${YELLOW}[WARNING]${NC} 部分镜像缺失，但将尝试继续部署"
fi

# 创建必要目录
echo -e "${BLUE}[INFO]${NC} 创建必要目录..."
mkdir -p "$PROJECT_ROOT/deployment/logs/nginx"
mkdir -p "$PROJECT_ROOT/deployment/logs/api"
mkdir -p "$PROJECT_ROOT/deployment/logs/mysql"
mkdir -p "$PROJECT_ROOT/deployment/logs/redis"
mkdir -p "$PROJECT_ROOT/deployment/logs/minio"
mkdir -p "$PROJECT_ROOT/deployment/uploads"

# 停止现有服务
echo -e "${BLUE}[INFO]${NC} 停止现有服务..."
cd "$PROJECT_ROOT"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans 2>/dev/null || true

# 等待服务完全停止
sleep 3

# 启动服务
echo -e "${BLUE}[INFO]${NC} 启动服务..."
echo -e "${BLUE}[INFO]${NC} 请耐心等待，服务启动需要一些时间..."

# 分步启动以确保依赖关系
echo -e "${BLUE}[INFO]${NC} 第1步：启动数据库服务..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d mysql redis minio

echo -e "${BLUE}[INFO]${NC} 等待数据库服务启动..."
sleep 30

echo -e "${BLUE}[INFO]${NC} 第2步：启动API服务..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api

echo -e "${BLUE}[INFO]${NC} 等待API服务启动..."
sleep 20

echo -e "${BLUE}[INFO]${NC} 第3步：启动Web和Nginx服务..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d web nginx

echo -e "${BLUE}[INFO]${NC} 最终等待所有服务稳定..."
sleep 15

# 检查服务状态
echo -e "${BLUE}[INFO]${NC} 检查服务状态..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

# 简单健康检查
echo -e "${BLUE}[INFO]${NC} 执行健康检查..."
health_ok=true

# 检查Web服务
if curl -f -m 10 -s http://localhost/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Web服务正常"
else
    echo -e "${YELLOW}✗${NC} Web服务可能未就绪"
    health_ok=false
fi

# 检查API服务
if curl -f -m 10 -s http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API服务正常"
else
    echo -e "${YELLOW}✗${NC} API服务可能未就绪"
    health_ok=false
fi

if [[ "$health_ok" == "true" ]]; then
    echo -e "${GREEN}[SUCCESS]${NC} 所有服务健康检查通过！"
else
    echo -e "${YELLOW}[WARNING]${NC} 部分服务可能需要更多时间启动"
fi

# 显示部署结果
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}    部署完成！${NC}"
echo -e "${BLUE}========================================${NC}"

# 获取服务器IP
SERVER_IP=$(hostname -I | awk '{print $1}' || echo "localhost")

echo -e "${BLUE}访问地址:${NC}"
echo -e "  前端应用: ${GREEN}http://$SERVER_IP${NC}"
echo -e "  API服务:  ${GREEN}http://$SERVER_IP:3000${NC}"
echo -e "  MinIO控制台: ${GREEN}http://$SERVER_IP:9001${NC}"
echo -e ""
echo -e "${BLUE}管理命令:${NC}"
echo -e "  查看服务状态: ${YELLOW}docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps${NC}"
echo -e "  查看服务日志: ${YELLOW}docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs [服务名]${NC}"
echo -e "  停止所有服务: ${YELLOW}docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE down${NC}"
echo -e ""
echo -e "${BLUE}故障排除:${NC}"
echo -e "  如果服务无法访问，请等待1-2分钟后重试"
echo -e "  查看详细日志: ${YELLOW}docker-compose logs -f${NC}"
echo -e "  重启服务: ${YELLOW}$0${NC}"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 Wedding Club 部署完成！${NC}"
echo -e "${BLUE}========================================${NC}"
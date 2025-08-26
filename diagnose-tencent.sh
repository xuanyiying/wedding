#!/bin/bash

# Wedding Club 腾讯云部署问题诊断脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Wedding Club 问题诊断工具${NC}"
echo -e "${BLUE}========================================${NC}"

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# 配置文件路径
COMPOSE_FILE="$PROJECT_ROOT/deployment/docker-compose.tencent.yml"
ENV_FILE="$PROJECT_ROOT/deployment/.env.tencent"

echo -e "${BLUE}[INFO]${NC} 开始系统诊断..."

# 1. 检查Docker环境
echo -e "\n${BLUE}=== 1. Docker环境检查 ===${NC}"

if command -v docker >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker已安装"
    echo -e "${BLUE}Docker版本:${NC} $(docker --version)"
else
    echo -e "${RED}✗${NC} Docker未安装"
fi

if command -v docker-compose >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker Compose已安装"
    echo -e "${BLUE}Docker Compose版本:${NC} $(docker-compose --version)"
else
    echo -e "${RED}✗${NC} Docker Compose未安装"
fi

if docker info >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker服务运行正常"
else
    echo -e "${RED}✗${NC} Docker服务未运行"
fi

# 2. 检查配置文件
echo -e "\n${BLUE}=== 2. 配置文件检查 ===${NC}"

if [[ -f "$COMPOSE_FILE" ]]; then
    echo -e "${GREEN}✓${NC} Docker Compose配置文件存在"
else
    echo -e "${RED}✗${NC} Docker Compose配置文件不存在: $COMPOSE_FILE"
fi

if [[ -f "$ENV_FILE" ]]; then
    echo -e "${GREEN}✓${NC} 环境配置文件存在"
else
    echo -e "${RED}✗${NC} 环境配置文件不存在: $ENV_FILE"
fi

if [[ -f "$COMPOSE_FILE" ]]; then
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Docker Compose配置语法正确"
    else
        echo -e "${RED}✗${NC} Docker Compose配置语法错误"
        echo -e "${YELLOW}错误详情:${NC}"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config 2>&1 || true
    fi
fi

# 3. 检查本地镜像
echo -e "\n${BLUE}=== 3. Docker镜像检查 ===${NC}"

required_images=(
    "deployment-web:latest"
    "deployment-api1:latest"
    "mysql:8.0"
    "redis:7-alpine"
    "minio/minio:latest"
    "nginx:alpine"
)

for image in "${required_images[@]}"; do
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^$image$"; then
        echo -e "${GREEN}✓${NC} $image"
    else
        echo -e "${RED}✗${NC} $image (缺失)"
    fi
done

# 4. 检查容器状态
echo -e "\n${BLUE}=== 4. 容器状态检查 ===${NC}"

if [[ -f "$COMPOSE_FILE" ]]; then
    echo -e "${BLUE}当前容器状态:${NC}"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps 2>/dev/null || echo "无法获取容器状态"
    
    echo -e "\n${BLUE}所有Docker容器:${NC}"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(wedding|mysql|redis|minio|nginx)" || echo "未找到相关容器"
fi

# 5. 检查端口占用
echo -e "\n${BLUE}=== 5. 端口占用检查 ===${NC}"

ports=("80" "3000" "3306" "6379" "9000" "9001")
for port in "${ports[@]}"; do
    if ss -tlnp | grep -q ":$port "; then
        echo -e "${GREEN}✓${NC} 端口 $port 正在使用"
        ss -tlnp | grep ":$port " | head -1
    else
        echo -e "${YELLOW}○${NC} 端口 $port 未使用"
    fi
done

# 6. 检查网络连接
echo -e "\n${BLUE}=== 6. 网络连接检查 ===${NC}"

# 检查本地服务响应
if curl -f -m 5 -s http://localhost/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Web服务响应正常 (http://localhost/health)"
else
    echo -e "${RED}✗${NC} Web服务无响应 (http://localhost/health)"
fi

if curl -f -m 5 -s http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API服务响应正常 (http://localhost:3000/health)"
else
    echo -e "${RED}✗${NC} API服务无响应 (http://localhost:3000/health)"
fi

# 7. 检查系统资源
echo -e "\n${BLUE}=== 7. 系统资源检查 ===${NC}"

# 磁盘空间
available_space=$(df / | awk 'NR==2 {print $4}')
echo -e "${BLUE}可用磁盘空间:${NC} ${available_space}KB"
if [[ $available_space -lt 1048576 ]]; then
    echo -e "${YELLOW}⚠${NC} 磁盘空间不足，建议至少1GB"
fi

# 内存使用
if command -v free >/dev/null 2>&1; then
    echo -e "${BLUE}内存使用情况:${NC}"
    free -h | head -2
fi

# CPU负载
if command -v uptime >/dev/null 2>&1; then
    echo -e "${BLUE}系统负载:${NC} $(uptime | awk -F'load average:' '{print $2}')"
fi

# 8. 检查日志
echo -e "\n${BLUE}=== 8. 最近错误日志 ===${NC}"

log_dirs=(
    "$PROJECT_ROOT/deployment/logs/nginx"
    "$PROJECT_ROOT/deployment/logs/api"
    "$PROJECT_ROOT/deployment/logs/mysql"
)

for log_dir in "${log_dirs[@]}"; do
    if [[ -d "$log_dir" ]]; then
        echo -e "${BLUE}检查日志目录: $log_dir${NC}"
        find "$log_dir" -name "*.log" -mtime -1 -exec tail -5 {} \; 2>/dev/null || echo "无最近日志"
    fi
done

# 9. 容器日志检查
echo -e "\n${BLUE}=== 9. 容器日志检查 ===${NC}"

if [[ -f "$COMPOSE_FILE" ]]; then
    services=("nginx" "api" "mysql" "redis" "minio")
    for service in "${services[@]}"; do
        echo -e "${BLUE}=== $service 服务日志 (最后10行) ===${NC}"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=10 "$service" 2>/dev/null || echo "$service 服务未运行"
        echo ""
    done
fi

# 10. 建议的解决方案
echo -e "\n${BLUE}=== 10. 常见问题解决方案 ===${NC}"

echo -e "${YELLOW}如果遇到以下问题，可以尝试:${NC}"
echo -e "1. ${BLUE}镜像缺失:${NC} 检查服务器上的Docker镜像，确保所需镜像存在"
echo -e "2. ${BLUE}端口冲突:${NC} 停止占用端口的其他服务: sudo pkill -f 'port:80|port:3000'"
echo -e "3. ${BLUE}服务启动失败:${NC} 重新启动: ./quick-deploy-tencent.sh"
echo -e "4. ${BLUE}数据库连接失败:${NC} 检查MySQL服务状态和密码配置"
echo -e "5. ${BLUE}权限问题:${NC} 确保脚本有执行权限: chmod +x *.sh"
echo -e "6. ${BLUE}网络问题:${NC} 检查Docker网络: docker network ls"

echo -e "\n${BLUE}快捷命令:${NC}"
echo -e "  重启所有服务: ${YELLOW}./quick-deploy-tencent.sh${NC}"
echo -e "  查看所有日志: ${YELLOW}docker-compose -f $COMPOSE_FILE logs -f${NC}"
echo -e "  停止所有服务: ${YELLOW}docker-compose -f $COMPOSE_FILE down${NC}"
echo -e "  强制重建: ${YELLOW}docker-compose -f $COMPOSE_FILE down && docker-compose -f $COMPOSE_FILE up -d --force-recreate${NC}"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}    诊断完成${NC}"
echo -e "${BLUE}========================================${NC}"
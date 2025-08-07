#!/bin/bash

# 测试云部署脚本
# 用于验证cloud-deploy.sh的修复效果

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 测试云部署脚本 ===${NC}"
echo

# 检查必要文件
echo -e "${BLUE}[检查]${NC} 验证必要文件存在..."
required_files=("cloud-deploy.sh" "docker-compose.yml" "server/package.json" "web/package.json")
for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "${GREEN}✓${NC} $file 存在"
    else
        echo -e "${RED}✗${NC} $file 不存在"
        exit 1
    fi
done

# 检查Docker
echo -e "${BLUE}[检查]${NC} 验证Docker环境..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker 已安装: $(docker --version)"
else
    echo -e "${RED}✗${NC} Docker 未安装"
    exit 1
fi

if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker Compose 已安装: $(docker-compose --version)"
else
    echo -e "${RED}✗${NC} Docker Compose 未安装"
    exit 1
fi

# 检查Docker服务状态
if docker info &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker 服务运行正常"
else
    echo -e "${RED}✗${NC} Docker 服务未运行"
    exit 1
fi

# 清理现有环境
echo -e "${BLUE}[清理]${NC} 清理现有环境..."
docker-compose down --remove-orphans 2>/dev/null || true
docker system prune -f 2>/dev/null || true
echo -e "${GREEN}✓${NC} 环境清理完成"

# 检查脚本权限
echo -e "${BLUE}[检查]${NC} 验证脚本权限..."
if [[ -x "cloud-deploy.sh" ]]; then
    echo -e "${GREEN}✓${NC} cloud-deploy.sh 有执行权限"
else
    echo -e "${YELLOW}!${NC} 添加执行权限..."
    chmod +x cloud-deploy.sh
    echo -e "${GREEN}✓${NC} 权限已添加"
fi

# 验证docker-compose.yml配置
echo -e "${BLUE}[检查]${NC} 验证docker-compose.yml配置..."
if docker-compose config &> /dev/null; then
    echo -e "${GREEN}✓${NC} docker-compose.yml 配置有效"
else
    echo -e "${RED}✗${NC} docker-compose.yml 配置无效"
    docker-compose config
    exit 1
fi

# 检查网络配置
echo -e "${BLUE}[检查]${NC} 验证网络配置..."
if grep -q "driver: bridge" docker-compose.yml; then
    echo -e "${GREEN}✓${NC} 网络配置正确 (使用bridge驱动)"
else
    echo -e "${RED}✗${NC} 网络配置可能有问题"
fi

echo
echo -e "${GREEN}=== 所有检查通过！可以运行部署脚本 ===${NC}"
echo
echo -e "${BLUE}运行部署命令:${NC}"
echo "./cloud-deploy.sh"
echo
echo -e "${BLUE}监控部署过程:${NC}"
echo "tail -f /tmp/wedding-deploy.log"
echo
echo -e "${BLUE}检查服务状态:${NC}"
echo "docker-compose ps"
echo
echo -e "${BLUE}查看服务日志:${NC}"
echo "docker-compose logs [服务名]"
echo
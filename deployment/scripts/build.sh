#!/bin/bash

# 构建脚本
set -e

# 获取环境参数
ENVIRONMENT=${1:-development}
VALID_ENVS=("development" "production" "tencent")

# 验证环境参数
if [[ ! " ${VALID_ENVS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    echo "错误: 无效的环境 '${ENVIRONMENT}'"
    echo "有效环境: ${VALID_ENVS[*]}"
    exit 1
fi

echo "构建环境: ${ENVIRONMENT}"

# 加载环境变量
ENV_FILE="deployment/environments/.env.${ENVIRONMENT}"
if [ ! -f "$ENV_FILE" ]; then
    echo "错误: 环境配置文件不存在: $ENV_FILE"
    exit 1
fi

# 导出环境变量
export $(grep -v '^#' $ENV_FILE | xargs)

echo "使用配置文件: $ENV_FILE"
echo "API_BASE_URL: $API_BASE_URL"
echo "SERVER_HOST: $SERVER_HOST"

# 构建Docker镜像
echo "构建Docker镜像..."
docker-compose --env-file $ENV_FILE build --build-arg API_BASE_URL=$API_BASE_URL --build-arg NODE_ENV=$NODE_ENV

echo "构建完成!"
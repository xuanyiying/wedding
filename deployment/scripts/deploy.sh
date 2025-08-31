#!/bin/bash

# 部署脚本
set -e

# 获取环境参数
ENVIRONMENT=${1:-development}
ACTION=${2:-up}
VALID_ENVS=("development" "production" "tencent")
VALID_ACTIONS=("up" "down" "restart" "logs")

# 验证参数
if [[ ! " ${VALID_ENVS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    echo "错误: 无效的环境 '${ENVIRONMENT}'"
    echo "有效环境: ${VALID_ENVS[*]}"
    exit 1
fi

if [[ ! " ${VALID_ACTIONS[@]} " =~ " ${ACTION} " ]]; then
    echo "错误: 无效的操作 '${ACTION}'"
    echo "有效操作: ${VALID_ACTIONS[*]}"
    exit 1
fi

echo "部署环境: ${ENVIRONMENT}"
echo "执行操作: ${ACTION}"

# 加载环境变量
ENV_FILE="deployment/environments/.env.${ENVIRONMENT}"
if [ ! -f "$ENV_FILE" ]; then
    echo "错误: 环境配置文件不存在: $ENV_FILE"
    exit 1
fi

# 创建必要的目录
mkdir -p deployment/logs/{api,mysql,nginx,redis,minio}
mkdir -p deployment/uploads/images

# 执行操作
case $ACTION in
    "up")
        echo "启动服务..."
        docker-compose --env-file $ENV_FILE up -d
        echo "服务启动完成!"
        echo "前端访问地址: http://${SERVER_HOST}:${WEB_PORT}"
        echo "API访问地址: http://${SERVER_HOST}:${SERVER_PORT}"
        ;;
    "down")
        echo "停止服务..."
        docker-compose --env-file $ENV_FILE down
        echo "服务已停止!"
        ;;
    "restart")
        echo "重启服务..."
        docker-compose --env-file $ENV_FILE restart
        echo "服务重启完成!"
        ;;
    "logs")
        echo "查看日志..."
        docker-compose --env-file $ENV_FILE logs -f
        ;;
esac
#!/bin/bash
# 生产环境快速部署脚本

echo "部署到生产环境 (localhost)..."
./deployment/scripts/setup.sh production
./deployment/scripts/deploy.sh production up
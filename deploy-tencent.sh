#!/bin/bash
# 腾讯云环境快速部署脚本

echo "部署到腾讯云环境 (114.132.225.94)..."
./deployment/scripts/setup.sh tencent
./deployment/scripts/deploy.sh tencent up
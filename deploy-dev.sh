#!/bin/bash
# 开发环境快速部署脚本

echo "部署到开发环境..."
./deployment/scripts/setup.sh development
./deployment/scripts/deploy.sh development up
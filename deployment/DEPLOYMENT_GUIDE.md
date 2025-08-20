# Wedding Client 部署指南

## 目录
- [概述](#概述)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [详细部署流程](#详细部署流程)
- [环境配置](#环境配置)
- [监控和健康检查](#监控和健康检查)
- [故障排除](#故障排除)
- [维护指南](#维护指南)

## 概述

Wedding Client 是一个基于 Docker 的全栈婚礼管理应用，支持开发环境和生产环境的自动化部署。本指南将帮助您完成从环境准备到生产部署的全过程。

### 架构组件
- **前端**: React + TypeScript + Vite
- **后端**: Node.js + Express + TypeScript
- **数据库**: PostgreSQL
- **容器化**: Docker + Docker Compose
- **部署**: 自动化脚本 + GitHub Actions

## 环境要求

### 本地开发环境
- Node.js >= 18.0.0
- npm >= 8.0.0
- Docker >= 20.10.0
- Docker Compose >= 2.0.0
- Git >= 2.30.0

### 生产服务器环境
- Ubuntu 20.04+ / CentOS 8+
- Docker >= 20.10.0
- Docker Compose >= 2.0.0
- 至少 2GB RAM
- 至少 20GB 可用磁盘空间
- SSH 访问权限

### 网络要求
- 端口 80 (HTTP)
- 端口 443 (HTTPS)
- 端口 8080 (应用服务)
- 端口 5432 (PostgreSQL，仅内部访问)

## 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/xuanyiying/wedding.git
cd wedding-client
```

### 2. 环境配置
```bash
# 复制环境配置文件
cp .env.example .env
cp deployment/.env.staging.example deployment/.env.staging
cp deployment/.env.tencent.example deployment/.env.tencent

# 编辑配置文件
vim .env
vim deployment/.env.staging
vim deployment/.env.tencent
```

### 3. 一键部署

#### 开发环境部署
```bash
# 使用一键部署脚本
./deployment/one-click-deploy.sh dev

# 或使用开发环境专用脚本
./deployment/dev/deploy.sh
```

#### 生产环境部署
```bash
# 使用一键部署脚本
./deployment/one-click-deploy.sh prod

# 或使用生产环境专用脚本
./deployment/prod/deploy.sh
```

## 详细部署流程

### 开发环境部署

#### 1. 准备工作
```bash
# 检查依赖
./deployment/dev/deploy.sh setup

# 启动服务
./deployment/dev/deploy.sh start
```

#### 2. 完整部署
```bash
# 执行完整部署流程
./deployment/dev/deploy.sh deploy
```

#### 3. 健康检查
```bash
# 检查服务状态
./deployment/dev/health-check.sh
```

### 生产环境部署

#### 1. 服务器准备
```bash
# 初始化服务器环境
./deployment/prod/deploy.sh setup

# 测试 SSH 连接
ssh root@your-server-ip
```

#### 2. 部署应用
```bash
# 完整部署
./deployment/prod/deploy.sh deploy

# 快速部署（适用于代码更新）
./deployment/prod/quick-deploy.sh
```

#### 3. 验证部署
```bash
# 检查服务状态
./deployment/prod/deploy.sh status

# 查看日志
./deployment/prod/deploy.sh logs

# 健康检查
./deployment/prod/deploy.sh health
```

## 环境配置

### 主配置文件 (.env)
```bash
# 应用配置
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wedding_db
DB_USER=wedding_user
DB_PASSWORD=your_secure_password

# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 文件上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,video/mp4

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 部署环境配置 (deployment/.env.staging)
```bash
# 服务器配置
SERVER_IP=your_staging_server_ip
SSH_USER=root
SSH_PASS=your_ssh_password

# 部署配置
DEPLOY_DIR=/opt/wedding
WEB_PORT=8080
PROJECT_NAME=wedding

# Slack 通知配置
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# 调试模式
DEBUG_MODE=true
```

### 腾讯云配置 (deployment/.env.tencent)
```bash
# 腾讯云服务器配置
TENCENT_SERVER_IP=your_tencent_server_ip
TENCENT_SSH_USER=ubuntu
TENCENT_SSH_KEY_PATH=~/.ssh/tencent_key

# 腾讯云特定配置
TENCENT_REGION=ap-guangzhou
TENCENT_ZONE=ap-guangzhou-1

# CDN 配置
TENCENT_CDN_DOMAIN=your_cdn_domain
TENCENT_COS_BUCKET=your_cos_bucket
```

## 监控和健康检查

### 自动健康检查
```bash
# 开发环境健康检查
./deployment/dev/health-check.sh

# 生产环境健康检查
./deployment/prod/deploy.sh health
```

### 监控指标
- **应用状态**: HTTP 响应状态
- **数据库连接**: PostgreSQL 连接状态
- **容器状态**: Docker 容器运行状态
- **资源使用**: CPU、内存、磁盘使用率
- **响应时间**: API 响应时间监控

### 日志监控
```bash
# 查看应用日志
docker-compose logs -f web
docker-compose logs -f server

# 查看部署日志
tail -f deployment/logs/deploy-*.log

# 查看健康检查日志
tail -f deployment/logs/health-check-*.log
```

## 故障排除

### 常见问题

#### 1. 部署失败
**症状**: 部署脚本执行失败

**可能原因**:
- 网络连接问题
- 权限不足
- 依赖缺失
- 配置错误

**解决方案**:
```bash
# 检查网络连接
ping google.com

# 检查 SSH 连接
ssh -v root@your_server_ip

# 检查 Docker 状态
docker --version
docker-compose --version

# 查看详细错误日志
tail -f deployment/logs/deploy-*.log

# 启用调试模式
DEBUG_MODE=true ./deployment/prod/deploy.sh
```

#### 2. 容器启动失败
**症状**: Docker 容器无法启动

**可能原因**:
- 端口冲突
- 资源不足
- 镜像问题
- 配置错误

**解决方案**:
```bash
# 检查容器状态
docker ps -a

# 查看容器日志
docker logs container_name

# 检查端口占用
netstat -tulpn | grep :8080

# 重新构建镜像
docker-compose build --no-cache

# 清理无用资源
docker system prune -f
```

#### 3. 数据库连接失败
**症状**: 应用无法连接到数据库

**可能原因**:
- 数据库未启动
- 连接配置错误
- 网络问题
- 权限问题

**解决方案**:
```bash
# 检查数据库容器状态
docker ps | grep postgres

# 测试数据库连接
docker exec -it postgres_container psql -U wedding_user -d wedding_db

# 检查数据库日志
docker logs postgres_container

# 重启数据库服务
docker-compose restart db
```

#### 4. 前端资源加载失败
**症状**: 前端页面无法正常加载

**可能原因**:
- 构建失败
- 静态资源路径错误
- Nginx 配置问题

**解决方案**:
```bash
# 重新构建前端
cd web
npm run build

# 检查构建产物
ls -la dist/

# 检查 Nginx 配置
docker exec -it nginx_container nginx -t

# 重启 Nginx
docker-compose restart nginx
```

### 性能问题

#### 1. 响应时间慢
**诊断步骤**:
```bash
# 检查系统资源
top
df -h
free -m

# 检查数据库性能
docker exec -it postgres_container psql -U wedding_user -d wedding_db -c "SELECT * FROM pg_stat_activity;"

# 分析慢查询
docker exec -it postgres_container psql -U wedding_user -d wedding_db -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

**优化建议**:
- 增加服务器资源
- 优化数据库查询
- 启用缓存
- 使用 CDN

#### 2. 内存使用过高
**诊断步骤**:
```bash
# 检查容器内存使用
docker stats

# 检查 Node.js 内存泄漏
docker exec -it server_container node --inspect=0.0.0.0:9229 server.js
```

**解决方案**:
- 增加内存限制
- 优化代码逻辑
- 使用内存分析工具

### 安全问题

#### 1. SSL 证书问题
```bash
# 检查证书状态
openssl x509 -in /path/to/cert.pem -text -noout

# 更新 Let's Encrypt 证书
certbot renew --dry-run
```

#### 2. 防火墙配置
```bash
# 检查防火墙状态
ufw status

# 开放必要端口
ufw allow 80
ufw allow 443
ufw allow 8080
```

## 维护指南

### 定期维护任务

#### 每日任务
- 检查服务状态
- 查看错误日志
- 监控资源使用

#### 每周任务
- 清理 Docker 资源
- 备份数据库
- 更新依赖包

#### 每月任务
- 安全更新
- 性能优化
- 容量规划

### 备份和恢复

#### 数据库备份
```bash
# 创建备份
./deployment/prod/deploy.sh backup

# 恢复备份
./deployment/prod/deploy.sh restore backup_filename
```

#### 完整系统备份
```bash
# 备份配置文件
tar -czf config_backup.tar.gz deployment/ .env*

# 备份应用数据
docker run --rm -v wedding_db_data:/data -v $(pwd):/backup alpine tar czf /backup/db_backup.tar.gz /data
```

### 更新和升级

#### 应用更新
```bash
# 拉取最新代码
git pull origin main

# 重新部署
./deployment/prod/deploy.sh deploy
```

#### 系统更新
```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 更新 Docker
sudo apt install docker-ce docker-ce-cli containerd.io
```

### 监控和告警

#### 设置 Slack 通知
1. 创建 Slack Webhook URL
2. 在环境配置中设置 `SLACK_WEBHOOK`
3. 测试通知功能

#### 设置监控脚本
```bash
# 创建监控 cron 任务
crontab -e

# 添加以下行（每5分钟检查一次）
*/5 * * * * /path/to/deployment/health-check.sh
```

## 联系支持

如果遇到无法解决的问题，请联系技术支持：

- **邮箱**: support@wedding-client.com
- **GitHub Issues**: https://github.com/xuanyiying/wedding/issues
- **文档**: https://wedding-client.com/docs

---

**最后更新**: 2024年1月
**版本**: 2.1.0
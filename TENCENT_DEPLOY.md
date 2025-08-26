# Wedding Club 腾讯云服务器部署指南

## 概述

本指南专门针对腾讯云服务器环境，解决了原始部署脚本中Docker Hub访问超时的问题。通过使用本地已有镜像和优化的配置，实现快速稳定的部署。

## 问题分析

### 原始问题
- **网络超时**: `Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection`
- **镜像拉取失败**: 腾讯云服务器访问Docker Hub受限
- **服务启动异常**: redis、minio、nginx、mysql服务中断

### 解决方案
1. **使用本地镜像**: 直接使用服务器上已有的Docker镜像，避免从Docker Hub拉取
2. **优化配置**: 简化docker-compose配置，移除复杂的依赖关系
3. **网络优化**: 适配无域名IP直接访问的场景
4. **资源优化**: 针对腾讯云服务器资源进行配置调优

## 文件结构

```
wedding-client/
├── deployment/
│   ├── docker-compose.tencent.yml    # 腾讯云专用compose配置
│   ├── .env.tencent                  # 腾讯云环境变量
│   └── nginx/
│       ├── nginx.tencent.conf        # 腾讯云nginx配置
│       └── default.conf              # 简化的默认配置
├── scripts/
│   └── deploy-tencent.sh             # 腾讯云部署脚本
├── quick-deploy-tencent.sh           # 快速部署脚本
└── diagnose-tencent.sh               # 问题诊断脚本
```

## 服务器环境要求

### 已有镜像
确保服务器上存在以下Docker镜像：
- `deployment-web:latest`
- `deployment-api1:latest` (或 `deployment-api2:latest`)
- `mysql:8.0`
- `redis:7-alpine`
- `minio/minio:latest`
- `nginx:alpine`

### 系统要求
- Ubuntu 18.04+ 或 CentOS 7+
- Docker 20.10+
- Docker Compose 1.29+
- 至少 2GB 内存
- 至少 10GB 可用磁盘空间

## 快速部署

### 方法一：一键部署（推荐）

```bash
# 1. 进入项目目录
cd /path/to/wedding-client

# 2. 运行快速部署脚本
./quick-deploy-tencent.sh
```

### 方法二：手动部署

```bash
# 1. 进入项目目录
cd /path/to/wedding-client

# 2. 创建必要目录
mkdir -p deployment/logs/{nginx,api,mysql,redis,minio}
mkdir -p deployment/uploads

# 3. 停止现有服务
docker-compose -f deployment/docker-compose.tencent.yml --env-file deployment/.env.tencent down

# 4. 启动服务
docker-compose -f deployment/docker-compose.tencent.yml --env-file deployment/.env.tencent up -d

# 5. 检查状态
docker-compose -f deployment/docker-compose.tencent.yml --env-file deployment/.env.tencent ps
```

## 访问地址

部署完成后，可通过以下地址访问：

- **前端应用**: http://114.132.225.94
- **API服务**: http://114.132.225.94:3000
- **API文档**: http://114.132.225.94:3000/api-docs
- **MinIO控制台**: http://114.132.225.94:9001

## 配置说明

### 核心优化点

1. **网络配置**:
   - 移除了复杂的网络分割
   - 使用单一bridge网络
   - 支持IP直接访问

2. **服务配置**:
   - 简化了健康检查
   - 减少了资源限制
   - 优化了启动顺序

3. **存储配置**:
   - 使用本地卷存储
   - 简化了备份策略
   - 优化了日志管理

### 环境变量说明

关键环境变量（在`.env.tencent`中）：

```bash
# 服务器IP
SERVER_IP=114.132.225.94

# API访问地址
VITE_API_URL=http://114.132.225.94/api
CORS_ORIGIN=http://114.132.225.94

# 数据库配置
DB_PASSWORD=W3dd1ng_Us3r_2024_Pr0d_S3cur3!
REDIS_PASSWORD=R3d1s_W3dd1ng_2024_Pr0d_S3cur3!

# MinIO配置
MINIO_ACCESS_KEY=weddingadmin
MINIO_SECRET_KEY=M1n10_W3dd1ng_2024_Pr0d_S3cur3!
```

## 常见问题

### 0. Nginx配置错误（紧急修复）

**症状**: nginx启动时出现以下错误：
```
nginx: [warn] load balancing method redefined in /etc/nginx/nginx.conf:115
nginx: [emerg] host not found in upstream "minio1:9000" in /etc/nginx/nginx.conf:119
```

**原因**: nginx配置中引用了不存在的上游服务器

**快速解决方案**:
```bash
# 运行紧急修复脚本
./fix-nginx-emergency.sh

# 或手动按顺序重启服务
docker-compose -f deployment/docker-compose.tencent.yml down
sleep 5

# 分步启动
docker-compose -f deployment/docker-compose.tencent.yml up -d mysql redis minio
sleep 30
docker-compose -f deployment/docker-compose.tencent.yml up -d api
sleep 20
docker-compose -f deployment/docker-compose.tencent.yml up -d web nginx
```

**根本解决**: 已在最新配置中修复了minio1:9000改为wedding-minio:9000

### 1. 服务启动失败

**症状**: 容器启动后立即退出

**解决方案**:
```bash
# 查看详细日志
docker-compose -f deployment/docker-compose.tencent.yml logs [服务名]

# 重新构建并启动
docker-compose -f deployment/docker-compose.tencent.yml up -d --force-recreate
```

### 2. 端口冲突

**症状**: 端口被占用错误

**解决方案**:
```bash
# 检查端口占用
ss -tlnp | grep :80
ss -tlnp | grep :3000

# 停止占用端口的进程
sudo pkill -f "port:80"

# 或修改配置文件中的端口
```

### 3. 数据库连接失败

**症状**: API服务无法连接数据库

**解决方案**:
```bash
# 检查MySQL容器状态
docker logs wedding-mysql

# 重启MySQL服务
docker-compose -f deployment/docker-compose.tencent.yml restart mysql

# 检查网络连接
docker exec wedding-api ping mysql
```

### 4. 静态文件无法访问

**症状**: 前端页面空白或资源加载失败

**解决方案**:
```bash
# 检查nginx配置
docker exec wedding-nginx nginx -t

# 重启nginx服务
docker-compose -f deployment/docker-compose.tencent.yml restart nginx

# 检查文件权限
docker exec wedding-nginx ls -la /usr/share/nginx/html/
```

## 故障排查

### 自动诊断

运行诊断脚本进行自动问题检测：

```bash
./diagnose-tencent.sh
```

### 手动检查

```bash
# 1. 检查所有容器状态
docker ps -a

# 2. 查看特定服务日志
docker-compose -f deployment/docker-compose.tencent.yml logs -f [服务名]

# 3. 检查网络连接
docker network ls
docker network inspect wedding-net

# 4. 检查卷挂载
docker volume ls
```

## 维护操作

### 日常维护

```bash
# 查看服务状态
docker-compose -f deployment/docker-compose.tencent.yml ps

# 查看资源使用
docker stats

# 清理未使用的容器和镜像
docker system prune -f
```

### 数据备份

```bash
# 备份数据库
docker exec wedding-mysql mysqldump -u root -p wedding_club > backup_$(date +%Y%m%d).sql

# 备份上传文件
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz deployment/uploads/

# 备份配置文件
tar -czf config_backup_$(date +%Y%m%d).tar.gz deployment/*.yml deployment/*.env
```

### 服务重启

```bash
# 重启单个服务
docker-compose -f deployment/docker-compose.tencent.yml restart [服务名]

# 重启所有服务
./quick-deploy-tencent.sh

# 强制重新创建
docker-compose -f deployment/docker-compose.tencent.yml down
docker-compose -f deployment/docker-compose.tencent.yml up -d --force-recreate
```

## 性能优化

### 资源限制调优

编辑 `.env.tencent` 文件中的资源配置：

```bash
# MySQL优化
MYSQL_INNODB_BUFFER_POOL_SIZE=256M
MYSQL_MAX_CONNECTIONS=100

# Redis优化
REDIS_MAX_MEMORY=128mb

# Node.js优化
NODE_OPTIONS=--max-old-space-size=512
```

### Nginx缓存优化

如需要更高性能，可以启用nginx缓存：

```bash
# 编辑nginx配置，取消缓存相关注释
vim deployment/nginx/nginx.tencent.conf

# 重启nginx服务
docker-compose restart nginx
```

## 安全建议

1. **更改默认密码**: 修改 `.env.tencent` 中的所有密码
2. **限制访问IP**: 在nginx配置中添加IP白名单
3. **启用防火墙**: 配置服务器防火墙规则
4. **定期更新**: 保持Docker镜像和系统更新
5. **监控日志**: 定期检查访问日志和错误日志

## 技术支持

如果遇到问题，请按以下顺序排查：

1. 运行 `./diagnose-tencent.sh` 进行自动诊断
2. 查看相关服务的日志
3. 检查网络和端口配置
4. 确认镜像和配置文件完整性

---

**注意**: 本部署方案针对腾讯云服务器环境优化，如在其他云平台部署，可能需要调整相关配置。
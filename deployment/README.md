# Wedding Client 部署文档

## 概述

本项目支持三种环境的部署：
- **腾讯云环境**: 使用IP 114.132.225.94
- **生产环境**: 使用 localhost
- **开发环境**: 本地开发环境

## 目录结构

```
deployment/
├── environments/          # 环境配置文件
│   ├── .env.tencent      # 腾讯云环境
│   ├── .env.production   # 生产环境
│   └── .env.development  # 开发环境
├── nginx/                # Nginx配置
├── scripts/              # 部署脚本
├── logs/                 # 日志目录
└── uploads/              # 上传文件目录
```

## 快速开始

### 1. 环境准备

确保已安装：
- Docker
- Docker Compose

### 2. 快速部署

```bash
# 腾讯云环境
./deploy-tencent.sh

# 生产环境
./deploy-production.sh

# 开发环境
./deploy-dev.sh
```

### 3. 手动部署

```bash
# 初始化环境
./deployment/scripts/setup.sh [environment]

# 启动服务
./deployment/scripts/deploy.sh [environment] up

# 停止服务
./deployment/scripts/deploy.sh [environment] down

# 重启服务
./deployment/scripts/deploy.sh [environment] restart

# 查看日志
./deployment/scripts/deploy.sh [environment] logs
```

## 环境配置

### 腾讯云环境
- 前端: http://114.132.225.94
- API: http://114.132.225.94:3000

### 生产环境
- 前端: http://localhost
- API: http://localhost:3000

### 开发环境
- 前端: http://localhost:3000
- API: http://localhost:3001

## 服务组件

- **Web应用**: Nginx + React前端
- **API服务**: Node.js后端
- **数据库**: MySQL 8.0
- **缓存**: Redis
- **文件存储**: MinIO

## 监控和日志

日志文件位置：
- Nginx: `deployment/logs/nginx/`
- API: `deployment/logs/api/`
- MySQL: `deployment/logs/mysql/`
- Redis: `deployment/logs/redis/`
- MinIO: `deployment/logs/minio/`

## 故障排除

### 常见问题

1. **端口冲突**
   - 检查端口是否被占用
   - 修改环境配置文件中的端口设置

2. **权限问题**
   - 确保脚本有执行权限: `chmod +x deployment/scripts/*.sh`

3. **Docker问题**
   - 检查Docker服务状态: `systemctl status docker`
   - 清理Docker缓存: `docker system prune -f`

### 查看服务状态

```bash
# 查看容器状态
docker-compose ps

# 查看服务日志
docker-compose logs -f [service_name]

# 进入容器
docker-compose exec app sh
```

## 配置修改

### 修改IP地址

1. 编辑对应环境的配置文件 `deployment/environments/.env.[environment]`
2. 修改 `SERVER_HOST` 等相关配置
3. 重新构建和部署

### 添加新环境

1. 创建新的环境配置文件 `deployment/environments/.env.[new_env]`
2. 更新构建和部署脚本中的 `VALID_ENVS` 数组
3. 创建对应的快速部署脚本

## 安全注意事项

- 生产环境请修改默认密码
- 定期更新JWT密钥
- 配置防火墙规则
- 启用HTTPS（生产环境）
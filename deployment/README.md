# Wedding Club 部署系统

## 📋 概述

Wedding Club 采用现代化的容器化部署方案，支持开发、测试、生产三套环境的自动化部署。本系统基于 Docker 和 Docker Compose，提供统一的配置管理、一键部署、完善的错误处理和详细的日志记录。

## 🏗️ 系统架构

```
Wedding Club
├── 前端服务 (React + Vite)
├── 后端服务 (Node.js + Express)
├── 数据库服务 (MySQL 8.0)
├── 缓存服务 (Redis 7)
├── 存储服务 (MinIO)
└── 代理服务 (Nginx)
```

## 🚀 快速开始

### 环境要求

- Docker >= 20.10
- Docker Compose >= 2.0
- 系统内存 >= 4GB
- 磁盘空间 >= 10GB

### 一键部署

```bash
# 开发环境
./deploy-dev.sh

# 测试环境
./deploy-test.sh

# 生产环境
./deploy-prod.sh
```

## 📁 目录结构

```
deployment/
├── environments/           # 环境配置文件
│   ├── .env.dev           # 开发环境配置
│   ├── .env.test          # 测试环境配置
│   └── .env.prod          # 生产环境配置
├── nginx/                 # Nginx配置
│   ├── nginx.conf         # 主配置文件
│   └── conf.d/            # 站点配置
├── scripts/               # 部署脚本
│   ├── deploy.sh          # 统一部署脚本
│   └── cleanup.sh         # 清理脚本
├── mysql/                 # MySQL配置
├── redis/                 # Redis配置
├── supervisor/            # 进程管理配置
├── ssl/                   # SSL证书
├── logs/                  # 日志文件
└── backups/               # 备份文件
```

## 🔧 环境配置

### 开发环境 (dev)

- **用途**: 本地开发，支持热重载
- **端口**: Web(3000), API(3001), MySQL(3307), Redis(6380)
- **特性**: 调试模式、Mock数据、详细日志

```bash
# 启动开发环境
./deploy-dev.sh

# 查看日志
./deployment/scripts/deploy.sh dev logs -f

# 停止服务
./deployment/scripts/deploy.sh dev down
```

### 测试环境 (test)

- **用途**: CI/CD集成测试
- **端口**: Web(8080), API(3002), MySQL(3308), Redis(6381)
- **特性**: 自动化测试、Mock外部API、测试数据

```bash
# 启动测试环境
./deploy-test.sh

# 运行测试
npm run test

# 查看状态
./deployment/scripts/deploy.sh test status
```

### 生产环境 (prod)

- **用途**: 腾讯云生产部署
- **端口**: Web(80), API(3000), MySQL(3306), Redis(6379)
- **特性**: 高性能、安全加固、监控告警

```bash
# 启动生产环境 (需要确认)
./deploy-prod.sh

# 备份数据
./deployment/scripts/deploy.sh prod backup

# 查看监控
./deployment/scripts/deploy.sh prod status
```

## 🛠️ 高级操作

### 环境管理

```bash
# 查看所有环境状态
./deployment/scripts/deploy.sh dev status
./deployment/scripts/deploy.sh test status
./deployment/scripts/deploy.sh prod status

# 重启特定环境
./deployment/scripts/deploy.sh prod restart

# 强制重新构建
./deployment/scripts/deploy.sh dev up --build
```

### 数据管理

```bash
# 备份生产数据
./deployment/scripts/deploy.sh prod backup

# 恢复数据
./deployment/scripts/deploy.sh prod restore /path/to/backup.tar.gz

# 查看数据库日志
./deployment/scripts/deploy.sh prod logs mysql
```

### 日志管理

```bash
# 查看所有服务日志
./deployment/scripts/deploy.sh prod logs

# 查看特定服务日志
./deployment/scripts/deploy.sh prod logs app
./deployment/scripts/deploy.sh prod logs nginx

# 实时跟踪日志
./deployment/scripts/deploy.sh prod logs -f --tail=100
```

### 清理和维护

```bash
# 清理废弃资源
./deployment/scripts/cleanup.sh

# 清理特定环境
./deployment/scripts/deploy.sh dev clean

# 强制清理所有资源
./deployment/scripts/deploy.sh dev clean --force
```

## 🔐 安全配置

### 生产环境安全检查清单

- [ ] 修改默认数据库密码
- [ ] 更新JWT密钥
- [ ] 配置SMTP设置
- [ ] 设置SSL证书
- [ ] 配置防火墙规则
- [ ] 启用访问日志
- [ ] 设置备份策略

### 环境变量安全

```bash
# 生产环境必须修改的变量
MYSQL_ROOT_PASSWORD=CHANGE_ME_ROOT_PASSWORD_2025
MYSQL_PASSWORD=CHANGE_ME_PROD_PASSWORD_2025
JWT_SECRET=CHANGE_ME_JWT_SECRET_PROD_2025_WEDDING
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD_2025
MINIO_SECRET_KEY=CHANGE_ME_MINIO_SECRET_2025
```

## 📊 监控和告警

### 健康检查

```bash
# 检查服务健康状态
curl http://localhost/health

# 检查API接口
curl http://localhost/api/health

# 检查Swagger文档
curl http://localhost/api/v1/docs
```

### 性能监控

```bash
# 查看容器资源使用
docker stats

# 查看Nginx状态
curl http://localhost/nginx_status

# 查看系统资源
htop
```

## 🐛 故障排查

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   lsof -i :80
   lsof -i :3000
   
   # 修改环境配置中的端口
   vim deployment/environments/.env.dev
   ```

2. **容器启动失败**
   ```bash
   # 查看容器日志
   ./deployment/scripts/deploy.sh dev logs app
   
   # 检查容器状态
   docker ps -a
   ```

3. **数据库连接失败**
   ```bash
   # 检查数据库容器
   ./deployment/scripts/deploy.sh dev logs mysql
   
   # 测试数据库连接
   docker exec -it wedding-mysql-dev mysql -u root -p
   ```

4. **Swagger UI 404错误**
   ```bash
   # 检查API服务
   curl http://localhost:3000/api/v1/docs
   
   # 检查Nginx配置
   nginx -t
   ```

### 日志位置

- **应用日志**: `deployment/logs/`
- **Nginx日志**: `/var/log/nginx/` (容器内)
- **MySQL日志**: `/var/log/mysql/` (容器内)
- **Redis日志**: `/var/log/redis/` (容器内)

## 🔄 CI/CD 集成

### GitHub Actions 示例

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Production
        run: |
          ./deploy-prod.sh
          
      - name: Health Check
        run: |
          sleep 30
          curl -f http://150.158.20.143/health
```

## 📚 相关文档

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Nginx 配置指南](https://nginx.org/en/docs/)
- [MySQL 8.0 文档](https://dev.mysql.com/doc/refman/8.0/en/)
- [Redis 文档](https://redis.io/documentation)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

如果您遇到问题或需要帮助，请：

1. 查看本文档的故障排查部分
2. 检查 [Issues](https://github.com/your-repo/issues) 页面
3. 创建新的 Issue 描述问题
4. 联系开发团队

---

**Wedding Club DevOps Team**  
最后更新: 2025-09-01
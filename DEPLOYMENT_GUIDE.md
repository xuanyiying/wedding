# 婚礼应用腾讯云服务器部署指南

## 🚀 快速开始

### 前提条件
- 腾讯云服务器（推荐配置：2核4G内存，40G硬盘）
- Ubuntu 18.04+ 或 CentOS 7+ 操作系统
- 服务器已开放端口：80, 443, 3000, 8000, 3306, 6379, 9000, 9001

### 一键部署

1. **登录服务器并克隆项目**
   ```bash
   # 登录腾讯云服务器
   ssh root@your-server-ip
   
   # 克隆项目
   git clone <your-repository-url>
   cd wedding-client
   ```

2. **执行一键部署**
   ```bash
   # 给脚本执行权限
   chmod +x deploy.sh
   
   # 执行部署
   ./deploy.sh
   ```

3. **访问应用**
   - Web 应用：`http://your-server-ip`
   - API 服务：`http://your-server-ip:8000`
   - MinIO 控制台：`http://your-server-ip:9001`

## 📋 部署脚本功能

### 基本命令
```bash
# 完整部署（默认）
./deploy.sh deploy
./deploy.sh -d

# 启动服务
./deploy.sh start
./deploy.sh -s

# 停止服务
./deploy.sh stop
./deploy.sh -t

# 重启服务
./deploy.sh restart
./deploy.sh -r

# 查看服务状态
./deploy.sh status
./deploy.sh -st

# 查看日志
./deploy.sh logs
./deploy.sh -l

# 备份部署
./deploy.sh backup
./deploy.sh -b

# 清理资源
./deploy.sh clean
./deploy.sh -c

# 更新服务
./deploy.sh update
./deploy.sh -u

# 显示帮助
./deploy.sh help
./deploy.sh -h
```

## 🔧 手动配置

### 环境变量配置

#### 后端配置 (server/.env)
```env
# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=wedding_host
DB_USER=wedding
DB_PASSWORD=wedding123

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379

# MinIO 配置
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=rustfsadmin
MINIO_SECRET_KEY=rustfssecret123
MINIO_BUCKET=wedding-files

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=8000
NODE_ENV=production

# CORS 配置
CORS_ORIGIN=http://your-domain.com
```

#### 前端配置 (web/.env)
```env
# API 配置
VITE_API_BASE_URL=http://your-domain.com/api
VITE_APP_TITLE=婚礼主持人平台

# 环境配置
VITE_NODE_ENV=production
```

### 域名配置

如果您有域名，请修改 `Caddyfile`：

```caddyfile
your-domain.com {
    # API 路由
    handle /api/* {
        reverse_proxy server:8000
    }
    
    # 前端路由
    handle {
        reverse_proxy web:3000
    }
}
```

## 🛠️ 常见问题

### 1. 端口被占用
```bash
# 查看端口占用
sudo netstat -tuln | grep :80

# 停止占用端口的服务
sudo systemctl stop nginx  # 如果是 nginx
sudo systemctl stop apache2  # 如果是 apache
```

### 2. Docker 权限问题
```bash
# 将用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker
```

### 3. 服务启动失败
```bash
# 查看服务日志
docker-compose logs service-name

# 查看所有服务状态
docker-compose ps

# 重启特定服务
docker-compose restart service-name
```

### 4. 数据库连接失败
```bash
# 检查 MySQL 容器状态
docker-compose logs mysql

# 进入 MySQL 容器
docker-compose exec mysql mysql -u wedding -p
```

### 5. 文件上传问题
```bash
# 检查 MinIO 服务
docker-compose logs minio

# 访问 MinIO 控制台
# http://your-server-ip:9001
# 用户名: rustfsadmin
# 密码: rustfssecret123
```

## 🔒 安全配置

### 1. 防火墙设置
```bash
# Ubuntu/Debian
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22  # SSH
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 2. SSL 证书配置
如果需要 HTTPS，请修改 `Caddyfile`：

```caddyfile
your-domain.com {
    # Caddy 会自动申请 Let's Encrypt 证书
    
    handle /api/* {
        reverse_proxy server:8000
    }
    
    handle {
        reverse_proxy web:3000
    }
}
```

### 3. 生产环境安全
- 修改默认密码（数据库、MinIO）
- 使用强 JWT 密钥
- 配置适当的 CORS 策略
- 定期备份数据

## 📊 监控和维护

### 系统监控
```bash
# 查看系统资源
docker stats

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

### 日志管理
```bash
# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f server

# 清理日志
docker system prune -f
```

### 数据备份
```bash
# 自动备份（脚本已包含）
./deploy.sh backup

# 手动数据库备份
docker-compose exec mysql mysqldump -u wedding -pwedding123 wedding_host > backup.sql

# 恢复数据库
docker-compose exec -T mysql mysql -u wedding -pwedding123 wedding_host < backup.sql
```

## 🚀 性能优化

### 1. 服务器配置
- 推荐配置：4核8G内存，100G SSD
- 开启 swap（如果内存不足）
- 配置 CDN 加速静态资源

### 2. 数据库优化
```sql
-- 在 MySQL 中执行
SET GLOBAL innodb_buffer_pool_size = 1073741824;  -- 1GB
SET GLOBAL max_connections = 200;
```

### 3. 缓存配置
- Redis 内存限制配置
- 静态资源缓存策略
- API 响应缓存

## 📞 技术支持

如果在部署过程中遇到问题，请：

1. 查看部署日志：`./deploy.sh logs`
2. 检查服务状态：`./deploy.sh status`
3. 查看系统资源：`docker stats`
4. 提供错误信息和系统环境信息

---

**祝您部署顺利！** 🎉
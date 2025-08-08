# Wedding Client 腾讯云快速部署指南

## 📋 部署概览

本项目已完全配置好腾讯云部署环境，包含自动化部署脚本和完整的服务配置。

### 🖥️ 服务器信息
- **公网IP**: 114.132.225.94
- **内网IP**: 10.1.12.15
- **SSH用户**: root
- **SSH密码**: lhins-3vhwz99j
- **Web端口**: 8080 (通过Nginx代理)
- **协议**: HTTP

### 🏗️ 架构说明
- **前端**: React + Vite (端口 5173)
- **后端**: Node.js API (端口 3000)
- **数据库**: MySQL 8.0 (端口 3306)
- **缓存**: Redis (端口 6379)
- **存储**: MinIO (端口 9000/9001)
- **代理**: Nginx (端口 8080)

## 🚀 快速部署

### 方法一：一键自动部署

```bash
# 进入项目目录
cd /Users/yiying/dev-app/wedding-client

# 执行部署脚本
./deploy-tencent.sh

# 或者带源码上传
./deploy-tencent.sh deploy --with-source
```

### 方法二：分步部署

```bash
# 1. 测试连接
./deploy-tencent.sh test

# 2. 检查状态
./deploy-tencent.sh status

# 3. 完整部署
./deploy-tencent.sh deploy
```

## 📁 部署文件说明

### 核心配置文件
- `docker-compose-tencent.yml` - Docker Compose 配置
- `nginx-tencent.conf` - Nginx 反向代理配置
- `.env.tencent` - 环境变量配置
- `deploy-tencent.sh` - 自动化部署脚本

### 环境配置 (.env.tencent)
```bash
# 服务器配置
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
NODE_ENV=production

# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=wedding_db
DB_USER=wedding_user
DB_PASSWORD=wedding_pass_2024
MYSQL_ROOT_PASSWORD=root_pass_2024

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_pass_2024

# MinIO配置
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=wedding_minio_user
MINIO_SECRET_KEY=wedding_minio_pass_2024
MINIO_BUCKET=wedding-uploads

# JWT配置
JWT_SECRET=wedding_jwt_secret_key_2024_very_secure
JWT_EXPIRES_IN=7d

# 前端配置
VITE_API_URL=http://114.132.225.94:8080/api
VITE_UPLOAD_URL=http://114.132.225.94:8080/uploads
```

## 🛠️ 管理命令

### 基本操作
```bash
# 查看帮助
./deploy-tencent.sh help

# 部署服务
./deploy-tencent.sh deploy

# 检查状态
./deploy-tencent.sh status

# 查看日志
./deploy-tencent.sh logs

# 重启服务
./deploy-tencent.sh restart

# 停止服务
./deploy-tencent.sh stop

# 启动服务
./deploy-tencent.sh start

# 更新服务
./deploy-tencent.sh update

# 清理资源
./deploy-tencent.sh clean
```

### 高级选项
```bash
# 部署并上传源码
./deploy-tencent.sh deploy --with-source

# 强制重新部署
./deploy-tencent.sh deploy --force

# 跳过构建步骤
./deploy-tencent.sh deploy --no-build
```

## 🌐 访问地址

部署完成后，可通过以下地址访问：

- **Web应用**: http://114.132.225.94:8080
- **API接口**: http://114.132.225.94:8080/api
- **MinIO控制台**: http://114.132.225.94:8080/minio
- **健康检查**: http://114.132.225.94:8080/health

## 🔧 故障排查

### 常见问题

1. **连接失败**
   ```bash
   # 检查网络连接
   ping 114.132.225.94
   
   # 测试SSH连接
   ssh root@114.132.225.94
   ```

2. **服务启动失败**
   ```bash
   # 查看详细日志
   ./deploy-tencent.sh logs
   
   # 检查服务状态
   ./deploy-tencent.sh status
   ```

3. **端口冲突**
   ```bash
   # 检查端口占用
   ssh root@114.132.225.94 "netstat -tlnp | grep :8080"
   ```

4. **Docker问题**
   ```bash
   # 重启Docker服务
   ssh root@114.132.225.94 "systemctl restart docker"
   
   # 清理Docker资源
   ./deploy-tencent.sh clean
   ```

### 日志查看
```bash
# 查看所有服务日志
./deploy-tencent.sh logs

# 在服务器上查看特定服务日志
ssh root@114.132.225.94
cd /opt/wedding-client
docker-compose logs -f web
docker-compose logs -f api
docker-compose logs -f mysql
```

## 📊 监控和维护

### 系统监控
```bash
# 查看系统资源
ssh root@114.132.225.94 "htop"

# 查看磁盘使用
ssh root@114.132.225.94 "df -h"

# 查看内存使用
ssh root@114.132.225.94 "free -h"
```

### 备份策略
```bash
# 数据库备份
ssh root@114.132.225.94 "cd /opt/wedding-client && docker-compose exec mysql mysqldump -u root -p wedding_db > backup.sql"

# 文件备份
ssh root@114.132.225.94 "cd /opt/wedding-client && tar -czf uploads_backup.tar.gz data/uploads/"
```

## 🔒 安全配置

### 防火墙设置
- SSH (22): 已开放
- HTTP (80): 已开放
- HTTPS (443): 已开放
- Web (8080): 已开放

### 安全建议
1. 定期更新系统和Docker镜像
2. 使用强密码和SSH密钥认证
3. 配置SSL证书启用HTTPS
4. 定期备份重要数据
5. 监控系统日志和异常访问

## 📈 性能优化

### 建议配置
1. **数据库优化**: 调整MySQL配置参数
2. **缓存策略**: 合理使用Redis缓存
3. **静态资源**: 配置CDN加速
4. **负载均衡**: 多实例部署
5. **监控告警**: 配置系统监控

## 🆘 技术支持

如遇到问题，请按以下步骤排查：

1. 查看部署日志: `./deploy-tencent.sh logs`
2. 检查服务状态: `./deploy-tencent.sh status`
3. 测试网络连接: `./deploy-tencent.sh test`
4. 重启服务: `./deploy-tencent.sh restart`
5. 清理重新部署: `./deploy-tencent.sh clean && ./deploy-tencent.sh deploy`

---

**部署完成后，请访问 http://114.132.225.94:8080 查看应用运行状态！** 🎉
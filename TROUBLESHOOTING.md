# 部署故障排除指南

本文档提供了婚礼应用部署过程中常见问题的解决方案。

## 常见问题

### 1. 网络连接问题

**问题**: `curl: (35) Recv failure: Connection reset by peer`

**解决方案**:
```bash
# 检查网络连接
ping google.com
ping github.com

# 检查 DNS 设置
nslookup google.com

# 如果在中国大陆，可能需要配置代理或使用国内镜像
# 设置 Docker 镜像源
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
EOF
sudo systemctl restart docker
```

### 2. 操作系统不支持

**问题**: `不支持的操作系统: OpenCloudOS`

**解决方案**:
- 脚本已更新支持 OpenCloudOS、Rocky Linux、AlmaLinux 等
- 如果仍有问题，可以手动安装 Docker:

```bash
# OpenCloudOS/CentOS 手动安装 Docker
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# 手动安装 Docker Compose
sudo dnf install -y docker-compose
# 或使用 pip
sudo dnf install -y python3-pip
sudo pip3 install docker-compose
```

### 3. 内存不足警告

**问题**: `内存不足 2GB，可能影响性能`

**解决方案**:
```bash
# 检查内存使用
free -h

# 创建交换文件（临时解决方案）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久启用交换文件
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 4. 端口占用问题

**问题**: 端口 80、3000、8000 等被占用

**解决方案**:
```bash
# 检查端口占用
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :8000

# 停止占用端口的服务
sudo systemctl stop nginx  # 如果是 nginx
sudo systemctl stop apache2  # 如果是 apache

# 或者修改 docker-compose.yml 中的端口映射
# 例如将 "80:80" 改为 "8080:80"
```

### 5. Docker 服务启动失败

**问题**: Docker 容器无法启动

**解决方案**:
```bash
# 检查 Docker 服务状态
sudo systemctl status docker

# 重启 Docker 服务
sudo systemctl restart docker

# 检查 Docker 日志
sudo journalctl -u docker.service

# 检查容器日志
docker-compose logs
docker-compose logs [service_name]
```

### 6. 权限问题

**问题**: `Permission denied` 错误

**解决方案**:
```bash
# 确保用户在 docker 组中
sudo usermod -aG docker $USER

# 重新登录或运行
newgrp docker

# 检查文件权限
ls -la docker-compose.yml
chmod +x deploy.sh quick-deploy.sh
```

### 7. 数据库连接失败

**问题**: 应用无法连接到数据库

**解决方案**:
```bash
# 检查 MySQL 容器状态
docker-compose ps mysql

# 查看 MySQL 日志
docker-compose logs mysql

# 进入 MySQL 容器检查
docker-compose exec mysql mysql -u wedding -pwedding123 wedding_host

# 重启数据库服务
docker-compose restart mysql
```

### 8. 前端构建失败

**问题**: Web 应用构建过程中出错

**解决方案**:
```bash
# 检查构建日志
docker-compose logs web

# 清理并重新构建
docker-compose down
docker system prune -f
docker-compose build --no-cache web
docker-compose up -d

# 检查 Node.js 版本兼容性
# 确保使用的 Node.js 版本与项目要求匹配
```

## 防火墙配置

### Ubuntu/Debian (UFW)
```bash
sudo ufw enable
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 3000/tcp # Web dev
sudo ufw allow 8000/tcp # API
sudo ufw allow 9001/tcp # MinIO Console
sudo ufw status
```

### CentOS/RHEL/OpenCloudOS (Firewalld)
```bash
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=9001/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

## 性能优化

### 1. 系统资源监控
```bash
# 监控系统资源
top
htop
docker stats

# 检查磁盘空间
df -h
du -sh /var/lib/docker
```

### 2. Docker 优化
```bash
# 清理未使用的资源
docker system prune -f
docker volume prune -f
docker image prune -f

# 限制容器资源使用
# 在 docker-compose.yml 中添加:
# deploy:
#   resources:
#     limits:
#       memory: 512M
#       cpus: '0.5'
```

## 日志分析

### 查看应用日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f server
docker-compose logs -f web
docker-compose logs -f mysql
docker-compose logs -f redis
docker-compose logs -f minio

# 查看最近的日志
docker-compose logs --tail=100 server
```

### 系统日志
```bash
# 查看系统日志
sudo journalctl -f
sudo journalctl -u docker.service
sudo journalctl -u docker.socket
```

## 备份与恢复

### 数据备份
```bash
# 备份数据库
docker-compose exec mysql mysqldump -u wedding -pwedding123 wedding_host > backup.sql

# 备份 MinIO 数据
docker-compose exec minio mc mirror /data/wedding-files ./minio-backup/

# 备份配置文件
cp -r server/.env web/.env docker-compose.yml ./config-backup/
```

### 数据恢复
```bash
# 恢复数据库
docker-compose exec -T mysql mysql -u wedding -pwedding123 wedding_host < backup.sql

# 恢复 MinIO 数据
docker-compose exec minio mc mirror ./minio-backup/ /data/wedding-files
```

## 联系支持

如果以上解决方案都无法解决问题，请提供以下信息：

1. 操作系统版本: `cat /etc/os-release`
2. Docker 版本: `docker --version`
3. Docker Compose 版本: `docker-compose --version`
4. 错误日志: `docker-compose logs`
5. 系统资源: `free -h && df -h`

将这些信息发送给技术支持团队以获得进一步帮助。
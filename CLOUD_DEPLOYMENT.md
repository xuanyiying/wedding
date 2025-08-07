# 云服务器部署指南

本指南专门针对在云服务器（如腾讯云、阿里云等）上部署婚礼应用的优化方案。

## 问题解决

### 网络冲突问题

**问题描述**: 
```
failed to create network wedding_wedding-net: Error response from daemon: invalid pool request: Pool overlaps with other one on this address space
```

**解决方案**: 
已实现动态网络分配机制，自动检测并选择可用的网络子网。

## 部署前准备

### 1. 服务器要求

- **操作系统**: Ubuntu 18.04+, CentOS 7+, OpenCloudOS
- **内存**: 最低 2GB，推荐 4GB+
- **存储**: 最低 20GB 可用空间
- **网络**: 确保以下端口可访问
  - 80 (HTTP)
  - 443 (HTTPS)
  - 3000 (API服务)
  - 5173 (前端服务)
  - 3306 (MySQL)
  - 6379 (Redis)
  - 9000/9001 (MinIO)

### 2. 防火墙配置

```bash
# Ubuntu/Debian
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw allow 5173

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --reload
```

## 快速开始

### 方法一：快速部署（推荐）

如果您的云服务器已安装Docker和Docker Compose，可以使用快速部署脚本：

```bash
# 1. 连接到云服务器
ssh root@your-server-ip

# 2. 克隆项目
git clone <your-repo-url>
cd wedding-client

# 3. 运行快速部署脚本
./cloud-deploy.sh
```

### 方法二：完整部署

如果是全新的云服务器，使用完整部署脚本：

```bash
# 1. 连接到云服务器
ssh root@your-server-ip

# 2. 克隆项目
git clone <your-repo-url>
cd wedding-client

# 3. 运行完整部署脚本
./deploy.sh
```

### 快速部署脚本特性

`cloud-deploy.sh` 脚本专为云服务器环境优化，具有以下特性：

- ✅ **快速部署**：跳过Docker安装，直接进行应用部署
- ✅ **智能检测**：自动获取公网IP并配置CORS
- ✅ **健康检查**：自动验证所有服务是否正常运行
- ✅ **详细日志**：完整的部署日志记录到 `/tmp/wedding-deploy.log`
- ✅ **错误处理**：遇到错误立即停止并提供故障排除建议
- ✅ **资源检查**：验证系统内存和磁盘空间是否充足

### 部署时间对比

| 部署方式 | 预计时间 | 适用场景 |
|---------|---------|----------|
| 快速部署 (`cloud-deploy.sh`) | 3-5分钟 | 已安装Docker的云服务器 |
| 完整部署 (`deploy.sh`) | 10-15分钟 | 全新的云服务器 |

## 部署步骤

### 1. 获取代码

```bash
# 克隆项目
git clone <your-repository-url> wedding-client
cd wedding-client

# 或者更新现有代码
git pull origin main
```

### 2. 配置环境

编辑服务器配置文件，确保使用正确的服务器IP地址：

```bash
# 获取服务器公网IP
curl -s ifconfig.me

# 编辑Caddyfile（如果使用域名）
vim Caddyfile
```

### 3. 运行部署脚本

```bash
# 给脚本执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

### 4. 验证部署

```bash
# 检查服务状态
./deploy.sh status

# 查看服务日志
docker-compose logs -f

# 测试网络连接
curl http://localhost:3000/api/health
curl http://localhost:5173
```

## 网络配置优化

### 动态子网分配

部署脚本会自动检测并选择可用的网络子网：

1. **优先级顺序**:
   - 172.20.0.0/16
   - 172.21.0.0/16
   - 172.22.0.0/16
   - 172.23.0.0/16
   - 10.20.0.0/16

2. **冲突检测**:
   - 检查系统路由表
   - 检查现有Docker网络
   - 自动清理冲突资源

3. **错误处理**:
   - 提供详细的诊断信息
   - 建议手动清理步骤

### 手动网络清理

如果自动清理失败，可以手动执行：

```bash
# 停止所有容器
docker-compose down --remove-orphans

# 清理网络
docker network prune -f

# 清理未使用的资源
docker system prune -f

# 查看现有网络
docker network ls

# 删除特定网络
docker network rm <network_name>
```

## 常见问题解决

### 1. 内存不足

```bash
# 创建交换文件（脚本会自动执行）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久启用
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. 权限问题

```bash
# 将用户添加到docker组
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker
```

### 3. 端口被占用

```bash
# 查看端口占用
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3000

# 停止占用端口的进程
sudo kill -9 <PID>
```

### 4. 服务启动失败

```bash
# 查看具体服务日志
docker-compose logs <service_name>

# 重启特定服务
docker-compose restart <service_name>

# 重新构建并启动
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 性能优化

### 1. 资源限制

已在 `docker-compose.yml` 中配置了合理的资源限制：

- MySQL: 512MB 内存限制
- MinIO: 256MB 内存限制
- Server: 512MB 内存限制

### 2. 健康检查

所有服务都配置了健康检查，确保服务正常启动后再启动依赖服务。

### 3. 网络优化

- 使用自定义桥接网络
- 优化MTU设置（1500）
- 容器间直接通信，减少网络开销

## 监控和维护

### 日常维护命令

```bash
# 查看服务状态
./deploy.sh status

# 查看资源使用
docker stats

# 备份数据
./deploy.sh backup

# 更新服务
./deploy.sh update

# 清理资源
./deploy.sh clean
```

### 日志管理

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f mysql
docker-compose logs -f server
docker-compose logs -f web

# 限制日志输出行数
docker-compose logs --tail=100 server
```

## 安全建议

1. **更改默认密码**: 修改 MySQL、Redis、MinIO 的默认密码
2. **防火墙配置**: 只开放必要的端口
3. **SSL证书**: 配置 HTTPS 证书（推荐使用 Let's Encrypt）
4. **定期备份**: 设置定期数据库备份
5. **监控告警**: 配置服务监控和告警

## 故障排除

如果遇到问题，请按以下顺序排查：

1. 检查服务状态: `docker-compose ps`
2. 查看服务日志: `docker-compose logs <service>`
3. 检查网络连接: `docker network inspect wedding-net`
4. 检查资源使用: `docker stats`
5. 重启服务: `docker-compose restart <service>`
6. 完全重新部署: `docker-compose down && ./deploy.sh`

如果问题仍然存在，请提供以下信息：
- 服务器操作系统和版本
- Docker 和 Docker Compose 版本
- 错误日志
- 网络配置信息
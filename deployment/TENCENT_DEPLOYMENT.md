# 腾讯云服务器部署指南

## 服务器信息
- **公网IP**: 114.132.225.94
- **内网IP**: 10.1.12.15
- **SSH连接**: `ssh root@114.132.225.94`
- **密码**: lhins-3vhwz99j
- **访问端口**: 8080 (HTTP)

## 部署架构

```
用户 → 公网IP:8080 → Nginx → Web服务(5173) + API服务(3000)
                    ↓
                MySQL(3306) + Redis(6379) + MinIO(9000/9001)
```

## 快速部署

### 1. 自动部署（推荐）

```bash
# 在本地项目根目录执行
./deploy-tencent.sh
```

脚本会自动完成：
- 检查本地依赖
- 测试服务器连接
- 安装Docker和Docker Compose
- 配置防火墙
- 上传项目文件
- 构建和启动所有服务

### 2. 手动部署

#### 步骤1: 准备本地环境

```bash
# 安装sshpass (macOS)
brew install sshpass

# 或者 (Ubuntu)
sudo apt-get install sshpass
```

#### 步骤2: 连接服务器

```bash
ssh root@114.132.225.94
# 密码: lhins-3vhwz99j
```

#### 步骤3: 安装Docker

```bash
# 更新系统
apt-get update

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl start docker
systemctl enable docker

# 安装Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

#### 步骤4: 配置防火墙

```bash
# 开放必要端口
ufw allow 22/tcp    # SSH
ufw allow 8080/tcp  # Web访问
ufw allow 3000/tcp  # API
ufw allow 3306/tcp  # MySQL
ufw allow 6379/tcp  # Redis
ufw allow 9000/tcp  # MinIO API
ufw allow 9001/tcp  # MinIO Console
```

#### 步骤5: 上传项目文件

```bash
# 在本地执行
scp -r server root@114.132.225.94:/root/wedding/
scp -r web root@114.132.225.94:/root/wedding/
scp deployment/docker-compose-tencent.yml root@114.132.225.94:/root/wedding/docker-compose.yml
scp deployment/nginx-tencent.conf root@114.132.225.94:/root/wedding/nginx.conf
scp deployment/.env.tencent root@114.132.225.94:/root/wedding/.env
```

#### 步骤6: 启动服务

```bash
# 在服务器上执行
cd /root/wedding

# 构建和启动
docker-compose build --no-cache
docker-compose up -d

# 查看状态
docker-compose ps
docker-compose logs -f
```

## 服务配置

### 端口映射
- **Nginx**: 8080 → 80
- **Web**: 5173 (内部)
- **API**: 3000 (内部)
- **MySQL**: 3306
- **Redis**: 6379
- **MinIO API**: 9000
- **MinIO Console**: 9001

### 环境变量
主要配置在 `.env.tencent` 文件中：
- API地址: `http://114.132.225.94:8080/api`
- 数据库连接: MySQL
- 文件存储: MinIO
- 缓存: Redis

## 访问地址

- **前端应用**: http://114.132.225.94:8080
- **API接口**: http://114.132.225.94:8080/api
- **MinIO控制台**: http://114.132.225.94:9001
- **健康检查**: http://114.132.225.94:8080/health

## 管理命令

### 查看服务状态
```bash
ssh root@114.132.225.94 'cd /root/wedding && docker-compose ps'
```

### 查看日志
```bash
# 查看所有服务日志
ssh root@114.132.225.94 'cd /root/wedding && docker-compose logs -f'

# 查看特定服务日志
ssh root@114.132.225.94 'cd /root/wedding && docker-compose logs -f nginx'
ssh root@114.132.225.94 'cd /root/wedding && docker-compose logs -f web'
ssh root@114.132.225.94 'cd /root/wedding && docker-compose logs -f server'
```

### 重启服务
```bash
# 重启所有服务
ssh root@114.132.225.94 'cd /root/wedding && docker-compose restart'

# 重启特定服务
ssh root@114.132.225.94 'cd /root/wedding && docker-compose restart nginx'
```

### 停止服务
```bash
ssh root@114.132.225.94 'cd /root/wedding && docker-compose down'
```

### 更新部署
```bash
# 停止服务
ssh root@114.132.225.94 'cd /root/wedding && docker-compose down'

# 重新上传文件（在本地执行）
./deploy-tencent.sh
```

## 故障排查

### 1. 服务无法启动
```bash
# 检查容器状态
docker-compose ps

# 查看错误日志
docker-compose logs [service_name]

# 检查资源使用
docker stats
```

### 2. 网络连接问题
```bash
# 检查端口监听
netstat -tlnp | grep :8080

# 检查防火墙
ufw status

# 测试内部连接
curl http://localhost:8080/health
```

### 3. 数据库连接问题
```bash
# 检查MySQL状态
docker-compose exec mysql mysqladmin ping

# 连接数据库
docker-compose exec mysql mysql -u wedding -p wedding_host
```

### 4. 文件上传问题
```bash
# 检查MinIO状态
curl http://localhost:9000/minio/health/live

# 查看MinIO日志
docker-compose logs minio
```

## 性能优化

### 1. 资源限制
已在docker-compose中配置内存限制：
- MySQL: 512M
- Server: 512M
- MinIO: 256M

### 2. 缓存配置
- Nginx静态文件缓存: 1年
- Redis缓存: 用于会话和临时数据

### 3. 数据库优化
- MySQL配置优化
- 连接池配置
- 索引优化

## 安全配置

### 1. 防火墙
只开放必要端口，其他端口默认关闭

### 2. 密码安全
- 数据库密码: 生产环境请修改默认密码
- MinIO密码: 生产环境请修改默认密码
- JWT密钥: 已配置强密钥

### 3. HTTPS升级（可选）
如果需要HTTPS，可以：
1. 申请SSL证书
2. 修改Nginx配置
3. 更新防火墙规则

## 备份策略

### 1. 数据备份
```bash
# 备份MySQL数据
docker-compose exec mysql mysqldump -u wedding -p wedding_host > backup.sql

# 备份MinIO数据
docker-compose exec minio mc mirror /data /backup
```

### 2. 配置备份
```bash
# 备份配置文件
tar -czf wedding-config-$(date +%Y%m%d).tar.gz docker-compose.yml nginx.conf .env
```

## 监控建议

1. **服务监控**: 使用健康检查端点监控服务状态
2. **资源监控**: 监控CPU、内存、磁盘使用情况
3. **日志监控**: 定期检查应用日志和错误日志
4. **性能监控**: 监控响应时间和并发数

## 联系信息

如有问题，请检查：
1. 服务器日志
2. 网络连接
3. 防火墙配置
4. 资源使用情况

部署完成后，访问 http://114.132.225.94:8080 即可使用应用。
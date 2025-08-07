# Docker 网络配置指南

## 概述

本文档详细说明了婚礼管理系统的 Docker 网络配置方案，包括网络架构设计、服务间通信、安全配置和故障排除。

## 网络架构

### 1. 网络拓扑

```
┌─────────────────────────────────────────────────────────────┐
│                    Host Network                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              wedding-net (172.20.0.0/16)           │   │
│  │                                                     │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │   │
│  │  │  MySQL  │  │  Redis  │  │  MinIO  │  │ Server  │ │   │
│  │  │:3306    │  │:6379    │  │:9000/01 │  │:3000    │ │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │   │
│  │                                                     │   │
│  │  ┌─────────┐  ┌─────────┐                          │   │
│  │  │   Web   │  │  Caddy  │                          │   │
│  │  │:5173    │  │:80/443  │                          │   │
│  │  └─────────┘  └─────────┘                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2. 网络配置详情

#### 自定义桥接网络 (wedding-net)

- **网络类型**: bridge
- **子网范围**: 172.20.0.0/16
- **网关地址**: 172.20.0.1
- **网桥名称**: wedding-br0
- **MTU**: 1500
- **驱动**: bridge

#### 网络配置优势

1. **隔离性**: 自定义网络提供了与其他容器的网络隔离
2. **DNS解析**: 容器可以通过服务名进行相互访问
3. **安全性**: 只有同一网络内的容器可以相互通信
4. **可扩展性**: 支持后续添加更多服务
5. **可控性**: 可以精确控制网络配置和路由

## 服务配置

### 1. 容器网络配置

| 服务 | 容器名 | 内部端口 | 外部端口 | 网络别名 |
|------|--------|----------|----------|----------|
| MySQL | wedding_mysql | 3306 | 3306 | mysql |
| Redis | wedding_redis | 6379 | 6379 | redis |
| MinIO | wedding_minio | 9000/9001 | 9000/9001 | minio |
| Server | wedding_server | 3000 | 3000 | server |
| Web | wedding_web | 5173 | 5173 | web |
| Caddy | wedding_caddy | 80/443 | 80/443 | caddy |

### 2. 服务间通信

#### 内部通信（容器间）

```yaml
# Server 连接数据库
DB_HOST=mysql
DB_PORT=3306

# Server 连接 Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Server 连接 MinIO
MINIO_ENDPOINT=minio:9000

# Web 连接 Server
VITE_API_URL=http://server:3000
```

#### 外部访问

```bash
# 通过 Caddy 反向代理访问
http://your-domain.com -> Caddy:80 -> Web:5173
http://your-domain.com/api -> Caddy:80 -> Server:3000

# 直接访问服务
http://localhost:3000  # API 服务
http://localhost:5173  # Web 服务
http://localhost:9001  # MinIO 控制台
```

### 3. 健康检查配置

每个服务都配置了健康检查，确保服务正常运行：

```yaml
healthcheck:
  test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

## 安全配置

### 1. 网络安全

- **网络隔离**: 使用自定义网络隔离应用容器
- **最小权限**: 只暴露必要的端口
- **内部通信**: 服务间通过内部网络通信，不暴露敏感端口

### 2. 端口管理

#### 对外暴露端口
- 80/443: HTTP/HTTPS (Caddy)
- 3000: API 服务 (开发/调试用)
- 5173: Web 服务 (开发/调试用)
- 9001: MinIO 控制台

#### 内部端口
- 3306: MySQL (仅内部访问)
- 6379: Redis (仅内部访问)
- 9000: MinIO API (仅内部访问)

### 3. 防火墙配置建议

```bash
# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许 SSH
sudo ufw allow 22/tcp

# 可选：允许直接访问服务（开发环境）
sudo ufw allow 3000/tcp
sudo ufw allow 5173/tcp
sudo ufw allow 9001/tcp

# 启用防火墙
sudo ufw enable
```

## 性能优化

### 1. 网络性能

- **MTU 设置**: 设置为 1500，适合大多数网络环境
- **桥接模式**: 使用桥接网络，性能优于 overlay 网络
- **DNS 缓存**: Docker 内置 DNS 缓存，提高解析速度

### 2. 资源限制

```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

### 3. 连接池配置

```javascript
// 数据库连接池
const pool = mysql.createPool({
  host: 'mysql',
  port: 3306,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000
});

// Redis 连接池
const redis = new Redis({
  host: 'redis',
  port: 6379,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100
});
```

## 故障排除

### 1. 网络连通性测试

```bash
# 检查网络是否存在
docker network ls | grep wedding-net

# 检查网络详细信息
docker network inspect wedding-net

# 测试容器间连通性
docker-compose exec server ping mysql
docker-compose exec server nc -zv mysql 3306

# 检查端口监听
docker-compose exec mysql netstat -tuln | grep 3306
```

### 2. 常见问题及解决方案

#### 问题 1: 容器无法相互通信

**症状**: 服务启动失败，连接超时

**解决方案**:
```bash
# 检查容器是否在同一网络
docker network inspect wedding-net

# 重新创建网络
docker network rm wedding-net
docker-compose up -d
```

#### 问题 2: 端口冲突

**症状**: 端口已被占用错误

**解决方案**:
```bash
# 查找占用端口的进程
sudo netstat -tulpn | grep :3306
sudo lsof -i :3306

# 停止占用进程或修改端口配置
```

#### 问题 3: DNS 解析失败

**症状**: 无法通过服务名访问其他容器

**解决方案**:
```bash
# 检查容器 DNS 配置
docker-compose exec server nslookup mysql

# 重启 Docker 服务
sudo systemctl restart docker
```

#### 问题 4: 网络性能问题

**症状**: 服务间通信延迟高

**解决方案**:
```bash
# 检查网络统计
docker-compose exec server ss -i

# 调整 MTU 设置
docker network create --opt com.docker.network.driver.mtu=1450 wedding-net
```

### 3. 监控和日志

```bash
# 查看网络流量
docker stats

# 查看容器日志
docker-compose logs -f server

# 查看系统网络状态
ss -tuln
ip route show
```

## 部署最佳实践

### 1. 部署前检查

- 确认端口可用性
- 检查网络段冲突
- 验证 Docker 版本兼容性
- 确保足够的系统资源

### 2. 分阶段部署

1. **基础设施层**: MySQL, Redis, MinIO
2. **应用层**: Server
3. **前端层**: Web
4. **代理层**: Caddy

### 3. 健康检查

- 等待依赖服务健康后再启动下游服务
- 配置合适的健康检查间隔和超时
- 实现优雅的服务降级

### 4. 备份和恢复

```bash
# 备份网络配置
docker network inspect wedding-net > network-backup.json

# 备份容器配置
docker-compose config > docker-compose-backup.yml

# 恢复网络
docker network create --driver bridge --subnet=172.20.0.0/16 wedding-net
```

## 扩展和升级

### 1. 水平扩展

```yaml
# 扩展 Server 服务
services:
  server:
    deploy:
      replicas: 3
  
  # 添加负载均衡
  nginx:
    image: nginx:alpine
    depends_on:
      - server
```

### 2. 服务发现

考虑使用 Consul 或 etcd 进行服务发现：

```yaml
services:
  consul:
    image: consul:latest
    networks:
      - wedding-net
```

### 3. 监控集成

```yaml
services:
  prometheus:
    image: prom/prometheus
    networks:
      - wedding-net
  
  grafana:
    image: grafana/grafana
    networks:
      - wedding-net
```

## 总结

本项目采用的 Docker 网络配置方案具有以下特点：

1. **简单可靠**: 使用标准的桥接网络，配置简单，稳定性好
2. **安全隔离**: 自定义网络提供良好的隔离性
3. **易于维护**: 清晰的服务命名和网络结构
4. **可扩展性**: 支持后续添加更多服务
5. **性能优化**: 合理的网络配置和资源限制

通过遵循本指南，可以确保婚礼管理系统的网络配置既安全又高效，同时便于维护和扩展。
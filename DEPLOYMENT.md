# Wedding Client 部署指南

## 环境配置说明

本项目支持三种部署环境：

1. **腾讯云环境 (tencent)** - 用于腾讯云服务器部署
2. **生产环境 (prod)** - 用于本地生产环境部署
3. **开发环境 (dev)** - 用于本地开发环境

## 环境配置文件

每种环境都有对应的配置文件：

- 腾讯云环境: `deployment/.env.tencent`
- 生产环境: `deployment/.env.prod`
- 开发环境: `deployment/.env.dev`

## IP地址统一管理

为了便于在不同环境中部署，项目使用环境变量统一管理IP地址：

- 腾讯云环境: `SERVER_IP=114.132.225.94`
- 生产环境: `SERVER_IP=127.0.0.1`
- 开发环境: `SERVER_IP=127.0.0.1`

所有配置文件、脚本和Docker配置都使用 `$SERVER_IP` 变量而不是硬编码的IP地址。

## Docker Compose 配置文件

每种环境都有对应的 Docker Compose 配置文件：

- 腾讯云环境: `deployment/docker-compose.tencent.yml`
- 生产环境: `deployment/docker-compose.prod.yml`
- 开发环境: `deployment/docker-compose.dev.yml`

## Nginx 配置文件

每种环境都有对应的 Nginx 配置文件：

- 腾讯云环境: `web/nginx.tencent.conf`
- 生产环境: `web/nginx.prod.conf`
- 开发环境: `web/nginx.dev.conf`

## 部署脚本

### 统一部署脚本

使用统一部署脚本 `deployment/deploy-unified.sh`：

```bash
# 启动腾讯云环境
./deployment/deploy-unified.sh start tencent

# 启动生产环境
./deployment/deploy-unified.sh start prod

# 启动开发环境
./deployment/deploy-unified.sh start dev

# 完整部署腾讯云环境
./deployment/deploy-unified.sh deploy tencent

# 重新构建并部署生产环境
./deployment/deploy-unified.sh rebuild prod

# 查看开发环境API日志
./deployment/deploy-unified.sh logs api dev
```

### 环境特定启动脚本

每种环境都有对应的启动脚本：

```bash
# 启动腾讯云环境
./start.tencent.sh

# 启动生产环境
./start.prod.sh

# 启动开发环境
./start.dev.sh
```

## 环境变量使用

所有配置文件中的IP地址和端口都使用环境变量，确保在不同环境中的一致性：

- `SERVER_IP`: 服务器IP地址
- `WEB_PORT`: Web服务端口
- `API_PORT`: API服务端口
- `MYSQL_PORT`: MySQL端口
- `REDIS_PORT`: Redis端口
- `MINIO_PORT`: MinIO端口
- `MINIO_CONSOLE_PORT`: MinIO控制台端口

## Dockerfile 环境变量支持

Dockerfile中已更新以支持环境变量：

- Web服务Dockerfile: `web/Dockerfile`
- API服务Dockerfile: `server/Dockerfile`

## 使用示例

### 腾讯云环境部署

```bash
# 完整部署
./deployment/deploy-unified.sh deploy tencent

# 重新构建并部署
./deployment/deploy-unified.sh rebuild tencent

# 查看状态
./deployment/deploy-unified.sh status tencent

# 查看日志
./deployment/deploy-unified.sh logs api tencent
```

### 生产环境部署

```bash
# 完整部署
./deployment/deploy-unified.sh deploy prod

# 重新构建并部署
./deployment/deploy-unified.sh rebuild prod

# 查看状态
./deployment/deploy-unified.sh status prod

# 查看日志
./deployment/deploy-unified.sh logs api prod
```

### 开发环境部署

```bash
# 完整部署
./deployment/deploy-unified.sh deploy dev

# 重新构建并部署
./deployment/deploy-unified.sh rebuild dev

# 查看状态
./deployment/deploy-unified.sh status dev

# 查看日志
./deployment/deploy-unified.sh logs api dev
```

## 注意事项

1. 确保在部署前已安装 Docker 和 Docker Compose
2. 确保有足够的系统资源运行所有服务
3. 生产环境部署前请修改默认密码和密钥
4. 腾讯云环境需要配置正确的服务器IP地址
5. 开发环境默认使用 localhost 和标准开发端口

## 故障排除

如果遇到问题，请检查：

1. 环境变量配置是否正确
2. Docker 服务是否正常运行
3. 端口是否被占用
4. 防火墙设置是否正确
5. 磁盘空间是否充足
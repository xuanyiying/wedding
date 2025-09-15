# Wedding Club 部署架构说明

## 架构优化概述

本次优化重点解决了以下问题：
1. **环境配置统一管理** - 通过环境变量文件实现多环境支持
2. **nginx配置去重** - 统一使用外部挂载配置，移除web目录重复配置
3. **部署脚本增强** - 支持环境切换和智能部署
4. **配置管理简化** - 避免多处重复定义相同配置项

## 目录结构

```
deployment/
├── environments/          # 环境配置文件
│   ├── .env.dev          # 开发环境配置
│   ├── .env.test         # 测试环境配置
│   └── .env.prod         # 生产环境配置
├── docker/               # Docker相关配置
│   ├── nginx/           # Nginx配置
│   │   ├── nginx.conf   # 主配置文件
│   │   └── conf.d/      # 站点配置
│   ├── mysql/           # MySQL配置
│   ├── redis/           # Redis配置
│   └── monitoring/      # 监控配置
├── scripts/             # 部署脚本
│   └── nginx-entrypoint.sh
├── logs/               # 日志目录
├── ssl/                # SSL证书
└── uploads/            # 文件上传目录
```

## 环境配置管理

### 环境变量文件

每个环境都有独立的配置文件：
- `.env.dev` - 开发环境（端口：8080, 3001, 3307, 6380）
- `.env.test` - 测试环境（端口：8080, 3000, 3306, 6379）
- `.env.prod` - 生产环境（端口：8080, 3000, 3306, 6379）

### 配置项说明

主要配置项包括：
- **环境标识**：ENVIRONMENT, NODE_ENV
- **服务端口**：WEB_PORT, SERVER_PORT, MYSQL_PORT, REDIS_PORT
- **数据库配置**：MYSQL_*, REDIS_*
- **安全配置**：JWT_SECRET, CORS_ORIGIN
- **文件上传**：UPLOAD_MAX_SIZE, UPLOAD_ALLOWED_TYPES
- **监控配置**：LOG_LEVEL, HEALTH_CHECK_ENABLED

## Nginx配置架构

### 配置文件层次

1. **主配置文件** (`deployment/docker/nginx/nginx.conf`)
   - 全局设置和性能优化
   - 缓存配置
   - 限流配置
   - 安全头设置

2. **站点配置模板** (`deployment/docker/nginx/conf.d/default.conf.template`)
   - 上游服务器配置
   - 路由规则
   - 代理设置
   - 静态文件处理

3. **Web容器配置** (简化版)
   - 仅处理容器内静态文件服务
   - 基础健康检查
   - 简单缓存策略

### 为什么保留Web目录配置？

虽然已有外部nginx配置，但web目录中的nginx配置仍有必要保留：

1. **容器独立性**：web容器可以独立运行和测试
2. **开发调试**：开发环境可以直接访问web容器进行调试
3. **故障隔离**：外部nginx故障时，web容器仍可提供基础服务
4. **配置分离**：外部nginx处理复杂路由，内部nginx处理静态文件
5. **性能优化**：内部nginx专门优化静态文件服务

## 部署脚本使用

### 基本命令

```bash
# 部署到不同环境
./deploy.sh dev deploy      # 部署开发环境
./deploy.sh test deploy     # 部署测试环境
./deploy.sh prod deploy     # 部署生产环境（默认）

# 其他操作
./deploy.sh prod stop       # 停止生产环境
./deploy.sh dev restart     # 重启开发环境
./deploy.sh test logs api   # 查看测试环境API日志
./deploy.sh prod status     # 查看生产环境状态
```

### 高级选项

```bash
# 强制重新构建
./deploy.sh prod deploy --force

# 不使用缓存构建
./deploy.sh dev deploy --no-cache

# 拉取最新基础镜像
./deploy.sh prod deploy --pull

# 仅构建不启动
./deploy.sh test deploy --build-only
```

## Docker Compose配置

### 动态环境加载

docker-compose.yml 使用环境变量动态加载配置：

```yaml
env_file:
  - ./deployment/environments/.env.${ENVIRONMENT:-prod}
```

### 服务命名规范

所有服务使用统一命名规范：
- 容器名：`wedding-{service}-{environment}`
- 网络名：`wedding-{environment}-network`
- 数据卷：`wedding-{service}-{environment}-data`

## 配置优化要点

### 1. 去除重复配置

- **问题**：nginx配置在多处重复定义
- **解决**：统一使用外部挂载配置，web容器仅保留基础配置

### 2. 环境变量统一

- **问题**：环境配置分散在多个文件
- **解决**：集中在 `deployment/environments/` 目录管理

### 3. 部署流程标准化

- **问题**：部署脚本功能单一，不支持环境切换
- **解决**：重构脚本支持多环境、多操作、参数化部署

### 4. 配置模板化

- **问题**：nginx配置硬编码服务名和端口
- **解决**：使用模板和环境变量动态生成配置

## 监控和日志

### 日志目录结构

```
deployment/logs/
├── nginx/          # Nginx访问和错误日志
├── api/            # API服务日志
├── mysql/          # MySQL日志
├── redis/          # Redis日志
└── minio/          # MinIO日志
```

### 健康检查

所有服务都配置了健康检查：
- **Web服务**：HTTP GET /health
- **API服务**：HTTP GET /health
- **MySQL**：mysqladmin ping
- **Redis**：redis-cli ping
- **MinIO**：HTTP GET /minio/health/live

## 安全配置

### 网络安全

- 服务间通信使用内部网络
- 限流配置防止DDoS攻击
- 安全头防止XSS等攻击

### 数据安全

- 数据库密码通过环境变量管理
- JWT密钥独立配置
- 文件上传类型和大小限制

## 故障排查

### 常见问题

1. **服务启动失败**
   ```bash
   ./deploy.sh prod logs [service-name]
   ```

2. **nginx配置错误**
   ```bash
   docker exec wedding-nginx-prod nginx -t
   ```

3. **环境变量问题**
   ```bash
   ./deploy.sh prod status
   docker exec wedding-api-prod env | grep -E "(NODE_ENV|ENVIRONMENT)"
   ```

### 调试命令

```bash
# 查看服务状态
./deploy.sh [env] status

# 查看特定服务日志
./deploy.sh [env] logs [service]

# 测试配置
./deploy.sh [env] test

# 健康检查
./deploy.sh [env] health
```

## 性能优化

### Nginx优化

- 启用gzip压缩
- 配置静态文件缓存
- 优化代理缓冲区
- 连接保持和复用

### Docker优化

- 多阶段构建减少镜像大小
- 构建缓存优化
- 健康检查配置
- 资源限制设置

## 扩展性考虑

### 水平扩展

- 服务使用upstream配置支持多实例
- 数据库支持读写分离
- 静态文件可使用CDN

### 监控扩展

- 预留监控服务配置
- 日志收集和分析
- 性能指标监控
- 告警配置

## 维护建议

1. **定期更新**：定期更新基础镜像和依赖
2. **备份策略**：配置数据库和文件备份
3. **安全审计**：定期检查安全配置
4. **性能监控**：监控服务性能和资源使用
5. **文档更新**：及时更新配置文档
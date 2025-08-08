# 本地开发环境指南

本项目提供了完整的 Docker 本地开发环境，支持热重载和快速开发。

## 🚀 快速开始

### 1. 环境准备

确保你的系统已安装：
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 2. 启动开发环境

```bash
# 克隆项目
git clone https://github.com/xuanyiying/wedding.git
cd wedding

# 复制环境变量文件
cp .env.local .env

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 3. 访问服务

- **前端应用**: http://localhost:5173
- **后端API**: http://localhost:3000
- **MinIO控制台**: http://localhost:9001 (用户名: minioadmin, 密码: minioadmin123)
- **MySQL数据库**: localhost:3306
- **Redis缓存**: localhost:6379

## 📁 项目结构

```
wedding/
├── docker-compose.yml          # 本地开发环境配置
├── .env.local                   # 环境变量模板
├── server/                      # 后端代码
│   ├── Dockerfile.dev          # 后端开发环境镜像
│   └── ...
├── web/                         # 前端代码
│   ├── Dockerfile.dev          # 前端开发环境镜像
│   └── ...
└── deployment/                  # 生产环境部署配置
    └── ...
```

## 🛠️ 开发工作流

### 代码热重载

- **后端**: 修改 `server/` 目录下的代码会自动重启服务
- **前端**: 修改 `web/` 目录下的代码会自动刷新浏览器

### 数据库操作

```bash
# 连接到MySQL容器
docker-compose exec mysql mysql -u wedding -p wedding_dev

# 查看数据库日志
docker-compose logs mysql

# 重置数据库
docker-compose down -v
docker-compose up -d
```

### 缓存操作

```bash
# 连接到Redis容器
docker-compose exec redis redis-cli

# 清空缓存
docker-compose exec redis redis-cli FLUSHALL
```

### 文件存储

```bash
# 查看MinIO存储
# 访问 http://localhost:9001
# 用户名: minioadmin
# 密码: minioadmin123
```

## 🔧 常用命令

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重新构建并启动
docker-compose up --build -d

# 查看服务状态
docker-compose ps

# 查看特定服务日志
docker-compose logs -f server
docker-compose logs -f web

# 进入容器
docker-compose exec server sh
docker-compose exec web sh

# 重启特定服务
docker-compose restart server
docker-compose restart web

# 清理所有数据（谨慎使用）
docker-compose down -v
docker system prune -f
```

## 🐛 故障排除

### 端口冲突

如果遇到端口冲突，可以修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "3001:3000"  # 将后端端口改为3001
  - "5174:5173"  # 将前端端口改为5174
```

### 服务启动失败

1. 检查服务依赖是否正常启动
2. 查看服务日志定位问题
3. 确认环境变量配置正确

### 数据库连接问题

1. 确认MySQL服务已启动并健康检查通过
2. 检查数据库连接字符串是否正确
3. 验证数据库用户权限

### 热重载不工作

1. 确认代码目录正确挂载
2. 检查文件权限
3. 重启相关服务

## 📝 开发注意事项

1. **环境变量**: 不要将敏感信息提交到版本控制
2. **数据持久化**: 开发数据存储在Docker卷中，`docker-compose down -v` 会清空所有数据
3. **性能**: 首次启动可能较慢，后续启动会更快
4. **网络**: 所有服务在同一个Docker网络中，可以通过服务名互相访问

## 🔗 相关链接

- [Docker官方文档](https://docs.docker.com/)
- [Docker Compose官方文档](https://docs.docker.com/compose/)
- [Node.js官方文档](https://nodejs.org/)
- [React官方文档](https://reactjs.org/)
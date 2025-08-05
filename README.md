# 婚礼主持人平台

一个现代化的婚礼主持人服务平台，提供主持人展示、预约、评价等功能。

## 🚀 快速部署

### 腾讯云服务器一键部署

**方式一：全新服务器快速部署**
```bash
# 1. 登录腾讯云服务器
ssh root@your-server-ip

# 2. 克隆项目
git clone <your-repository-url>
cd wedding-client

# 3. 执行一键部署（推荐用于全新服务器）
sudo ./quick-deploy.sh
```

**方式二：使用完整部署脚本**
```bash
# 1. 克隆项目到服务器
git clone <your-repository-url>
cd wedding-client

# 2. 执行部署
./deploy.sh
```

### 本地开发环境

```bash
# 1. 启动基础设施服务
docker-compose up -d mysql redis minio

# 2. 启动后端服务
cd server
npm install
npm run dev

# 3. 启动前端服务
cd web
npm install
npm run dev
```

## 📋 部署脚本功能

### deploy.sh - 完整部署脚本
```bash
./deploy.sh [选项]

选项：
  deploy, -d     执行完整部署（默认）
  start, -s      启动服务
  stop, -t       停止服务
  restart, -r    重启服务
  status, -st    查看服务状态
  logs, -l       查看服务日志
  backup, -b     备份当前部署
  clean, -c      清理 Docker 资源
  update, -u     更新并重启服务
  help, -h       显示帮助信息
```

### quick-deploy.sh - 腾讯云快速部署
- 自动检测系统环境
- 自动安装 Docker 和 Docker Compose
- 自动配置防火墙
- 一键部署所有服务
- 适用于全新的腾讯云服务器

## 🏗️ 项目架构

```
wedding-client/
├── web/                 # React 前端应用
├── server/              # Node.js 后端 API
├── docker-compose.yml   # Docker 编排文件
├── Caddyfile           # Caddy 反向代理配置
├── deploy.sh           # 完整部署脚本
├── quick-deploy.sh     # 快速部署脚本
├── DEPLOYMENT_GUIDE.md # 详细部署指南
└── deployment/         # 部署相关文档
```

## 🔧 服务组件

- **Web 前端**: React + TypeScript + Vite
- **API 后端**: Node.js + Express + TypeScript
- **数据库**: MySQL 8.0
- **缓存**: Redis 7
- **文件存储**: MinIO
- **反向代理**: Caddy 2

## 🌐 访问地址

部署完成后，您可以通过以下地址访问：

- **Web 应用**: `http://your-server-ip`
- **API 服务**: `http://your-server-ip:8000`
- **MinIO 控制台**: `http://your-server-ip:9001`
  - 用户名: `rustfsadmin`
  - 密码: `rustfssecret123`

## 📖 详细文档

- [部署指南](./DEPLOYMENT_GUIDE.md) - 详细的部署说明和故障排除
- [API 文档](./docs/) - API 接口文档
- [开发文档](./docs/) - 开发环境搭建和贡献指南

## 🛠️ 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f [service-name]

# 重启服务
docker-compose restart [service-name]

# 停止所有服务
docker-compose down

# 清理 Docker 资源
docker system prune -f
```

## 🔒 安全配置

### 生产环境建议

1. **修改默认密码**
   - 数据库密码
   - MinIO 访问密钥
   - JWT 密钥

2. **配置 HTTPS**
   - 使用域名并配置 SSL 证书
   - 修改 `Caddyfile` 中的域名配置

3. **防火墙配置**
   - 仅开放必要端口
   - 配置 IP 白名单（如需要）

## 📞 技术支持

如果在部署过程中遇到问题：

1. 查看 [部署指南](./DEPLOYMENT_GUIDE.md)
2. 检查服务日志：`./deploy.sh logs`
3. 查看服务状态：`./deploy.sh status`
4. 提交 Issue 并提供详细的错误信息

## 📄 许可证

MIT License

---

**祝您使用愉快！** 🎉
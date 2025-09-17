# Wedding Client 婚礼工作室官网

一个现代化的婚礼工作室官网系统，包含客户展示端和管理后台，采用前后端分离架构开发。

## 🚀 快速开始

### 简单启动
```bash
# 1. 克隆项目
git clone <repository-url>
cd wedding-client

# 2. 一键启动（推荐）
./deploy.sh deploy

# 3. 查看服务状态
./deploy.sh status
```

### 访问地址
- **前端展示**: http://localhost
- **管理后台**: http://localhost/admin  
- **API接口**: http://localhost/api
- **MinIO控制台**: http://localhost:9001

### 默认账户
- **管理员**: admin / admin123
- **邮箱**: admin@wedding.com

## 📁 项目结构

```
wedding-client/
├── deploy.sh              # 🚀 主部署脚本（根目录）
├── 📂 deployment/          # 🚀 部署配置文件
│   ├── docker/            #    Docker配置
│   ├── environments/      #    环境配置
│   └── scripts/           #    工具脚本集合
│       ├── check-db-init.sh      #    数据库状态检查
│       ├── database-management.sh #    数据库管理
│       ├── health-check.sh       #    系统健康检查
│       ├── nginx-entrypoint.sh   #    Nginx启动脚本
│       └── setup.sh              #    环境初始化
├── 📂 docs/               # 📚 项目文档
├── 📂 server/             # 🔧 后端服务
└── 📂 web/                # 🎨 前端应用
```

## 🛠️ 技术栈

### 前端
- **React 18** + **TypeScript** - 现代化用户界面
- **Redux Toolkit** - 状态管理
- **Ant Design 5** - 企业级UI组件
- **Vite** - 快速构建工具

### 后端  
- **Node.js 18+** + **TypeScript** - 服务端运行时
- **Express.js** - Web框架
- **MySQL 8.0** - 主数据库
- **Redis 7** - 缓存数据库
- **JWT** - 身份认证

### 基础设施
- **Docker** + **Docker Compose** - 容器化部署
- **Nginx** - 反向代理
- **MinIO** - 对象存储

## 🎯 核心功能

### 客户展示端
- ✨ **首页展示** - 工作室介绍与作品展示
- 👥 **团队介绍** - 主持人团队展示
- 📅 **档期查询** - 实时档期状态查看
- 🎬 **作品展示** - 图片/视频作品展示
- 📞 **联系咨询** - 在线咨询与联系

### 管理后台
- 📊 **数据仪表盘** - 业务数据统计
- 👤 **用户管理** - 用户信息与权限管理
- 📅 **档期管理** - 档期安排与冲突检测
- 🎨 **作品管理** - 作品上传与审核
- 👥 **团队管理** - 团队成员管理
- ⚙️ **系统设置** - 系统配置管理

## 📋 常用命令

### 服务管理
```bash
./deploy.sh start      # 启动所有服务
./deploy.sh stop       # 停止所有服务  
./deploy.sh restart    # 重启所有服务
./deploy.sh status     # 查看服务状态
```

### 部署操作
```bash
./deploy.sh deploy     # 完整部署
./deploy.sh init       # 数据库初始化
```

### 工具脚本
```bash
./deployment/scripts/database-management.sh backup    # 数据库备份
./deployment/scripts/health-check.sh                  # 健康检查
./deploy.sh diagnose                                  # nginx问题诊断
```

### 文档查看
```bash
cat docs/README.md     # 文档索引
```

## 📚 详细文档

| 文档类型 | 链接 | 说明 |
|----------|------|------|
| 📋 **文档索引** | [docs/README.md](docs/README.md) | 所有文档的导航目录 |
| 🚀 **部署指南** | [docs/DEPLOYMENT_README.md](docs/DEPLOYMENT_README.md) | 详细部署说明 |
| 🏗️ **架构设计** | [docs/complete-architecture-design.md](docs/complete-architecture-design.md) | 系统架构说明 |
| 🗄️ **数据库设计** | [docs/database-design.md](docs/database-design.md) | 数据库表结构 |
| 🔐 **权限系统** | [docs/PERMISSION_GUIDE.md](docs/PERMISSION_GUIDE.md) | 权限系统使用指南 |

## 🔧 开发指南

### 环境要求
- Node.js 18+
- Docker & Docker Compose
- MySQL 8.0
- Redis 7

### 本地开发
```bash
# 后端开发
cd server
npm install
npm run dev

# 前端开发  
cd web
npm install
npm run dev
```

### 数据库初始化
```bash
# 自动初始化（推荐）
./deploy.sh init

# 手动初始化
./deployment/scripts/database-management.sh init
```

## 🛡️ 安全建议

1. **修改默认密码** - 首次部署后立即修改管理员密码
2. **配置SMTP** - 设置邮件服务以支持密码重置
3. **启用HTTPS** - 生产环境建议配置SSL证书
4. **定期备份** - 使用 `./start.sh backup` 定期备份数据

## 🆘 故障排除

### 常见问题
- **服务启动失败**: 检查端口占用 `docker ps`
- **数据库连接失败**: 确认环境变量配置
- **文件上传失败**: 检查MinIO服务状态
- **网络问题**: 查看 [Docker网络指南](docs/DOCKER_NETWORK_GUIDE.md)

### 获取帮助
```bash
./deploy.sh help       # 查看帮助信息
./deploy.sh diagnose   # nginx问题诊断
./deployment/scripts/health-check.sh  # 系统健康检查
```

## 📄 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

**快速体验**: `./deploy.sh deploy` 一键部署，几分钟内即可访问完整系统！
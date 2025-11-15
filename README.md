# Wedding Club - 一站式婚礼服务平台

<div align="center">

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

一站式婚礼服务平台，包含客户管理、作品展示、日程安排、团队协作等核心功能。

</div>

## 🌟 项目特点

- **全栈解决方案**: 前端React + 后端Node.js + 数据库MySQL + 缓存Redis
- **现代化架构**: 微服务设计，Docker容器化部署
- **响应式设计**: 支持PC、平板、手机等多设备访问
- **安全可靠**: JWT认证、权限控制、数据加密
- **高性能**: Redis缓存、数据库优化、CDN加速
- **易扩展**: 模块化设计，便于功能扩展

## 🏗️ 技术架构

### 前端技术栈
- React 18 + TypeScript
- Vite 构建工具
- Ant Design 组件库
- React Router v6
- Zustand 状态管理

### 后端技术栈
- Node.js 18+
- Express.js
- TypeScript
- MySQL 8.0
- Redis 7.x
- MinIO 对象存储
- JWT 认证

### 基础设施
- Docker + Docker Compose
- Nginx 反向代理
- ELK 日志分析 (可选)

## 📁 项目结构

```
.
├── deployment/          # 部署配置和脚本
│   ├── docker/         # Docker配置文件
│   ├── environments/   # 环境配置文件
│   ├── scripts/        # 部署脚本
│   └── logs/           # 日志目录
├── server/             # 后端服务
│   ├── src/            # 源代码
│   ├── config/         # 配置文件
│   └── scripts/        # 服务脚本
├── web/                # 前端应用
│   ├── src/            # 源代码
│   └── public/         # 静态资源
└── docker-compose.yml  # Docker编排文件
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Docker + Docker Compose
- Git

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd wedding-client
```

2. **配置环境变量**
```bash
# 复制环境配置模板
cp deployment/environments/.env.example deployment/environments/.env.dev
cp deployment/environments/.env.example deployment/environments/.env.prod

# 编辑配置文件
vim deployment/environments/.env.dev
```

3. **启动服务**
```bash
# 开发环境
./deploy.sh dev deploy

# 生产环境
./deploy.sh prod deploy
```

4. **访问应用**
- 前端界面: http://localhost:8080
- API文档: http://localhost:8080/api/v1/docs
- 管理后台: http://localhost:8080/admin

## 📊 服务监控与可观测性

系统提供完善的日志和监控功能，详情请参考 [可观测性指南](deployment/OBSERVABILITY.md)。

### 快速查看日志
```bash
# 查看所有服务日志
./deployment/scripts/view-logs.sh

# 查看API服务日志
./deployment/scripts/view-logs.sh api

# 实时监控服务状态
./deployment/scripts/monitor-services.sh
```

### 健康检查
所有服务都提供健康检查端点：
- API服务: `http://localhost:3000/health`
- Web服务: `http://localhost/health`

## 🔧 开发指南

### 后端开发
```bash
cd server
npm install
npm run dev
```

### 前端开发
```bash
cd web
npm install
npm run dev
```

### 代码规范
- 使用ESLint和Prettier保持代码风格一致
- 遵循RESTful API设计规范
- 使用TypeScript类型检查

## 🛡️ 安全特性

- JWT Token认证
- 密码加密存储
- SQL注入防护
- XSS攻击防护
- CSRF防护
- 权限访问控制

## 📈 性能优化

- Redis缓存热点数据
- 数据库索引优化
- 静态资源CDN加速
- 图片懒加载
- 服务端渲染支持

## 📚 API文档

API文档使用Swagger生成，启动服务后访问:
- http://localhost:8080/api/v1/docs

## 🎨 管理后台

系统提供完整的管理后台，包含以下功能模块：
- 用户管理
- 作品管理
- 日程管理
- 团队管理
- 系统设置
- 数据统计

## 📦 部署说明

### 多环境支持
- 开发环境 (dev)
- 测试环境 (test)  
- 生产环境 (prod)

### 部署命令
```bash
# 部署到生产环境
./deploy.sh prod deploy

# 重启服务
./deploy.sh prod restart

# 停止服务
./deploy.sh prod stop

# 查看日志
./deploy.sh prod logs
```

详细部署说明请参考 [部署文档](deployment/README.md)。

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目。

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

本项目采用MIT许可证，详情请查看 [LICENSE](LICENSE) 文件。

## 📞 联系方式

如有问题，请提交Issue或通过以下方式联系：
- 邮箱: [your-email@example.com](mailto:your-email@example.com)
- 微信: [your-wechat]

---
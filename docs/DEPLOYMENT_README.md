# Wedding平台部署文档

本文档介绍如何使用腾讯云部署脚本进行Wedding平台的生产环境部署。

## 目录结构

```
deployment/
├── tencent-deploy.sh           # 腾讯云部署脚本
├── docker-compose-production.yml # 生产环境Docker Compose配置
├── .env.production             # 生产环境变量配置
├── nginx-prod.conf             # Nginx生产环境配置
└── README.md                   # 本文档
```

## 环境要求

### 本地环境
- Docker 和 Docker Compose
- sshpass (用于SSH密码认证)
- 网络连接到腾讯云服务器

### 服务器环境
- Ubuntu/CentOS Linux系统
- Docker 和 Docker Compose已安装
- SSH访问权限
- 足够的磁盘空间和内存

## 配置文件说明

### 1. 环境变量配置 (.env.production)

```bash
# 服务器配置
SERVER_IP=your-server-ip
SSH_USER=root
SSH_PASS=your-ssh-password

# Docker镜像配置
API_IMAGE_NAME=wedding-api
WEB_IMAGE_NAME=wedding-web
API_IMAGE_TAG=latest
WEB_IMAGE_TAG=latest

# 服务端口配置
API_PORT=3000
WEB_PORT=80
NGINX_PORT=80

# MinIO配置
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001

# 数据库配置
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=password123
MONGO_PORT=27017
```

### 2. Docker Compose配置 (docker-compose-production.yml)

生产环境的服务编排配置，包括：
- Web前端服务
- API后端服务
- MongoDB数据库
- MinIO对象存储
- Nginx反向代理

### 3. Nginx配置 (nginx-prod.conf)

生产环境的Nginx配置，包括：
- 反向代理设置
- 静态文件服务
- SSL配置（如需要）
- 负载均衡配置

## 部署脚本使用方法

### 基本用法

```bash
# 标准部署
./tencent-deploy.sh

# 显示帮助信息
./tencent-deploy.sh --help
```

### 命令行选项

| 选项 | 说明 |
|------|------|
| `-h, --help` | 显示帮助信息 |
| `-v, --verbose` | 详细输出模式 |
| `--skip-build` | 跳过镜像构建步骤 |
| `--skip-backup` | 跳过备份步骤 |
| `--force` | 强制部署（跳过确认） |
| `--rollback` | 回滚到最新备份 |
| `--health-check-only` | 仅执行健康检查 |
| `--dry-run` | 模拟运行（不执行实际部署） |

### 环境变量

| 环境变量 | 说明 |
|----------|------|
| `CI=true` | 启用CI/CD模式 |
| `SKIP_CONFIRMATION=true` | 跳过用户确认 |

### 使用示例

```bash
# 1. 标准部署（包含所有步骤）
./tencent-deploy.sh

# 2. 跳过构建步骤的部署（适用于镜像已存在的情况）
./tencent-deploy.sh --skip-build

# 3. 强制部署（跳过用户确认）
./tencent-deploy.sh --force

# 4. CI/CD环境中的部署
CI=true ./tencent-deploy.sh --force

# 5. 详细输出模式
./tencent-deploy.sh --verbose

# 6. 模拟运行（查看将要执行的步骤）
./tencent-deploy.sh --dry-run

# 7. 仅执行健康检查
./tencent-deploy.sh --health-check-only

# 8. 回滚部署
./tencent-deploy.sh --rollback
```

## 部署流程

### 标准部署流程

1. **依赖检查** - 检查必要的工具是否安装
2. **配置验证** - 验证环境变量和配置文件
3. **服务器连接** - 测试SSH连接
4. **环境准备** - 准备服务器环境
5. **备份现有部署** - 备份当前运行的服务
6. **构建镜像** - 构建Docker镜像
7. **传输镜像** - 将镜像传输到服务器
8. **传输配置文件** - 传输部署配置
9. **部署服务** - 启动新的服务
10. **健康检查** - 验证服务是否正常运行
11. **显示部署信息** - 显示部署结果和服务状态

### CI/CD集成

脚本支持CI/CD环境，可以通过以下方式集成：

```yaml
# GitHub Actions示例
- name: Deploy to Production
  run: |
    cd deployment
    CI=true ./tencent-deploy.sh --force
  env:
    SERVER_IP: ${{ secrets.SERVER_IP }}
    SSH_USER: ${{ secrets.SSH_USER }}
    SSH_PASS: ${{ secrets.SSH_PASS }}
```

## 错误处理和回滚

### 自动回滚

脚本包含自动回滚机制：
- 部署过程中如果发生错误，会自动触发回滚
- 回滚会恢复到最近的备份状态
- 回滚完成后会重启服务

### 手动回滚

```bash
# 手动执行回滚
./tencent-deploy.sh --rollback
```

### 健康检查

```bash
# 检查服务健康状态
./tencent-deploy.sh --health-check-only
```

## 监控和日志

### 日志位置

- 部署日志：控制台输出
- 服务日志：通过Docker Compose查看
- 系统日志：服务器系统日志

### 监控检查

脚本会检查以下服务状态：
- Web服务健康检查
- API服务健康检查
- 数据库连接状态
- 存储服务状态

## 故障排除

### 常见问题

1. **SSH连接失败**
   - 检查服务器IP和SSH凭据
   - 确认服务器SSH服务正在运行
   - 检查防火墙设置

2. **Docker镜像构建失败**
   - 检查Dockerfile语法
   - 确认依赖包可以正常下载
   - 检查网络连接

3. **服务启动失败**
   - 检查端口是否被占用
   - 查看Docker容器日志
   - 验证环境变量配置

4. **健康检查失败**
   - 检查服务是否正常启动
   - 验证网络连接
   - 查看应用程序日志

### 调试模式

```bash
# 启用详细输出进行调试
./tencent-deploy.sh --verbose

# 模拟运行查看执行步骤
./tencent-deploy.sh --dry-run
```

## 安全注意事项

1. **敏感信息保护**
   - 不要将密码提交到版本控制系统
   - 使用环境变量或密钥管理系统
   - 定期更换密码和密钥

2. **网络安全**
   - 配置防火墙规则
   - 使用SSH密钥认证（推荐）
   - 限制SSH访问IP

3. **数据安全**
   - 定期备份数据
   - 加密敏感数据
   - 监控异常访问

## 维护和更新

### 定期维护

1. 更新系统和Docker镜像
2. 清理旧的备份文件
3. 监控系统资源使用情况
4. 检查日志文件大小

### 版本更新

1. 测试新版本
2. 备份当前部署
3. 执行部署
4. 验证功能正常
5. 如有问题及时回滚

## 联系支持

如果在部署过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查系统日志和应用日志
3. 使用详细输出模式重新运行脚本
4. 联系技术支持团队

---

**注意：** 在生产环境中部署前，请务必在测试环境中验证所有配置和流程。
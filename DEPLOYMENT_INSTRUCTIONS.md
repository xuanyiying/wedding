# 婚礼应用部署说明

## 概述

`quick-deploy.sh` 脚本已经更新，现在包含了自动获取项目代码的功能。此脚本适用于在全新的腾讯云服务器上快速部署婚礼应用。

## 使用前准备

### 1. 更新 Git 仓库地址

在使用脚本之前，请修改 `quick-deploy.sh` 文件中的 Git 仓库地址：

```bash
# 在 clone_project() 函数中，将以下行：
git clone https://github.com/your-username/wedding-client.git "$PROJECT_DIR"

# 替换为您的实际仓库地址，例如：
git clone https://github.com/yourusername/wedding-client.git "$PROJECT_DIR"
# 或者
git clone https://gitee.com/yourusername/wedding-client.git "$PROJECT_DIR"
```

### 2. 确保仓库访问权限

- **公开仓库**：无需额外配置
- **私有仓库**：需要在服务器上配置 SSH 密钥或使用 HTTPS 认证

## 部署步骤

### 1. 上传脚本到服务器

```bash
# 将脚本上传到服务器
scp quick-deploy.sh root@your-server-ip:/root/
```

### 2. 登录服务器并执行脚本

```bash
# SSH 登录服务器
ssh root@your-server-ip

# 给脚本执行权限
chmod +x quick-deploy.sh

# 执行部署脚本
./quick-deploy.sh
```

## 脚本功能

脚本会自动执行以下操作：

1. ✅ 系统环境检测和更新
2. ✅ Docker 和 Docker Compose 安装
3. ✅ 防火墙端口配置
4. ✅ **从 Git 仓库克隆项目代码**
5. ✅ 创建环境配置文件
6. ✅ 构建和启动应用服务
7. ✅ 健康检查和状态验证

## 项目结构要求

脚本期望项目具有以下结构：

```
wedding-client/
├── docker-compose.yml
├── server/
│   ├── Dockerfile
│   └── ...
├── web/
│   ├── Dockerfile
│   └── ...
└── ...
```

## 故障排除

### 1. Git 克隆失败

如果 Git 克隆失败，脚本会提示手动上传项目文件：

```bash
# 手动上传项目文件到服务器
scp -r ./wedding-client root@your-server-ip:/root/wedding-master/

# 然后重新运行脚本
./quick-deploy.sh
```

### 2. Docker 构建失败

检查以下文件是否存在：
- `/root/wedding-master/docker-compose.yml`
- `/root/wedding-master/server/Dockerfile`
- `/root/wedding-master/web/Dockerfile`

### 3. 查看服务状态

```bash
# 切换到项目目录
cd /root/wedding-master

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f
```

## 访问应用

部署成功后，您可以通过以下地址访问应用：

- **Web 应用**: http://your-server-ip
- **API 服务**: http://your-server-ip:8000
- **MinIO 控制台**: http://your-server-ip:9001
  - 用户名: `rustfsadmin`
  - 密码: `rustfssecret123`

## 管理命令

```bash
# 切换到项目目录
cd /root/wedding-master

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 重新构建并启动
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 注意事项

1. 确保服务器有足够的内存（建议 2GB 以上）和磁盘空间（建议 10GB 以上）
2. 确保服务器可以访问 GitHub 或 Gitee
3. 如果使用私有仓库，请提前配置好访问权限
4. 脚本需要 root 权限执行
5. 首次部署可能需要较长时间，因为需要下载 Docker 镜像和安装依赖
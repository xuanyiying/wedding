# GitHub Secrets 配置指南

为了使自动化部署正常工作，需要在GitHub仓库中配置以下Secrets。

## 必需的Secrets

### 1. 生产服务器连接信息

```
PRODUCTION_HOST=150.158.20.143
PRODUCTION_USER=root
PRODUCTION_PORT=22
PRODUCTION_SSH_KEY=<私钥内容>
```

### 2. GitHub Container Registry (可选，使用GITHUB_TOKEN)

如果需要使用私有镜像仓库，GitHub Actions会自动使用`GITHUB_TOKEN`来推送镜像到GitHub Container Registry。

## 配置步骤

### 1. 在GitHub仓库中添加Secrets

1. 进入GitHub仓库页面
2. 点击 `Settings` 标签
3. 在左侧菜单中选择 `Secrets and variables` > `Actions`
4. 点击 `New repository secret`
5. 添加以下secrets：

#### PRODUCTION_HOST
- **Name**: `PRODUCTION_HOST`
- **Value**: `150.158.20.143`

#### PRODUCTION_USER
- **Name**: `PRODUCTION_USER`
- **Value**: `root` (或其他有权限的用户)

#### PRODUCTION_PORT
- **Name**: `PRODUCTION_PORT`
- **Value**: `22` (SSH端口，默认为22)

#### PRODUCTION_SSH_KEY
- **Name**: `PRODUCTION_SSH_KEY`
- **Value**: SSH私钥内容

### 2. 生成SSH密钥对

如果还没有SSH密钥对，可以按以下步骤生成：

```bash
# 在本地生成SSH密钥对
ssh-keygen -t rsa -b 4096 -C "github-actions@wedding-client"

# 将公钥添加到生产服务器的authorized_keys
ssh-copy-id -i ~/.ssh/id_rsa.pub root@150.158.20.143

# 或者手动添加
cat ~/.ssh/id_rsa.pub | ssh root@150.158.20.143 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

然后将私钥内容（`~/.ssh/id_rsa`）复制到GitHub Secrets中的`PRODUCTION_SSH_KEY`。

### 3. 验证SSH连接

在配置完成后，可以测试SSH连接：

```bash
ssh -i ~/.ssh/id_rsa root@150.158.20.143
```

## 生产服务器准备

### 1. 确保生产服务器已安装必要软件

```bash
# 安装Docker和Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 安装Git
sudo apt-get update
sudo apt-get install -y git curl
```

### 2. 克隆项目到生产服务器

```bash
# 在生产服务器上
cd /opt
git clone https://github.com/your-username/wedding-client.git wedding
cd wedding
```

### 3. 设置项目权限

```bash
# 确保部署脚本有执行权限
chmod +x deployment/deploy.sh

# 创建必要的目录
mkdir -p backups
mkdir -p logs
```

## 安全注意事项

1. **SSH密钥安全**：
   - 使用专门的部署密钥，不要使用个人SSH密钥
   - 定期轮换SSH密钥
   - 限制SSH密钥的权限

2. **服务器安全**：
   - 配置防火墙，只开放必要端口
   - 定期更新系统和软件
   - 使用非root用户进行部署（推荐）

3. **Secrets管理**：
   - 不要在代码中硬编码敏感信息
   - 定期检查和更新Secrets
   - 使用最小权限原则

## 故障排除

### 1. SSH连接失败

```bash
# 检查SSH连接
ssh -v root@150.158.20.143

# 检查SSH密钥格式
ssh-keygen -l -f ~/.ssh/id_rsa
```

### 2. Docker权限问题

```bash
# 将用户添加到docker组
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker
```

### 3. 部署失败

检查GitHub Actions日志，常见问题：
- SSH连接超时
- Docker镜像拉取失败
- 权限不足
- 端口冲突

## 测试部署

配置完成后，可以通过以下方式测试部署：

1. 推送代码到main分支
2. 查看GitHub Actions执行情况
3. 检查生产服务器状态
4. 访问应用验证功能

```bash
# 在生产服务器上检查服务状态
docker-compose -f deployment/docker-compose-tencent.yml ps

# 查看日志
docker-compose -f deployment/docker-compose-tencent.yml logs
```
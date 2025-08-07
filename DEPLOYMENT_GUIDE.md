# 婚礼应用部署指南

本指南提供两种部署方式，请根据您的服务器环境选择合适的部署脚本。

## 🚀 快速选择

### 已有Docker环境？使用快速部署

```bash
./cloud-deploy.sh
```

**适用场景：**
- ✅ 云服务器已安装Docker和Docker Compose
- ✅ 需要快速部署（3-5分钟）
- ✅ 生产环境部署

### 全新服务器？使用完整部署

```bash
./deploy.sh
```

**适用场景：**
- ✅ 全新的云服务器
- ✅ 需要安装Docker环境
- ✅ 首次部署（10-15分钟）

## 📋 部署脚本对比

| 特性 | cloud-deploy.sh | deploy.sh |
|------|----------------|----------|
| Docker安装 | ❌ 跳过 | ✅ 自动安装 |
| 系统配置 | ❌ 跳过 | ✅ 防火墙、交换文件等 |
| 网络检测 | ✅ 基础检测 | ✅ 完整检测 |
| IP配置 | ✅ 自动获取 | ✅ 自动获取 |
| 健康检查 | ✅ 详细检查 | ✅ 基础检查 |
| 错误处理 | ✅ 立即停止 | ✅ 继续尝试 |
| 日志记录 | ✅ 详细日志 | ✅ 基础日志 |
| 部署时间 | 3-5分钟 | 10-15分钟 |

## 先决条件

*   云服务器（腾讯云、阿里云等）
*   具有 sudo 权限的用户
*   服务器内存 ≥ 512MB（推荐1GB+）
*   磁盘空间 ≥ 2GB
*   网络能访问Docker Hub

## 🔧 使用步骤

### 1. 连接服务器

```bash
ssh root@your-server-ip
```

### 2. 克隆项目

```bash
git clone <your-repo-url>
cd wedding-client
```

### 3. 选择部署方式

**快速部署（推荐）：**
```bash
./cloud-deploy.sh
```

**完整部署：**
```bash
./deploy.sh
```

### 快速部署脚本特性

`cloud-deploy.sh` 脚本专为云服务器环境优化，具有以下特性：

- ✅ **快速部署**：跳过Docker安装，直接进行应用部署
- ✅ **智能检测**：自动获取公网IP并配置CORS
- ✅ **健康检查**：自动验证所有服务是否正常运行
- ✅ **详细日志**：完整的部署日志记录到 `/tmp/wedding-deploy.log`
- ✅ **错误处理**：遇到错误立即停止并提供故障排除建议
- ✅ **资源检查**：验证系统内存和磁盘空间是否充足

## 📱 访问应用

部署完成后，您可以通过以下地址访问：

- **Web应用**: `http://your-server-ip`
- **API服务**: `http://your-server-ip:3000`
- **MinIO控制台**: `http://your-server-ip:9001`

## 🛠️ 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs [服务名]

# 重启服务
docker-compose restart [服务名]

# 停止所有服务
docker-compose down

# 重新部署
./cloud-deploy.sh  # 或 ./deploy.sh
```

## 🔍 故障排除

### 快速部署失败？

1. **检查Docker状态**：
   ```bash
   docker --version
   docker-compose --version
   ```

2. **查看部署日志**：
   ```bash
   cat /tmp/wedding-deploy.log
   ```

3. **使用完整部署**：
   ```bash
   ./deploy.sh
   ```

### 完整部署失败？

1. **查看详细错误**：
   ```bash
   ./deploy.sh 2>&1 | tee deploy-error.log
   ```

2. **检查系统要求**：
   - 内存：≥ 512MB（推荐1GB+）
   - 磁盘：≥ 2GB可用空间
   - 网络：能访问Docker Hub

3. **手动安装Docker**：
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

## 📞 获取帮助

如果遇到问题，请：

1. 查看 [CLOUD_DEPLOYMENT.md](./CLOUD_DEPLOYMENT.md) 详细文档
2. 检查部署日志文件
3. 确认服务器配置满足要求
4. 联系技术支持

---

**提示**：首次部署建议使用 `cloud-deploy.sh`，如果失败再使用 `deploy.sh`。
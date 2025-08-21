# 婚礼应用独立部署脚本使用指南

## 概述

`standalone-deploy.sh` 是一个跨平台的独立部署脚本，可以在不依赖Docker的情况下，自动完成婚礼应用的完整部署。该脚本支持主流Linux发行版，包括Ubuntu、Debian、CentOS、RHEL和Fedora。

## 功能特性

### 🚀 自动化部署
- **系统依赖安装**: 自动检测操作系统并安装必要的系统包
- **服务组件安装**: 自动安装和配置MySQL、Redis、MinIO、Nginx
- **应用部署**: 自动部署前端和后端应用
- **服务配置**: 自动创建systemd服务并启动

### 🛡️ 安全与稳定
- **错误处理**: 完善的错误处理机制，遇到问题自动停止
- **日志记录**: 详细的操作日志，便于问题排查
- **健康检查**: 部署完成后自动检查所有服务状态
- **防火墙配置**: 自动配置防火墙规则

### 📊 监控与维护
- **日志轮转**: 自动配置日志轮转，防止日志文件过大
- **服务监控**: 使用systemd管理服务，支持自动重启
- **状态输出**: 清晰的进度提示和状态信息

## 系统要求

### 支持的操作系统
- Ubuntu 18.04+
- Debian 9+
- CentOS 7+
- RHEL 7+
- Fedora 30+

### 硬件要求
- **CPU**: 2核心以上
- **内存**: 4GB以上
- **存储**: 20GB以上可用空间
- **网络**: 稳定的互联网连接

### 权限要求
- 必须以root用户或使用sudo权限运行
- 需要访问互联网下载依赖包

## 使用方法

### 1. 准备工作

确保服务器满足系统要求，并且有稳定的网络连接：

```bash
# 检查系统版本
cat /etc/os-release

# 检查可用空间
df -h

# 检查内存
free -h

# 测试网络连接
ping -c 3 google.com
```

### 2. 下载项目代码

```bash
# 克隆项目到服务器
git clone <your-repository-url> /opt/wedding-client
cd /opt/wedding-client/deployment
```

### 3. 执行部署

```bash
# 给脚本添加执行权限
chmod +x standalone-deploy.sh

# 以root权限运行部署脚本
sudo ./standalone-deploy.sh
```

### 4. 监控部署过程

部署过程中，脚本会显示详细的进度信息：

```
[INFO] 开始婚礼应用独立部署...
[INFO] 检测到操作系统: ubuntu 20.04
[INFO] 创建必要的目录结构...
[SUCCESS] 目录结构创建完成
[INFO] 安装系统依赖包...
[SUCCESS] 系统依赖安装完成
...
```

## 服务配置

### 默认端口配置
- **前端应用**: 80 (HTTP)
- **后端API**: 3000
- **MySQL**: 3306
- **Redis**: 6379
- **MinIO**: 9000 (API), 9001 (控制台)

### 默认账户信息

**MySQL数据库**:
- Root密码: `wedding_root_2024`
- 数据库名: `wedding_db`
- 应用用户: `wedding_user`
- 应用密码: `wedding_pass_2024`

**Redis**:
- 密码: `redis_pass_2024`

**MinIO**:
- 用户名: `minioadmin`
- 密码: `minioadmin123`

> ⚠️ **安全提示**: 生产环境中请务必修改这些默认密码！

## 部署后操作

### 1. 验证部署

部署完成后，脚本会自动进行健康检查并显示服务信息：

```
===========================================
        婚礼应用部署完成
===========================================
前端访问地址: http://192.168.1.100
API服务地址: http://192.168.1.100:3000
MinIO控制台: http://192.168.1.100:9001
数据库信息:
  - 主机: localhost:3306
  - 数据库: wedding_db
  - 用户: wedding_user
Redis信息:
  - 主机: localhost:6379
日志目录: /opt/wedding-client/deployment/logs
===========================================
```

### 2. 检查服务状态

```bash
# 检查所有服务状态
sudo systemctl status mysql redis nginx minio wedding-api

# 检查特定服务
sudo systemctl status wedding-api

# 查看服务日志
sudo journalctl -u wedding-api -f
```

### 3. 访问应用

- 打开浏览器访问服务器IP地址即可使用应用
- 访问 `http://服务器IP:9001` 可以管理MinIO存储

## 故障排除

### 常见问题

**1. 权限不足错误**
```bash
# 确保使用sudo运行
sudo ./standalone-deploy.sh
```

**2. 网络连接问题**
```bash
# 检查DNS设置
nslookup google.com

# 检查防火墙设置
sudo ufw status
```

**3. 服务启动失败**
```bash
# 查看具体服务的错误日志
sudo journalctl -u wedding-api --no-pager
sudo journalctl -u mysql --no-pager
```

**4. 端口冲突**
```bash
# 检查端口占用情况
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3000
```

### 日志文件位置

- **部署日志**: `/opt/wedding-client/deployment/logs/standalone-deploy-YYYYMMDD-HHMMSS.log`
- **应用日志**: `/var/log/wedding/`
- **系统服务日志**: 使用 `journalctl` 查看

### 重新部署

如果需要重新部署，可以先停止所有服务：

```bash
# 停止应用服务
sudo systemctl stop wedding-api nginx minio redis mysql

# 清理数据（可选，会删除所有数据）
sudo rm -rf /opt/wedding-client/deployment/data/*

# 重新运行部署脚本
sudo ./standalone-deploy.sh
```

## 维护操作

### 更新应用

```bash
# 拉取最新代码
cd /opt/wedding-client
git pull origin main

# 重新构建和部署前端
cd web
npm install
npm run build
sudo cp -r dist/* /opt/wedding-client/deployment/data/web/

# 重新构建和重启后端
cd ../server
npm install
npm run build
sudo systemctl restart wedding-api
```

### 备份数据

```bash
# 备份MySQL数据库
sudo mysqldump -u root -p wedding_db > wedding_db_backup_$(date +%Y%m%d).sql

# 备份MinIO数据
sudo tar -czf minio_backup_$(date +%Y%m%d).tar.gz /opt/wedding-client/deployment/data/minio/

# 备份Redis数据
sudo cp /opt/wedding-client/deployment/data/redis/dump.rdb redis_backup_$(date +%Y%m%d).rdb
```

### 监控服务

```bash
# 查看系统资源使用情况
top
htop
df -h
free -h

# 查看服务状态
sudo systemctl list-units --type=service --state=running | grep wedding
```

## 安全建议

1. **修改默认密码**: 部署完成后立即修改所有默认密码
2. **配置SSL**: 为生产环境配置HTTPS证书
3. **定期更新**: 定期更新系统包和应用代码
4. **备份策略**: 建立定期备份策略
5. **监控告警**: 配置服务监控和告警机制
6. **访问控制**: 配置适当的防火墙规则和访问控制

## 技术支持

如果在部署过程中遇到问题，请：

1. 查看部署日志文件
2. 检查系统服务状态
3. 确认网络连接正常
4. 验证系统要求是否满足

更多技术支持，请参考项目文档或联系开发团队。
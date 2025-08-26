# Wedding Client 部署指南

## 🚀 快速开始

### 一键部署
```bash
# 完整部署（推荐）
./deploy.sh deploy

# 快速部署
./deploy.sh quick
```

### 基本操作
```bash
# 启动服务
./deploy.sh start

# 停止服务  
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 查看状态
./deploy.sh status
```

## 🔧 问题解决

### 修复常见问题
```bash
# 自动修复
./deploy.sh fix

# 修复网络冲突
./deploy.sh fix-network

# 系统诊断
./deploy.sh diagnose
```

### 查看日志
```bash
# 查看所有日志
./deploy.sh logs

# 查看特定服务日志
./deploy.sh logs nginx
./deploy.sh logs api
./deploy.sh logs mysql
```

## 🛠️ 维护操作

### 清理资源
```bash
# 清理Docker资源
./deploy.sh clean

# 测试配置
./deploy.sh test
```

## 📋 命令参考

| 命令 | 说明 | 示例 |
|------|------|------|
| `deploy` | 完整部署 | `./deploy.sh deploy` |
| `quick` | 快速部署 | `./deploy.sh quick` |
| `start` | 启动服务 | `./deploy.sh start` |
| `stop` | 停止服务 | `./deploy.sh stop` |
| `restart` | 重启服务 | `./deploy.sh restart` |
| `status` | 查看状态 | `./deploy.sh status` |
| `fix` | 自动修复 | `./deploy.sh fix` |
| `diagnose` | 问题诊断 | `./deploy.sh diagnose` |
| `logs` | 查看日志 | `./deploy.sh logs [服务名]` |
| `clean` | 清理资源 | `./deploy.sh clean` |

## 🌐 访问地址

部署完成后：
- **前端应用**: http://服务器IP
- **API服务**: http://服务器IP:3000  
- **MinIO控制台**: http://服务器IP:9001

## ⚠️ 常见问题

### 网络冲突
```bash
./deploy.sh fix-network
```

### 服务启动失败
```bash
./deploy.sh diagnose
./deploy.sh fix
```

### 容器无法访问
```bash
./deploy.sh clean
./deploy.sh deploy
```

## 📁 项目结构

```
wedding-client/
├── deploy.sh                    # 统一部署管理脚本
├── one-click-deploy.sh         # 原始一键部署脚本
├── deployment/
│   ├── docker-compose.prod.yml     # 生产环境配置
│   ├── docker-compose.tencent.yml  # 腾讯云环境配置  
│   ├── .env.production             # 生产环境变量
│   └── .env.tencent                # 腾讯云环境变量
└── scripts/
    ├── backup-restore.sh           # 备份恢复
    ├── database-management.sh      # 数据库管理
    ├── deploy-production.sh        # 生产环境部署
    ├── deploy-tencent.sh          # 腾讯云部署
    └── health-check.sh            # 健康检查
```

---

💡 **推荐使用 `./deploy.sh` 进行所有部署操作，这是最简单高效的方式！**
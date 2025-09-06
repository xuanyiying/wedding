# Wedding Client 项目文档索引

## 📚 文档分类

### 🚀 部署与运维
- **[部署说明](DEPLOYMENT_README.md)** - 项目部署指南
- **[Docker网络指南](DOCKER_NETWORK_GUIDE.md)** - Docker网络配置与故障排除
- **[SMTP配置指南](SMTP_SETUP.md)** - 邮件服务配置说明
- **[GitHub密钥配置](github-secrets-setup.md)** - GitHub Actions 密钥设置

### 🏗️ 系统架构
- **[完整架构设计](complete-architecture-design.md)** - 系统整体架构说明
- **[数据库设计](database-design.md)** - 数据库表结构与关系
- **[数据库优化方案](database-optimization-alternatives.md)** - 数据库性能优化建议

### 🔧 技术方案
- **[直接上传解决方案](DIRECT_UPLOAD_SOLUTION.md)** - 文件直接上传技术方案
- **[视频帧提取分析](video-frame-extraction-analysis.md)** - 视频处理技术分析
- **[视频上传优化方案](视频上传优化方案.md)** - 视频上传性能优化

### 👥 用户与权限
- **[认证指南](AUTH_GUIDE.md)** - 用户认证机制说明
- **[权限指南](PERMISSION_GUIDE.md)** - 权限系统设计与使用

### 📋 项目管理
- **[需求分析](requirements-analysis.md)** - 项目功能需求分析
- **[开发提示词](claude-development-prompt.md)** - AI辅助开发的完整提示词

## 🗂️ 文档使用指南

### 新手入门
1. 先阅读 **[完整架构设计](complete-architecture-design.md)** 了解项目整体结构
2. 查看 **[部署说明](DEPLOYMENT_README.md)** 了解如何部署项目
3. 参考 **[认证指南](AUTH_GUIDE.md)** 和 **[权限指南](PERMISSION_GUIDE.md)** 了解系统权限

### 开发人员
1. **架构理解**: [完整架构设计](complete-architecture-design.md)
2. **数据库**: [数据库设计](database-design.md) + [数据库优化方案](database-optimization-alternatives.md)
3. **文件上传**: [直接上传解决方案](DIRECT_UPLOAD_SOLUTION.md)
4. **权限系统**: [权限指南](PERMISSION_GUIDE.md)

### 运维人员
1. **部署指南**: [部署说明](DEPLOYMENT_README.md)
2. **网络配置**: [Docker网络指南](DOCKER_NETWORK_GUIDE.md)
3. **邮件配置**: [SMTP配置指南](SMTP_SETUP.md)
4. **CI/CD配置**: [GitHub密钥配置](github-secrets-setup.md)

### 产品经理
1. **需求文档**: [需求分析](requirements-analysis.md)
2. **架构概览**: [完整架构设计](complete-architecture-design.md)
3. **技术方案**: [直接上传解决方案](DIRECT_UPLOAD_SOLUTION.md)

## 📝 文档维护

### 文档更新规则
- ✅ **保持更新**: 文档应与代码实现保持同步
- 📝 **版本控制**: 重要变更需要记录版本和更新时间
- 🔍 **定期审查**: 每月检查文档的准确性和完整性
- 🗑️ **及时清理**: 删除过时或冗余的文档

### 文档贡献
- 新增功能时，需要同步更新相关文档
- 发现文档错误或不清晰时，及时修正
- 建议采用 Markdown 格式，保持风格统一

## 🚀 快速导航

| 需求 | 推荐文档 |
|------|----------|
| 🔧 **快速部署** | [部署说明](DEPLOYMENT_README.md) |
| 🏗️ **理解架构** | [完整架构设计](complete-architecture-design.md) |
| 🗄️ **数据库相关** | [数据库设计](database-design.md) |
| 👤 **用户权限** | [权限指南](PERMISSION_GUIDE.md) |
| 📁 **文件上传** | [直接上传解决方案](DIRECT_UPLOAD_SOLUTION.md) |
| 🐛 **网络问题** | [Docker网络指南](DOCKER_NETWORK_GUIDE.md) |
| 📧 **邮件配置** | [SMTP配置指南](SMTP_SETUP.md) |

---

*最后更新: 2025-09-06*  
*文档总数: 14个核心文档*  
*维护状态: ✅ 活跃维护*

## 📋 脚本使用指南

### 主要脚本位置
- **主部署脚本**: `./deploy.sh` (项目根目录)
- **工具脚本集合**: `./deployment/scripts/` 目录

### 常用脚本命令
```bash
# 主要部署操作
./deploy.sh deploy          # 完整部署
./deploy.sh start           # 启动服务
./deploy.sh stop            # 停止服务
./deploy.sh status          # 查看状态
./deploy.sh diagnose        # nginx诊断

# 专项工具脚本
./deployment/scripts/database-management.sh init     # 数据库初始化
./deployment/scripts/check-db-init.sh               # 数据库状态检查
./deployment/scripts/health-check.sh                # 系统健康检查
./deployment/scripts/setup.sh                       # 环境初始化
```

### 脚本功能说明
| 脚本名称 | 功能描述 | 使用场景 |
|----------|----------|----------|
| `deploy.sh` | 主部署脚本 | 完整部署、服务管理、问题诊断 |
| `database-management.sh` | 数据库管理 | 备份、恢复、初始化数据库 |
| `check-db-init.sh` | 数据库状态检查 | 验证数据库初始化状态 |
| `health-check.sh` | 系统健康检查 | 监控系统运行状态 |
| `nginx-entrypoint.sh` | Nginx启动脚本 | Docker容器启动时使用 |
| `setup.sh` | 环境初始化 | 新环境搭建和配置 |
# 部署监控和通知设置指南

本文档介绍如何设置Wedding Client项目的自动化部署监控和通知系统。

## 1. Slack通知设置

### 1.1 创建Slack Webhook

1. 登录到你的Slack工作区
2. 访问 https://api.slack.com/apps
3. 点击 "Create New App" -> "From scratch"
4. 输入应用名称（如 "Wedding Deployment Bot"）和选择工作区
5. 在左侧菜单选择 "Incoming Webhooks"
6. 开启 "Activate Incoming Webhooks"
7. 点击 "Add New Webhook to Workspace"
8. 选择要发送通知的频道（建议创建 #deployments 和 #monitoring 频道）
9. 复制生成的Webhook URL

### 1.2 配置GitHub Secrets

在GitHub仓库中添加以下Secrets：

```bash
# 在GitHub仓库页面，进入 Settings -> Secrets and variables -> Actions
# 添加以下Secret：
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## 2. 健康检查监控设置

### 2.1 在生产服务器上设置定时任务

```bash
# 1. 登录到生产服务器
ssh user@114.132.225.94

# 2. 进入项目目录
cd /path/to/wedding-client

# 3. 设置环境变量（在 ~/.bashrc 或 ~/.profile 中添加）
echo 'export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"' >> ~/.bashrc
source ~/.bashrc

# 4. 创建日志目录
sudo mkdir -p /var/log/wedding-monitoring
sudo chown $USER:$USER /var/log/wedding-monitoring

# 5. 设置crontab任务
crontab -e
```

在crontab中添加以下内容：

```bash
# Wedding Client 监控任务
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PATH=/usr/local/bin:/usr/bin:/bin
SHELL=/bin/bash

# 每5分钟执行一次健康检查
*/5 * * * * cd /path/to/wedding-client && ./deployment/health-check.sh >> /var/log/wedding-monitoring/health-check.log 2>&1

# 每小时执行一次系统资源检查
0 * * * * cd /path/to/wedding-client && ./deployment/health-check.sh --system-only >> /var/log/wedding-monitoring/system-check.log 2>&1

# 每天凌晨2点清理旧的Docker镜像
0 2 * * * docker image prune -f

# 每周日凌晨3点清理Docker系统缓存
0 3 * * 0 docker system prune -f
```

### 2.2 手动测试健康检查

```bash
# 测试完整健康检查
./deployment/health-check.sh

# 测试特定组件
./deployment/health-check.sh --frontend-only
./deployment/health-check.sh --backend-only
./deployment/health-check.sh --docker-only
./deployment/health-check.sh --system-only
```

## 3. 日志管理

### 3.1 设置日志轮转

创建logrotate配置：

```bash
sudo nano /etc/logrotate.d/wedding-monitoring
```

添加以下内容：

```
/var/log/wedding-monitoring/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

### 3.2 查看日志

```bash
# 查看健康检查日志
tail -f /var/log/wedding-monitoring/health-check.log

# 查看系统检查日志
tail -f /var/log/wedding-monitoring/system-check.log

# 查看最近的错误
grep -i error /var/log/wedding-monitoring/*.log | tail -20
```

## 4. 监控指标说明

### 4.1 健康检查项目

- **前端服务**: 检查主页是否可访问 (http://114.132.225.94)
- **后端API**: 检查健康检查端点 (http://114.132.225.94/api/v1/health)
- **Docker容器**: 检查所有容器是否正常运行
- **磁盘空间**: 监控磁盘使用率（阈值：85%）
- **内存使用**: 监控内存使用率（阈值：90%）

### 4.2 告警级别

- **Critical**: 服务完全不可用
- **Warning**: 性能问题或资源使用率过高
- **Info**: 正常状态信息

## 5. 故障排查

### 5.1 常见问题

1. **健康检查失败**
   ```bash
   # 检查容器状态
   docker ps -a
   
   # 检查容器日志
   docker logs wedding-client-web
   docker logs wedding-client-server
   docker logs wedding-client-nginx
   
   # 重启服务
   cd /path/to/wedding-client
   docker-compose -f deployment/docker-compose-tencent.yml restart
   ```

2. **Slack通知不工作**
   ```bash
   # 测试Webhook URL
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test notification"}' \
     $SLACK_WEBHOOK_URL
   
   # 检查环境变量
   echo $SLACK_WEBHOOK_URL
   ```

3. **磁盘空间不足**
   ```bash
   # 清理Docker资源
   docker system prune -a -f
   
   # 清理旧的镜像
   docker images | grep '<none>' | awk '{print $3}' | xargs docker rmi
   
   # 检查大文件
   du -sh /* | sort -hr | head -10
   ```

### 5.2 紧急恢复

如果服务完全不可用：

```bash
# 1. 快速重启所有服务
cd /path/to/wedding-client
docker-compose -f deployment/docker-compose-tencent.yml down
docker-compose -f deployment/docker-compose-tencent.yml up -d

# 2. 如果还是不行，回滚到上一个版本
./deployment/deploy.sh rollback

# 3. 检查系统资源
free -h
df -h
top
```

## 6. 性能优化建议

1. **监控频率调整**: 根据实际需要调整健康检查频率
2. **告警去重**: 避免短时间内重复发送相同告警
3. **日志管理**: 定期清理旧日志，避免磁盘空间不足
4. **资源监控**: 根据实际使用情况调整告警阈值

## 7. 扩展功能

### 7.1 添加更多监控指标

- API响应时间监控
- 数据库连接监控
- 第三方服务依赖监控
- 用户访问量统计

### 7.2 集成其他通知渠道

- 邮件通知
- 短信告警
- 企业微信/钉钉通知
- PagerDuty集成

### 7.3 可视化监控

- Grafana仪表板
- Prometheus指标收集
- ELK日志分析
- 自定义监控面板
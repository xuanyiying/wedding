# SMTP 邮件服务配置说明

## 问题描述

服务器启动失败，错误信息：
```
Error: Environment variable SMTP_USER is required
```

## 解决方案

已修复配置文件中缺失的 SMTP 环境变量，但需要配置真实的邮件服务凭据。

## 配置步骤

### 1. 更新 .env.production 文件

编辑 `/Users/yiying/dev-app/wedding-client/deployment/.env.production` 文件中的邮件配置：

```bash
# 邮件服务配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-email@gmail.com    # 替换为真实邮箱
SMTP_PASS=your-actual-app-password       # 替换为真实应用密码
SMTP_FROM=Wedding Club <noreply@wedding.com>
```

### 2. Gmail 应用密码设置

如果使用 Gmail，需要：

1. 启用两步验证
2. 生成应用专用密码：
   - 访问 Google 账户设置
   - 安全性 → 两步验证 → 应用专用密码
   - 选择"邮件"和设备，生成密码
   - 将生成的密码填入 `SMTP_PASS`

### 3. 其他邮件服务商配置

#### 腾讯企业邮箱
```bash
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### 阿里云邮件推送
```bash
SMTP_HOST=smtpdm.aliyun.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### 网易邮箱
```bash
SMTP_HOST=smtp.163.com
SMTP_PORT=587
SMTP_SECURE=false
```

### 4. 重新部署服务

配置完成后，重新部署服务：

```bash
cd /Users/yiying/dev-app/wedding-client/deployment
./tencent-deploy.sh
```

## 修复内容

1. ✅ 更新了 `.env.production` 文件，添加了完整的 SMTP 配置
2. ✅ 更新了 `docker-compose-production.yml` 文件，在 api 服务中添加了 SMTP 环境变量
3. ✅ 确保了生产环境必需的环境变量能够正确传递给容器

## 注意事项

- 请使用真实的邮件服务凭据替换占位符值
- 确保邮件服务商允许 SMTP 访问
- 建议使用应用专用密码而不是账户密码
- 配置完成后需要重新部署服务才能生效

## 验证配置

部署完成后，可以通过以下方式验证邮件配置：

1. 检查容器日志：
   ```bash
   docker logs wedding_api_prod
   ```

2. 测试邮件发送功能（如果应用提供相关接口）

3. 确认服务正常启动，没有 SMTP_USER 相关错误
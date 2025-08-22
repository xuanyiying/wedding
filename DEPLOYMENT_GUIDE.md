# Wedding Client 部署指南

本文档提供了 Wedding Client 项目的详细部署指南，包括脚本使用说明、执行顺序和一键部署方案。

## 目录结构

```
wedding-client/
├── scripts/                    # 管理脚本目录
├── deployment/                 # 部署配置目录
├── docker/                     # Docker配置目录
├── server/                     # 后端服务目录
└── web/                        # 前端应用目录
```

## 脚本功能说明

### 1. Scripts 目录脚本 (`/scripts/`)

#### 1.1 核心部署脚本

**deploy-production.sh** - 生产环境部署脚本
- **功能**: 完整的生产环境部署流程
- **参数**:
  - `--env`: 部署环境 (production/staging)
  - `--force`: 强制部署
  - `--skip-health-check`: 跳过健康检查
  - `--backup`: 部署前备份
- **执行顺序**: 1
- **依赖**: Docker, Docker Compose

```bash
# 基本部署
./scripts/deploy-production.sh --env production

# 强制部署（跳过检查）
./scripts/deploy-production.sh --env production --force

# 部署并跳过健康检查
./scripts/deploy-production.sh --env production --skip-health-check
```

**container-management.sh** - 容器管理脚本
- **功能**: Docker容器的创建、启动、停止、监控
- **参数**:
  - `start [service]`: 启动服务
  - `stop [service]`: 停止服务
  - `restart [service]`: 重启服务
  - `build [service]`: 构建镜像
  - `pull [service]`: 拉取镜像
  - `clean`: 清理容器和镜像
  - `logs [service]`: 查看日志
  - `status`: 查看状态
- **执行顺序**: 2

```bash
# 启动所有服务
./scripts/container-management.sh start

# 启动特定服务
./scripts/container-management.sh start web

# 构建镜像
./scripts/container-management.sh build

# 查看服务状态
./scripts/container-management.sh status
```

#### 1.2 系统管理脚本

**setup-environment.sh** - 环境初始化脚本
- **功能**: 初始化部署环境，安装依赖
- **参数**:
  - `--install-docker`: 安装Docker
  - `--install-compose`: 安装Docker Compose
  - `--setup-ssl`: 配置SSL证书
- **执行顺序**: 0 (首次部署前)

**database-management.sh** - 数据库管理脚本
- **功能**: 数据库初始化、备份、恢复、迁移
- **参数**:
  - `init`: 初始化数据库
  - `backup`: 备份数据库
  - `restore <backup_file>`: 恢复数据库
  - `migrate`: 执行数据库迁移

**backup-restore.sh** - 备份恢复脚本
- **功能**: 系统数据备份和恢复
- **参数**:
  - `backup`: 创建备份
  - `restore <backup_id>`: 恢复备份
  - `list`: 列出备份
  - `clean`: 清理旧备份

#### 1.3 监控和维护脚本

**health-check.sh** - 健康检查脚本
- **功能**: 检查系统各组件健康状态
- **参数**:
  - `--all`: 检查所有组件
  - `--web`: 检查Web服务
  - `--api`: 检查API服务
  - `--db`: 检查数据库

**monitoring.sh** - 系统监控脚本
- **功能**: 系统性能监控和告警
- **参数**:
  - `start`: 启动监控
  - `stop`: 停止监控
  - `status`: 监控状态
  - `alert`: 发送告警

**log-management.sh** - 日志管理脚本
- **功能**: 日志收集、轮转、清理
- **参数**:
  - `collect`: 收集日志
  - `rotate`: 轮转日志
  - `clean`: 清理旧日志
  - `analyze`: 分析日志

#### 1.4 API和测试脚本

**api-docs.sh** - API文档生成脚本
- **功能**: 生成API文档、OpenAPI规范、Postman集合
- **参数**:
  - `generate`: 生成所有文档
  - `openapi`: 生成OpenAPI规范
  - `swagger`: 生成Swagger文档
  - `postman`: 生成Postman集合
  - `serve`: 启动文档服务器

```bash
# 生成所有API文档
./scripts/api-docs.sh generate

# 生成并启动文档服务器
./scripts/api-docs.sh generate && ./scripts/api-docs.sh serve
```

**test-automation.sh** - 自动化测试脚本
- **功能**: 执行自动化测试套件
- **参数**:
  - `unit`: 单元测试
  - `integration`: 集成测试
  - `e2e`: 端到端测试
  - `performance`: 性能测试

### 2. Deployment 目录配置 (`/deployment/`)

#### 2.1 部署脚本

**start-production.sh** - 生产环境启动脚本
- **功能**: 启动生产环境服务
- **参数**:
  - `--force-rebuild`: 强制重新构建镜像
  - `--logs`: 启动后显示日志
  - `--no-pull`: 不拉取最新镜像
- **执行顺序**: 3

```bash
# 启动生产环境
./deployment/start-production.sh

# 强制重新构建并启动
./deployment/start-production.sh --force-rebuild

# 启动并显示日志
./deployment/start-production.sh --logs
```

**stop-production.sh** - 生产环境停止脚本
- **功能**: 安全停止生产环境服务
- **参数**:
  - `--force`: 强制停止
  - `--cleanup`: 停止后清理资源

**tencent-deploy.sh** - 腾讯云部署脚本
- **功能**: 腾讯云服务器自动化部署
- **参数**:
  - `deploy`: 部署应用
  - `rollback`: 回滚到上一版本
  - `status`: 查看部署状态
  - `logs`: 查看部署日志

#### 2.2 配置文件

- **.env.production** - 生产环境变量配置
- **.env.dev** - 开发环境变量配置
- **docker-compose.prod.yml** - 生产环境Docker Compose配置
- **nginx/nginx.prod.conf** - 生产环境Nginx配置

### 3. Docker 目录配置 (`/docker/`)

- **mysql/my.cnf** - MySQL配置文件
- **redis/redis.conf** - Redis配置文件

## 部署执行顺序

### 首次部署流程

1. **环境准备** (执行一次)
   ```bash
   ./scripts/setup-environment.sh --install-docker --install-compose
   ```

2. **数据库初始化**
   ```bash
   ./scripts/database-management.sh init
   ```

3. **配置环境变量**
   ```bash
   cp deployment/.env.production.example deployment/.env.production
   # 编辑 .env.production 文件，配置实际参数
   ```

4. **构建和部署**
   ```bash
   ./scripts/deploy-production.sh --env production --backup
   ```

5. **启动服务**
   ```bash
   ./deployment/start-production.sh
   ```

6. **健康检查**
   ```bash
   ./scripts/health-check.sh --all
   ```

### 日常部署流程

1. **备份当前版本**
   ```bash
   ./scripts/backup-restore.sh backup
   ```

2. **部署新版本**
   ```bash
   ./scripts/deploy-production.sh --env production
   ```

3. **验证部署**
   ```bash
   ./scripts/health-check.sh --all
   ./scripts/test-automation.sh integration
   ```

## 环境变量配置

### 必需的环境变量

```bash
# 应用配置
APP_ENV=production
APP_PORT=3000
APP_HOST=0.0.0.0

# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=wedding_club
DB_USER=wedding_user
DB_PASSWORD=your_secure_password

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# 文件上传配置
UPLOAD_MAX_SIZE=10MB
UPLOAD_PATH=/app/uploads

# 邮件配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password

# 监控配置
MONITORING_ENABLED=true
LOG_LEVEL=info
```

## 一键部署方案

### 创建一键部署脚本

创建 `one-click-deploy.sh` 脚本，实现完全自动化部署：

```bash
#!/bin/bash

# Wedding Client 一键部署脚本
# 使用方法: ./one-click-deploy.sh [environment] [options]

set -euo pipefail

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
ENVIRONMENT="${1:-production}"
FORCE_DEPLOY="${FORCE_DEPLOY:-false}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
AUTO_ROLLBACK="${AUTO_ROLLBACK:-true}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 错误处理
error_exit() {
    log_error "$1"
    if [[ "$AUTO_ROLLBACK" == "true" && -f "$PROJECT_ROOT/.last_backup" ]]; then
        log_warning "尝试自动回滚..."
        ./scripts/backup-restore.sh restore "$(cat "$PROJECT_ROOT/.last_backup")"
    fi
    exit 1
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    command -v docker >/dev/null 2>&1 || error_exit "Docker 未安装"
    command -v docker-compose >/dev/null 2>&1 || command -v docker >/dev/null 2>&1 || error_exit "Docker Compose 未安装"
    
    # 检查Docker服务状态
    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker 服务未运行"
    fi
    
    log_success "依赖检查完成"
}

# 环境检查
check_environment() {
    log_info "检查部署环境..."
    
    # 检查环境配置文件
    local env_file="$PROJECT_ROOT/deployment/.env.$ENVIRONMENT"
    if [[ ! -f "$env_file" ]]; then
        error_exit "环境配置文件不存在: $env_file"
    fi
    
    # 检查Docker Compose文件
    local compose_file="$PROJECT_ROOT/deployment/docker-compose.$ENVIRONMENT.yml"
    if [[ ! -f "$compose_file" ]]; then
        compose_file="$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml"
        if [[ ! -f "$compose_file" ]]; then
            error_exit "Docker Compose配置文件不存在"
        fi
    fi
    
    log_success "环境检查完成"
}

# 预部署检查
pre_deploy_checks() {
    log_info "执行预部署检查..."
    
    # 检查端口占用
    local ports=("80" "443" "3000" "8080" "3306" "6379")
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_warning "端口 $port 已被占用"
        fi
    done
    
    # 检查磁盘空间
    local available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 2097152 ]]; then  # 2GB
        log_warning "磁盘空间不足，建议至少保留2GB空间"
    fi
    
    # 检查内存
    local available_memory=$(free -m | awk 'NR==2{print $7}')
    if [[ $available_memory -lt 1024 ]]; then  # 1GB
        log_warning "可用内存不足，建议至少1GB可用内存"
    fi
    
    log_success "预部署检查完成"
}

# 备份当前版本
backup_current_version() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        log_warning "跳过备份步骤"
        return 0
    fi
    
    log_info "备份当前版本..."
    
    if [[ -x "$PROJECT_ROOT/scripts/backup-restore.sh" ]]; then
        "$PROJECT_ROOT/scripts/backup-restore.sh" backup || error_exit "备份失败"
    else
        log_warning "备份脚本不存在，跳过备份"
    fi
    
    log_success "备份完成"
}

# 部署应用
deploy_application() {
    log_info "开始部署应用..."
    
    # 执行部署脚本
    local deploy_script="$PROJECT_ROOT/scripts/deploy-production.sh"
    if [[ -x "$deploy_script" ]]; then
        local deploy_args=("--env" "$ENVIRONMENT")
        
        if [[ "$FORCE_DEPLOY" == "true" ]]; then
            deploy_args+=("--force")
        fi
        
        "$deploy_script" "${deploy_args[@]}" || error_exit "应用部署失败"
    else
        error_exit "部署脚本不存在: $deploy_script"
    fi
    
    log_success "应用部署完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    local start_script="$PROJECT_ROOT/deployment/start-production.sh"
    if [[ -x "$start_script" ]]; then
        "$start_script" || error_exit "服务启动失败"
    else
        # 备用启动方法
        local compose_file="$PROJECT_ROOT/deployment/docker-compose.$ENVIRONMENT.yml"
        if [[ -f "$compose_file" ]]; then
            docker-compose -f "$compose_file" up -d || error_exit "服务启动失败"
        else
            error_exit "无法找到服务启动配置"
        fi
    fi
    
    log_success "服务启动完成"
}

# 健康检查
health_checks() {
    log_info "执行健康检查..."
    
    local health_script="$PROJECT_ROOT/scripts/health-check.sh"
    if [[ -x "$health_script" ]]; then
        "$health_script" --all || error_exit "健康检查失败"
    else
        # 基本健康检查
        log_info "执行基本健康检查..."
        
        local max_attempts=10
        local attempt=1
        
        while [[ $attempt -le $max_attempts ]]; do
            log_info "健康检查尝试 $attempt/$max_attempts"
            
            # 检查Web服务
            if curl -f -m 10 http://localhost:8080/health >/dev/null 2>&1; then
                log_success "Web服务健康检查通过"
                break
            fi
            
            # 检查API服务
            if curl -f -m 10 http://localhost:3000/api/v1/health >/dev/null 2>&1; then
                log_success "API服务健康检查通过"
                break
            fi
            
            if [[ $attempt -eq $max_attempts ]]; then
                error_exit "健康检查失败，服务可能未正常启动"
            fi
            
            sleep 30
            ((attempt++))
        done
    fi
    
    log_success "健康检查完成"
}

# 运行测试
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "跳过测试步骤"
        return 0
    fi
    
    log_info "运行集成测试..."
    
    local test_script="$PROJECT_ROOT/scripts/test-automation.sh"
    if [[ -x "$test_script" ]]; then
        "$test_script" integration || log_warning "集成测试失败，但继续部署"
    else
        log_warning "测试脚本不存在，跳过测试"
    fi
    
    log_success "测试完成"
}

# 生成API文档
generate_docs() {
    log_info "生成API文档..."
    
    local docs_script="$PROJECT_ROOT/scripts/api-docs.sh"
    if [[ -x "$docs_script" ]]; then
        "$docs_script" generate || log_warning "API文档生成失败"
    else
        log_warning "API文档脚本不存在，跳过文档生成"
    fi
    
    log_success "API文档生成完成"
}

# 部署后清理
post_deploy_cleanup() {
    log_info "执行部署后清理..."
    
    # 清理Docker资源
    docker system prune -f >/dev/null 2>&1 || true
    
    # 清理临时文件
    rm -rf "$PROJECT_ROOT/temp" >/dev/null 2>&1 || true
    
    log_success "清理完成"
}

# 显示部署状态
show_deployment_status() {
    log_info "部署状态信息:"
    
    echo "==========================================="
    echo "部署环境: $ENVIRONMENT"
    echo "部署时间: $(date)"
    echo "项目路径: $PROJECT_ROOT"
    echo "==========================================="
    
    # 显示服务状态
    if command -v docker-compose >/dev/null 2>&1; then
        local compose_file="$PROJECT_ROOT/deployment/docker-compose.$ENVIRONMENT.yml"
        if [[ -f "$compose_file" ]]; then
            echo "服务状态:"
            docker-compose -f "$compose_file" ps
        fi
    fi
    
    echo "==========================================="
    echo "访问地址:"
    echo "  前端: http://localhost:8080"
    echo "  API: http://localhost:3000"
    echo "  API文档: http://localhost:3000/api-docs"
    echo "==========================================="
}

# 主函数
main() {
    log_info "开始一键部署 Wedding Client ($ENVIRONMENT 环境)"
    
    # 解析命令行参数
    while [[ $# -gt 1 ]]; do
        case $2 in
            --force)
                FORCE_DEPLOY="true"
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP="true"
                shift
                ;;
            --skip-tests)
                SKIP_TESTS="true"
                shift
                ;;
            --no-rollback)
                AUTO_ROLLBACK="false"
                shift
                ;;
            *)
                log_warning "未知参数: $2"
                shift
                ;;
        esac
    done
    
    # 执行部署流程
    check_dependencies
    check_environment
    pre_deploy_checks
    backup_current_version
    deploy_application
    start_services
    health_checks
    run_tests
    generate_docs
    post_deploy_cleanup
    show_deployment_status
    
    log_success "🎉 一键部署完成！"
}

# 信号处理
trap 'log_error "部署被中断"; exit 1' INT TERM

# 执行主函数
main "$@"
```

### 使用一键部署脚本

1. **赋予执行权限**
   ```bash
   chmod +x one-click-deploy.sh
   ```

2. **基本部署**
   ```bash
   # 生产环境部署
   ./one-click-deploy.sh production
   
   # 开发环境部署
   ./one-click-deploy.sh development
   ```

3. **高级选项**
   ```bash
   # 强制部署（跳过检查）
   ./one-click-deploy.sh production --force
   
   # 跳过备份
   ./one-click-deploy.sh production --skip-backup
   
   # 跳过测试
   ./one-click-deploy.sh production --skip-tests
   
   # 禁用自动回滚
   ./one-click-deploy.sh production --no-rollback
   ```

## 监控和维护

### 日常监控命令

```bash
# 查看服务状态
./scripts/container-management.sh status

# 查看服务日志
./scripts/container-management.sh logs

# 健康检查
./scripts/health-check.sh --all

# 系统监控
./scripts/monitoring.sh status

# 性能监控
./scripts/performance-monitoring.sh
```

### 故障排除

1. **服务无法启动**
   ```bash
   # 查看详细日志
   ./scripts/container-management.sh logs [service_name]
   
   # 检查配置文件
   ./scripts/config-management.sh validate
   
   # 重启服务
   ./scripts/container-management.sh restart [service_name]
   ```

2. **数据库连接问题**
   ```bash
   # 检查数据库状态
   ./scripts/database-management.sh status
   
   # 重启数据库
   ./scripts/container-management.sh restart mysql
   ```

3. **性能问题**
   ```bash
   # 性能分析
   ./scripts/performance-monitoring.sh analyze
   
   # 系统资源检查
   ./scripts/system-maintenance.sh check-resources
   ```

### 备份和恢复

```bash
# 创建备份
./scripts/backup-restore.sh backup

# 列出备份
./scripts/backup-restore.sh list

# 恢复备份
./scripts/backup-restore.sh restore <backup_id>

# 清理旧备份
./scripts/backup-restore.sh clean
```

## 安全配置

### SSL/TLS 配置

1. **生成SSL证书**
   ```bash
   ./scripts/security-management.sh generate-ssl
   ```

2. **配置Nginx SSL**
   编辑 `deployment/nginx/nginx.prod.conf`：
   ```nginx
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /etc/ssl/certs/your-domain.crt;
       ssl_certificate_key /etc/ssl/private/your-domain.key;
       
       # SSL配置
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
       ssl_prefer_server_ciphers off;
   }
   ```

### 防火墙配置

```bash
# 配置防火墙规则
./scripts/security-management.sh setup-firewall

# 检查安全配置
./scripts/security-management.sh audit
```

## 性能优化

### 数据库优化

1. **MySQL配置优化**
   编辑 `docker/mysql/my.cnf`：
   ```ini
   [mysqld]
   innodb_buffer_pool_size = 1G
   innodb_log_file_size = 256M
   max_connections = 200
   query_cache_size = 64M
   ```

2. **Redis配置优化**
   编辑 `docker/redis/redis.conf`：
   ```
   maxmemory 512mb
   maxmemory-policy allkeys-lru
   save 900 1
   save 300 10
   ```

### 应用性能优化

```bash
# 性能分析
./scripts/performance-monitoring.sh profile

# 缓存优化
./scripts/performance-monitoring.sh optimize-cache

# 数据库查询优化
./scripts/database-management.sh optimize
```

## 扩展和定制

### 添加新的部署环境

1. **创建环境配置**
   ```bash
   cp deployment/.env.production deployment/.env.staging
   cp deployment/docker-compose.prod.yml deployment/docker-compose.staging.yml
   ```

2. **修改配置文件**
   根据新环境需求修改配置参数

3. **更新部署脚本**
   在部署脚本中添加新环境的支持

### 自定义监控告警

1. **配置告警规则**
   编辑 `monitoring/alert_rules.yml`

2. **设置通知渠道**
   ```bash
   # 配置Slack通知
   export SLACK_WEBHOOK_URL="your_webhook_url"
   
   # 配置邮件通知
   export SMTP_HOST="smtp.example.com"
   export SMTP_USER="alerts@example.com"
   ```

## 常见问题解答

### Q: 部署失败如何回滚？
A: 使用备份恢复功能：
```bash
./scripts/backup-restore.sh restore <backup_id>
```

### Q: 如何更新单个服务？
A: 使用容器管理脚本：
```bash
./scripts/container-management.sh restart <service_name>
```

### Q: 如何查看详细的部署日志？
A: 查看日志文件：
```bash
./scripts/log-management.sh collect
tail -f deployment/logs/deploy.log
```

### Q: 如何配置自动备份？
A: 设置定时任务：
```bash
# 添加到crontab
0 2 * * * /path/to/wedding-client/scripts/backup-restore.sh backup
```

## 总结

本部署指南提供了完整的 Wedding Client 项目部署方案，包括：

- ✅ 详细的脚本功能说明
- ✅ 清晰的执行顺序指导
- ✅ 完整的环境配置说明
- ✅ 一键部署自动化方案
- ✅ 监控和维护工具
- ✅ 故障排除指南
- ✅ 性能优化建议
- ✅ 安全配置指导

通过遵循本指南，您可以快速、安全地部署和维护 Wedding Client 应用系统。
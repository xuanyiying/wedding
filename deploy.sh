#!/bin/bash

# Wedding Client 精简部署脚本
# 确保部署流程一次成功，失败则需要重新构建

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# 显示帮助信息
show_help() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}    Wedding Client 精简部署工具${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "使用方法: ./deploy.sh [命令] [选项]"
    echo ""
    echo -e "${GREEN}核心命令:${NC}"
    echo "  start         启动服务"
    echo "  stop          停止服务"
    echo "  restart       重启服务"
    echo "  status        查看状态"
    echo ""
    echo -e "${YELLOW}部署命令:${NC}"
    echo "  deploy        智能部署（检测变化后部署）"
    echo "  redeploy      强制重新构建并部署"
    echo ""
    echo -e "${BLUE}管理命令:${NC}"
    echo "  logs [服务]   查看日志"
    echo "  clean         清理资源"
    echo "  health        健康检查"
    echo "  test          测试配置"
    echo "  diagnose      诊断nginx配置问题"
    echo ""
    echo -e "${YELLOW}选项:${NC}"
    echo "  --services <服务列表>  指定要构建和部署的服务（web,api,nginx）"
    echo ""
    echo -e "${GREEN}部署模式说明:${NC}"
    echo "  deploy        - 智能检测代码变化，无变化时快速重启"
    echo "  redeploy      - 强制重新构建指定服务（或全部服务）"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh deploy                        # 智能部署（推荐）"
    echo "  ./deploy.sh redeploy                      # 强制重新构建所有服务"
    echo "  ./deploy.sh redeploy --services web       # 只重新构建web服务"
    echo "  ./deploy.sh redeploy --services web,api   # 重新构建web和api服务"
    echo "  ./deploy.sh deploy --services web         # 智能部署，仅构建web服务（如有变化）"
    echo "  ./deploy.sh logs api                      # 查看API日志"
    echo "  ./deploy.sh diagnose                      # 诊断nginx配置问题"
    echo ""
    echo -e "${GREEN}Swagger文档:${NC} http://YOUR_IP/api/v1/docs"
    echo ""
}

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检测环境
detect_environment() {
    # 检查环境变量
    if [[ -n "$ENVIRONMENT" ]]; then
        echo "$ENVIRONMENT"
    else
        # 默认返回prod环境
        echo "prod"
    fi
}

# 获取配置文件路径
get_config_files() {
    local env=$(detect_environment)
    COMPOSE_FILE="$PROJECT_ROOT/docker-compose.env.yml"
    if [[ "$env" == "development" ]] || [[ "$env" == "dev" ]]; then
        ENV_FILE="$PROJECT_ROOT/deployment/environments/.env.dev"
    elif [[ "$env" == "test" ]]; then
        ENV_FILE="$PROJECT_ROOT/deployment/environments/.env.test"
    else
        ENV_FILE="$PROJECT_ROOT/deployment/environments/.env.prod"
    fi
}

# 复制环境文件到项目根目录
copy_env_file() {
    log_info "复制环境文件到项目根目录..."
    
    # 确保目标目录存在
    mkdir -p "$PROJECT_ROOT"
    
    # 复制对应的环境文件到项目根目录
    if [[ -f "$ENV_FILE" ]]; then
        cp "$ENV_FILE" "$PROJECT_ROOT/.env"
        log_success "已将 $ENV_FILE 复制到项目根目录"
        
        # 验证关键环境变量
        validate_env_variables
    else
        log_warning "环境文件 $ENV_FILE 不存在，跳过复制"
    fi
}

# 验证环境变量
validate_env_variables() {
    log_info "验证关键环境变量..."
    
    source "$PROJECT_ROOT/.env"
    
    # 检查必需的环境变量
    local required_vars=("SERVER_HOST" "MYSQL_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET" "OSS_ACCESS_KEY" "OSS_SECRET_KEY" "CORS_ORIGIN")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "缺少必需的环境变量: ${missing_vars[*]}"
        return 1
    fi
    
    # 验证SERVER_HOST不是localhost（生产环境）
    if [[ "$ENVIRONMENT" == "prod" && "$SERVER_HOST" == "localhost" ]]; then
        log_warning "生产环境SERVER_HOST不应为localhost，请检查配置"
    fi
    
    log_success "环境变量验证通过"
}

# 验证nginx配置
validate_nginx_config() {
    log_info "验证nginx配置..."
    
    # 检查nginx配置模板是否存在
    local nginx_template="$PROJECT_ROOT/deployment/docker/nginx/conf.d/default.conf.template"
    if [[ ! -f "$nginx_template" ]]; then
        log_error "nginx配置模板不存在: $nginx_template"
        return 1
    fi
    
    # 检查entrypoint脚本
    local entrypoint_script="$PROJECT_ROOT/deployment/scripts/nginx-entrypoint.sh"
    if [[ ! -f "$entrypoint_script" ]]; then
        log_error "nginx entrypoint脚本不存在: $entrypoint_script"
        return 1
    fi
    
    # 确保脚本有执行权限
    chmod +x "$entrypoint_script"
    log_info "已设置nginx entrypoint脚本执行权限"
    
    # 检查模板中是否包含环境变量占位符
    if ! grep -q '${SERVER_HOST}' "$nginx_template"; then
        log_error "nginx配置模板中缺少SERVER_HOST变量"
        return 1
    fi
    
    # 验证环境变量是否已设置
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        source "$PROJECT_ROOT/.env"
        if [[ -n "$SERVER_HOST" ]]; then
            log_info "SERVER_HOST环境变量已设置: $SERVER_HOST"
        else
            log_warning "SERVER_HOST环境变量未设置，将使用默认值localhost"
        fi
    fi
    
    log_success "nginx配置验证通过"
}

# 创建必要的目录和权限
setup_directories() {
    log_info "创建必要的目录..."
    
    # 创建必要的目录
    mkdir -p deployment/logs/{nginx,api,mysql,redis,minio}
    mkdir -p deployment/uploads/{images,videos}
    mkdir -p deployment/ssl
    
    # 设置正确的权限
    chmod -R 755 deployment/logs
    chmod -R 755 deployment/uploads
    
    log_success "目录创建完成"
}

# 启动服务
start_services() {
    log_info "启动Wedding Client服务..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    
    # 预检查和准备
    validate_nginx_config
    setup_directories
    
    # 确保环境文件已复制
    copy_env_file
    
    # 分层启动 - 确保依赖顺序
    log_info "1. 启动基础服务 (MySQL, Redis, MinIO)..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d mysql redis minio
    
    # 等待基础服务就绪
    log_info "等待基础服务就绪..."
    wait_for_service "mysql" 30
    wait_for_service "redis" 15
    wait_for_service "minio" 20
    
    # 初始化MinIO bucket
    log_info "初始化MinIO存储桶..."
    initialize_minio_buckets
    
    log_info "2. 启动API服务..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api
    wait_for_service "api" 30
    
    log_info "3. 启动Web服务..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d web
    wait_for_service "web" 20
    
    log_info "4. 准备并启动Nginx服务..."
    
    # 确保nginx entrypoint脚本有执行权限
    local entrypoint_script="$PROJECT_ROOT/deployment/scripts/nginx-entrypoint.sh"
    chmod +x "$entrypoint_script"
    log_info "已设置nginx entrypoint脚本执行权限"
    
    # 清理可能存在的旧nginx容器
    log_info "清理旧的nginx容器..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop nginx 2>/dev/null || true
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" rm -f nginx 2>/dev/null || true
    
    # 启动nginx服务
    log_info "启动nginx服务..."
    if ! docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d nginx; then
        log_error "nginx服务启动失败"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs nginx
        return 1
    fi
    
    # 等待nginx容器启动并验证
    log_info "等待nginx容器完全启动..."
    local nginx_ready=false
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker ps | grep -q "wedding-nginx.*Up"; then
            log_info "nginx容器已启动，等待配置生成..."
            sleep 5
            nginx_ready=true
            break
        fi
        
        log_info "等待nginx容器启动... ($attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    if [[ "$nginx_ready" != true ]]; then
        log_error "nginx容器启动超时"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs nginx
        return 1
    fi
    
    # 验证nginx配置生成
    if ! verify_nginx_config_generation; then
        log_error "nginx配置生成验证失败"
        return 1
    fi
    
    show_status
    log_success "服务启动完成！"
}

# 等待服务就绪
wait_for_service() {
    local service_name="$1"
    local timeout="$2"
    local count=0
    
    log_info "等待 $service_name 服务就绪..."
    
    while [[ $count -lt $timeout ]]; do
        if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps "$service_name" | grep -q "Up"; then
            log_success "$service_name 服务已就绪"
            return 0
        fi
        
        sleep 1
        ((count++))
    done
    
    log_warning "$service_name 服务启动超时，继续执行..."
    return 1
}

# 初始化MinIO存储桶
initialize_minio_buckets() {
    log_info "初始化MinIO存储桶..."
    
    # 等待MinIO完全启动
    sleep 5
    
    # 设置MinIO客户端别名 (使用统一的OSS配置)
    if ! docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T minio mc alias set local http://localhost:9000 "${OSS_ACCESS_KEY:-wedding_minio_access}" "${OSS_SECRET_KEY:-M1n10_Pr0d_S3cr3t_K3y_2025!}" 2>/dev/null; then
        log_warning "MinIO客户端别名设置失败，尝试重新设置..."
        sleep 3
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T minio mc alias set local http://localhost:9000 "${OSS_ACCESS_KEY:-wedding_minio_access}" "${OSS_SECRET_KEY:-M1n10_Pr0d_S3cr3t_K3y_2025!}" || {
            log_error "MinIO客户端别名设置失败"
            return 1
        }
    fi
    
    # 创建主要存储桶
    local buckets=( "wedding-media-prod")
    
    for bucket in "${buckets[@]}"; do
        if ! docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T minio mc ls "local/$bucket" >/dev/null 2>&1; then
            log_info "创建存储桶: $bucket"
            if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T minio mc mb "local/$bucket"; then
                # 设置公共读取权限
                docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T minio mc anonymous set public "local/$bucket"
                log_success "存储桶 $bucket 创建成功并设置为公共访问"
            else
                log_warning "存储桶 $bucket 创建失败"
            fi
        else
            log_info "存储桶 $bucket 已存在"
        fi
    done
    
    log_success "MinIO存储桶初始化完成"
}

# 验证nginx配置生成
verify_nginx_config_generation() {
    log_info "验证nginx配置生成..."
    
    # 获取nginx容器名称
    local nginx_container=$(docker ps | grep "wedding-nginx" | awk '{print $NF}')
    
    if [[ -z "$nginx_container" ]]; then
        log_error "nginx容器未运行"
        return 1
    fi
    
    log_info "找到nginx容器: $nginx_container"
    
    # 等待配置文件生成
    local max_wait=30
    local count=0
    
    while [[ $count -lt $max_wait ]]; do
        if docker exec "$nginx_container" test -f /etc/nginx/conf.d/default.conf 2>/dev/null; then
            log_success "nginx配置文件已生成"
            break
        fi
        
        log_info "等待nginx配置文件生成... ($((count+1))/$max_wait)"
        sleep 1
        ((count++))
    done
    
    if [[ $count -eq $max_wait ]]; then
        log_error "nginx配置文件生成超时"
        log_info "查看nginx容器日志:"
        docker logs "$nginx_container" --tail 20
        return 1
    fi
    
    # 验证配置文件内容
    log_info "验证nginx配置文件内容..."
    
    # 检查SERVER_HOST是否正确替换
    local server_host_in_config=$(docker exec "$nginx_container" grep -o "http://[^:]*:9000" /etc/nginx/conf.d/default.conf 2>/dev/null | head -1 | sed 's|http://||; s|:9000||' || echo "")
    
    if [[ -n "$server_host_in_config" ]]; then
        log_info "配置中的SERVER_HOST: $server_host_in_config"
        
        # 验证是否使用了正确的SERVER_HOST
        source "$PROJECT_ROOT/.env" 2>/dev/null || true
        if [[ "$server_host_in_config" == "$SERVER_HOST" ]]; then
            log_success "SERVER_HOST环境变量正确替换"
        else
            log_warning "SERVER_HOST可能未正确替换，期望: $SERVER_HOST, 实际: $server_host_in_config"
        fi
    fi
    
    # 测试nginx配置语法
    log_info "测试nginx配置语法..."
    if docker exec "$nginx_container" nginx -t >/dev/null 2>&1; then
        log_success "nginx配置语法正确"
    else
        log_error "nginx配置语法错误:"
        docker exec "$nginx_container" nginx -t
        return 1
    fi
    
    # 重新加载nginx配置
    log_info "重新加载nginx配置..."
    if docker exec "$nginx_container" nginx -s reload >/dev/null 2>&1; then
        log_success "nginx配置重新加载成功"
    else
        log_warning "nginx配置重新加载失败，但服务可能仍然正常"
    fi
    
    log_success "nginx配置生成验证完成"
}

# 诊断nginx问题
diagnose_nginx() {
    log_info "诊断nginx配置问题..."
    
    echo -e "\n${BLUE}=== Nginx 诊断报告 ===${NC}"
    
    # 1. 检查容器状态
    echo -e "\n${YELLOW}1. 容器状态:${NC}"
    if docker ps | grep -q "wedding-nginx"; then
        echo -e "${GREEN}✓${NC} nginx容器正在运行"
        docker ps | grep "wedding-nginx"
    else
        echo -e "${RED}✗${NC} nginx容器未运行"
        docker ps -a | grep "wedding-nginx" || echo "未找到nginx容器"
    fi
    
    # 2. 检查配置文件
    echo -e "\n${YELLOW}2. 配置文件检查:${NC}"
    local nginx_template="$PROJECT_ROOT/deployment/docker/nginx/conf.d/default.conf.template"
    local nginx_entrypoint="$PROJECT_ROOT/deployment/scripts/nginx-entrypoint.sh"
    
    if [[ -f "$nginx_template" ]]; then
        echo -e "${GREEN}✓${NC} nginx配置模板存在: $nginx_template"
        
        # 检查模板是否使用环境变量
        if grep -q '${SERVER_HOST}' "$nginx_template"; then
            echo -e "${GREEN}✓${NC} 模板正确使用SERVER_HOST环境变量"
        else
            echo -e "${RED}✗${NC} 模板缺少SERVER_HOST环境变量"
        fi
        
        # 检查是否有硬编码的localhost
        if grep -q "localhost:9000\|127.0.0.1:9000" "$nginx_template"; then
            echo -e "${RED}✗${NC} 模板中发现硬编码的localhost/127.0.0.1配置"
        else
            echo -e "${GREEN}✓${NC} 模板无硬编码问题"
        fi
    else
        echo -e "${RED}✗${NC} nginx配置模板不存在: $nginx_template"
    fi
    
    if [[ -f "$nginx_entrypoint" ]]; then
        echo -e "${GREEN}✓${NC} nginx entrypoint脚本存在: $nginx_entrypoint"
        if [[ -x "$nginx_entrypoint" ]]; then
            echo -e "${GREEN}✓${NC} entrypoint脚本有执行权限"
        else
            echo -e "${YELLOW}⚠${NC} entrypoint脚本缺少执行权限，正在修复..."
            chmod +x "$nginx_entrypoint"
        fi
    else
        echo -e "${RED}✗${NC} nginx entrypoint脚本不存在: $nginx_entrypoint"
    fi
    
    # 3. 检查环境变量
    echo -e "\n${YELLOW}3. 环境变量检查:${NC}"
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        source "$PROJECT_ROOT/.env"
        if [[ -n "$SERVER_HOST" ]]; then
            echo -e "${GREEN}✓${NC} SERVER_HOST已设置: $SERVER_HOST"
            
            # 验证SERVER_HOST不是localhost（生产环境）
            if [[ "$SERVER_HOST" == "localhost" || "$SERVER_HOST" == "127.0.0.1" ]]; then
                echo -e "${YELLOW}⚠${NC} 生产环境建议使用实际IP地址而非localhost"
            fi
        else
            echo -e "${RED}✗${NC} SERVER_HOST未设置"
        fi
        
        # 检查MinIO相关配置
        if [[ -n "$MINIO_ENDPOINT" ]]; then
            echo -e "${GREEN}✓${NC} MINIO_ENDPOINT已设置: $MINIO_ENDPOINT"
        else
            echo -e "${YELLOW}⚠${NC} MINIO_ENDPOINT未设置"
        fi
    else
        echo -e "${RED}✗${NC} .env文件不存在"
    fi
    
    # 4. 检查容器内配置
    echo -e "\n${YELLOW}4. 容器内配置检查:${NC}"
    if docker ps | grep -q "wedding-nginx"; then
        local container_name=$(docker ps | grep "wedding-nginx" | awk '{print $NF}')
        
        if docker exec "$container_name" test -f /etc/nginx/conf.d/default.conf; then
            echo -e "${GREEN}✓${NC} 容器内配置文件已生成"
            
            # 检查生成的配置是否正确使用了环境变量
            local server_host_in_config=$(docker exec "$container_name" grep -o "http://[^:]*:9000" /etc/nginx/conf.d/default.conf 2>/dev/null | head -1 | sed 's|http://||; s|:9000||')
            if [[ -n "$server_host_in_config" && "$server_host_in_config" != "localhost" && "$server_host_in_config" != "127.0.0.1" ]]; then
                echo -e "${GREEN}✓${NC} 配置正确使用了SERVER_HOST: $server_host_in_config"
            elif [[ "$server_host_in_config" == "localhost" || "$server_host_in_config" == "127.0.0.1" ]]; then
                echo -e "${YELLOW}⚠${NC} 配置使用了localhost，检查SERVER_HOST环境变量"
            else
                echo -e "${YELLOW}⚠${NC} 无法检测配置中的主机设置"
            fi
            
            if docker exec "$container_name" nginx -t >/dev/null 2>&1; then
                echo -e "${GREEN}✓${NC} nginx配置语法正确"
            else
                echo -e "${RED}✗${NC} nginx配置语法错误:"
                docker exec "$container_name" nginx -t
            fi
        else
            echo -e "${RED}✗${NC} 容器内配置文件未生成"
            echo -e "${BLUE}→${NC} 检查entrypoint脚本是否正确执行"
        fi
        
        # 检查日志
        echo -e "\n${YELLOW}5. 最近的nginx日志:${NC}"
        docker logs "$container_name" --tail 10
    fi
    
    # 6. 自动修复建议
    echo -e "\n${YELLOW}6. 修复建议:${NC}"
    if ! docker ps | grep -q "wedding-nginx"; then
        echo -e "${BLUE}→${NC} 启动nginx容器: ./deploy.sh start"
    elif ! docker exec $(docker ps | grep "wedding-nginx" | awk '{print $NF}') test -f /etc/nginx/conf.d/default.conf 2>/dev/null; then
        echo -e "${BLUE}→${NC} 配置文件未生成，执行以下步骤:"
        echo -e "   1. 确保entrypoint脚本有执行权限: chmod +x deployment/scripts/nginx-entrypoint.sh"
        echo -e "   2. 重启nginx容器: docker-compose restart nginx"
        echo -e "   3. 或者重新部署: ./deploy.sh restart"
    elif [[ -f "$PROJECT_ROOT/.env" ]]; then
        source "$PROJECT_ROOT/.env"
        if [[ "$SERVER_HOST" == "localhost" || "$SERVER_HOST" == "127.0.0.1" ]]; then
            echo -e "${BLUE}→${NC} 建议在.env中设置正确的SERVER_HOST IP地址"
            echo -e "   当前值: $SERVER_HOST"
            echo -e "   建议值: 您的服务器实际IP地址"
        else
            echo -e "${GREEN}✓${NC} nginx配置正常，无需修复"
        fi
    else
        echo -e "${BLUE}→${NC} 创建.env文件并设置SERVER_HOST环境变量"
        echo -e "   1. 复制环境文件: cp deployment/environments/.env.prod .env"
        echo -e "   2. 编辑.env文件，设置正确的SERVER_HOST值"
    fi
    
    # 7. 推荐解决方案
    echo -e "\n${YELLOW}7. 推荐解决方案:${NC}"
    echo -e "${BLUE}→${NC} 重启所有服务（推荐）: ./deploy.sh restart"
    echo -e "${BLUE}→${NC} 仅重启nginx服务: docker-compose restart nginx"
    echo -e "${BLUE}→${NC} 查看nginx详细日志: docker-compose logs nginx -f"
    echo -e "${BLUE}→${NC} 完全重新部署: ./deploy.sh redeploy"
    
    echo -e "\n${BLUE}=== 诊断完成 ===${NC}"
}

# 停止服务
stop_services() {
    log_info "停止Wedding Client服务..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans
    
    log_success "服务已停止！"
}

# 重启服务
restart_services() {
    log_info "重启Wedding Client服务..."
    stop_services
    sleep 5
    start_services
}

# 显示状态
show_status() {
    get_config_files
    
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}    服务状态信息${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    echo -e "\n${BLUE}访问地址:${NC}"
    local server_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    local env=$(detect_environment)
    
    if [[ "$env" == "tencent" ]]; then
        echo -e "  前端:    ${GREEN}http://$server_ip${NC}"
        echo -e "  API:     ${GREEN}http://$server_ip/api/v1${NC}"
        echo -e "  Swagger: ${GREEN}http://$server_ip/api/v1/docs${NC}"
    else
        echo -e "  前端:    ${GREEN}http://$server_ip${NC}"
        echo -e "  API:     ${GREEN}http://$server_ip:3000/api/v1${NC}"
        echo -e "  Swagger: ${GREEN}http://$server_ip:3000/api/v1/docs${NC}"
    fi
    echo -e "  MinIO:   ${GREEN}http://$server_ip:9001${NC}"
    echo ""
}

# 检查代码和配置是否发生变化
check_changes() {
    local web_hash_file=".deploy_cache/web_code_hash"
    local api_hash_file=".deploy_cache/api_code_hash"
    local config_hash_file=".deploy_cache/config_hash"
    local web_current_hash
    local api_current_hash
    local config_current_hash
    
    # 创建缓存目录
    mkdir -p .deploy_cache
    
    # 计算当前代码哈希值
    web_current_hash=$(find web/src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" -o -name "*.html" | sort | xargs md5sum | md5sum | awk '{print $1}')
    api_current_hash=$(find server/src -type f -name "*.ts" -o -name "*.js" | sort | xargs md5sum | md5sum | awk '{print $1}')
    
    # 计算配置文件哈希值
    config_current_hash=$(find deployment/environments deployment/docker/mysql deployment/docker/redis -type f | sort | xargs md5sum | md5sum | awk '{print $1}')
    
    local web_changed=false
    local api_changed=false
    local config_changed=false
    
    # 检查前端代码是否变化
    if [[ -f "$web_hash_file" ]]; then
        local web_last_hash
        web_last_hash=$(cat "$web_hash_file")
        if [[ "$web_current_hash" != "$web_last_hash" ]]; then
            web_changed=true
        fi
    else
        web_changed=true
    fi
    
    # 检查后端代码是否变化
    if [[ -f "$api_hash_file" ]]; then
        local api_last_hash
        api_last_hash=$(cat "$api_hash_file")
        if [[ "$api_current_hash" != "$api_last_hash" ]]; then
            api_changed=true
        fi
    else
        api_changed=true
    fi
    
    # 检查配置文件是否变化
    if [[ -f "$config_hash_file" ]]; then
        local config_last_hash
        config_last_hash=$(cat "$config_hash_file")
        if [[ "$config_current_hash" != "$config_last_hash" ]]; then
            config_changed=true
        fi
    else
        config_changed=true
    fi
    
    # 保存当前哈希值
    echo "$web_current_hash" > "$web_hash_file"
    echo "$api_current_hash" > "$api_hash_file"
    echo "$config_current_hash" > "$config_hash_file"
    
    # 返回结果
    if [[ "$web_changed" == true || "$api_changed" == true || "$config_changed" == true ]]; then
        echo "changed"
    else
        echo "unchanged"
    fi
}

# 解析命令行参数
parse_args() {
    SERVICES_TO_BUILD=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --services)
                SERVICES_TO_BUILD="$2"
                shift 2
                ;;
            *)
                # 其他参数保持不变
                break
                ;;
        esac
    done
}

# 构建指定服务
build_services() {
    local services="$1"
    
    if [[ -z "$services" ]]; then
        log_info "未指定服务，跳过构建步骤"
        return 0
    fi
    
    log_info "构建指定服务: $services"
    cd "$PROJECT_ROOT"
    
    # 设置构建参数
    local build_args=""
    if [[ "$FORCE_REBUILD" == "true" ]]; then
        build_args="--no-cache --pull"
        log_info "强制重新构建模式（无缓存）"
    fi
    
    # 解析服务列表
    IFS=',' read -ra SERVICE_ARRAY <<< "$services"
    
    for service in "${SERVICE_ARRAY[@]}"; do
        case $service in
            web)
                # 清理前端构建缓存和产物
                if [[ -d "web/dist" ]]; then
                    log_info "清理前端构建产物..."
                    rm -rf web/dist/*
                fi
                
                if [[ -d "web/node_modules/.vite" ]]; then
                    log_info "清理前端构建缓存..."
                    rm -rf web/node_modules/.vite
                fi
                
                # 构建Web镜像
                if [[ -f "web/Dockerfile" ]]; then
                    log_info "构建Web镜像..."
                    docker build $build_args -t wedding-web:$(detect_environment)-latest web/ || {
                        log_error "Web镜像构建失败"
                        return 1
                    }
                    log_success "Web镜像构建完成"
                fi
                ;;
            api)
                # 构建API镜像
                if [[ -f "server/Dockerfile" ]]; then
                    log_info "构建API镜像..."
                    docker build $build_args -t wedding-api:$(detect_environment)-latest server/ || {
                        log_error "API镜像构建失败"
                        return 1
                    }
                    log_success "API镜像构建完成"
                fi
                ;;
            nginx)
                # 构建Nginx镜像
                if [[ -f "deployment/docker/nginx/Dockerfile" ]]; then
                    log_info "构建Nginx镜像..."
                    docker build $build_args -t wedding-nginx:$(detect_environment)-latest -f deployment/docker/nginx/Dockerfile . || {
                        log_error "Nginx镜像构建失败"
                        return 1
                    }
                    log_success "Nginx镜像构建完成"
                elif [[ -f "deployment/docker/nginx/nginx.Dockerfile" ]]; then
                    log_info "构建Nginx镜像..."
                    docker build $build_args -t wedding-nginx:$(detect_environment)-latest -f deployment/docker/nginx/nginx.Dockerfile . || {
                        log_error "Nginx镜像构建失败"
                        return 1
                    }
                    log_success "Nginx镜像构建完成"
                else
                    log_warning "未找到Nginx Dockerfile，跳过构建"
                fi
                ;;
            *)
                log_warning "未知服务: $service，跳过构建"
                ;;
        esac
    done
    
    log_success "指定服务构建完成"
}

# 智能部署
smart_deploy() {
    log_info "开始智能部署..."
    
    # 预检查
    pre_deploy_check
    
    # 如果指定了服务，强制执行完整部署
    if [[ -n "$SERVICES_TO_BUILD" ]]; then
        log_info "指定了构建服务 ($SERVICES_TO_BUILD)，执行完整部署..."
        execute_full_deploy
        log_success "智能部署完成！"
        return $?
    fi
    
    # 检查代码和配置变化
    local change_status
    change_status=$(check_changes)
    
    if [[ "$change_status" == "unchanged" ]]; then
        log_info "代码和配置未发生变化，执行快速重启..."
        quick_restart
        return $?
    fi
    
    log_info "检测到代码或配置变化，开始完整部署..."
    
    # 执行完整部署流程
    execute_full_deploy
    
    log_success "智能部署完成！"
}

# 预部署检查
pre_deploy_check() {
    log_info "执行预部署检查..."
    
    # 检查Docker是否运行
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker未运行，请启动Docker服务"
        exit 1
    fi
    
    # 检查Docker Compose是否可用
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "docker-compose未安装"
        exit 1
    fi
    
    # 检查磁盘空间
    local available_space=$(df . | tail -1 | awk '{print $4}')
    if [[ $available_space -lt 2097152 ]]; then  # 2GB in KB
        log_warning "磁盘空间不足2GB，可能影响部署"
    fi
    
    log_success "预部署检查通过"
}

# 快速重启
quick_restart() {
    log_info "执行快速重启..."
    
    get_config_files
    cd "$PROJECT_ROOT"
    
    # 复制环境文件
    copy_env_file
    
    # 确保nginx entrypoint脚本权限正确
    chmod +x "$PROJECT_ROOT/deployment/scripts/nginx-entrypoint.sh"
    
    # 重启关键服务
    log_info "重启Web、API和Nginx服务..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart web api nginx
    
    # 等待服务就绪
    wait_for_service "web" 20
    wait_for_service "api" 20
    wait_for_service "nginx" 15
    
    # 验证nginx配置
    if ! verify_nginx_config_generation; then
        log_warning "nginx配置验证失败，尝试重新创建nginx容器..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop nginx
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" rm -f nginx
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d nginx
        wait_for_service "nginx" 15
        verify_nginx_config_generation
    fi
    
    # 健康检查
    if health_check; then
        log_success "快速重启完成！"
        return 0
    else
        log_warning "快速重启后健康检查失败，执行完整部署..."
        execute_full_deploy
        return $?
    fi
}

# 执行完整部署
execute_full_deploy() {
    log_info "执行完整部署流程..."
    
    # 停止服务
    stop_services 2>/dev/null || true
    
    # 清理资源
    clean_resources
    
    # 复制环境文件
    copy_env_file
    
    # 确保nginx相关文件权限正确
    log_info "设置nginx相关文件权限..."
    chmod +x "$PROJECT_ROOT/deployment/scripts/nginx-entrypoint.sh"
    
    # 构建指定服务
    if [[ -n "$SERVICES_TO_BUILD" ]]; then
        build_services "$SERVICES_TO_BUILD"
    else
        log_info "未指定构建服务，跳过构建步骤"
    fi
    
    # 启动服务
    start_services
    
    # 执行数据库初始化
    initialize_database
    
    # 健康检查
    health_check
    
    # 显示部署结果
    show_deployment_result
}

# 显示部署结果
show_deployment_result() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}    部署完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    # 获取服务器IP
    local server_ip
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        source "$PROJECT_ROOT/.env"
        server_ip="$SERVER_HOST"
    else
        server_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    fi
    
    echo -e "\n${BLUE}🌐 访问地址:${NC}"
    echo -e "  前端应用:    ${GREEN}http://$server_ip/${NC}"
    echo -e "  API文档:     ${GREEN}http://$server_ip/api/v1/docs/${NC}"
    echo -e "  MinIO控制台: ${GREEN}http://$server_ip:9001/${NC}"
    
    echo -e "\n${BLUE}📊 服务状态:${NC}"
    show_status
    
    echo -e "\n${YELLOW}💡 提示:${NC}"
    echo -e "  - 如遇问题，可执行: ${GREEN}./deploy.sh diagnose${NC}"
    echo -e "  - 查看日志: ${GREEN}./deploy.sh logs [服务名]${NC}"
    echo -e "  - 重新部署: ${GREEN}./deploy.sh redeploy${NC}"
    echo ""
}

# 清理指定服务的资源
clean_specific_services() {
    local services="$1"
    
    if [[ -z "$services" ]]; then
        log_warning "未指定服务，跳过清理"
        return 0
    fi
    
    log_info "清理指定服务资源: $services"
    
    # 解析服务列表
    IFS=',' read -ra SERVICE_ARRAY <<< "$services"
    
    for service in "${SERVICE_ARRAY[@]}"; do
        case $service in
            web)
                log_info "清理Web服务资源..."
                # 停止并删除Web容器
                docker stop wedding-web-$(detect_environment) 2>/dev/null || true
                docker rm wedding-web-$(detect_environment) 2>/dev/null || true
                # 删除Web镜像
                docker rmi wedding-web:$(detect_environment)-latest 2>/dev/null || true
                # 清理构建缓存
                if [[ -d "web/dist" ]]; then
                    rm -rf web/dist/*
                fi
                if [[ -d "web/node_modules/.vite" ]]; then
                    rm -rf web/node_modules/.vite
                fi
                ;;
            api)
                log_info "清理API服务资源..."
                # 停止并删除API容器
                docker stop wedding-api-$(detect_environment) 2>/dev/null || true
                docker rm wedding-api-$(detect_environment) 2>/dev/null || true
                # 删除API镜像
                docker rmi wedding-api:$(detect_environment)-latest 2>/dev/null || true
                ;;
            nginx)
                log_info "清理Nginx服务资源..."
                # 停止并删除Nginx容器
                docker stop wedding-nginx-$(detect_environment) 2>/dev/null || true
                docker rm wedding-nginx-$(detect_environment) 2>/dev/null || true
                # 删除Nginx镜像（如果存在自定义镜像）
                docker rmi wedding-nginx:$(detect_environment)-latest 2>/dev/null || true
                ;;
            *)
                log_warning "未知服务: $service，跳过清理"
                ;;
        esac
    done
    
    log_success "指定服务资源清理完成"
}

# 重新构建部署（完全清理后重新部署）
redeploy() {
    log_info "开始重新构建并部署..."

    # 停止服务
    stop_services 2>/dev/null || true
    
    # 清理指定服务的资源
    if [[ -n "$SERVICES_TO_BUILD" ]]; then
        clean_specific_services "$SERVICES_TO_BUILD"
    else
        # 清理所有资源
        clean_resources
    fi
    
    # 强制设置构建标志，确保重新构建
    FORCE_REBUILD=true
    
    # 执行完整部署
    execute_full_deploy
    
    log_success "重新构建部署完成！"
}

# 初始化数据库
initialize_database() {
    log_info "执行优化的数据库初始化..."
    
    # 使用database-management.sh进行数据库初始化
    if [[ -f "$PROJECT_ROOT/deployment/scripts/database-management.sh" ]]; then
        cd "$PROJECT_ROOT/deployment/scripts"
        chmod +x database-management.sh
        if ./database-management.sh init; then
            log_success "数据库初始化完成"
            return 0
        else
            log_error "数据库初始化失败"
            return 1
        fi
    else
        log_error "数据库管理脚本不存在: $PROJECT_ROOT/deployment/scripts/database-management.sh"
        return 1
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=5
    local attempt=1
    
    # 获取环境配置
    get_config_files
    if [[ -f "$ENV_FILE" ]]; then
        source "$ENV_FILE"
    fi
    
    # 使用配置中的端口
    local web_port=${WEB_PORT:-8080}
    local api_port=${SERVER_PORT:-3000}
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "健康检查尝试 $attempt/$max_attempts"
        
        local healthy=0
        
        # 检查Web服务
        if curl -f -m 5 -s http://localhost:$web_port/health >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Web服务正常"
            healthy=$((healthy + 1))
        else
            log_warning "Web服务检查失败"
        fi
        
        # 检查API服务
        if curl -f -m 5 -s http://localhost:$api_port/health >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} API服务正常"
            healthy=$((healthy + 1))
        else
            log_warning "API服务检查失败"
        fi
        
        # 检查Swagger文档
        if curl -f -m 5 -s http://localhost:$api_port/api/v1/docs >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Swagger文档可访问"
            healthy=$((healthy + 1))
        else
            log_warning "Swagger文档检查失败"
        fi
        
        if [[ $healthy -ge 2 ]]; then
            log_success "健康检查通过"
            return 0
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log_info "等待15秒后重试..."
            sleep 15
        fi
        
        ((attempt++))
    done
    
    log_error "健康检查失败，建议执行重新构建: ./deploy.sh redeploy"
    return 1
}

# 查看日志
show_logs() {
    local service="$1"
    get_config_files
    
    cd "$PROJECT_ROOT"
    
    if [[ -n "$service" ]]; then
        log_info "显示 $service 服务日志..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f --tail=50 "$service"
    else
        log_info "显示所有服务日志..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=20
    fi
}

# 清理资源
clean_resources() {
    log_info "清理Docker资源..."
    
    # 停止服务
    stop_services 2>/dev/null || true
    
    # 停止并移除所有wedding相关的容器（如果存在）
    log_info "停止并移除所有wedding相关的容器..."
    docker stop $(docker ps -aq -f name=wedding-) 2>/dev/null || true
    docker rm $(docker ps -aq -f name=wedding-) 2>/dev/null || true
    
    # 删除 wedding-web 和 wedding-api 镜像（如果存在）
    log_info "删除 wedding-web 和 wedding-api 镜像..."
    docker rmi wedding-web:$(detect_environment)-latest 2>/dev/null || true
    docker rmi wedding-api:$(detect_environment)-latest 2>/dev/null || true
    
    # 清理wedding相关的网络和卷
    docker network rm $(docker network ls -q -f name=wedding-) 2>/dev/null || true
    docker volume rm $(docker volume ls -q -f name=wedding-) 2>/dev/null || true
    
    # 清理其他资源
    docker system prune -f >/dev/null 2>&1 || true
    docker volume prune -f >/dev/null 2>&1 || true
    docker network prune -f >/dev/null 2>&1 || true
    
    log_success "资源清理完成"
}

# 测试配置
test_config() {
    log_info "测试配置文件..."
    get_config_files
    
    cd "$PROJECT_ROOT"
    
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} 配置文件语法正确"
        return 0
    else
        echo -e "${RED}✗${NC} 配置文件语法错误"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config
        return 1
    fi
}


# 主函数
main() {
    local command="${1:-help}"
    
    # 解析参数
    parse_args "$@"
    
    case $command in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        deploy)
            smart_deploy
            ;;
        redeploy)
            redeploy
            ;;
        logs)
            show_logs "$2"
            ;;
        clean)
            clean_resources
            ;;
        health)
            health_check
            ;;
        test)
            test_config
            ;;
        diagnose)
            diagnose_nginx
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}未知命令: $command${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
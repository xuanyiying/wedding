#!/bin/bash

# Wedding Client 数据库备份脚本
# 用于在初始化前备份现有数据

set -e

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

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 检测环境
detect_environment() {
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^deployment-web:latest$"; then
        echo "tencent"
    else
        echo "production"
    fi
}

ENV_TYPE=$(detect_environment)

# 设置配置文件路径
if [[ "$ENV_TYPE" == "development" ]]; then
    COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
    ENV_FILE="$PROJECT_ROOT/deployment/environments/.env.dev"
else
    COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
    ENV_FILE="$PROJECT_ROOT/deployment/environments/.env.prod"
fi

# 创建备份目录
BACKUP_DIR="$PROJECT_ROOT/backups/database"
mkdir -p "$BACKUP_DIR"

# 生成备份文件名
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/wedding_club_backup_${TIMESTAMP}.sql"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    数据库备份工具${NC}"
echo -e "${BLUE}========================================${NC}"

log_info "环境类型: $ENV_TYPE"
log_info "备份文件: $BACKUP_FILE"

# 检查MySQL服务状态
check_mysql_service() {
    log_info "检查MySQL服务状态..."
    
    if ! docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps mysql | grep -q "Up"; then
        log_error "MySQL服务未运行"
        return 1
    fi
    
    log_success "MySQL服务正在运行"
}

# 执行数据库备份
backup_database() {
    log_info "开始备份数据库..."
    
    # 从环境文件获取数据库密码
    local mysql_root_password=$(grep "MYSQL_ROOT_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2)
    local database_name=$(grep "MYSQL_DATABASE=" "$ENV_FILE" | cut -d'=' -f2 || echo "wedding_club")
    
    if [[ -z "$mysql_root_password" ]]; then
        log_error "无法从环境文件获取MySQL root密码"
        return 1
    fi
    
    # 执行备份
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T mysql \
        mysqldump -u root -p"$mysql_root_password" \
        --single-transaction \
        --routines \
        --triggers \
        --databases "$database_name" > "$BACKUP_FILE"; then
        
        log_success "数据库备份完成: $BACKUP_FILE"
        
        # 显示备份文件大小
        local file_size=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
        log_info "备份文件大小: $file_size"
        
        return 0
    else
        log_error "数据库备份失败"
        return 1
    fi
}

# 验证备份文件
verify_backup() {
    log_info "验证备份文件..."
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "备份文件不存在"
        return 1
    fi
    
    # 检查文件是否为空
    if [[ ! -s "$BACKUP_FILE" ]]; then
        log_error "备份文件为空"
        return 1
    fi
    
    # 检查文件头部是否包含SQL注释
    if head -5 "$BACKUP_FILE" | grep -q "mysqldump"; then
        log_success "备份文件验证通过"
        return 0
    else
        log_warning "备份文件格式可能有问题，请手动检查"
        return 1
    fi
}

# 清理旧备份
cleanup_old_backups() {
    local retention_days=${1:-7}
    
    log_info "清理${retention_days}天前的旧备份文件..."
    
    if find "$BACKUP_DIR" -name "wedding_club_backup_*.sql" -mtime +$retention_days -exec rm {} \; 2>/dev/null; then
        log_success "旧备份文件清理完成"
    else
        log_info "没有需要清理的旧备份文件"
    fi
}

# 显示备份列表
list_backups() {
    echo -e "\n${BLUE}现有备份文件:${NC}"
    if ls -la "$BACKUP_DIR"/wedding_club_backup_*.sql 2>/dev/null; then
        echo ""
        log_info "备份文件总数: $(ls "$BACKUP_DIR"/wedding_club_backup_*.sql 2>/dev/null | wc -l)"
    else
        echo "  (无备份文件)"
    fi
}

# 主函数
main() {
    local retention_days=${1:-7}
    
    # 检查MySQL服务
    if ! check_mysql_service; then
        log_error "请先启动MySQL服务"
        exit 1
    fi
    
    # 执行备份
    if backup_database && verify_backup; then
        # 清理旧备份
        cleanup_old_backups "$retention_days"
        
        # 显示备份列表
        list_backups
        
        echo ""
        log_success "数据库备份操作完成！"
        echo ""
        echo -e "${YELLOW}备份文件位置:${NC} $BACKUP_FILE"
        echo -e "${YELLOW}恢复命令示例:${NC}"
        echo "  docker-compose -f \"$COMPOSE_FILE\" --env-file \"$ENV_FILE\" exec -T mysql mysql -u root -p < \"$BACKUP_FILE\""
        echo ""
    else
        log_error "数据库备份失败"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "Wedding Client 数据库备份脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [保留天数]    # 备份数据库并清理旧备份（默认保留7天）"
    echo "  $0 --list       # 显示现有备份文件"
    echo "  $0 --help       # 显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0              # 备份数据库，保留7天内的备份"
    echo "  $0 14           # 备份数据库，保留14天内的备份"
    echo "  $0 --list       # 列出所有备份文件"
    echo ""
}

# 解析命令行参数
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --list|-l)
        list_backups
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
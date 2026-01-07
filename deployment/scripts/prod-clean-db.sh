#!/bin/bash
# =============================================================================
# Wedding Club - 生产环境数据库清理工具
# =============================================================================
# 注意：此操作不可逆，执行前请务必确认！
# =============================================================================

set -e

# 加载环境变量
if [ -f "./deployment/environments/.env.prod" ]; then
    source ./deployment/environments/.env.prod
else
    echo "❌ 未找到生产环境配置文件: ./deployment/environments/.env.prod"
    exit 1
fi

DB_CONTAINER="wedding-service-mysql-prod"
DB_NAME=${MYSQL_DATABASE:-wedding_db}
DB_USER=${MYSQL_USER:-root}
DB_PASS=${MYSQL_PASSWORD}

echo "⚠️  警告：您正在准备清理生产环境数据库 [$DB_NAME] 的测试数据！"
echo "⚠️  将保留 admin 用户，清空所有业务表（档期、作品、联系人、日志等）。"
read -p "确认执行清理吗？ (y/N): " confirm

if [[ $confirm != "y" && $confirm != "Y" ]]; then
    echo "❌ 操作已取消。"
    exit 0
fi

# 1. 自动备份（以防万一）
BACKUP_FILE="./deployment/backups/pre_clean_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p ./deployment/backups
echo "📦 正在备份数据库到 $BACKUP_FILE ..."
docker exec $DB_CONTAINER mysqldump -u$DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE
echo "✅ 备份完成。"

# 2. 执行清理 SQL
echo "🧹 正在执行清理..."

CLEAN_SQL="
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE contacts;
TRUNCATE TABLE schedules;
TRUNCATE TABLE works;
TRUNCATE TABLE work_likes;
TRUNCATE TABLE operation_logs;
TRUNCATE TABLE issues;
TRUNCATE TABLE view_stats;
TRUNCATE TABLE team_members;
TRUNCATE TABLE teams;
TRUNCATE TABLE media_profiles;
TRUNCATE TABLE files;
DELETE FROM user_permissions WHERE user_id NOT IN (SELECT id FROM users WHERE username = 'admin');
DELETE FROM users WHERE username != 'admin';
SET FOREIGN_KEY_CHECKS = 1;
"

echo "$CLEAN_SQL" | docker exec -i $DB_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME

echo "✨ 生产环境数据清理成功！"
echo "💡 提示：物理文件（OSS/Minio中的图片）未删除，如需清理请手动处理存储桶。"

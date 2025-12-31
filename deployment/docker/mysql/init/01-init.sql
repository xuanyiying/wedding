-- 婚礼服务平台数据库初始化脚本
-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `wedding_service` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 切换到数据库
USE `wedding_service`;

-- 确保用户 wedding_service 存在并允许从任何 IP 连接
-- 注意：在生产环境中，出于安全考虑，建议将 '%' 替换为具体的客户端 IP
CREATE USER IF NOT EXISTS 'wedding_service'@'%' IDENTIFIED BY 'password_123';

-- 授权所有权限给 wedding_service 用户
GRANT ALL PRIVILEGES ON `wedding_service`.* TO 'wedding_service'@'%';

-- 对于 MySQL 8.0+，确保使用兼容的密码插件
ALTER USER 'wedding_service'@'%' IDENTIFIED WITH mysql_native_password BY 'password_123';

-- 刷新权限
FLUSH PRIVILEGES;

-- 打印成功消息
SELECT 'Database and User initialized successfully!' as result;

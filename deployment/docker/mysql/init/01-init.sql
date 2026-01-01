-- 婚礼服务平台数据库初始化脚本
-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `wedding_service` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 切换到数据库
USE `wedding_service`;

-- 打印成功消息
SELECT 'Database initialized successfully!' as result;

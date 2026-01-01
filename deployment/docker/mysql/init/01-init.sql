-- 婚礼服务平台数据库初始化脚本
-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `wedding_service` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 切换到数据库
USE `wedding_service`;

-- 确保用户存在并拥有权限（仅在初始化时运行）
-- 注意：生产环境建议通过环境变量自动创建，这里显式授权
GRANT ALL PRIVILEGES ON `wedding_service`.* TO 'wedding_service'@'%';
FLUSH PRIVILEGES;

-- 打印成功消息
SELECT 'Database initialized successfully!' as result;

-- 婚礼服务平台数据库初始化脚本
-- 根据模型定义和初始化脚本生成
-- 创建时间: 2024

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 使用数据库
USE host;

-- ================================
-- 1. 创建用户表 (users)
-- ================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL COMMENT '用户ID',
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `email` varchar(100) NOT NULL COMMENT '邮箱',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `password_hash` varchar(255) NOT NULL COMMENT '密码哈希',
  `salt` varchar(32) NOT NULL COMMENT '密码盐值',
  `role` enum('super_admin','admin','user') NOT NULL DEFAULT 'user' COMMENT '用户角色',
  `status` enum('active','inactive','suspended','deleted') NOT NULL DEFAULT 'active' COMMENT '用户状态',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT '头像URL',
  `real_name` varchar(100) DEFAULT NULL COMMENT '真实姓名',
  `nickname` varchar(100) DEFAULT NULL COMMENT '昵称',
  `bio` text COMMENT '个人简介',
  `specialties` json DEFAULT NULL COMMENT '专业技能',
  `experience_years` int DEFAULT 0 COMMENT '从业年限',
  `location` varchar(200) DEFAULT NULL COMMENT '所在地区',
  `contact_info` json DEFAULT NULL COMMENT '联系方式',
  `social_links` json DEFAULT NULL COMMENT '社交媒体链接',
  `last_login_at` datetime DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` varchar(45) DEFAULT NULL COMMENT '最后登录IP',
  `email_verified_at` datetime DEFAULT NULL COMMENT '邮箱验证时间',
  `phone_verified_at` datetime DEFAULT NULL COMMENT '手机验证时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` datetime DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_username` (`username`),
  UNIQUE KEY `idx_users_email` (`email`),
  KEY `idx_users_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ================================
-- 2. 创建日程表 (schedules)
-- ================================
DROP TABLE IF EXISTS `schedules`;
CREATE TABLE `schedules` (
  `id` varchar(36) NOT NULL COMMENT '日程ID',
  `user_id` varchar(36) NOT NULL COMMENT '用户ID (主持人或团队成员)',
  `customer_id` varchar(36) DEFAULT NULL COMMENT '客户ID',
  `title` varchar(255) NOT NULL COMMENT '日程标题',
  `description` text COMMENT '详细描述',
  `wedding_date` date NOT NULL COMMENT '婚礼日期',
  `wedding_time` enum('lunch','dinner','full_day') NOT NULL COMMENT '婚礼时间',
  `location` varchar(255) DEFAULT NULL COMMENT '地点',
  `venue_name` varchar(200) DEFAULT NULL COMMENT '场地名称',
  `venue_address` varchar(500) DEFAULT NULL COMMENT '场地地址',
  `event_type` enum('wedding','consultation','other') NOT NULL COMMENT '事件类型',
  `status` enum('available','booked','confirmed','completed','cancelled','deleted','expired','busy','vacation') NOT NULL DEFAULT 'available' COMMENT '日程状态',
  `price` decimal(10,2) DEFAULT NULL COMMENT '价格',
  `deposit` decimal(10,2) DEFAULT NULL COMMENT '定金',
  `customer_name` varchar(100) DEFAULT NULL COMMENT '客户姓名',
  `customer_phone` varchar(20) DEFAULT NULL COMMENT '客户电话',
  `is_Paid` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否已支付',
  `requirements` text COMMENT '特殊要求',
  `notes` text COMMENT '备注',
  `tags` json DEFAULT NULL COMMENT '标签',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` datetime DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_schedules_user_id_wedding_date` (`user_id`,`wedding_date`),
  KEY `idx_schedules_customer_id` (`customer_id`),
  KEY `idx_schedules_status_event_type` (`status`,`event_type`),
  KEY `idx_schedules_wedding_date_time` (`wedding_date`,`wedding_time`),
  KEY `idx_schedules_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_schedules_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_schedules_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日程表';

-- ================================
-- 3. 创建系统配置表 (system_configs)
-- ================================
DROP TABLE IF EXISTS `system_configs`;
CREATE TABLE `system_configs` (
  `id` varchar(50) NOT NULL COMMENT '配置ID',
  `config_key` varchar(100) NOT NULL COMMENT '配置键',
  `config_value` text COMMENT '配置值',
  `default_value` text COMMENT '默认值',
  `config_type` enum('STRING','NUMBER','BOOLEAN','JSON','TEXT') NOT NULL DEFAULT 'STRING' COMMENT '配置类型',
  `category` varchar(50) NOT NULL DEFAULT 'general' COMMENT '配置分类',
  `description` varchar(255) DEFAULT NULL COMMENT '配置描述',
  `validation_rule` varchar(255) DEFAULT NULL COMMENT '验证规则',
  `is_public` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否公开',
  `is_editable` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否可编辑',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_system_configs_config_key` (`config_key`),
  KEY `idx_system_configs_category` (`category`),
  KEY `idx_system_configs_is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ================================
-- 4. 插入系统配置初始数据
-- ================================

-- 删除现有数据
DELETE FROM system_configs;

-- 插入初始配置数据
INSERT INTO system_configs (id, config_key, config_value, default_value, config_type, category, description, validation_rule, is_public, is_editable, sort_order, created_at, updated_at) VALUES
-- 网站基本设置
('site_001', 'site', '{"name":"婚礼服务平台","description":"专业的婚礼策划与服务平台，为您打造完美的婚礼体验","keywords":"婚礼策划,婚礼摄影,婚礼主持,婚礼服务,婚庆公司","logo":"./assets/images/logo.png","favicon":"./assets/images/favicon.ico"}', '{"name":"婚礼服务平台","description":"专业的婚礼策划与服务平台，为您打造完美的婚礼体验","keywords":"婚礼策划,婚礼摄影,婚礼主持,婚礼服务,婚庆公司","logo":"./assets/images/logo.png","favicon":"./assets/images/favicon.ico"}', 'JSON', 'site', '网站基本信息配置', NULL, 1, 1, 1, NOW(), NOW()),
('site_002', 'contactEmail', 'contact@wedding.com', 'contact@wedding.com', 'STRING', 'site', '联系邮箱', NULL, 1, 1, 2, NOW(), NOW()),
('site_003', 'contactPhone', '400-123-4567', '400-123-4567', 'STRING', 'site', '联系电话', NULL, 1, 1, 3, NOW(), NOW()),

-- 首页版块设置
('site_014', 'homepageSections', '{"hero":{"backgroundImage":"/images/hero-bg.jpg","visible":true,"title":"完美婚礼，从这里开始","description":"专业团队为您打造梦想中的婚礼","ctaText":"立即咨询","ctaLink":"/contact"},"team":{"visible":true,"title":"专业团队","subtitle":"经验丰富的婚礼策划师","description":"专业团队为您打造梦想中的婚礼"},"teamShowcase":{"visible":true,"title":"团队风采","subtitle":"展示我们的专业实力","description":"查看我们团队的精彩瞬间"},"portfolio":{"visible":true,"title":"精选作品","subtitle":"见证每一个美好时刻","description":"浏览我们的婚礼摄影作品集"},"schedule":{"visible":true,"title":"档期查询","subtitle":"查询可预约的主持人","description":"查询可预约的主持人"},"contact":{"visible":true,"title":"联系我们","subtitle":"随时为您提供咨询","description":"多种方式联系我们的团队","address":"北京市朝阳区婚礼大厦","phone":"400-123-4567","email":"contact@wedding.com","wechat":"wedding_service","xiaohongshu":"wedding_xiaohongshu","douyin":"wedding_douyin"}}', '{"hero":{"backgroundImage":"/images/hero-bg.jpg","visible":true,"title":"完美婚礼，从这里开始","description":"专业团队为您打造梦想中的婚礼","ctaText":"立即咨询","ctaLink":"/contact"},"team":{"visible":true,"title":"专业团队","subtitle":"经验丰富的婚礼策划师","description":"专业团队为您打造梦想中的婚礼"},"teamShowcase":{"visible":true,"title":"团队风采","subtitle":"展示我们的专业实力","description":"查看我们团队的精彩瞬间"},"portfolio":{"visible":true,"title":"精选作品","subtitle":"见证每一个美好时刻","description":"浏览我们的婚礼摄影作品集"},"schedule":{"visible":true,"title":"档期查询","subtitle":"查询可预约的主持人","description":"查询可预约的主持人"},"contact":{"visible":true,"title":"联系我们","subtitle":"随时为您提供咨询","description":"多种方式联系我们的团队","address":"北京市朝阳区婚礼大厦","phone":"400-123-4567","email":"contact@wedding.com","wechat":"wedding_service","xiaohongshu":"wedding_xiaohongshu","douyin":"wedding_douyin"}}', 'JSON', 'site', '首页版块配置', NULL, 1, 1, 14, NOW(), NOW()),

-- 主题设置
('theme_001', 'siteTheme', '{"colors":{"primary":"#1890ff","secondary":"#52c41a","background":"#ffffff","text":"#000000"},"fonts":{"primary":"Arial, sans-serif","secondary":"Georgia, serif"},"spacing":{"containerPadding":"20px","sectionPadding":"40px"}}', '{"colors":{"primary":"#1890ff","secondary":"#52c41a","background":"#ffffff","text":"#000000"},"fonts":{"primary":"Arial, sans-serif","secondary":"Georgia, serif"},"spacing":{"containerPadding":"20px","sectionPadding":"40px"}}', 'JSON', 'theme', '网站主题配置', NULL, 1, 1, 1, NOW(), NOW()),

-- 邮件设置
('email_001', 'email', '{"smtpHost":"smtp.gmail.com","smtpPort":587,"smtpUser":"","smtpPassword":"","smtpSecure":true,"emailFrom":"noreply@wedding.com","emailFromName":"婚礼服务平台"}', '{"smtpHost":"smtp.gmail.com","smtpPort":587,"smtpUser":"","smtpPassword":"","smtpSecure":true,"emailFrom":"noreply@wedding.com","emailFromName":"婚礼服务平台"}', 'JSON', 'email', '邮件服务配置', NULL, 0, 1, 1, NOW(), NOW()),

-- 安全设置
('security_001', 'enable_registration', 'true', 'true', 'BOOLEAN', 'security', '允许用户注册', NULL, 0, 1, 1, NOW(), NOW()),
('security_002', 'enable_captcha', 'false', 'false', 'BOOLEAN', 'security', '启用验证码', NULL, 0, 1, 2, NOW(), NOW()),
('security_003', 'session_timeout', '7200', '7200', 'NUMBER', 'security', '会话超时时间(秒)', NULL, 0, 1, 3, NOW(), NOW()),
('security_004', 'max_login_attempts', '5', '5', 'NUMBER', 'security', '最大登录尝试次数', NULL, 0, 1, 4, NOW(), NOW()),
('security_005', 'ip_whitelist', '[]', '[]', 'JSON', 'security', 'IP白名单', NULL, 0, 1, 5, NOW(), NOW()),
('security_006', 'password_policy', '{"minLength":8,"requireUppercase":true,"requireLowercase":true,"requireNumbers":true,"requireSpecialChars":false}', '{"minLength":8,"requireUppercase":true,"requireLowercase":true,"requireNumbers":true,"requireSpecialChars":false}', 'JSON', 'security', '密码策略', NULL, 0, 1, 6, NOW(), NOW()),

-- 系统设置
('system_001', 'system_version', '1.0.0', '1.0.0', 'STRING', 'system', '系统版本', NULL, 1, 0, 1, NOW(), NOW()),
('system_002', 'maintenance_mode', 'false', 'false', 'BOOLEAN', 'system', '维护模式', NULL, 0, 1, 2, NOW(), NOW()),
('system_003', 'debug_mode', 'false', 'false', 'BOOLEAN', 'system', '调试模式', NULL, 0, 1, 3, NOW(), NOW()),
('system_004', 'cache_enabled', 'true', 'true', 'BOOLEAN', 'system', '启用缓存', NULL, 0, 1, 4, NOW(), NOW()),
('system_005', 'log_level', 'info', 'info', 'STRING', 'system', '日志级别', NULL, 0, 1, 5, NOW(), NOW()),

-- SEO设置
('seo_001', 'seo', '{"title":"婚礼服务平台 - 专业婚礼策划与服务","description":"专业的婚礼策划与服务平台，提供婚礼摄影、婚礼主持、婚礼策划等一站式服务","keywords":"婚礼策划,婚礼摄影,婚礼主持,婚礼服务,婚庆公司","ogImage":"/images/og-image.jpg","twitterCard":"summary_large_image"}', '{"title":"婚礼服务平台 - 专业婚礼策划与服务","description":"专业的婚礼策划与服务平台，提供婚礼摄影、婚礼主持、婚礼策划等一站式服务","keywords":"婚礼策划,婚礼摄影,婚礼主持,婚礼服务,婚庆公司","ogImage":"/images/og-image.jpg","twitterCard":"summary_large_image"}', 'JSON', 'seo', 'SEO优化配置', NULL, 1, 1, 1, NOW(), NOW());

-- ================================
-- 5. 创建默认管理员用户
-- ================================

-- 插入默认管理员用户 (密码: admin123)
-- 注意：实际部署时应该修改默认密码
INSERT INTO users (
  id, 
  username, 
  email, 
  password_hash, 
  salt, 
  role, 
  status, 
  real_name,
  created_at, 
  updated_at
) VALUES (
  UUID(), 
  'admin', 
  'admin@wedding.com', 
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', -- 这是示例hash，实际应使用bcrypt
  'default_salt', 
  'super_admin', 
  'active', 
  '系统管理员',
  NOW(), 
  NOW()
);

-- ================================
-- 6. 重新启用外键检查
-- ================================
SET FOREIGN_KEY_CHECKS = 1;

-- ================================
-- 7. 显示初始化完成信息
-- ================================
SELECT 'Database initialization completed successfully!' as result;
SELECT 'Tables created: users, schedules, system_configs' as tables_info;
SELECT 'Default admin user created with username: admin' as admin_info;
SELECT 'Please change the default admin password after first login!' as security_warning;
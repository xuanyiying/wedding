-- 系统配置表初始化SQL脚本
-- 创建system_configs表并插入初始数据

USE wedding_club;

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

SELECT 'System configs initialized successfully' as result;
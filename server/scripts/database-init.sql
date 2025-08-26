-- 婚礼服务平台数据库初始化脚本
-- 根据模型定义和初始化脚本生成
-- 创建时间: 2024

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 使用数据库
USE wedding_club;

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
-- 4. 创建联系表单表 (contacts)
-- ================================
DROP TABLE IF EXISTS `contacts`;
CREATE TABLE `contacts` (
  `id` varchar(36) NOT NULL COMMENT '联系表单ID',
  `name` varchar(100) NOT NULL COMMENT '联系人姓名',
  `phone` varchar(20) NOT NULL COMMENT '联系电话',
  `email` varchar(255) NOT NULL COMMENT '邮箱地址',
  `wedding_date` date NOT NULL COMMENT '婚礼日期',
  `wedding_time` time NOT NULL COMMENT '婚礼时间',
  `location` varchar(255) NOT NULL COMMENT '婚礼地点',
  `guest_count` int NOT NULL COMMENT '宾客人数',
  `service_type` enum('wedding','engagement','anniversary','other') NOT NULL COMMENT '服务类型',
  `budget` enum('5000-10000','10000-20000','20000-50000','50000+') NOT NULL COMMENT '预算范围',
  `requirements` text DEFAULT NULL COMMENT '特殊要求',
  `status` enum('pending','contacted','completed','cancelled') NOT NULL DEFAULT 'pending' COMMENT '处理状态',
  `notes` text DEFAULT NULL COMMENT '管理员备注',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_contacts_phone` (`phone`),
  KEY `idx_contacts_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='联系表单表';

-- ================================
-- 5. 创建文件表 (files)
-- ================================
DROP TABLE IF EXISTS `files`;
CREATE TABLE `files` (
  `id` varchar(36) NOT NULL COMMENT '文件ID',
  `user_id` varchar(36) NOT NULL COMMENT '上传用户ID',
  `original_name` varchar(255) NOT NULL COMMENT '原始文件名',
  `filename` varchar(255) NOT NULL COMMENT '存储文件名',
  `file_path` varchar(500) NOT NULL COMMENT '文件路径',
  `file_url` varchar(500) NOT NULL COMMENT '访问URL',
  `file_size` bigint NOT NULL COMMENT '文件大小(字节)',
  `mime_type` varchar(100) NOT NULL COMMENT 'MIME类型',
  `file_type` enum('image','video','audio','document','other') NOT NULL COMMENT '文件类型',
  `category` varchar(50) DEFAULT NULL COMMENT '文件分类',
  `width` int DEFAULT NULL COMMENT '图片/视频宽度',
  `height` int DEFAULT NULL COMMENT '图片/视频高度',
  `duration` int DEFAULT NULL COMMENT '音视频时长(秒)',
  `thumbnail_url` varchar(500) DEFAULT NULL COMMENT '缩略图URL',
  `hash_md5` varchar(32) DEFAULT NULL COMMENT 'MD5哈希值',
  `hash_sha256` varchar(64) DEFAULT NULL COMMENT 'SHA256哈希值',
  `storage_type` enum('local','minio','oss','cos','s3') NOT NULL DEFAULT 'minio' COMMENT '存储类型',
  `bucket_name` varchar(100) DEFAULT NULL COMMENT '存储桶名称',
  `is_public` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否公开访问',
  `download_count` int NOT NULL DEFAULT 0 COMMENT '下载次数',
  `metadata` json DEFAULT NULL COMMENT '文件元数据',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` datetime DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_files_user_id` (`user_id`),
  KEY `idx_files_type_category` (`file_type`,`category`),
  KEY `idx_files_hash_md5` (`hash_md5`),
  CONSTRAINT `fk_files_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件表';

-- ================================
-- 6. 创建媒体资料表 (media_profiles)
-- ================================
DROP TABLE IF EXISTS `media_profiles`;
CREATE TABLE `media_profiles` (
  `id` varchar(36) NOT NULL COMMENT '用户公开资料ID',
  `user_id` varchar(36) NOT NULL COMMENT '用户ID',
  `file_id` varchar(36) NOT NULL COMMENT '文件ID',
  `file_type` enum('image','video','audio','document','other') NOT NULL COMMENT '媒体类型',
  `media_order` int NOT NULL COMMENT '媒体排序',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_media_profiles_user_file` (`user_id`,`file_id`),
  KEY `idx_media_profiles_user_order` (`user_id`,`media_order`),
  CONSTRAINT `fk_media_profiles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_media_profiles_file_id` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='媒体资料表';

-- ================================
-- 7. 创建操作日志表 (operation_logs)
-- ================================
DROP TABLE IF EXISTS `operation_logs`;
CREATE TABLE `operation_logs` (
  `id` varchar(36) NOT NULL COMMENT '日志ID',
  `user_id` varchar(36) DEFAULT NULL COMMENT '操作用户ID',
  `module` varchar(50) NOT NULL COMMENT '模块名称',
  `action` varchar(100) NOT NULL COMMENT '操作动作',
  `level` enum('INFO','WARN','ERROR','DEBUG') NOT NULL DEFAULT 'INFO' COMMENT '日志级别',
  `resource_type` varchar(50) DEFAULT NULL COMMENT '资源类型',
  `resource_id` varchar(36) DEFAULT NULL COMMENT '资源ID',
  `description` text DEFAULT NULL COMMENT '操作描述',
  `request_method` varchar(10) DEFAULT NULL COMMENT '请求方法',
  `request_url` varchar(500) DEFAULT NULL COMMENT '请求URL',
  `request_params` json DEFAULT NULL COMMENT '请求参数',
  `response_status` int DEFAULT NULL COMMENT '响应状态码',
  `response_data` json DEFAULT NULL COMMENT '响应数据',
  `error_message` text DEFAULT NULL COMMENT '错误信息',
  `stack_trace` text DEFAULT NULL COMMENT '堆栈跟踪',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` text DEFAULT NULL COMMENT '用户代理',
  `execution_time` int DEFAULT NULL COMMENT '执行时间(毫秒)',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_operation_logs_user_id` (`user_id`),
  KEY `idx_operation_logs_resource` (`resource_type`,`resource_id`),
  KEY `idx_operation_logs_created_at` (`created_at`),
  CONSTRAINT `fk_operation_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- ================================
-- 8. 创建团队表 (teams)
-- ================================
DROP TABLE IF EXISTS `teams`;
CREATE TABLE `teams` (
  `id` varchar(36) NOT NULL COMMENT '团队ID',
  `name` varchar(100) NOT NULL COMMENT '团队名称',
  `description` text DEFAULT NULL COMMENT '团队描述',
  `avatar` varchar(500) DEFAULT NULL COMMENT '团队头像',
  `background` varchar(255) DEFAULT NULL COMMENT '背景图片',
  `contact_phone` varchar(20) DEFAULT NULL COMMENT '联系电话',
  `contact_email` varchar(100) DEFAULT NULL COMMENT '联系邮箱',
  `contact_wechat` varchar(50) DEFAULT NULL COMMENT '微信号',
  `contact_qq` varchar(20) DEFAULT NULL COMMENT 'QQ号',
  `address` varchar(200) DEFAULT NULL COMMENT '地址',
  `service_areas` text DEFAULT NULL COMMENT 'JSON格式存储服务区域数组',
  `specialties` text DEFAULT NULL COMMENT 'JSON格式存储专业特长数组',
  `price_range` varchar(50) DEFAULT NULL COMMENT '价格区间',
  `owner_id` varchar(36) NOT NULL COMMENT '团队所有者ID',
  `member_count` int NOT NULL DEFAULT 1 COMMENT '成员数量',
  `status` varchar(20) NOT NULL DEFAULT 'active' COMMENT '状态: disabled-禁用 active-正常 pending-待审核',
  `view_count` int NOT NULL DEFAULT 0 COMMENT '浏览次数',
  `rating` decimal(3,2) NOT NULL DEFAULT 0.00 COMMENT '团队评级',
  `rating_count` int NOT NULL DEFAULT 0 COMMENT '评价数量',
  `established_at` datetime DEFAULT NULL COMMENT '成立时间',
  `scale` varchar(50) DEFAULT NULL COMMENT '团队规模',
  `achievements` text DEFAULT NULL COMMENT '团队成就，JSON格式',
  `certifications` text DEFAULT NULL COMMENT '团队资质，JSON格式',
  `equipment_list` text DEFAULT NULL COMMENT '设备清单，JSON格式',
  `service_packages` text DEFAULT NULL COMMENT '服务套餐，JSON格式',
  `working_hours` text DEFAULT NULL COMMENT '工作时间',
  `emergency_contact` varchar(50) DEFAULT NULL COMMENT '紧急联系人',
  `emergency_phone` varchar(20) DEFAULT NULL COMMENT '紧急联系电话',
  `bank_account` varchar(50) DEFAULT NULL COMMENT '对公账户',
  `tax_number` varchar(50) DEFAULT NULL COMMENT '税号',
  `legal_representative` varchar(50) DEFAULT NULL COMMENT '法人代表',
  `registration_address` varchar(200) DEFAULT NULL COMMENT '注册地址',
  `operating_address` varchar(200) DEFAULT NULL COMMENT '经营地址',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否已认证',
  `business_license` varchar(255) DEFAULT NULL COMMENT '营业执照',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` datetime DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_teams_owner_id` (`owner_id`),
  KEY `idx_teams_status` (`status`),
  KEY `idx_teams_rating` (`rating`),
  KEY `idx_teams_view_count` (`view_count`),
  KEY `idx_teams_created_at` (`created_at`),
  CONSTRAINT `fk_teams_owner_id` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队表';

-- ================================
-- 9. 创建团队成员表 (team_members)
-- ================================
DROP TABLE IF EXISTS `team_members`;
CREATE TABLE `team_members` (
  `id` varchar(36) NOT NULL COMMENT '团队成员ID',
  `team_id` varchar(36) NOT NULL COMMENT '团队ID',
  `user_id` varchar(36) NOT NULL COMMENT '用户ID',
  `role` tinyint NOT NULL DEFAULT 1 COMMENT '角色: 1-成员 2-管理员 3-所有者',
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用 1-正常 2-待审核',
  `inviter_id` varchar(36) NOT NULL COMMENT '邀请人ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` datetime DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_team_members_team_user` (`team_id`,`user_id`),
  KEY `idx_team_members_team_id` (`team_id`),
  KEY `idx_team_members_user_id` (`user_id`),
  KEY `idx_team_members_status` (`status`),
  KEY `idx_team_members_role` (`role`),
  CONSTRAINT `fk_team_members_team_id` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_team_members_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_team_members_inviter_id` FOREIGN KEY (`inviter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队成员表';

-- ================================
-- 10. 创建用户权限表 (user_permissions)
-- ================================
DROP TABLE IF EXISTS `user_permissions`;
CREATE TABLE `user_permissions` (
  `id` varchar(36) NOT NULL COMMENT '权限ID',
  `user_id` varchar(36) NOT NULL COMMENT '用户ID',
  `permission` varchar(100) NOT NULL COMMENT '权限标识',
  `resource_type` varchar(50) DEFAULT NULL COMMENT '资源类型',
  `resource_id` varchar(36) DEFAULT NULL COMMENT '资源ID',
  `granted_by` varchar(36) DEFAULT NULL COMMENT '授权人ID',
  `expires_at` datetime DEFAULT NULL COMMENT '过期时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_permissions` (`user_id`,`permission`,`resource_type`,`resource_id`),
  KEY `idx_user_permissions_user_id` (`user_id`),
  KEY `idx_user_permissions_permission` (`permission`),
  KEY `idx_user_permissions_resource` (`resource_type`,`resource_id`),
  KEY `idx_user_permissions_expires_at` (`expires_at`),
  CONSTRAINT `fk_user_permissions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_permissions_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限表';

-- ================================
-- 11. 创建页面访问统计表 (view_stats)
-- ================================
DROP TABLE IF EXISTS `view_stats`;
CREATE TABLE `view_stats` (
  `id` varchar(36) NOT NULL COMMENT '访问记录ID',
  `page_type` enum('team_member','work','homepage') NOT NULL COMMENT '页面类型',
  `page_id` varchar(36) DEFAULT NULL COMMENT '页面ID（团队成员ID、作品ID或null表示首页）',
  `action_type` enum('view','play') NOT NULL DEFAULT 'view' COMMENT '行为类型：浏览或播放',
  `visitor_ip` varchar(45) NOT NULL COMMENT '访问者IP地址',
  `user_agent` text DEFAULT NULL COMMENT '用户代理字符串',
  `referer` text DEFAULT NULL COMMENT '来源页面',
  `session_id` varchar(128) DEFAULT NULL COMMENT '会话ID',
  `visit_date` date NOT NULL COMMENT '访问日期',
  `duration` int NOT NULL DEFAULT 0 COMMENT '停留时长（秒）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_page_view_stats_page` (`page_type`,`page_id`),
  KEY `idx_page_view_stats_ip` (`visitor_ip`),
  KEY `idx_page_view_stats_session` (`session_id`),
  KEY `idx_page_view_stats_visit_date` (`visit_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='页面访问统计表';

-- ================================
-- 12. 创建作品表 (works)
-- ================================
DROP TABLE IF EXISTS `works`;
CREATE TABLE `works` (
  `id` varchar(36) NOT NULL COMMENT '作品ID',
  `user_id` varchar(36) NOT NULL COMMENT '用户ID',
  `title` varchar(200) NOT NULL COMMENT '作品标题',
  `description` text DEFAULT NULL COMMENT '作品描述',
  `type` enum('photography','videography','hosting','planning','design','other') NOT NULL COMMENT '作品类型',
  `category` enum('wedding','engagement','anniversary','portrait','commercial','other') NOT NULL DEFAULT 'wedding' COMMENT '作品分类',
  `file_ids` json DEFAULT NULL COMMENT '文件ID列表',
  `tags` json DEFAULT NULL COMMENT '标签',
  `location` varchar(255) DEFAULT NULL COMMENT '拍摄地点',
  `wedding_date` date DEFAULT NULL COMMENT '婚礼日期',
  `equipment_info` json DEFAULT NULL COMMENT '设备信息',
  `technical_info` json DEFAULT NULL COMMENT '技术参数',
  `status` enum('draft','published','archived','deleted') NOT NULL DEFAULT 'draft' COMMENT '发布状态',
  `is_featured` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否精选',
  `view_count` int NOT NULL DEFAULT 0 COMMENT '浏览次数',
  `like_count` int NOT NULL DEFAULT 0 COMMENT '点赞次数',
  `share_count` int NOT NULL DEFAULT 0 COMMENT '分享次数',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序权重',
  `published_at` datetime DEFAULT NULL COMMENT '发布时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` datetime DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_works_user_id` (`user_id`),
  KEY `idx_works_category` (`category`),
  KEY `idx_works_status` (`status`),
  KEY `idx_works_user_category_status` (`user_id`,`category`,`status`),
  KEY `idx_works_featured_sort` (`is_featured`,`sort_order`),
  CONSTRAINT `fk_works_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品表';

-- ================================
-- 13. 创建作品点赞表 (work_likes)
-- ================================
DROP TABLE IF EXISTS `work_likes`;
CREATE TABLE `work_likes` (
  `id` varchar(36) NOT NULL COMMENT '点赞ID',
  `work_id` varchar(36) NOT NULL COMMENT '作品ID',
  `user_id` varchar(36) DEFAULT NULL COMMENT '用户ID',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` text DEFAULT NULL COMMENT '用户代理',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_likes_user` (`work_id`,`user_id`),
  UNIQUE KEY `uk_work_likes_ip` (`work_id`,`ip_address`),
  KEY `idx_work_likes_work_id` (`work_id`),
  CONSTRAINT `fk_work_likes_work_id` FOREIGN KEY (`work_id`) REFERENCES `works` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_work_likes_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品点赞表';

-- ================================
-- 14. 插入系统配置初始数据
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
-- 15. 创建默认管理员用户
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
  '$2a$12$nYmA674JQcRwb2cXB78byesUkCsUWhsQJh.tugP8zd2TR/ykef.wu', -- admin123的bcrypt哈希
  'default_salt', 
  'super_admin', 
  'active', 
  '系统管理员',
  NOW(), 
  NOW()
);

-- ================================
-- 16. 重新启用外键检查
-- ================================
SET FOREIGN_KEY_CHECKS = 1;

-- ================================
-- 17. 显示初始化完成信息
-- ================================
SELECT 'Database initialization completed successfully!' as result;
SELECT 'Tables created: users, schedules, system_configs, contacts, files, media_profiles, operation_logs, teams, team_members, user_permissions, view_stats, works, work_likes' as tables_info;
SELECT 'Default admin user created with username: admin' as admin_info;
SELECT 'Please change the default admin password after first login!' as security_warning;
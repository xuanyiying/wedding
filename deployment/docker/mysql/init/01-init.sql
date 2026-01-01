-- 婚礼服务平台数据库初始化脚本
-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `wedding_service` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 切换到数据库
USE `wedding_service`;

-- 确保用户存在并拥有权限
GRANT ALL PRIVILEGES ON `wedding_service`.* TO 'wedding_service'@'%';
FLUSH PRIVILEGES;

-- ==========================================
-- 导入表结构和初始数据
-- ==========================================

-- 婚礼服务平台数据库表结构初始化脚本
-- 注意：此脚本仅用于手动创建表结构，生产环境建议使用Sequelize自动同步
-- 创建时间: 2025-06-27
-- 设置字符集和排序规则
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for contacts
-- ----------------------------
DROP TABLE IF EXISTS `contacts`;
CREATE TABLE `contacts` (
                            `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '联系表单ID',
                            `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '联系人姓名',
                            `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '联系电话',
                            `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮箱地址',
                            `wedding_date` date NOT NULL COMMENT '婚礼日期',
                            `wedding_time` time NOT NULL COMMENT '婚礼时间',
                            `location` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '婚礼地点',
                            `guest_count` int NOT NULL COMMENT '宾客人数',
                            `service_type` enum('wedding','engagement','anniversary','other') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '服务类型',
                            `budget` enum('5000-10000','10000-20000','20000-50000','50000+') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '预算范围',
                            `requirements` text COLLATE utf8mb4_unicode_ci COMMENT '特殊要求',
                            `status` enum('pending','contacted','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '处理状态',
                            `notes` text COLLATE utf8mb4_unicode_ci COMMENT '管理员备注',
                            `created_at` datetime NOT NULL COMMENT '创建时间',
                            `updated_at` datetime NOT NULL COMMENT '更新时间',
                            PRIMARY KEY (`id`),
                            KEY `idx_contacts_phone` (`phone`),
                            KEY `idx_contacts_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='联系表单表';

-- ----------------------------
-- Table structure for files
-- ----------------------------
DROP TABLE IF EXISTS `files`;
CREATE TABLE `files` (
                         `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件ID',
                         `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '上传用户ID',
                         `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '原始文件名',
                         `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '存储文件名',
                         `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件路径',
                         `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '访问URL',
                         `file_size` bigint NOT NULL COMMENT '文件大小(字节)',
                         `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'MIME类型',
                         `file_type` enum('image','video') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件类型',
                         `category` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文件分类',
                         `width` int DEFAULT NULL COMMENT '图片/视频宽度',
                         `height` int DEFAULT NULL COMMENT '图片/视频高度',
                         `duration` int DEFAULT NULL COMMENT '音视频时长(秒)',
                         `thumbnail_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '缩略图URL',
                         `hash_md5` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'MD5哈希值',
                         `hash_sha256` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SHA256哈希值',
                         `storage_type` enum('minio','aws','aliyun','tencent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'minio' COMMENT '存储类型',
                         `bucket_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '存储桶名称',
                         `is_public` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否公开访问',
                         `download_count` int NOT NULL DEFAULT '0' COMMENT '下载次数',
                         `metadata` json DEFAULT NULL COMMENT '文件元数据',
                         `created_at` datetime DEFAULT NULL COMMENT '创建时间',
                         `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
                         `deleted_at` datetime DEFAULT NULL COMMENT '删除时间',
                         PRIMARY KEY (`id`),
                         KEY `idx_files_user_id` (`user_id`),
                         KEY `idx_files_type_category` (`file_type`,`category`),
                         KEY `idx_files_hash_md5` (`hash_md5`),
                         CONSTRAINT `files_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件表';

-- ----------------------------
-- Table structure for issues
-- ----------------------------
DROP TABLE IF EXISTS `issues`;
CREATE TABLE `issues` (
                          `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
                          `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
                          `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
                          `type` enum('bug','feature','enhancement','documentation','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bug',
                          `priority` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
                          `status` enum('open','in_progress','resolved','closed','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
                          `steps_to_reproduce` text COLLATE utf8mb4_unicode_ci,
                          `expected_behavior` text COLLATE utf8mb4_unicode_ci,
                          `actual_behavior` text COLLATE utf8mb4_unicode_ci,
                          `environment` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                          `version` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                          `reporter_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
                          `assignee_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                          `due_date` datetime DEFAULT NULL,
                          `estimated_hours` int DEFAULT NULL,
                          `labels` text COLLATE utf8mb4_unicode_ci,
                          `attachments` text COLLATE utf8mb4_unicode_ci,
                          `vote_count` int NOT NULL DEFAULT '0',
                          `comment_count` int NOT NULL DEFAULT '0',
                          `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                          `deleted_at` datetime DEFAULT NULL,
                          PRIMARY KEY (`id`),
                          KEY `idx_issues_type` (`type`),
                          KEY `idx_issues_priority` (`priority`),
                          KEY `idx_issues_status` (`status`),
                          KEY `idx_issues_reporter_id` (`reporter_id`),
                          KEY `idx_issues_assignee_id` (`assignee_id`),
                          KEY `issues_type` (`type`),
                          KEY `issues_priority` (`priority`),
                          KEY `issues_status` (`status`),
                          KEY `issues_reporter_id` (`reporter_id`),
                          KEY `issues_assignee_id` (`assignee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for media_profiles
-- ----------------------------
DROP TABLE IF EXISTS `media_profiles`;
CREATE TABLE `media_profiles` (
                                  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户公开资料ID',
                                  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
                                  `file_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件ID',
                                  `file_type` enum('image','video') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '媒体类型',
                                  `media_order` int NOT NULL COMMENT '媒体排序',
                                  `created_at` datetime NOT NULL,
                                  `updated_at` datetime NOT NULL,
                                  PRIMARY KEY (`id`),
                                  UNIQUE KEY `uk_media_profiles_user_file` (`user_id`,`file_id`),
                                  UNIQUE KEY `media_profiles_user_id_file_id` (`user_id`,`file_id`),
                                  KEY `idx_media_profiles_user_order` (`user_id`,`media_order`),
                                  KEY `file_id` (`file_id`),
                                  KEY `media_profiles_user_id_media_order` (`user_id`,`media_order`),
                                  CONSTRAINT `media_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
                                  CONSTRAINT `media_profiles_ibfk_2` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='媒体资料表';

-- ----------------------------
-- Table structure for operation_logs
-- ----------------------------
DROP TABLE IF EXISTS `operation_logs`;
CREATE TABLE `operation_logs` (
                                  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日志ID',
                                  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作用户ID',
                                  `module` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模块名称',
                                  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作动作',
                                  `level` enum('INFO','WARN','ERROR','DEBUG') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INFO' COMMENT '日志级别',
                                  `resource_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '资源类型',
                                  `resource_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '资源ID',
                                  `description` text COLLATE utf8mb4_unicode_ci COMMENT '操作描述',
                                  `request_method` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求方法',
                                  `request_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求URL',
                                  `request_params` json DEFAULT NULL COMMENT '请求参数',
                                  `response_status` int DEFAULT NULL COMMENT '响应状态码',
                                  `response_data` json DEFAULT NULL COMMENT '响应数据',
                                  `error_message` text COLLATE utf8mb4_unicode_ci COMMENT '错误信息',
                                  `stack_trace` text COLLATE utf8mb4_unicode_ci COMMENT '堆栈跟踪',
                                  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
                                  `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT '用户代理',
                                  `execution_time` int DEFAULT NULL COMMENT '执行时间(毫秒)',
                                  `created_at` datetime NOT NULL COMMENT '创建时间',
                                  PRIMARY KEY (`id`),
                                  KEY `idx_operation_logs_user_id` (`user_id`),
                                  KEY `idx_operation_logs_resource` (`resource_type`,`resource_id`),
                                  KEY `idx_operation_logs_created_at` (`created_at`),
                                  CONSTRAINT `operation_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- ----------------------------
-- Table structure for schedules
-- ----------------------------
DROP TABLE IF EXISTS `schedules`;
CREATE TABLE `schedules` (
                             `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日程ID',
                             `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID (主持人或团队成员)',
                             `customer_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户ID',
                             `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日程标题',
                             `description` text COLLATE utf8mb4_unicode_ci COMMENT '详细描述',
                             `wedding_date` datetime NOT NULL COMMENT '婚礼日期',
                             `wedding_time` enum('lunch','dinner','full_day') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '婚礼时间',
                             `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '地点',
                             `venue_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '场地名称',
                             `venue_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '场地地址',
                             `event_type` enum('wedding','consultation','other') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '事件类型',
                             `status` enum('available','booked','confirmed','completed','cancelled','deleted','expired','busy','vacation') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available' COMMENT '日程状态',
                             `price` decimal(10,2) DEFAULT NULL COMMENT '价格',
                             `deposit` decimal(10,2) DEFAULT NULL COMMENT '定金',
                             `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户姓名',
                             `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户电话',
                             `is_Paid` tinyint(1) DEFAULT '0' COMMENT '是否已支付',
                             `requirements` text COLLATE utf8mb4_unicode_ci COMMENT '特殊要求',
                             `notes` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
                             `tags` json DEFAULT NULL COMMENT '标签',
                             `created_at` datetime DEFAULT NULL COMMENT '创建时间',
                             `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
                             `deleted_at` datetime DEFAULT NULL COMMENT '删除时间',
                             PRIMARY KEY (`id`),
                             KEY `idx_schedules_user_id_wedding_date` (`user_id`,`wedding_date`),
                             KEY `idx_schedules_customer_id` (`customer_id`),
                             KEY `idx_schedules_status_event_type` (`status`,`event_type`),
                             KEY `idx_schedules_wedding_date_time` (`wedding_date`,`wedding_time`),
                             KEY `idx_schedules_deleted_at` (`deleted_at`),
                             CONSTRAINT `schedules_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
                             CONSTRAINT `schedules_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日程表';

-- ----------------------------
-- Table structure for system_configs
-- ----------------------------
DROP TABLE IF EXISTS `system_configs`;
CREATE TABLE `system_configs` (
                                  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置ID',
                                  `config_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键',
                                  `config_value` text COLLATE utf8mb4_unicode_ci COMMENT '配置值',
                                  `default_value` text COLLATE utf8mb4_unicode_ci COMMENT '默认值',
                                  `config_type` enum('string','number','boolean','json','text') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string' COMMENT '配置类型',
                                  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general' COMMENT '配置分类',
                                  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配置描述',
                                  `validation_rule` text COLLATE utf8mb4_unicode_ci COMMENT '验证规则',
                                  `is_public` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否公开配置',
                                  `is_editable` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否可编辑',
                                  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
                                  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
                                  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
                                  PRIMARY KEY (`id`),
                                  UNIQUE KEY `idx_system_configs_config_key` (`config_key`),
                                  UNIQUE KEY `config_key` (`config_key`),
                                  KEY `idx_system_configs_category` (`category`),
                                  KEY `idx_system_configs_is_public` (`is_public`),
                                  KEY `idx_system_configs_public` (`is_public`),
                                  KEY `idx_system_configs_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ----------------------------
-- Table structure for team_members
-- ----------------------------
DROP TABLE IF EXISTS `team_members`;
CREATE TABLE `team_members` (
                                `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '团队成员ID',
                                `team_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                                `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                                `role` tinyint NOT NULL DEFAULT '1' COMMENT '角色: 1-成员 2-管理员 3-所有者',
                                `joined_at` datetime NOT NULL,
                                `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态: 0-禁用 1-正常 2-待审核',
                                `inviter_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                                `created_at` datetime NOT NULL,
                                `updated_at` datetime NOT NULL,
                                `deleted_at` datetime DEFAULT NULL,
                                PRIMARY KEY (`id`),
                                UNIQUE KEY `uk_team_members_team_user` (`team_id`,`user_id`),
                                UNIQUE KEY `team_members_team_id_user_id` (`team_id`,`user_id`),
                                KEY `idx_team_members_team_id` (`team_id`),
                                KEY `idx_team_members_user_id` (`user_id`),
                                KEY `idx_team_members_status` (`status`),
                                KEY `idx_team_members_role` (`role`),
                                CONSTRAINT `team_members_ibfk_5` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
                                CONSTRAINT `team_members_ibfk_6` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
                                CONSTRAINT `team_members_ibfk_7` FOREIGN KEY (`inviter_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队成员表';

-- ----------------------------
-- Table structure for teams
-- ----------------------------
DROP TABLE IF EXISTS `teams`;
CREATE TABLE `teams` (
                         `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '团队ID',
                         `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '团队名称',
                         `description` text COLLATE utf8mb4_unicode_ci COMMENT '团队描述',
                         `avatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '团队头像',
                         `background` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                         `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                         `contact_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                         `contact_wechat` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                         `contact_qq` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                         `address` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                         `service_areas` text COLLATE utf8mb4_unicode_ci COMMENT 'JSON格式存储服务区域数组',
                         `specialties` text COLLATE utf8mb4_unicode_ci COMMENT 'JSON格式存储专业特长数组',
                         `price_range` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                         `owner_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                         `member_count` int NOT NULL DEFAULT '1',
                         `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '状态: disabled-禁用 active-正常 pending-待审核',
                         `view_count` int NOT NULL DEFAULT '0',
                         `rating` decimal(3,2) NOT NULL DEFAULT '0.00' COMMENT '团队评级',
                         `rating_count` int NOT NULL DEFAULT '0',
                         `established_at` datetime DEFAULT NULL,
                         `scale` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '团队规模',
                         `achievements` text COLLATE utf8mb4_unicode_ci COMMENT '团队成就，JSON格式',
                         `certifications` text COLLATE utf8mb4_unicode_ci COMMENT '团队资质，JSON格式',
                         `equipment_list` text COLLATE utf8mb4_unicode_ci COMMENT '设备清单，JSON格式',
                         `service_packages` text COLLATE utf8mb4_unicode_ci COMMENT '服务套餐，JSON格式',
                         `working_hours` text COLLATE utf8mb4_unicode_ci COMMENT '工作时间',
                         `emergency_contact` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '紧急联系人',
                         `emergency_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '紧急联系电话',
                         `bank_account` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '对公账户',
                         `tax_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '税号',
                         `legal_representative` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '法人代表',
                         `registration_address` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '注册地址',
                         `operating_address` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '经营地址',
                         `is_verified` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已认证',
                         `business_license` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '营业执照',
                         `created_at` datetime NOT NULL,
                         `updated_at` datetime NOT NULL,
                         `deleted_at` datetime DEFAULT NULL,
                         PRIMARY KEY (`id`),
                         KEY `idx_teams_owner_id` (`owner_id`),
                         KEY `idx_teams_status` (`status`),
                         KEY `idx_teams_rating` (`rating`),
                         KEY `idx_teams_view_count` (`view_count`),
                         KEY `idx_teams_created_at` (`created_at`),
                         CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队表';

-- ----------------------------
-- Table structure for user_permissions
-- ----------------------------
DROP TABLE IF EXISTS `user_permissions`;
CREATE TABLE `user_permissions` (
                                    `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限ID',
                                    `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
                                    `permission` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限标识',
                                    `resource_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '资源类型',
                                    `resource_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '资源ID',
                                    `granted_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '授权人ID',
                                    `expires_at` datetime DEFAULT NULL COMMENT '过期时间',
                                    `created_at` datetime NOT NULL,
                                    PRIMARY KEY (`id`),
                                    UNIQUE KEY `uk_user_permissions` (`user_id`,`permission`,`resource_type`,`resource_id`),
                                    KEY `idx_user_permissions_user_id` (`user_id`),
                                    KEY `idx_user_permissions_permission` (`permission`),
                                    KEY `idx_user_permissions_resource` (`resource_type`,`resource_id`),
                                    KEY `idx_user_permissions_expires_at` (`expires_at`),
                                    KEY `granted_by` (`granted_by`),
                                    CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
                                    CONSTRAINT `user_permissions_ibfk_2` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限表';

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
                         `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
                         `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名',
                         `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮箱',
                         `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '手机号',
                         `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密码哈希',
                         `salt` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密码盐值',
                         `role` enum('super_admin','admin','user') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user' COMMENT '用户角色',
                         `status` enum('active','inactive','suspended','deleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '用户状态',
                         `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '头像URL',
                         `real_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '真实姓名',
                         `nickname` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '昵称',
                         `bio` text COLLATE utf8mb4_unicode_ci COMMENT '个人简介',
                         `specialties` json DEFAULT NULL COMMENT '专业技能',
                         `experience_years` int DEFAULT '0' COMMENT '从业年限',
                         `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所在地区',
                         `contact_info` json DEFAULT NULL COMMENT '联系方式',
                         `social_links` json DEFAULT NULL COMMENT '社交媒体链接',
                         `last_login_at` datetime DEFAULT NULL COMMENT '最后登录时间',
                         `last_login_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '最后登录IP',
                         `email_verified_at` datetime DEFAULT NULL COMMENT '邮箱验证时间',
                         `phone_verified_at` datetime DEFAULT NULL COMMENT '手机验证时间',
                         `created_at` datetime NOT NULL COMMENT '创建时间',
                         `updated_at` datetime NOT NULL COMMENT '更新时间',
                         `deleted_at` datetime DEFAULT NULL COMMENT '删除时间',
                         `hide_social_links` tinyint DEFAULT NULL,
                         PRIMARY KEY (`id`),
                         UNIQUE KEY `idx_users_username` (`username`),
                         UNIQUE KEY `idx_users_email` (`email`),
                         KEY `idx_users_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ----------------------------
-- Table structure for view_stats
-- ----------------------------
DROP TABLE IF EXISTS `view_stats`;
CREATE TABLE `view_stats` (
                              `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '访问记录ID',
                              `page_type` enum('team_member','work','homepage') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '页面类型',
                              `page_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '页面ID（团队成员ID、作品ID或null表示首页）',
                              `action_type` enum('view','play') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'view' COMMENT '行为类型：浏览或播放',
                              `visitor_ip` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '访问者IP地址',
                              `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT '用户代理字符串',
                              `referer` text COLLATE utf8mb4_unicode_ci COMMENT '来源页面',
                              `session_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '会话ID',
                              `visit_date` date NOT NULL COMMENT '访问日期',
                              `duration` int NOT NULL DEFAULT '0' COMMENT '停留时长（秒）',
                              `created_at` datetime NOT NULL COMMENT '创建时间',
                              `updated_at` datetime NOT NULL COMMENT '更新时间',
                              PRIMARY KEY (`id`),
                              KEY `idx_page_view_stats_page` (`page_type`,`page_id`),
                              KEY `idx_page_view_stats_ip` (`visitor_ip`),
                              KEY `idx_page_view_stats_session` (`session_id`),
                              KEY `idx_page_view_stats_visit_date` (`visit_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='页面访问统计表';

-- ----------------------------
-- Table structure for work_likes
-- ----------------------------
DROP TABLE IF EXISTS `work_likes`;
CREATE TABLE `work_likes` (
                              `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '点赞ID',
                              `work_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '作品ID',
                              `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户ID',
                              `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
                              `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT '用户代理',
                              `created_at` datetime NOT NULL COMMENT '创建时间',
                              PRIMARY KEY (`id`),
                              UNIQUE KEY `uk_work_likes_user` (`work_id`,`user_id`),
                              UNIQUE KEY `uk_work_likes_ip` (`work_id`,`ip_address`),
                              KEY `idx_work_likes_work_id` (`work_id`),
                              KEY `user_id` (`user_id`),
                              CONSTRAINT `work_likes_ibfk_97` FOREIGN KEY (`work_id`) REFERENCES `works` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
                              CONSTRAINT `work_likes_ibfk_98` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品点赞表';

-- ----------------------------
-- Table structure for works
-- ----------------------------
DROP TABLE IF EXISTS `works`;
CREATE TABLE `works` (
                         `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '作品ID',
                         `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
                         `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '作品标题',
                         `description` text COLLATE utf8mb4_unicode_ci COMMENT '作品描述',
                         `type` enum('image','video') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '作品类型',
                         `category` enum('wedding','event') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'wedding' COMMENT '作品分类',
                         `file_ids` json DEFAULT NULL COMMENT '文件ID列表',
                         `tags` json DEFAULT NULL COMMENT '标签',
                         `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '拍摄地点',
                         `wedding_date` date DEFAULT NULL COMMENT '婚礼日期',
                         `equipment_info` json DEFAULT NULL COMMENT '设备信息',
                         `technical_info` json DEFAULT NULL COMMENT '技术参数',
                         `status` enum('draft','published','archived','deleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft' COMMENT '发布状态',
                         `is_featured` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否精选',
                         `view_count` int NOT NULL DEFAULT '0' COMMENT '浏览次数',
                         `like_count` int NOT NULL DEFAULT '0' COMMENT '点赞次数',
                         `share_count` int NOT NULL DEFAULT '0' COMMENT '分享次数',
                         `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序权重',
                         `published_at` datetime DEFAULT NULL COMMENT '发布时间',
                         `created_at` datetime DEFAULT NULL COMMENT '创建时间',
                         `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
                         `deleted_at` datetime DEFAULT NULL COMMENT '删除时间',
                         PRIMARY KEY (`id`),
                         KEY `idx_works_user_id` (`user_id`),
                         KEY `idx_works_category` (`category`),
                         KEY `idx_works_status` (`status`),
                         KEY `idx_works_user_category_status` (`user_id`,`category`,`status`),
                         KEY `idx_works_featured_sort` (`is_featured`,`sort_order`),
                         CONSTRAINT `works_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品表';
-- ================================
-- 15. 创建默认管理员用户
-- ================================

-- 插入默认管理员用户 (密码: password)
-- 注意：实际部署时应该修改默认密码


-- ================================
-- 插入系统管理员用户
-- ================================
-- 设置管理员用户ID为固定值，便于后续权限分配
SET @admin_user_id = '1';

INSERT IGNORE INTO `users` (
    `id`,
    `username`,
    `email`,
    `password_hash`,
    `salt`,
    `role`,
    `status`,
    `real_name`,
    `nickname`,
    `created_at`,
    `updated_at`
) VALUES (
             @admin_user_id,
             'admin',
             'admin@wedding.com',
             '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
             'default_salt',
             'super_admin',
             'active',
             '系统管理员',
             'Admin',
             NOW(),
             NOW()
         );

-- ================================
-- 插入用户权限数据
-- ================================
-- 为超级管理员分配所有系统权限

-- 清理可能存在的错误权限数据
DELETE FROM `user_permissions` WHERE `user_id` != @admin_user_id;

-- 系统管理权限
INSERT IGNORE INTO `user_permissions` (`id`, `user_id`, `permission`, `resource_type`, `resource_id`, `granted_by`, `expires_at`, `created_at`) VALUES
                                                                                                                                                    (CONCAT('perm-sys-admin-', UUID()), @admin_user_id, 'system:admin', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-sys-config-', UUID()), @admin_user_id, 'system:config', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-sys-user-', UUID()), @admin_user_id, 'system:user:manage', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-sys-role-', UUID()), @admin_user_id, 'system:role:manage', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-sys-log-', UUID()), @admin_user_id, 'system:log:view', NULL, NULL, NULL, NULL, NOW());

-- 用户相关权限
INSERT IGNORE INTO `user_permissions` (`id`, `user_id`, `permission`, `resource_type`, `resource_id`, `granted_by`, `expires_at`, `created_at`) VALUES
                                                                                                                                                    (CONCAT('perm-user-view-', UUID()), @admin_user_id, 'user:profile:view', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-user-edit-', UUID()), @admin_user_id, 'user:profile:edit', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-user-pwd-', UUID()), @admin_user_id, 'user:password:change', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-user-avatar-', UUID()), @admin_user_id, 'user:avatar:upload', NULL, NULL, NULL, NULL, NOW());

-- 作品管理权限
INSERT IGNORE INTO `user_permissions` (`id`, `user_id`, `permission`, `resource_type`, `resource_id`, `granted_by`, `expires_at`, `created_at`) VALUES
                                                                                                                                                    (CONCAT('perm-work-create-', UUID()), @admin_user_id, 'work:create', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-work-view-', UUID()), @admin_user_id, 'work:view', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-work-edit-', UUID()), @admin_user_id, 'work:edit', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-work-delete-', UUID()), @admin_user_id, 'work:delete', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-work-publish-', UUID()), @admin_user_id, 'work:publish', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-work-moderate-', UUID()), @admin_user_id, 'work:moderate', NULL, NULL, NULL, NULL, NOW());

-- 团队管理权限
INSERT IGNORE INTO `user_permissions` (`id`, `user_id`, `permission`, `resource_type`, `resource_id`, `granted_by`, `expires_at`, `created_at`) VALUES
                                                                                                                                                    (CONCAT('perm-team-create-', UUID()), @admin_user_id, 'team:create', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-team-view-', UUID()), @admin_user_id, 'team:view', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-team-edit-', UUID()), @admin_user_id, 'team:edit', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-team-delete-', UUID()), @admin_user_id, 'team:delete', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-team-member-', UUID()), @admin_user_id, 'team:member:manage', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-team-invite-', UUID()), @admin_user_id, 'team:invite', NULL, NULL, NULL, NULL, NOW());

-- 日程管理权限
INSERT IGNORE INTO `user_permissions` (`id`, `user_id`, `permission`, `resource_type`, `resource_id`, `granted_by`, `expires_at`, `created_at`) VALUES
                                                                                                                                                    (CONCAT('perm-schedule-create-', UUID()), @admin_user_id, 'schedule:create', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-schedule-view-', UUID()), @admin_user_id, 'schedule:view', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-schedule-edit-', UUID()), @admin_user_id, 'schedule:edit', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-schedule-delete-', UUID()), @admin_user_id, 'schedule:delete', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-schedule-manage-', UUID()), @admin_user_id, 'schedule:manage:all', NULL, NULL, NULL, NULL, NOW());

-- 文件管理权限
INSERT IGNORE INTO `user_permissions` (`id`, `user_id`, `permission`, `resource_type`, `resource_id`, `granted_by`, `expires_at`, `created_at`) VALUES
                                                                                                                                                    (CONCAT('perm-file-upload-', UUID()), @admin_user_id, 'file:upload', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-file-view-', UUID()), @admin_user_id, 'file:view', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-file-delete-', UUID()), @admin_user_id, 'file:delete', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-file-manage-', UUID()), @admin_user_id, 'file:manage:all', NULL, NULL, NULL, NULL, NOW());

-- 联系人管理权限
INSERT IGNORE INTO `user_permissions` (`id`, `user_id`, `permission`, `resource_type`, `resource_id`, `granted_by`, `expires_at`, `created_at`) VALUES
                                                                                                                                                    (CONCAT('perm-contact-create-', UUID()), @admin_user_id, 'contact:create', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-contact-view-', UUID()), @admin_user_id, 'contact:view', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-contact-edit-', UUID()), @admin_user_id, 'contact:edit', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-contact-delete-', UUID()), @admin_user_id, 'contact:delete', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-contact-export-', UUID()), @admin_user_id, 'contact:export', NULL, NULL, NULL, NULL, NOW());

-- 统计分析权限
INSERT IGNORE INTO `user_permissions` (`id`, `user_id`, `permission`, `resource_type`, `resource_id`, `granted_by`, `expires_at`, `created_at`) VALUES
                                                                                                                                                    (CONCAT('perm-analytics-view-', UUID()), @admin_user_id, 'analytics:view', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-analytics-export-', UUID()), @admin_user_id, 'analytics:export', NULL, NULL, NULL, NULL, NOW()),
                                                                                                                                                    (CONCAT('perm-analytics-dash-', UUID()), @admin_user_id, 'analytics:dashboard', NULL, NULL, NULL, NULL, NOW());


-- ================================
-- 16. 重新启用外键检查
-- ================================
SET FOREIGN_KEY_CHECKS = 1;

-- ================================
-- 17. 显示初始化完成信息
-- ================================
SELECT 'Database initialized successfully!' as result;
SELECT 'Tables created: users, schedules, system_configs, contacts, files, media_profiles, operation_logs, teams, team_members, user_permissions, view_stats, works, work_likes' as tables_info;
SELECT 'Default admin user created with username: admin' as admin_info;

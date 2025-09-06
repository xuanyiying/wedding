-- Active: 1757153926451@@150.158.20.143@3306@wedding_club
-- 婚礼服务平台数据初始化脚本
-- 仅负责插入初始化数据，不创建表结构
-- 表结构由Sequelize模型自动同步创建

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 使用数据库
USE wedding_club;

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
-- 插入系统配置数据
-- ================================
INSERT IGNORE INTO `system_configs` (
  `id`,
  `config_key`,
  `config_value`,
  `config_type`,
  `description`,
  `is_public`,
  `created_at`,
  `updated_at`
) VALUES 
(UUID(), 'site_name', '婚礼服务平台', 'string', '网站名称', 1, NOW(), NOW()),
(UUID(), 'site_description', '专业的婚礼服务管理平台', 'string', '网站描述', 1, NOW(), NOW()),
(UUID(), 'max_file_size', '100', 'number', '最大文件上传大小(MB)', 0, NOW(), NOW()),
(UUID(), 'allowed_file_types', '["jpg","jpeg","png","gif","mp4","mov","avi"]', 'json', '允许的文件类型', 0, NOW(), NOW()),
(UUID(), 'default_avatar', '/uploads/default-avatar.png', 'string', '默认头像路径', 1, NOW(), NOW());

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

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 显示插入结果
SELECT 'Data initialization completed successfully' as status;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as config_count FROM system_configs;
SELECT COUNT(*) as permission_count FROM user_permissions;

-- 显示管理员用户的权限统计
SELECT 
  u.username,
  u.role,
  COUNT(up.id) as total_permissions
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.username = 'admin'
GROUP BY u.id, u.username, u.role;
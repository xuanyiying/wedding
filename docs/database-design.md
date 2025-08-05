# 数据库模型设计

## 1. 数据库概览

### 1.1 数据库选择
- **主数据库**: MySQL 8.0
- **缓存数据库**: Redis 7.0
- **字符集**: utf8mb4
- **排序规则**: utf8mb4_unicode_ci
- **ORM**: Prisma / TypeORM
- **连接池**: mysql2 connection pool
- **Node.js Redis客户端**: ioredis

### 1.2 命名规范
- 表名：小写字母 + 下划线，复数形式 (如: users, schedules)
- 字段名：小写字母 + 下划线 (如: user_id, created_at)
- 索引名：idx_ + 表名 + 字段名 (如: idx_users_email)
- 外键名：fk_ + 表名 + 引用表名 (如: fk_schedules_users)
- TypeScript接口：PascalCase (如: User, Schedule, WorkItem)

## 2. 核心数据表设计

### 2.1 用户表 (users)

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    email VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱',
    phone VARCHAR(20) COMMENT '手机号',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    salt VARCHAR(32) NOT NULL COMMENT '密码盐值',
    role ENUM('admin', 'member', 'guest') DEFAULT 'guest' COMMENT '用户角色',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active' COMMENT '用户状态',
    avatar_url VARCHAR(500) COMMENT '头像URL',
    real_name VARCHAR(100) COMMENT '真实姓名',
    nickname VARCHAR(100) COMMENT '昵称',
    bio TEXT COMMENT '个人简介',
    specialties JSON COMMENT '专业技能',
    experience_years INT DEFAULT 0 COMMENT '从业年限',
    location VARCHAR(200) COMMENT '所在地区',
    contact_info JSON COMMENT '联系方式',
    social_links JSON COMMENT '社交媒体链接',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    last_login_ip VARCHAR(45) COMMENT '最后登录IP',
    email_verified_at TIMESTAMP NULL COMMENT '邮箱验证时间',
    phone_verified_at TIMESTAMP NULL COMMENT '手机验证时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at TIMESTAMP NULL COMMENT '软删除时间',
    
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_phone (phone),
    INDEX idx_users_role (role),
    INDEX idx_users_status (status),
    INDEX idx_users_created_at (created_at),
    INDEX idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
```

### 2.2 档期表 (schedules)

```sql
CREATE TABLE schedules (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '档期ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    title VARCHAR(200) NOT NULL COMMENT '档期标题',
    description TEXT COMMENT '档期描述',
    start_time DATETIME NOT NULL COMMENT '开始时间',
    end_time DATETIME NOT NULL COMMENT '结束时间',
    status ENUM('available', 'booked', 'confirmed', 'completed', 'cancelled') DEFAULT 'available' COMMENT '档期状态',
    event_type ENUM('wedding', 'engagement', 'anniversary', 'other') DEFAULT 'wedding' COMMENT '活动类型',
    location VARCHAR(255) COMMENT '活动地点',
    venue_name VARCHAR(200) COMMENT '场地名称',
    venue_address TEXT COMMENT '场地地址',
    client_name VARCHAR(100) COMMENT '客户姓名',
    client_phone VARCHAR(20) COMMENT '客户电话',
    client_email VARCHAR(100) COMMENT '客户邮箱',
    price DECIMAL(10,2) COMMENT '服务价格',
    deposit DECIMAL(10,2) COMMENT '定金',
    notes TEXT COMMENT '备注信息',
    requirements JSON COMMENT '特殊要求',
    tags JSON COMMENT '标签',
    is_public BOOLEAN DEFAULT TRUE COMMENT '是否公开显示',
    booking_source ENUM('website', 'phone', 'referral', 'other') COMMENT '预约来源',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at TIMESTAMP NULL COMMENT '软删除时间',
    
    FOREIGN KEY fk_schedules_users (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_schedules_user_id (user_id),
    INDEX idx_schedules_start_time (start_time),
    INDEX idx_schedules_end_time (end_time),
    INDEX idx_schedules_status (status),
    INDEX idx_schedules_event_type (event_type),
    INDEX idx_schedules_time_range (start_time, end_time),
    INDEX idx_schedules_user_time (user_id, start_time, end_time),
    INDEX idx_schedules_created_at (created_at),
    INDEX idx_schedules_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='档期表';
```

### 2.3 作品表 (works)

```sql
CREATE TABLE works (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '作品ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    title VARCHAR(200) NOT NULL COMMENT '作品标题',
    description TEXT COMMENT '作品描述',
    type ENUM('image', 'video', 'album') NOT NULL COMMENT '作品类型',
    category ENUM('wedding', 'engagement', 'anniversary', 'team_building', 'other') DEFAULT 'wedding' COMMENT '作品分类',
    cover_url VARCHAR(500) COMMENT '封面图片URL',
    content_urls JSON COMMENT '内容文件URLs',
    tags JSON COMMENT '标签',
    location VARCHAR(255) COMMENT '拍摄地点',
    shoot_date DATE COMMENT '拍摄日期',
    equipment_info JSON COMMENT '设备信息',
    technical_info JSON COMMENT '技术参数',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft' COMMENT '发布状态',
    is_featured BOOLEAN DEFAULT FALSE COMMENT '是否精选',
    view_count INT DEFAULT 0 COMMENT '浏览次数',
    like_count INT DEFAULT 0 COMMENT '点赞次数',
    share_count INT DEFAULT 0 COMMENT '分享次数',
    sort_order INT DEFAULT 0 COMMENT '排序权重',
    published_at TIMESTAMP NULL COMMENT '发布时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at TIMESTAMP NULL COMMENT '软删除时间',
    
    FOREIGN KEY fk_works_users (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_works_user_id (user_id),
    INDEX idx_works_type (type),
    INDEX idx_works_category (category),
    INDEX idx_works_status (status),
    INDEX idx_works_featured (is_featured),
    INDEX idx_works_published_at (published_at),
    INDEX idx_works_view_count (view_count),
    INDEX idx_works_sort_order (sort_order),
    INDEX idx_works_created_at (created_at),
    INDEX idx_works_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品表';
```

### 2.4 文件表 (files)

```sql
CREATE TABLE files (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '文件ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '上传用户ID',
    original_name VARCHAR(255) NOT NULL COMMENT '原始文件名',
    filename VARCHAR(255) NOT NULL COMMENT '存储文件名',
    file_path VARCHAR(500) NOT NULL COMMENT '文件路径',
    file_url VARCHAR(500) NOT NULL COMMENT '访问URL',
    file_size BIGINT NOT NULL COMMENT '文件大小(字节)',
    mime_type VARCHAR(100) NOT NULL COMMENT 'MIME类型',
    file_type ENUM('image', 'video', 'audio', 'document', 'other') NOT NULL COMMENT '文件类型',
    width INT COMMENT '图片/视频宽度',
    height INT COMMENT '图片/视频高度',
    duration INT COMMENT '音视频时长(秒)',
    thumbnail_url VARCHAR(500) COMMENT '缩略图URL',
    hash_md5 VARCHAR(32) COMMENT 'MD5哈希值',
    hash_sha256 VARCHAR(64) COMMENT 'SHA256哈希值',
    storage_type ENUM('local', 'oss', 's3', 'cdn') DEFAULT 'local' COMMENT '存储类型',
    bucket_name VARCHAR(100) COMMENT '存储桶名称',
    is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开访问',
    download_count INT DEFAULT 0 COMMENT '下载次数',
    metadata JSON COMMENT '文件元数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at TIMESTAMP NULL COMMENT '软删除时间',
    
    FOREIGN KEY fk_files_users (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_files_user_id (user_id),
    INDEX idx_files_filename (filename),
    INDEX idx_files_file_type (file_type),
    INDEX idx_files_mime_type (mime_type),
    INDEX idx_files_hash_md5 (hash_md5),
    INDEX idx_files_storage_type (storage_type),
    INDEX idx_files_created_at (created_at),
    INDEX idx_files_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件表';
```

### 2.5 团队成员表 (team_members)

```sql
CREATE TABLE team_members (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '成员ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    name VARCHAR(100) NOT NULL COMMENT '成员姓名',
    position VARCHAR(100) COMMENT '职位',
    department VARCHAR(100) COMMENT '部门',
    role ENUM('leader', 'member', 'coordinator', 'observer') DEFAULT 'member' COMMENT '团队角色',
    status ENUM('active', 'inactive', 'on_leave', 'resigned') DEFAULT 'active' COMMENT '成员状态',
    avatar_url VARCHAR(500) COMMENT '头像URL',
    bio TEXT COMMENT '个人简介',
    skills JSON COMMENT '技能标签',
    contact_info JSON COMMENT '联系方式',
    join_date DATE COMMENT '加入日期',
    leave_date DATE COMMENT '离职日期',
    performance_score DECIMAL(3,2) COMMENT '绩效评分',
    team_contribution TEXT COMMENT '团队贡献',
    emergency_contact JSON COMMENT '紧急联系人',
    work_location VARCHAR(200) COMMENT '工作地点',
    employment_type ENUM('full_time', 'part_time', 'contract', 'intern') DEFAULT 'full_time' COMMENT '雇佣类型',
    salary_level ENUM('junior', 'intermediate', 'senior', 'expert') COMMENT '薪资等级',
    manager_id BIGINT UNSIGNED COMMENT '直属上级ID',
    is_public BOOLEAN DEFAULT TRUE COMMENT '是否公开显示',
    sort_order INT DEFAULT 0 COMMENT '排序权重',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at TIMESTAMP NULL COMMENT '软删除时间',
    
    FOREIGN KEY fk_team_members_users (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY fk_team_members_manager (manager_id) REFERENCES team_members(id) ON DELETE SET NULL,
    INDEX idx_team_members_user_id (user_id),
    INDEX idx_team_members_department (department),
    INDEX idx_team_members_role (role),
    INDEX idx_team_members_status (status),
    INDEX idx_team_members_manager_id (manager_id),
    INDEX idx_team_members_join_date (join_date),
    INDEX idx_team_members_employment_type (employment_type),
    INDEX idx_team_members_sort_order (sort_order),
    INDEX idx_team_members_created_at (created_at),
    INDEX idx_team_members_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队成员表';
```

### 2.6 团建资料表 (team_materials)

```sql
CREATE TABLE team_materials (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '资料ID',
    title VARCHAR(200) NOT NULL COMMENT '资料标题',
    description TEXT COMMENT '资料描述',
    type ENUM('photo', 'video', 'document') NOT NULL COMMENT '资料类型',
    category ENUM('team_building', 'training', 'meeting', 'celebration', 'other') DEFAULT 'team_building' COMMENT '资料分类',
    file_urls JSON NOT NULL COMMENT '文件URLs',
    cover_url VARCHAR(500) COMMENT '封面图片URL',
    tags JSON COMMENT '标签',
    event_date DATE COMMENT '活动日期',
    location VARCHAR(255) COMMENT '活动地点',
    uploader_id BIGINT UNSIGNED NOT NULL COMMENT '上传者ID',
    is_public BOOLEAN DEFAULT TRUE COMMENT '是否公开',
    view_count INT DEFAULT 0 COMMENT '浏览次数',
    download_count INT DEFAULT 0 COMMENT '下载次数',
    sort_order INT DEFAULT 0 COMMENT '排序权重',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at TIMESTAMP NULL COMMENT '软删除时间',
    
    FOREIGN KEY fk_team_materials_users (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_team_materials_uploader_id (uploader_id),
    INDEX idx_team_materials_type (type),
    INDEX idx_team_materials_category (category),
    INDEX idx_team_materials_event_date (event_date),
    INDEX idx_team_materials_public (is_public),
    INDEX idx_team_materials_sort_order (sort_order),
    INDEX idx_team_materials_created_at (created_at),
    INDEX idx_team_materials_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团建资料表';
```

### 2.7 系统配置表 (system_configs)

```sql
CREATE TABLE system_configs (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
    config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    config_type ENUM('string', 'number', 'boolean', 'json', 'text') DEFAULT 'string' COMMENT '配置类型',
    category VARCHAR(50) DEFAULT 'general' COMMENT '配置分类',
    description VARCHAR(255) COMMENT '配置描述',
    is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开配置',
    is_editable BOOLEAN DEFAULT TRUE COMMENT '是否可编辑',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_system_configs_key (config_key),
    INDEX idx_system_configs_category (category),
    INDEX idx_system_configs_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';
```

### 2.8 操作日志表 (operation_logs)

```sql
CREATE TABLE operation_logs (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
    user_id BIGINT UNSIGNED COMMENT '操作用户ID',
    action VARCHAR(100) NOT NULL COMMENT '操作动作',
    resource_type VARCHAR(50) COMMENT '资源类型',
    resource_id BIGINT UNSIGNED COMMENT '资源ID',
    description TEXT COMMENT '操作描述',
    request_method VARCHAR(10) COMMENT '请求方法',
    request_url VARCHAR(500) COMMENT '请求URL',
    request_params JSON COMMENT '请求参数',
    response_status INT COMMENT '响应状态码',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    execution_time INT COMMENT '执行时间(毫秒)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    FOREIGN KEY fk_operation_logs_users (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_operation_logs_user_id (user_id),
    INDEX idx_operation_logs_action (action),
    INDEX idx_operation_logs_resource (resource_type, resource_id),
    INDEX idx_operation_logs_ip (ip_address),
    INDEX idx_operation_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';
```

## 3. 关联表设计

### 3.1 用户角色权限表 (user_permissions)

```sql
CREATE TABLE user_permissions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '权限ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    permission VARCHAR(100) NOT NULL COMMENT '权限标识',
    resource_type VARCHAR(50) COMMENT '资源类型',
    resource_id BIGINT UNSIGNED COMMENT '资源ID',
    granted_by BIGINT UNSIGNED COMMENT '授权人ID',
    expires_at TIMESTAMP NULL COMMENT '过期时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    FOREIGN KEY fk_user_permissions_users (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY fk_user_permissions_granted_by (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_permissions (user_id, permission, resource_type, resource_id),
    INDEX idx_user_permissions_user_id (user_id),
    INDEX idx_user_permissions_permission (permission),
    INDEX idx_user_permissions_resource (resource_type, resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限表';
```

### 3.2 作品点赞表 (work_likes)

```sql
CREATE TABLE work_likes (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '点赞ID',
    work_id BIGINT UNSIGNED NOT NULL COMMENT '作品ID',
    user_id BIGINT UNSIGNED COMMENT '用户ID',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    FOREIGN KEY fk_work_likes_works (work_id) REFERENCES works(id) ON DELETE CASCADE,
    FOREIGN KEY fk_work_likes_users (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_work_likes_user (work_id, user_id),
    UNIQUE KEY uk_work_likes_ip (work_id, ip_address),
    INDEX idx_work_likes_work_id (work_id),
    INDEX idx_work_likes_user_id (user_id),
    INDEX idx_work_likes_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品点赞表';
```

### 3.3 访问统计表 (visit_stats)

```sql
CREATE TABLE visit_stats (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '统计ID',
    date DATE NOT NULL COMMENT '统计日期',
    resource_type VARCHAR(50) NOT NULL COMMENT '资源类型',
    resource_id BIGINT UNSIGNED COMMENT '资源ID',
    page_path VARCHAR(500) COMMENT '页面路径',
    unique_visitors INT DEFAULT 0 COMMENT '独立访客数',
    page_views INT DEFAULT 0 COMMENT '页面浏览量',
    bounce_rate DECIMAL(5,2) DEFAULT 0 COMMENT '跳出率',
    avg_duration INT DEFAULT 0 COMMENT '平均停留时间(秒)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    UNIQUE KEY uk_visit_stats (date, resource_type, resource_id, page_path),
    INDEX idx_visit_stats_date (date),
    INDEX idx_visit_stats_resource (resource_type, resource_id),
    INDEX idx_visit_stats_page_path (page_path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='访问统计表';
```

## 4. 视图设计

### 4.1 用户档期视图 (v_user_schedules)

```sql
CREATE VIEW v_user_schedules AS
SELECT 
    s.id,
    s.user_id,
    u.username,
    u.real_name,
    u.avatar_url,
    s.title,
    s.description,
    s.start_time,
    s.end_time,
    s.status,
    s.event_type,
    s.location,
    s.venue_name,
    s.is_public,
    s.created_at,
    s.updated_at
FROM schedules s
INNER JOIN users u ON s.user_id = u.id
WHERE s.deleted_at IS NULL AND u.deleted_at IS NULL;
```

### 4.2 作品统计视图 (v_work_stats)

```sql
CREATE VIEW v_work_stats AS
SELECT 
    w.id,
    w.user_id,
    u.username,
    u.real_name,
    w.title,
    w.type,
    w.category,
    w.status,
    w.view_count,
    w.like_count,
    w.share_count,
    w.is_featured,
    w.published_at,
    COUNT(wl.id) as actual_likes
FROM works w
INNER JOIN users u ON w.user_id = u.id
LEFT JOIN work_likes wl ON w.id = wl.work_id
WHERE w.deleted_at IS NULL AND u.deleted_at IS NULL
GROUP BY w.id;
```

## 5. 存储过程

### 5.1 档期冲突检测存储过程

```sql
DELIMITER //
CREATE PROCEDURE CheckScheduleConflict(
    IN p_user_id BIGINT,
    IN p_start_time DATETIME,
    IN p_end_time DATETIME,
    IN p_exclude_id BIGINT,
    OUT p_conflict_count INT
)
BEGIN
    SELECT COUNT(*) INTO p_conflict_count
    FROM schedules
    WHERE user_id = p_user_id
      AND deleted_at IS NULL
      AND status IN ('booked', 'confirmed')
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
      AND (
          (start_time <= p_start_time AND end_time > p_start_time) OR
          (start_time < p_end_time AND end_time >= p_end_time) OR
          (start_time >= p_start_time AND end_time <= p_end_time)
      );
END //
DELIMITER ;
```

### 5.2 用户统计数据更新存储过程

```sql
DELIMITER //
CREATE PROCEDURE UpdateUserStats(
    IN p_user_id BIGINT
)
BEGIN
    DECLARE v_schedule_count INT DEFAULT 0;
    DECLARE v_work_count INT DEFAULT 0;
    DECLARE v_total_views INT DEFAULT 0;
    DECLARE v_total_likes INT DEFAULT 0;
    
    -- 统计档期数量
    SELECT COUNT(*) INTO v_schedule_count
    FROM schedules
    WHERE user_id = p_user_id AND deleted_at IS NULL;
    
    -- 统计作品数量
    SELECT COUNT(*) INTO v_work_count
    FROM works
    WHERE user_id = p_user_id AND deleted_at IS NULL AND status = 'published';
    
    -- 统计总浏览量
    SELECT COALESCE(SUM(view_count), 0) INTO v_total_views
    FROM works
    WHERE user_id = p_user_id AND deleted_at IS NULL;
    
    -- 统计总点赞数
    SELECT COALESCE(SUM(like_count), 0) INTO v_total_likes
    FROM works
    WHERE user_id = p_user_id AND deleted_at IS NULL;
    
    -- 更新用户统计信息
    UPDATE users
    SET 
        profile = JSON_SET(
            COALESCE(profile, '{}'),
            '$.schedule_count', v_schedule_count,
            '$.work_count', v_work_count,
            '$.total_views', v_total_views,
            '$.total_likes', v_total_likes
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
END //
DELIMITER ;
```

## 6. 触发器

### 6.1 作品点赞数更新触发器

```sql
DELIMITER //
CREATE TRIGGER tr_work_likes_insert
AFTER INSERT ON work_likes
FOR EACH ROW
BEGIN
    UPDATE works
    SET like_count = like_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.work_id;
END //

CREATE TRIGGER tr_work_likes_delete
AFTER DELETE ON work_likes
FOR EACH ROW
BEGIN
    UPDATE works
    SET like_count = GREATEST(like_count - 1, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.work_id;
END //
DELIMITER ;
```

## 7. 索引优化策略

### 7.1 复合索引设计

```sql
-- 用户档期查询优化
CREATE INDEX idx_schedules_user_status_time ON schedules(user_id, status, start_time, end_time);

-- 作品分类查询优化
CREATE INDEX idx_works_category_status_featured ON works(category, status, is_featured, published_at);

-- 文件类型查询优化
CREATE INDEX idx_files_user_type_created ON files(user_id, file_type, created_at);

-- 日志查询优化
CREATE INDEX idx_logs_user_action_time ON operation_logs(user_id, action, created_at);
```

### 7.2 分区表设计 (大数据量场景)

```sql
-- 按月分区的操作日志表
CREATE TABLE operation_logs_partitioned (
    -- 字段定义同 operation_logs
) PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
    PARTITION p202401 VALUES LESS THAN (202402),
    PARTITION p202402 VALUES LESS THAN (202403),
    PARTITION p202403 VALUES LESS THAN (202404),
    -- 继续添加分区...
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

## 8. 数据初始化

### 8.1 默认管理员用户

```sql
INSERT INTO users (
    username, email, password_hash, salt, role, status, real_name, nickname
) VALUES (
    'admin', 'admin@wedding-club.com', 
    '$2a$10$example_hash', 'example_salt',
    'admin', 'active', '系统管理员', '管理员'
);
```

### 8.2 系统默认配置

```sql
INSERT INTO system_configs (config_key, config_value, config_type, category, description) VALUES
('site_name', '婚礼主持俱乐部', 'string', 'general', '网站名称'),
('site_description', '专业的婚礼主持服务团队', 'string', 'general', '网站描述'),
('max_file_size', '100', 'number', 'upload', '最大文件上传大小(MB)'),
('allowed_file_types', '["jpg","jpeg","png","gif","mp4","mov","avi"]', 'json', 'upload', '允许的文件类型'),
('default_avatar', '/assets/images/default-avatar.png', 'string', 'user', '默认头像'),
('pagination_size', '20', 'number', 'general', '分页大小'),
('cache_ttl', '3600', 'number', 'cache', '缓存过期时间(秒)');
```

## 9. 备份与恢复策略

### 9.1 备份策略

```bash
# 每日全量备份
mysqldump --single-transaction --routines --triggers \
  --all-databases > backup_$(date +%Y%m%d).sql

# 每小时增量备份 (binlog)
mysqlbinlog --start-datetime="$(date -d '1 hour ago' '+%Y-%m-%d %H:00:00')" \
  /var/log/mysql/mysql-bin.* > incremental_$(date +%Y%m%d_%H).sql
```

### 9.2 数据恢复

```bash
# 恢复全量备份
mysql < backup_20240101.sql

# 恢复增量备份
mysql < incremental_20240101_14.sql
```

## 10. 性能监控

### 10.1 慢查询监控

```sql
-- 开启慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

### 10.2 性能分析查询

```sql
-- 查看表大小
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'wedding_club'
ORDER BY (data_length + index_length) DESC;

-- 查看索引使用情况
SELECT 
    table_name,
    index_name,
    cardinality,
    sub_part,
    packed,
    nullable,
    index_type
FROM information_schema.statistics
WHERE table_schema = 'wedding_club'
ORDER BY table_name, seq_in_index;
```
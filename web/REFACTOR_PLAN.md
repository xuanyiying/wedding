# 管理端代码重构计划

## 重构目标
1. 拆分复杂页面，降低代码复杂度
2. 提取通用功能为组件，提升代码复用率
3. 优化档期管理功能
4. 移动活动相关代码到档期管理页面
5. 添加密码修改入口
6. 优化作品管理权限控制

## 当前问题分析

### 1. SchedulesPage.tsx (985行)
- **问题**: 代码过于复杂，包含多个功能模块
- **功能模块**:
  - 档期列表和日历视图
  - 添加/编辑档期表单
  - 查询可用主持人
  - 团队成员筛选
  - 统计数据展示

### 2. DashboardPage.tsx (495行)
- **问题**: 包含活动相关代码需要移动
- **需要移动的功能**:
  - 最近活动列表
  - 活动图标映射
  - 活动数据获取

### 3. ProfilePage.tsx (1067行)
- **问题**: 缺少密码修改入口
- **需要添加**: 密码修改按钮和导航

### 4. WorksPage.tsx (842行)
- **问题**: 精选功能没有权限控制
- **需要优化**: 只有管理员才能使用featured功能

## 重构方案

### 阶段1: 创建通用组件

#### 1.1 创建 `/src/components/admin/common/` 目录
- `StatCard.tsx` - 统计卡片组件
- `FilterBar.tsx` - 筛选栏组件
- `ActionButtons.tsx` - 操作按钮组件
- `LoadingSpinner.tsx` - 加载组件
- `EmptyState.tsx` - 空状态组件

#### 1.2 创建 `/src/components/admin/schedule/` 目录
- `ScheduleCalendar.tsx` - 档期日历组件
- `ScheduleList.tsx` - 档期列表组件
- `ScheduleForm.tsx` - 档期表单组件
- `HostSearchModal.tsx` - 主持人查询模态框
- `TeamMemberSelector.tsx` - 团队成员选择器
- `ScheduleStats.tsx` - 档期统计组件
- `ActivityList.tsx` - 活动列表组件 (从Dashboard移动)

#### 1.3 创建 `/src/components/admin/work/` 目录
- `WorkCard.tsx` - 作品卡片组件
- `WorkForm.tsx` - 作品表单组件
- `WorkPreview.tsx` - 作品预览组件
- `WorkStats.tsx` - 作品统计组件

#### 1.4 创建 `/src/components/admin/profile/` 目录
- `BasicInfoForm.tsx` - 基本信息表单
- `SkillsManager.tsx` - 技能管理组件
- `MediaUploader.tsx` - 媒体上传组件
- `PublicProfile.tsx` - 公开资料展示

### 阶段2: 重构页面

#### 2.1 重构 SchedulesPage.tsx
```typescript
// 新的结构
const SchedulesPage = () => {
  return (
    <div>
      <PageHeader title="档期管理" />
      <ScheduleStats />
      <TeamMemberSelector /> {/* 管理员可见 */}
      <FilterBar />
      <Row gutter={24}>
        <Col span={16}>
          <ScheduleCalendar />
        </Col>
        <Col span={8}>
          <ScheduleList />
          <ActivityList /> {/* 从Dashboard移动过来 */}
        </Col>
      </Row>
      <ScheduleForm />
      <HostSearchModal />
    </div>
  );
};
```

#### 2.2 重构 DashboardPage.tsx
```typescript
// 移除活动相关代码，保留核心仪表板功能
const DashboardPage = () => {
  return (
    <div>
      <PageHeader title="仪表板" />
      <StatCard /> {/* 核心统计数据 */}
      <QuickActions /> {/* 快捷操作 */}
      <ScheduleCalendar /> {/* 简化版日历 */}
    </div>
  );
};
```

#### 2.3 优化 ProfilePage.tsx
```typescript
// 添加密码修改入口
const ProfilePage = () => {
  return (
    <div>
      <PageHeader 
        title="个人资料" 
        extra={
          <Space>
            <Button onClick={() => navigate('/admin/change-password')}>
              修改密码
            </Button>
            <Button type="primary" onClick={handleSave}>
              保存资料
            </Button>
          </Space>
        }
      />
      <Tabs>
        <TabPane tab="基本信息">
          <BasicInfoForm />
        </TabPane>
        <TabPane tab="专业技能">
          <SkillsManager />
        </TabPane>
        <TabPane tab="公开资料">
          <PublicProfile />
        </TabPane>
      </Tabs>
    </div>
  );
};
```

#### 2.4 优化 WorksPage.tsx
```typescript
// 添加管理员权限控制
const WorksPage = () => {
  const { user } = useAppSelector(state => state.auth);
  const isAdmin = user?.role === 'admin';
  
  return (
    <div>
      <PageHeader title="作品管理" />
      <WorkStats />
      <FilterBar />
      <WorkList>
        {works.map(work => (
          <WorkCard 
            key={work.id} 
            work={work}
            showFeatured={isAdmin} {/* 只有管理员显示精选功能 */}
          />
        ))}
      </WorkList>
      <WorkForm showFeatured={isAdmin} />
    </div>
  );
};
```

### 阶段3: 新增功能

#### 3.1 档期管理增强功能
- 团队成员档期查看
- 根据婚礼日期和用餐时间查询可用成员
- 档期冲突检测
- 自动分配建议

#### 3.2 权限控制优化
- 创建权限检查Hook: `usePermissions`
- 实现基于角色的组件渲染
- 添加权限装饰器

### 阶段4: 代码优化

#### 4.1 性能优化
- 使用React.memo优化组件渲染
- 实现虚拟滚动(如果需要)
- 优化图片加载和缓存

#### 4.2 类型安全
- 完善TypeScript类型定义
- 添加严格的类型检查
- 统一错误处理

## 实施计划

### 第1周: 基础组件开发
- [ ] 创建通用组件目录结构
- [ ] 开发StatCard、FilterBar等基础组件
- [ ] 开发档期相关组件

### 第2周: 页面重构
- [ ] 重构SchedulesPage
- [ ] 重构DashboardPage
- [ ] 移动活动代码到档期管理

### 第3周: 功能增强
- [ ] 添加密码修改入口
- [ ] 优化作品管理权限
- [ ] 实现档期管理新功能

### 第4周: 测试和优化
- [ ] 功能测试
- [ ] 性能优化
- [ ] 代码审查和文档更新

## 预期收益

1. **代码复杂度降低**: 单个文件行数减少50%以上
2. **复用性提升**: 通用组件可在多个页面使用
3. **维护性增强**: 模块化结构便于维护和扩展
4. **功能完善**: 新增实用功能提升用户体验
5. **权限安全**: 完善的权限控制保障系统安全
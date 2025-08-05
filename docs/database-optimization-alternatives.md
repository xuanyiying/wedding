data# 数据库设计优化方案 - 替代视图、存储过程、触发器

## 概述

本文档提供了替代数据库视图、存储过程、触发器的应用层解决方案，以提高系统的可维护性、可测试性和跨数据库兼容性。

## 1. 视图替代方案

### 1.1 用户档期视图 (v_user_schedules) 替代方案

**原视图功能：** 联合查询用户和档期信息

**应用层替代方案：**

#### 方案：ORM 关联查询 (使用 Sequelize)

```typescript
// src/models/Schedule.ts
export const Schedule = sequelize.define('Schedule', {
  // 字段定义...
}, {
  associations: {
    user: {
      type: 'belongsTo',
      model: 'User',
      foreignKey: 'user_id'
    }
  }
});

// src/services/ScheduleService.ts
export class ScheduleService {
  async getUserSchedules(filters: ScheduleFilters) {
    return await Schedule.findAll({
      include: [{
        model: User,
        attributes: ['username', 'real_name', 'avatar_url']
      }],
      where: {
        deleted_at: null,
        ...this.buildWhereConditions(filters)
      },
      order: [['start_time', 'ASC']]
    });
  }
}
```

### 1.2 作品统计视图 (v_work_stats) 替代方案

**原视图功能：** 统计作品的点赞数等信息

**应用层替代方案：**

#### 方案一：缓存 + 定时更新

```typescript
// src/services/WorkStatsService.ts
export class WorkStatsService {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  // 获取作品统计信息（优先从缓存获取）
  async getWorkStats(workId: number) {
    const cacheKey = `work_stats:${workId}`;
    let stats = await this.redis.get(cacheKey);
    
    if (!stats) {
      stats = await this.calculateWorkStats(workId);
      await this.redis.setex(cacheKey, 3600, JSON.stringify(stats)); // 缓存1小时
    } else {
      stats = JSON.parse(stats);
    }
    
    return stats;
  }
  
  // 计算作品统计信息
  private async calculateWorkStats(workId: number) {
    const work = await Work.findByPk(workId, {
      include: [{
        model: User,
        attributes: ['username', 'real_name']
      }]
    });
    
    const actualLikes = await WorkLike.count({
      where: { work_id: workId }
    });
    
    return {
      ...work.toJSON(),
      actual_likes: actualLikes
    };
  }
  
  // 批量更新统计信息（定时任务）
  async updateAllWorkStats() {
    const works = await Work.findAll({
      where: { deleted_at: null },
      attributes: ['id']
    });
    
    for (const work of works) {
      const stats = await this.calculateWorkStats(work.id);
      await this.redis.setex(
        `work_stats:${work.id}`, 
        3600, 
        JSON.stringify(stats)
      );
    }
  }
}
```

#### 方案二：实时计算 + 数据库优化

```typescript
// src/services/WorkService.ts
export class WorkService {
  async getWorksWithStats(filters: WorkFilters) {
    // 使用子查询优化性能
    const query = `
      SELECT 
        w.*,
        u.username,
        u.real_name,
        (
          SELECT COUNT(*) 
          FROM work_likes wl 
          WHERE wl.work_id = w.id
        ) as actual_likes
      FROM works w
      INNER JOIN users u ON w.user_id = u.id
      WHERE w.deleted_at IS NULL AND u.deleted_at IS NULL
    `;
    
    return await this.db.query(query);
  }
}
```

## 2. 存储过程替代方案

### 2.1 档期冲突检测存储过程替代方案

**原存储过程功能：** 检测用户档期冲突

**应用层替代方案：**

```typescript
// src/services/ScheduleConflictService.ts
export class ScheduleConflictService {
  async checkScheduleConflict(params: {
    userId: number;
    startTime: Date;
    endTime: Date;
    excludeId?: number;
  }): Promise<{ hasConflict: boolean; conflictCount: number; conflicts: Schedule[] }> {
    
    const whereConditions: any = {
      user_id: params.userId,
      deleted_at: null,
      status: ['booked', 'confirmed'],
      [Op.or]: [
        // 开始时间在现有档期内
        {
          start_time: { [Op.lte]: params.startTime },
          end_time: { [Op.gt]: params.startTime }
        },
        // 结束时间在现有档期内
        {
          start_time: { [Op.lt]: params.endTime },
          end_time: { [Op.gte]: params.endTime }
        },
        // 现有档期完全在新档期内
        {
          start_time: { [Op.gte]: params.startTime },
          end_time: { [Op.lte]: params.endTime }
        }
      ]
    };
    
    if (params.excludeId) {
      whereConditions.id = { [Op.ne]: params.excludeId };
    }
    
    const conflicts = await Schedule.findAll({
      where: whereConditions,
      include: [{
        model: User,
        attributes: ['username', 'real_name']
      }]
    });
    
    return {
      hasConflict: conflicts.length > 0,
      conflictCount: conflicts.length,
      conflicts
    };
  }
  
  // 批量检测冲突（用于批量操作）
  async batchCheckConflicts(schedules: Array<{
    userId: number;
    startTime: Date;
    endTime: Date;
    excludeId?: number;
  }>) {
    const results = await Promise.all(
      schedules.map(schedule => this.checkScheduleConflict(schedule))
    );
    
    return results;
  }
}
```

### 2.2 用户统计数据更新存储过程替代方案

**原存储过程功能：** 更新用户统计信息

**应用层替代方案：**

#### 方案一：事件驱动更新

```typescript
// src/services/UserStatsService.ts
export class UserStatsService {
  private eventEmitter: EventEmitter;
  
  constructor() {
    this.eventEmitter = new EventEmitter();
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // 监听档期变化事件
    this.eventEmitter.on('schedule.created', this.updateUserStats.bind(this));
    this.eventEmitter.on('schedule.deleted', this.updateUserStats.bind(this));
    
    // 监听作品变化事件
    this.eventEmitter.on('work.created', this.updateUserStats.bind(this));
    this.eventEmitter.on('work.deleted', this.updateUserStats.bind(this));
    this.eventEmitter.on('work.liked', this.updateUserStats.bind(this));
    this.eventEmitter.on('work.unliked', this.updateUserStats.bind(this));
  }
  
  async updateUserStats(userId: number) {
    try {
      // 使用事务确保数据一致性
      await sequelize.transaction(async (t) => {
        const [scheduleCount, workCount, totalViews, totalLikes] = await Promise.all([
          this.getScheduleCount(userId, t),
          this.getWorkCount(userId, t),
          this.getTotalViews(userId, t),
          this.getTotalLikes(userId, t)
        ]);
        
        await User.update({
          profile: {
            schedule_count: scheduleCount,
            work_count: workCount,
            total_views: totalViews,
            total_likes: totalLikes
          },
          updated_at: new Date()
        }, {
          where: { id: userId },
          transaction: t
        });
      });
    } catch (error) {
      console.error('更新用户统计信息失败:', error);
      // 可以加入重试机制或错误通知
    }
  }
  
  private async getScheduleCount(userId: number, transaction?: Transaction) {
    return await Schedule.count({
      where: {
        user_id: userId,
        deleted_at: null
      },
      transaction
    });
  }
  
  private async getWorkCount(userId: number, transaction?: Transaction) {
    return await Work.count({
      where: {
        user_id: userId,
        deleted_at: null,
        status: 'published'
      },
      transaction
    });
  }
  
  private async getTotalViews(userId: number, transaction?: Transaction) {
    const result = await Work.sum('view_count', {
      where: {
        user_id: userId,
        deleted_at: null
      },
      transaction
    });
    return result || 0;
  }
  
  private async getTotalLikes(userId: number, transaction?: Transaction) {
    const result = await Work.sum('like_count', {
      where: {
        user_id: userId,
        deleted_at: null
      },
      transaction
    });
    return result || 0;
  }
  
  // 触发统计更新事件
  emitStatsUpdate(event: string, userId: number) {
    this.eventEmitter.emit(event, userId);
  }
}
```


## 3. 触发器替代方案

### 3.1 作品点赞数更新触发器替代方案

**原触发器功能：** 自动更新作品点赞数

**应用层替代方案：**

#### 方案一：Service 层事务处理

```typescript
// src/services/WorkLikeService.ts
export class WorkLikeService {
  async likeWork(userId: number, workId: number) {
    return await sequelize.transaction(async (t) => {
      // 检查是否已经点赞
      const existingLike = await WorkLike.findOne({
        where: { user_id: userId, work_id: workId },
        transaction: t
      });
      
      if (existingLike) {
        throw new Error('已经点赞过了');
      }
      
      // 创建点赞记录
      await WorkLike.create({
        user_id: userId,
        work_id: workId
      }, { transaction: t });
      
      // 更新作品点赞数
      await Work.increment('like_count', {
        where: { id: workId },
        transaction: t
      });
      
      // 更新作品更新时间
      await Work.update({
        updated_at: new Date()
      }, {
        where: { id: workId },
        transaction: t
      });
      
      // 触发统计更新事件
      const work = await Work.findByPk(workId, { transaction: t });
      if (work) {
        this.eventEmitter.emit('work.liked', work.user_id);
      }
      
      return { success: true };
    });
  }
  
  async unlikeWork(userId: number, workId: number) {
    return await sequelize.transaction(async (t) => {
      // 查找并删除点赞记录
      const like = await WorkLike.findOne({
        where: { user_id: userId, work_id: workId },
        transaction: t
      });
      
      if (!like) {
        throw new Error('未找到点赞记录');
      }
      
      await like.destroy({ transaction: t });
      
      // 更新作品点赞数（确保不会小于0）
      await sequelize.query(
        'UPDATE works SET like_count = GREATEST(like_count - 1, 0), updated_at = NOW() WHERE id = ?',
        {
          replacements: [workId],
          transaction: t
        }
      );
      
      // 触发统计更新事件
      const work = await Work.findByPk(workId, { transaction: t });
      if (work) {
        this.eventEmitter.emit('work.unliked', work.user_id);
      }
      
      return { success: true };
    });
  }
  
  // 批量处理点赞（用于数据修复）
  async recalculateLikeCounts() {
    const works = await Work.findAll({
      where: { deleted_at: null },
      attributes: ['id']
    });
    
    for (const work of works) {
      await sequelize.transaction(async (t) => {
        const actualLikes = await WorkLike.count({
          where: { work_id: work.id },
          transaction: t
        });
        
        await Work.update({
          like_count: actualLikes,
          updated_at: new Date()
        }, {
          where: { id: work.id },
          transaction: t
        });
      });
    }
  }
}
```

#### 方案二：消息队列异步处理

```typescript
// src/services/WorkLikeService.ts
export class WorkLikeService {
  private messageQueue: MessageQueue;
  
  constructor(messageQueue: MessageQueue) {
    this.messageQueue = messageQueue;
  }
  
  async likeWork(userId: number, workId: number) {
    // 先创建点赞记录
    const like = await WorkLike.create({
      user_id: userId,
      work_id: workId
    });
    
    // 发送消息到队列异步更新统计
    await this.messageQueue.publish('work.like.created', {
      workId,
      userId,
      action: 'increment'
    });
    
    return like;
  }
  
  async unlikeWork(userId: number, workId: number) {
    const like = await WorkLike.findOne({
      where: { user_id: userId, work_id: workId }
    });
    
    if (!like) {
      throw new Error('未找到点赞记录');
    }
    
    await like.destroy();
    
    // 发送消息到队列异步更新统计
    await this.messageQueue.publish('work.like.deleted', {
      workId,
      userId,
      action: 'decrement'
    });
    
    return { success: true };
  }
}

// src/workers/WorkStatsWorker.ts
export class WorkStatsWorker {
  constructor(private messageQueue: MessageQueue) {
    this.setupMessageHandlers();
  }
  
  private setupMessageHandlers() {
    this.messageQueue.subscribe('work.like.created', this.handleLikeCreated.bind(this));
    this.messageQueue.subscribe('work.like.deleted', this.handleLikeDeleted.bind(this));
  }
  
  private async handleLikeCreated(message: { workId: number; userId: number }) {
    await Work.increment('like_count', {
      where: { id: message.workId }
    });
    
    await Work.update({
      updated_at: new Date()
    }, {
      where: { id: message.workId }
    });
  }
  
  private async handleLikeDeleted(message: { workId: number; userId: number }) {
    await sequelize.query(
      'UPDATE works SET like_count = GREATEST(like_count - 1, 0), updated_at = NOW() WHERE id = ?',
      { replacements: [message.workId] }
    );
  }
}
```

## 4. 优势对比

### 4.1 应用层方案的优势

1. **可测试性**：业务逻辑在应用层，容易编写单元测试和集成测试
2. **可维护性**：代码版本控制更容易，修改和部署更灵活
3. **跨数据库兼容性**：不依赖特定数据库的特性，便于数据库迁移
4. **调试友好**：可以使用应用层的调试工具和日志系统
5. **业务逻辑集中**：所有业务逻辑都在应用层，便于理解和维护
6. **扩展性**：容易添加缓存、消息队列等中间件

### 4.2 性能考虑

1. **缓存策略**：使用 Redis 等缓存系统减少数据库查询
2. **批量处理**：合并多个操作减少数据库往返
3. **异步处理**：使用消息队列处理非关键路径的操作
4. **数据库优化**：合理使用索引和查询优化

### 4.3 数据一致性保证

1. **事务处理**：使用数据库事务确保操作的原子性
2. **乐观锁**：使用版本号或时间戳防止并发冲突
3. **补偿机制**：对于异步操作，提供数据修复和重试机制
4. **监控告警**：监控数据一致性，及时发现和处理问题

## 5. 实施建议

### 5.1 迁移策略

1. **渐进式迁移**：逐步替换现有的数据库逻辑
2. **双写验证**：在迁移期间同时使用新旧方案，验证结果一致性
3. **回滚准备**：保留原有方案作为备份，确保可以快速回滚
4. **性能测试**：充分测试新方案的性能表现

### 5.2 监控和维护

1. **性能监控**：监控关键操作的响应时间和吞吐量
2. **错误监控**：监控和告警业务逻辑错误
3. **数据一致性检查**：定期检查数据一致性
4. **容量规划**：根据业务增长调整系统容量

通过以上方案，可以有效地替代数据库中的视图、存储过程和触发器，提高系统的可维护性和扩展性。
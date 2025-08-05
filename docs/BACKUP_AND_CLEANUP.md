# 数据备份和清理文档

## 概述

本文档描述了临时邮箱系统的数据备份策略、自动清理机制、系统监控和运维流程。

## 数据备份策略

### 备份组件

系统包含以下备份组件：

1. **MongoDB 数据备份** - 邮箱和邮件数据
2. **Redis 数据备份** - 会话和缓存数据
3. **应用程序日志备份** - 系统运行日志
4. **配置文件备份** - 系统配置和环境变量

### 备份调度

- **自动备份**: 每天凌晨 2:00 执行完整备份
- **手动备份**: 支持通过 API 或脚本手动触发
- **增量备份**: 暂不支持，所有备份均为完整备份

### 备份保留策略

- **默认保留期**: 30 天
- **自动清理**: 超过保留期的备份将自动删除
- **压缩存储**: 所有备份使用 gzip 压缩存储

### 备份存储位置

```
/opt/tempmail/backups/
├── backup_2024-01-15T02-00-00-000Z.tar.gz
├── backup_2024-01-16T02-00-00-000Z.tar.gz
└── ...
```

### 备份内容结构

每个备份包含以下内容：

```
backup_TIMESTAMP/
├── mongodb/                 # MongoDB 数据
│   └── tempmail/
│       ├── mailboxes.bson
│       ├── mails.bson
│       └── ...
├── redis.rdb.gz            # Redis 数据快照
├── logs/                   # 应用程序日志
│   ├── app.log
│   ├── error.log
│   └── ...
└── backup_metadata.json    # 备份元数据
```

## 自动数据清理

### 清理策略

系统实现了多层次的数据清理策略：

#### 1. 过期邮箱清理

- **频率**: 每 15 分钟执行一次
- **策略**: 删除过期超过 2 小时的邮箱及其所有邮件
- **宽限期**: 2 小时宽限期，防止误删除

#### 2. 旧邮件清理

- **频率**: 每天凌晨 3:00 执行
- **策略**: 删除超过 7 天的邮件
- **批处理**: 每批处理 100 条记录

#### 3. 孤立数据清理

- **频率**: 每周日凌晨 4:00 执行
- **策略**: 清理没有对应邮箱的邮件和无效的邮箱记录

#### 4. Redis 数据清理

- **频率**: 每天凌晨 2:00 执行
- **策略**: 清理过期会话和临时缓存

### 清理配置

可通过环境变量配置清理策略：

```bash
# 启用/禁用清理服务
CLEANUP_ENABLED=true

# 清理调度
CLEANUP_EXPIRED_MAILBOXES_SCHEDULE="*/15 * * * *"
CLEANUP_OLD_MAILS_SCHEDULE="0 3 * * *"
CLEANUP_ORPHANED_DATA_SCHEDULE="0 4 * * 0"
CLEANUP_REDIS_SCHEDULE="0 2 * * *"

# 保留策略
EXPIRED_MAILBOX_GRACE_PERIOD=2  # 小时
OLD_MAILS_RETENTION_DAYS=7      # 天
LOG_RETENTION_DAYS=30           # 天
SESSION_RETENTION_HOURS=24      # 小时

# 批处理大小
CLEANUP_BATCH_SIZE=100
```

## 系统监控

### 监控指标

系统监控以下关键指标：

#### 系统资源

- **CPU 使用率**: 阈值 80%
- **内存使用率**: 阈值 85%
- **磁盘使用率**: 阈值 90%
- **网络连接数**: 阈值 1000

#### 应用程序

- **响应时间**: 阈值 2000ms
- **错误率**: 阈值 10 错误/分钟
- **活跃连接数**: WebSocket 连接数
- **运行时间**: 应用程序正常运行时间

#### 数据库

- **MongoDB 连接状态**: 连接健康检查
- **Redis 连接状态**: 连接健康检查
- **连接池状态**: 连接池使用情况

### 告警机制

#### 告警级别

- **Warning**: 指标超过阈值但系统仍可正常运行
- **Critical**: 指标严重超标，可能影响系统稳定性

#### 告警通知

- **邮件通知**: 发送到管理员邮箱
- **Slack 通知**: 发送到指定 Slack 频道
- **Webhook 通知**: 发送到自定义 webhook 端点

#### 告警配置

```bash
# 监控配置
MONITORING_ENABLED=true
MONITORING_CHECK_INTERVAL="* * * * *"  # 每分钟检查

# 告警阈值
ALERT_CPU_THRESHOLD=80
ALERT_MEMORY_THRESHOLD=85
ALERT_DISK_THRESHOLD=90
ALERT_RESPONSE_TIME_THRESHOLD=2000
ALERT_ERROR_RATE_THRESHOLD=10

# 通知配置
ALERT_EMAIL=admin@nnu.edu.kg
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
SLACK_CHANNEL=#alerts
ALERT_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
```

## API 接口

### 备份管理 API

#### 手动触发备份

```http
POST /api/admin/backup
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "backupPath": "/opt/tempmail/backups/backup_2024-01-15T10-30-00-000Z.tar.gz",
  "size": 1048576,
  "duration": 30000
}
```

#### 获取备份列表

```http
GET /api/admin/backups
Authorization: Bearer <admin_token>

Response:
{
  "backups": [
    {
      "filename": "backup_2024-01-15T02-00-00-000Z.tar.gz",
      "size": 1048576,
      "created": "2024-01-15T02:00:00.000Z",
      "path": "/opt/tempmail/backups/backup_2024-01-15T02-00-00-000Z.tar.gz"
    }
  ]
}
```

#### 获取备份状态

```http
GET /api/admin/backup/status
Authorization: Bearer <admin_token>

Response:
{
  "enabled": true,
  "isRunning": true,
  "schedule": "0 2 * * *",
  "nextRun": "2024-01-16T02:00:00.000Z",
  "lastBackup": "2024-01-15T02:00:00.000Z"
}
```

### 清理管理 API

#### 手动触发清理

```http
POST /api/admin/cleanup/:type
Authorization: Bearer <admin_token>

Parameters:
- type: expiredMailboxes | oldMails | orphanedData | redisCleanup

Response:
{
  "type": "expiredMailboxes",
  "processed": 150,
  "deleted": 120,
  "errors": 0,
  "duration": 5000
}
```

#### 获取清理统计

```http
GET /api/admin/cleanup/stats
Authorization: Bearer <admin_token>

Response:
{
  "totalMailboxes": 1000,
  "activeMailboxes": 800,
  "expiredMailboxes": 200,
  "totalMails": 5000,
  "oldMails": 500,
  "redisKeys": 1500
}
```

### 监控 API

#### 获取系统指标

```http
GET /api/admin/monitoring/metrics
Authorization: Bearer <admin_token>

Response:
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "cpu": {
    "usage": 45.2,
    "loadAverage": [1.2, 1.1, 1.0]
  },
  "memory": {
    "total": 8589934592,
    "used": 4294967296,
    "free": 4294967296,
    "usage": 50.0
  },
  "disk": {
    "total": 107374182400,
    "used": 53687091200,
    "free": 53687091200,
    "usage": 50.0
  },
  "application": {
    "uptime": 86400,
    "responseTime": 150,
    "errorRate": 2,
    "activeConnections": 50
  },
  "database": {
    "mongodb": true,
    "redis": true,
    "connectionPool": 10
  }
}
```

#### 获取活跃告警

```http
GET /api/admin/monitoring/alerts
Authorization: Bearer <admin_token>

Response:
{
  "alerts": [
    {
      "id": "cpu_usage_1642248600000",
      "type": "warning",
      "metric": "cpu_usage",
      "value": 85.5,
      "threshold": 80,
      "message": "High CPU usage: 85.5%",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "resolved": false
    }
  ]
}
```

## 运维脚本

### 备份脚本

#### 手动备份

```bash
# 执行完整备份
./scripts/backup.sh backup

# 列出可用备份
./scripts/backup.sh list

# 清理旧备份
./scripts/backup.sh cleanup
```

#### 恢复备份

```bash
# 恢复指定备份（需要手动实现）
./scripts/backup.sh restore /path/to/backup.tar.gz
```

### 监控脚本

#### 健康检查

```bash
# 执行完整健康检查
./scripts/health-check.sh

# 检查特定服务
docker-compose ps
docker-compose logs backend
```

#### 系统监控

```bash
# 启动实时监控
./scripts/monitor.sh

# 查看监控日志
tail -f /opt/tempmail/logs/monitor.log
```

### 维护脚本

#### 系统维护

```bash
# 执行系统维护
./scripts/maintenance.sh

# 重启服务
./scripts/maintenance.sh restart

# 查看服务状态
./scripts/maintenance.sh status
```

## 故障排除

### 常见问题

#### 备份失败

1. **检查磁盘空间**: 确保备份目录有足够空间
2. **检查权限**: 确保备份进程有写入权限
3. **检查数据库连接**: 确保 MongoDB 和 Redis 连接正常

```bash
# 检查磁盘空间
df -h /opt/tempmail/backups

# 检查权限
ls -la /opt/tempmail/backups

# 测试数据库连接
docker exec tempmail-mongodb-prod mongosh --eval "db.adminCommand('ping')"
docker exec tempmail-redis-prod redis-cli ping
```

#### 清理任务异常

1. **检查调度器状态**: 确保 cron 任务正常运行
2. **检查日志**: 查看清理任务的错误日志
3. **手动执行**: 尝试手动执行清理任务

```bash
# 检查清理日志
docker logs tempmail-backend-prod | grep -i cleanup

# 手动触发清理
curl -X POST http://localhost:3001/api/admin/cleanup/expiredMailboxes \
  -H "Authorization: Bearer <admin_token>"
```

#### 监控告警异常

1. **检查监控服务状态**: 确保监控服务正常运行
2. **验证告警阈值**: 检查告警阈值配置是否合理
3. **测试通知渠道**: 验证邮件、Slack 等通知渠道

```bash
# 检查监控状态
curl http://localhost:3001/api/admin/monitoring/status

# 测试告警通知
curl -X POST http://localhost:3001/api/admin/monitoring/test-alert
```

### 日志文件位置

- **应用程序日志**: `/opt/tempmail/logs/app.log`
- **备份日志**: `/opt/tempmail/logs/backup.log`
- **监控日志**: `/opt/tempmail/logs/monitor.log`
- **清理日志**: 包含在应用程序日志中

### 性能优化建议

1. **备份优化**:
   - 在低峰时段执行备份
   - 使用增量备份（未来实现）
   - 考虑使用专用备份存储

2. **清理优化**:
   - 调整批处理大小以平衡性能和资源使用
   - 在低峰时段执行大型清理任务
   - 监控清理任务的执行时间

3. **监控优化**:
   - 调整监控频率以平衡及时性和资源消耗
   - 使用合适的告警阈值避免误报
   - 定期审查和调整监控策略

## 安全考虑

1. **备份安全**:
   - 备份文件包含敏感数据，需要适当的访问控制
   - 考虑对备份文件进行加密
   - 定期测试备份恢复流程

2. **API 安全**:
   - 所有管理 API 都需要管理员权限
   - 使用 HTTPS 传输敏感数据
   - 记录所有管理操作的审计日志

3. **监控安全**:
   - 保护监控数据不被未授权访问
   - 确保告警通知渠道的安全性
   - 定期审查监控配置和权限

## 联系信息

如有问题或需要支持，请联系：

- **技术支持**: admin@nnu.edu.kg
- **紧急联系**: 通过 Slack #alerts 频道
- **文档更新**: 请提交 Pull Request 到项目仓库

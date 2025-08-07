# 备份和清理服务使用指南

## 概述

备份和清理服务提供了完整的数据管理解决方案，包括自动备份、数据清理、系统监控和定时任务管理。

## 🚀 快速开始

### 1. 安装服务

```bash
# 交互式安装（推荐）
./scripts/install-backup-cleanup.sh

# 静默安装
./scripts/install-backup-cleanup.sh silent
```

### 2. 验证安装

```bash
# 验证备份清理服务
./scripts/validate-all.sh --backup-only

# 查看服务状态
./scripts/backup-cleanup.sh status
```

### 3. 手动执行

```bash
# 执行完整备份
./scripts/backup-cleanup.sh backup

# 执行完整清理
./scripts/backup-cleanup.sh cleanup

# 系统监控检查
./scripts/backup-cleanup.sh monitor
```

## 📋 功能详解

### 备份功能

#### 支持的数据类型

- **MongoDB 数据库** - 完整的数据库备份
- **Redis 缓存** - RDB 快照备份
- **配置文件** - 重要配置的备份（可选）

#### 备份特性

- 🗜️ **自动压缩** - 可配置压缩级别（1-9）
- 🔐 **加密支持** - 可选的备份加密
- 📅 **自动清理** - 根据保留策略清理旧备份
- 📧 **通知功能** - 备份完成后发送邮件通知

### 清理功能

#### 清理类型

- **过期邮箱清理** - 清理超过宽限期的过期邮箱
- **旧邮件清理** - 清理超过保留期的邮件
- **Redis 缓存清理** - 清理过期的缓存数据
- **日志文件清理** - 清理旧的日志文件

#### 清理策略

- ⏰ **灵活调度** - 支持不同的清理频率
- 🔢 **批处理** - 可配置批处理大小
- 🛡️ **安全机制** - 防止误删重要数据

### 监控功能

#### 监控指标

- **系统资源** - CPU、内存、磁盘使用率
- **服务状态** - Docker 容器运行状态
- **响应时间** - 服务响应时间监控
- **错误率** - 错误发生频率监控

#### 告警机制

- 📧 **邮件告警** - 超过阈值时发送邮件
- 🔗 **Webhook 支持** - 支持 Slack 等第三方通知
- 📊 **历史数据** - 保留监控历史数据

## ⚙️ 配置说明

### 主要配置文件

#### `.env` 文件

运行时配置，包含所有服务的配置参数：

```bash
# 备份服务配置
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=/opt/tempmail/backups

# 清理服务配置
CLEANUP_ENABLED=true
CLEANUP_EXPIRED_MAILBOXES_SCHEDULE="*/15 * * * *"
CLEANUP_OLD_MAILS_SCHEDULE="0 3 * * *"

# 监控服务配置
MONITORING_ENABLED=true
ALERT_CPU_THRESHOLD=80
ALERT_MEMORY_THRESHOLD=85
```

#### `.env.backup-cleanup` 文件

配置模板，包含所有可用的配置选项和详细说明。

### 关键配置项

#### 备份配置

- `BACKUP_ENABLED` - 启用/禁用备份服务
- `BACKUP_SCHEDULE` - 备份执行时间（cron 表达式）
- `BACKUP_RETENTION_DAYS` - 备份文件保留天数
- `BACKUP_PATH` - 备份文件存储路径
- `BACKUP_COMPRESSION_LEVEL` - 压缩级别（1-9）

#### 清理配置

- `CLEANUP_ENABLED` - 启用/禁用清理服务
- `EXPIRED_MAILBOX_GRACE_PERIOD` - 过期邮箱宽限期（小时）
- `OLD_MAILS_RETENTION_DAYS` - 邮件保留天数
- `CLEANUP_BATCH_SIZE` - 批处理大小

#### 监控配置

- `MONITORING_ENABLED` - 启用/禁用监控服务
- `ALERT_CPU_THRESHOLD` - CPU 使用率告警阈值
- `ALERT_MEMORY_THRESHOLD` - 内存使用率告警阈值
- `ALERT_EMAIL` - 告警通知邮箱

## 🕐 定时任务

### 默认调度

```bash
# 备份任务 - 每天凌晨 2:00
0 2 * * * /path/to/backup-cleanup.sh backup

# 清理过期邮箱 - 每 15 分钟
*/15 * * * * /path/to/backup-cleanup.sh cleanup-mailboxes

# 清理旧邮件 - 每天凌晨 3:00
0 3 * * * /path/to/backup-cleanup.sh cleanup-mails

# 清理 Redis - 每天凌晨 2:00
0 2 * * * /path/to/backup-cleanup.sh cleanup-redis

# 系统监控 - 每分钟
* * * * * /path/to/backup-cleanup.sh monitor
```

### 安装定时任务

```bash
# 安装所有定时任务
./scripts/backup-cleanup.sh install

# 查看已安装的任务
crontab -l
```

## 📊 使用示例

### 日常操作

```bash
# 查看服务状态
./scripts/backup-cleanup.sh status

# 手动执行备份
./scripts/backup-cleanup.sh backup

# 手动执行清理
./scripts/backup-cleanup.sh cleanup

# 只清理过期邮箱
./scripts/backup-cleanup.sh cleanup-mailboxes

# 只清理旧邮件
./scripts/backup-cleanup.sh cleanup-mails

# 只清理 Redis 缓存
./scripts/backup-cleanup.sh cleanup-redis

# 执行系统监控
./scripts/backup-cleanup.sh monitor
```

### 故障排除

```bash
# 检查配置
./scripts/validate-all.sh --backup-only

# 查看日志
tail -f logs/backup.log
tail -f logs/cleanup.log
tail -f logs/monitor.log

# 测试脚本
./scripts/backup-cleanup.sh status
```

## 📁 目录结构

```
project/
├── scripts/
│   ├── backup-cleanup.sh           # 主服务脚本
│   └── install-backup-cleanup.sh   # 安装脚本
├── .env                            # 运行时配置
├── .env.backup-cleanup             # 配置模板
├── backups/                        # 备份文件存储
│   ├── mongodb_20250807_020000.tar.gz
│   └── redis_20250807_020000.rdb
└── logs/                           # 日志文件
    ├── backup.log
    ├── cleanup.log
    └── monitor.log
```

## 🔧 高级配置

### 自定义备份路径

```bash
# 在 .env 文件中设置
BACKUP_PATH=/custom/backup/path
```

### 配置加密备份

```bash
# 启用加密
BACKUP_ENCRYPTION_ENABLED=true
BACKUP_ENCRYPTION_KEY=your-encryption-key
```

### 配置邮件通知

```bash
# 设置通知邮箱
BACKUP_NOTIFICATION_EMAIL=admin@example.com
ALERT_EMAIL=admin@example.com
```

### 配置 Slack 通知

```bash
# 设置 Slack Webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## 🚨 注意事项

### 安全建议

1. **权限控制** - 确保备份目录有适当的权限
2. **加密备份** - 生产环境建议启用备份加密
3. **网络安全** - 限制备份文件的网络访问
4. **密钥管理** - 安全存储加密密钥

### 性能优化

1. **备份时间** - 选择系统负载较低的时间执行备份
2. **压缩级别** - 平衡压缩率和 CPU 使用
3. **并发控制** - 根据系统资源调整并发数
4. **存储空间** - 定期检查备份存储空间

### 监控建议

1. **阈值设置** - 根据实际情况调整告警阈值
2. **历史数据** - 保留足够的监控历史数据
3. **告警频率** - 避免告警过于频繁
4. **响应机制** - 建立告警响应流程

## 📚 相关文档

- [脚本整合说明](SCRIPT_CONSOLIDATION.md)
- [配置管理指南](../README.md)
- [故障排除指南](TROUBLESHOOTING.md)

## 🆘 故障排除

### 常见问题

1. **备份失败**

   ```bash
   # 检查容器状态
   docker ps

   # 检查磁盘空间
   df -h

   # 查看错误日志
   tail -f logs/backup.log
   ```

2. **清理任务不执行**

   ```bash
   # 检查 cron 服务
   sudo service cron status

   # 检查 cron 任务
   crontab -l

   # 手动测试
   ./scripts/backup-cleanup.sh cleanup
   ```

3. **监控告警不工作**

   ```bash
   # 检查配置
   ./scripts/validate-all.sh --backup-only

   # 测试监控
   ./scripts/backup-cleanup.sh monitor

   # 检查邮件配置
   echo "test" | mail -s "test" admin@example.com
   ```

## 📝 总结

备份和清理服务提供了：

- ✅ **完整的数据保护** - 自动备份重要数据
- ✅ **智能数据清理** - 自动清理过期和无用数据
- ✅ **实时系统监控** - 监控系统健康状态
- ✅ **灵活的配置** - 支持各种自定义配置
- ✅ **简单的管理** - 一键安装和管理

通过这个服务，你可以确保邮件系统的数据安全和系统性能。

# 临时邮箱系统运维手册

## 概述

本手册提供了临时邮箱系统的日常运维指南，包括部署、监控、故障排除和维护程序。

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │    Frontend     │    │    Backend      │
│   (反向代理)     │────│   (React App)   │────│  (Node.js API)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │    MongoDB      │    │     Redis       │
                       │   (数据存储)     │    │    (缓存)       │
                       └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │    Postfix      │    │   监控服务       │
                       │   (邮件服务)     │    │  (备份/清理)     │
                       └─────────────────┘    └─────────────────┘
```

## 部署流程

### 生产环境部署

#### 1. 环境准备

```bash
# 创建部署目录
sudo mkdir -p /opt/tempmail
cd /opt/tempmail

# 克隆代码
git clone https://github.com/your-org/tempmail.git .

# 创建必要目录
sudo mkdir -p /opt/tempmail/{logs,backups,data}
sudo chown -R $USER:$USER /opt/tempmail
```

#### 2. 环境配置

```bash
# 复制生产环境配置
cp .env.production .env

# 编辑配置文件
nano .env
```

关键配置项：

```bash
NODE_ENV=production
DOMAIN=mail.nnu.edu.kg
MONGODB_URI=mongodb://localhost:27017/tempmail
REDIS_URL=redis://localhost:6379
BACKUP_ENABLED=true
MONITORING_ENABLED=true
```

#### 3. 构建和启动

```bash
# 构建应用
docker-compose -f docker-compose.prod.yml build

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 验证部署
./scripts/health-check.sh
```

### 更新部署

#### 零停机更新流程

```bash
# 1. 备份当前数据
./scripts/backup.sh backup

# 2. 拉取最新代码
git pull origin main

# 3. 构建新镜像
docker-compose -f docker-compose.prod.yml build

# 4. 滚动更新
docker-compose -f docker-compose.prod.yml up -d --no-deps backend
docker-compose -f docker-compose.prod.yml up -d --no-deps frontend

# 5. 验证更新
./scripts/health-check.sh

# 6. 清理旧镜像
docker image prune -f
```

## 监控和告警

### 关键监控指标

#### 系统级指标

- **CPU 使用率**: < 80%
- **内存使用率**: < 85%
- **磁盘使用率**: < 90%
- **网络连接数**: < 1000

#### 应用级指标

- **响应时间**: < 2000ms
- **错误率**: < 10 错误/分钟
- **邮箱创建率**: 监控异常峰值
- **邮件接收率**: 监控邮件处理性能

#### 数据库指标

- **MongoDB 连接状态**: 必须正常
- **Redis 连接状态**: 必须正常
- **数据库响应时间**: < 100ms

### 告警配置

#### Slack 告警设置

```bash
# 在 .env 中配置 Slack Webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#tempmail-alerts

# 测试告警
curl -X POST http://localhost:3001/api/admin/monitoring/test-alert \
  -H "Authorization: Bearer <admin_token>"
```

#### 邮件告警设置

```bash
# 配置邮件告警
ALERT_EMAIL=admin@nnu.edu.kg

# 确保系统可以发送邮件
sudo apt-get install mailutils
echo "Test email" | mail -s "Test" admin@nnu.edu.kg
```

### 监控仪表板

访问监控仪表板：

- **系统指标**: `https://mail.nnu.edu.kg/admin/monitoring`
- **应用日志**: `docker logs tempmail-backend-prod`
- **数据库状态**: `docker exec tempmail-mongodb-prod mongosh --eval "db.stats()"`

## 故障排除

### 常见故障场景

#### 1. 服务无响应

**症状**: 网站无法访问，返回 502/503 错误

**排查步骤**:

```bash
# 检查容器状态
docker-compose ps

# 检查 Nginx 日志
docker logs tempmail-nginx-prod

# 检查后端日志
docker logs tempmail-backend-prod

# 检查系统资源
htop
df -h
```

**解决方案**:

```bash
# 重启相关服务
docker-compose restart nginx
docker-compose restart backend

# 如果是资源不足
# 清理磁盘空间
docker system prune -f
./scripts/backup.sh cleanup

# 重启整个系统（最后手段）
docker-compose down
docker-compose up -d
```

#### 2. 邮件接收异常

**症状**: 用户报告收不到邮件

**排查步骤**:

```bash
# 检查邮件服务状态
docker logs tempmail-postfix-prod

# 检查邮件处理日志
docker logs tempmail-backend-prod | grep -i mail

# 测试邮件接收
echo "Test email" | mail test@nnu.edu.kg

# 检查 DNS 配置
dig MX nnu.edu.kg
```

**解决方案**:

```bash
# 重启邮件服务
docker-compose restart postfix

# 检查邮件队列
docker exec tempmail-postfix-prod postqueue -p

# 清理邮件队列（如果有积压）
docker exec tempmail-postfix-prod postsuper -d ALL
```

#### 3. 数据库连接问题

**症状**: 应用报告数据库连接错误

**排查步骤**:

```bash
# 检查 MongoDB 状态
docker exec tempmail-mongodb-prod mongosh --eval "db.adminCommand('ping')"

# 检查 Redis 状态
docker exec tempmail-redis-prod redis-cli ping

# 检查连接数
docker exec tempmail-mongodb-prod mongosh --eval "db.serverStatus().connections"
```

**解决方案**:

```bash
# 重启数据库服务
docker-compose restart mongodb redis

# 检查数据库日志
docker logs tempmail-mongodb-prod
docker logs tempmail-redis-prod

# 如果数据损坏，从备份恢复
./scripts/backup.sh restore /path/to/backup.tar.gz
```

#### 4. 磁盘空间不足

**症状**: 系统告警磁盘使用率过高

**排查步骤**:

```bash
# 检查磁盘使用情况
df -h
du -sh /opt/tempmail/* | sort -hr

# 检查大文件
find /opt/tempmail -type f -size +100M -ls
```

**解决方案**:

```bash
# 清理旧日志
find /opt/tempmail/logs -name "*.log" -mtime +7 -delete

# 清理旧备份
./scripts/backup.sh cleanup

# 清理 Docker 资源
docker system prune -f

# 手动清理过期数据
curl -X POST http://localhost:3001/api/admin/cleanup/expiredMailboxes \
  -H "Authorization: Bearer <admin_token>"
```

#### 5. 内存泄漏

**症状**: 内存使用率持续上升

**排查步骤**:

```bash
# 检查内存使用
free -h
docker stats

# 检查进程内存使用
ps aux --sort=-%mem | head -10

# 检查应用内存使用
docker exec tempmail-backend-prod node -e "console.log(process.memoryUsage())"
```

**解决方案**:

```bash
# 重启应用服务
docker-compose restart backend frontend

# 如果问题持续，重启整个系统
sudo reboot
```

### 紧急响应流程

#### 1. 系统完全宕机

```bash
# 立即响应（5分钟内）
1. 检查服务器状态
2. 重启 Docker 服务
3. 通知团队

# 短期恢复（15分钟内）
1. 从最近备份恢复
2. 验证服务功能
3. 更新状态页面

# 长期修复（1小时内）
1. 分析根本原因
2. 实施永久修复
3. 更新监控和告警
```

#### 2. 数据丢失

```bash
# 立即响应
1. 停止所有写操作
2. 评估数据丢失范围
3. 启动数据恢复流程

# 数据恢复
1. 从最近备份恢复
2. 验证数据完整性
3. 重启服务

# 后续处理
1. 分析数据丢失原因
2. 改进备份策略
3. 通知受影响用户
```

## 维护程序

### 日常维护任务

#### 每日检查清单

```bash
# 1. 检查系统状态
./scripts/health-check.sh

# 2. 检查监控告警
curl http://localhost:3001/api/admin/monitoring/alerts

# 3. 检查备份状态
ls -la /opt/tempmail/backups/ | tail -5

# 4. 检查磁盘空间
df -h

# 5. 检查错误日志
docker logs tempmail-backend-prod --since="24h" | grep -i error | wc -l
```

#### 每周维护任务

```bash
# 1. 系统更新
sudo apt update && sudo apt upgrade -y

# 2. 清理系统
docker system prune -f
./scripts/backup.sh cleanup

# 3. 性能检查
./scripts/performance-monitor.js

# 4. 安全检查
# 检查异常访问模式
docker logs tempmail-nginx-prod | grep -E "40[0-9]|50[0-9]" | tail -20
```

#### 每月维护任务

```bash
# 1. 备份验证
# 随机选择一个备份进行恢复测试

# 2. 性能优化
# 分析慢查询日志
# 优化数据库索引

# 3. 安全审计
# 检查访问日志
# 更新安全配置

# 4. 容量规划
# 分析增长趋势
# 评估资源需求
```

### 计划维护

#### 维护窗口

- **时间**: 每月第一个周日 02:00-04:00 UTC
- **通知**: 提前 48 小时通知用户
- **回滚计划**: 准备快速回滚方案

#### 维护流程

```bash
# 1. 维护前准备
./scripts/backup.sh backup
./scripts/health-check.sh > pre-maintenance-status.txt

# 2. 执行维护
# 系统更新
# 配置变更
# 性能优化

# 3. 维护后验证
./scripts/health-check.sh
# 功能测试
# 性能测试

# 4. 维护完成
# 更新文档
# 通知用户
```

## 性能优化

### 数据库优化

#### MongoDB 优化

```javascript
// 创建索引
db.mailboxes.createIndex({ expiresAt: 1, isActive: 1 });
db.mails.createIndex({ mailboxId: 1, receivedAt: -1 });

// 查询性能分析
db.mails.find({ mailboxId: 'xxx' }).explain('executionStats');

// 清理过期数据
db.mailboxes.deleteMany({ expiresAt: { $lt: new Date() }, isActive: false });
```

#### Redis 优化

```bash
# 检查内存使用
docker exec tempmail-redis-prod redis-cli info memory

# 清理过期键
docker exec tempmail-redis-prod redis-cli --scan --pattern "session:*" | xargs docker exec tempmail-redis-prod redis-cli del

# 优化配置
# 在 redis.conf 中设置合适的内存策略
maxmemory-policy allkeys-lru
```

### 应用优化

#### 后端优化

```javascript
// 连接池优化
mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
});

// 缓存策略
const cache = new Map();
const getCachedData = key => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  // 从数据库获取数据
  const data = fetchFromDB(key);
  cache.set(key, data);
  return data;
};
```

#### 前端优化

```javascript
// 代码分割
const MailboxPage = lazy(() => import('./pages/MailboxPage'));

// 图片懒加载
<img loading="lazy" src={imageUrl} alt="description" />;

// 缓存策略
const cacheConfig = {
  'Cache-Control': 'public, max-age=31536000',
  ETag: true,
};
```

## 安全管理

### 安全检查清单

#### 系统安全

```bash
# 1. 检查开放端口
nmap -sT -O localhost

# 2. 检查用户权限
sudo cat /etc/passwd | grep -E "bash|sh"

# 3. 检查系统更新
sudo apt list --upgradable

# 4. 检查防火墙状态
sudo ufw status
```

#### 应用安全

```bash
# 1. 检查依赖漏洞
npm audit

# 2. 检查 Docker 镜像安全
docker scan tempmail-backend:latest

# 3. 检查 SSL 证书
openssl x509 -in /etc/ssl/certs/mail.nnu.edu.kg.crt -text -noout

# 4. 检查访问日志异常
docker logs tempmail-nginx-prod | grep -E "40[0-9]|50[0-9]" | tail -20
```

### 安全事件响应

#### 1. 发现安全漏洞

```bash
# 立即响应
1. 评估漏洞影响范围
2. 临时缓解措施
3. 通知安全团队

# 修复流程
1. 开发安全补丁
2. 测试补丁
3. 部署修复

# 后续处理
1. 安全审计
2. 更新安全策略
3. 培训团队
```

#### 2. 检测到攻击

```bash
# 立即响应
1. 阻止攻击源 IP
sudo ufw deny from <攻击IP>

2. 分析攻击模式
docker logs tempmail-nginx-prod | grep <攻击IP>

3. 评估损害
# 检查数据完整性
# 检查系统文件

# 恢复措施
1. 清理恶意数据
2. 修复受损系统
3. 加强防护措施
```

## 联系信息和升级路径

### 团队联系方式

- **运维团队**: ops@nnu.edu.kg
- **开发团队**: dev@nnu.edu.kg
- **安全团队**: security@nnu.edu.kg

### 升级路径

#### 一级支持（运维团队）

- 日常监控和维护
- 常见故障处理
- 性能优化

#### 二级支持（开发团队）

- 复杂技术问题
- 代码级别故障
- 新功能开发

#### 三级支持（架构师/外部专家）

- 架构级别问题
- 重大系统设计变更
- 灾难恢复

### 紧急联系

- **24/7 值班电话**: +86-xxx-xxxx-xxxx
- **紧急邮件**: emergency@nnu.edu.kg
- **Slack 紧急频道**: #emergency-response

## 文档维护

本文档应定期更新，包括：

1. **每月更新**: 根据运维经验更新故障排除指南
2. **季度更新**: 更新性能基准和优化建议
3. **年度更新**: 全面审查和更新所有流程

最后更新时间: 2024-01-15
文档版本: v1.0
维护人员: 运维团队

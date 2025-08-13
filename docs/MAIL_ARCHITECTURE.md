# 邮件系统架构文档

## 概述

本项目实现了一个临时邮箱系统，支持开发和生产两种不同的邮件处理架构。

## 架构对比

### 开发环境 (Development)

```
外部邮件发送者
       ↓
   端口 25 (Postfix 邮件服务器)
       ↓
   backend:2525 (邮件处理服务)
       ↓
   ┌─────────────────┬─────────────────┐
   ↓                 ↓                 ↓
MongoDB 存储    MailHog 转发    WebSocket 推送
   ↓                 ↓                 ↓
数据持久化      可视化调试        前端实时更新
```

**特点：**

- ✅ MailHog 提供邮件可视化界面
- ✅ 所有邮件都会转发到 MailHog 进行调试
- ✅ 使用 Postfix 进行标准 SMTP 服务
- ✅ 支持热重载和调试模式

### 生产环境 (Production)

```
外部邮件发送者
       ↓
   端口 25 (Postfix 邮件服务器)
       ↓
   backend:2525 (邮件处理服务)
       ↓
   ┌─────────────────┬─────────────────┐
   ↓                 ↓                 ↓
MongoDB 存储    日志记录        WebSocket 推送
   ↓                 ↓                 ↓
数据持久化      生产监控        前端实时更新
```

**特点：**

- ✅ Postfix 提供标准 SMTP 服务
- ✅ 无 MailHog 转发，提高性能
- ✅ 完整的邮件服务器功能
- ✅ 生产级别的安全和监控

## 服务组件

### 共同组件

| 组件         | 端口  | 功能               |
| ------------ | ----- | ------------------ |
| Backend API  | 3001  | 主要业务逻辑和 API |
| Backend Mail | 2525  | 邮件接收和处理     |
| MongoDB      | 27017 | 数据存储           |
| Redis        | 6379  | 缓存和会话         |

### 开发环境专用

| 组件           | 端口 | 功能           |
| -------------- | ---- | -------------- |
| MailHog SMTP   | 1025 | 邮件捕获       |
| MailHog UI     | 8025 | 邮件可视化界面 |
| Postfix        | 25   | 标准 SMTP 服务器 |
| Frontend Dev   | 3000 | 开发服务器     |

### 生产环境专用

| 组件    | 端口   | 功能               |
| ------- | ------ | ------------------ |
| Postfix | 25     | 标准 SMTP 服务器   |
| Nginx   | 80/443 | 反向代理和静态文件 |

## 环境变量配置

### 开发环境

```bash
NODE_ENV=development
MAIL_PORT=2525
MAILHOG_HOST=mailhog
MAILHOG_PORT=1025
SMTP_HOST=mailhog
SMTP_PORT=1025
```

### 生产环境

```bash
NODE_ENV=production
MAIL_PORT=2525
POSTFIX_MYHOSTNAME=mail.nnu.edu.kg
POSTFIX_MYDOMAIN=nnu.edu.kg
POSTFIX_MYORIGIN=nnu.edu.kg
```

## 启动命令

### 开发环境

```bash
# 启动开发环境
./scripts/dev-start.sh

# 测试邮件转发
./scripts/test-mail-forwarding.sh

# 查看 MailHog 界面
open http://localhost:8025
```

### 生产环境

```bash
# 启动生产环境
./scripts/prod-start.sh

# 检查环境状态
./scripts/check-environment.sh
```

## 邮件处理流程

### 1. 邮件接收

- **开发**: Postfix 转发 → backend:2525
- **生产**: Postfix 转发 → backend:2525

### 2. 邮件解析

- 使用 `mailparser` 解析原始邮件
- 提取发件人、收件人、主题、内容、附件

### 3. 邮件存储

- 验证收件人域名
- 查找对应的临时邮箱
- 存储到 MongoDB

### 4. 实时通知

- 通过 WebSocket 推送到前端
- **开发**: 同时转发到 MailHog

## 调试和监控

### 开发环境调试

```bash
# 查看 MailHog 中的邮件
curl http://localhost:8025/api/v1/messages

# 查看后端健康状态
curl http://localhost:3001/health/mail

# 查看容器日志
docker-compose -f docker-compose.dev.yml logs -f backend-dev
```

### 生产环境监控

```bash
# 查看 Postfix 日志
docker-compose -f docker-compose.prod.yml logs -f mailserver

# 查看后端健康状态
curl http://localhost:3001/health/mail

# 查看系统状态
./scripts/check-environment.sh
```

## 配置文件结构

```
config/
├── postfix/
│   ├── main.cf              # 主配置文件
│   ├── transport            # 简单传输映射
│   ├── transport_regexp     # 正则表达式传输映射
│   └── virtual_regexp       # 虚拟域名映射
├── nginx/
├── redis/
└── mongodb/
```

## 故障排除

### 常见问题

1. **邮件无法接收**
   - 检查端口 25 是否被占用
   - 验证 DNS MX 记录配置
   - 查看防火墙设置
   - 检查 `config/postfix/` 配置文件

2. **MailHog 不显示邮件**
   - 确认 `NODE_ENV=development`
   - 检查 `MAILHOG_HOST` 环境变量
   - 查看后端日志中的转发状态

3. **Postfix 转发失败**
   - 检查 `config/postfix/main.cf` 配置
   - 验证 `config/postfix/transport_regexp` 映射
   - 确认后端服务连接
   - 查看 Postfix 日志

### 日志位置

- **开发**: Docker 容器日志
- **生产**: `/opt/tempmail/logs/` 目录
- **Postfix**: `/var/log/postfix/postfix.log`

## 安全考虑

### 开发环境

- 仅本地访问
- 简化的安全配置
- 调试信息可见

### 生产环境

- 端口绑定到 localhost
- Nginx 反向代理
- 完整的安全头设置
- 日志轮转和监控

# TempMail 生产环境部署指南

本指南介绍如何部署 TempMail 临时邮箱服务到生产环境，包含完整的邮件服务配置。

> **访问地址**: <https://mail.nnu.edu.kg>  
> **服务器IP**: 148.135.73.118

## 🏗️ 架构概述

生产环境包含以下服务：

- **MongoDB**: 数据库服务
- **Redis**: 缓存服务
- **Backend**: Node.js API 服务
- **Frontend**: React 前端应用
- **Mailserver**: Postfix 邮件服务器
- **Nginx**: 反向代理和负载均衡
- **Watchtower**: 自动更新服务

## 📋 系统要求

### 硬件要求

- **CPU**: 4核心或更多
- **内存**: 8GB 或更多
- **存储**: 100GB SSD 或更多
- **网络**: 固定 IP 地址

### 软件要求

- Ubuntu 20.04 LTS 或更新版本
- Docker 20.10+
- Docker Compose 2.0+
- 域名和 SSL 证书

## 🚀 快速部署

### 1. 准备服务器

```bash
# 创建专用用户
sudo useradd -m -s /bin/bash tempmail
sudo usermod -aG docker tempmail

# 创建应用目录
sudo mkdir -p /opt/tempmail
sudo chown tempmail:tempmail /opt/tempmail
```

### 2. 克隆项目

```bash
sudo -u tempmail git clone <your-repo-url> /opt/tempmail
cd /opt/tempmail
```

### 3. 配置环境变量

```bash
# 复制并编辑生产环境配置
cp .env.production .env.production.local
nano .env.production.local
```

**重要配置项**：

```bash
# 数据库配置
MONGODB_ROOT_USERNAME=tempmail_admin
MONGODB_ROOT_PASSWORD=your_strong_password_here
MONGODB_DATABASE=tempmail_prod

# JWT 密钥（至少64字符）
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here

# 邮件域名
MAIL_DOMAIN=your-domain.com

# CORS 配置
CORS_ORIGIN=https://your-domain.com

# 前端配置
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_WS_URL=https://your-domain.com
REACT_APP_MAIL_DOMAIN=your-domain.com
```

### 4. 部署应用

```bash
# 使用部署脚本
./scripts/deploy-production.sh deploy
```

## 🔧 管理命令

### 查看服务状态

```bash
./scripts/deploy-production.sh status
```

### 查看日志

```bash
# 查看所有服务日志
./scripts/deploy-production.sh logs

# 查看特定服务日志
./scripts/deploy-production.sh logs backend
./scripts/deploy-production.sh logs mailserver

# 查看最近50行日志
./scripts/deploy-production.sh logs backend 50
```

### 重启服务

```bash
./scripts/deploy-production.sh restart
```

### 更新部署

```bash
./scripts/deploy-production.sh update
```

### 备份数据

```bash
./scripts/deploy-production.sh backup
```

### 停止服务

```bash
./scripts/deploy-production.sh stop
```

## 🌐 DNS 配置

配置以下 DNS 记录：

```dns
# A 记录
mail.your-domain.com    IN  A     YOUR_SERVER_IP

# MX 记录
your-domain.com         IN  MX    10 mail.your-domain.com

# SPF 记录
your-domain.com         IN  TXT   "v=spf1 a mx ~all"

# DMARC 记录（可选）
_dmarc.your-domain.com  IN  TXT   "v=DMARC1; p=quarantine; rua=mailto:dmarc@your-domain.com"
```

## 🔒 SSL 证书配置

### 使用 Let's Encrypt

```bash
# 安装 Certbot
sudo apt update
sudo apt install certbot

# 获取证书
sudo certbot certonly --standalone -d mail.your-domain.com

# 复制证书到应用目录
sudo mkdir -p /opt/tempmail/config/nginx/ssl
sudo cp /etc/letsencrypt/live/mail.your-domain.com/fullchain.pem /opt/tempmail/config/nginx/ssl/
sudo cp /etc/letsencrypt/live/mail.your-domain.com/privkey.pem /opt/tempmail/config/nginx/ssl/
sudo chown -R tempmail:tempmail /opt/tempmail/config/nginx/ssl
```

### 自动续期

```bash
# 添加续期任务到 crontab
echo "0 12 * * * /usr/bin/certbot renew --quiet && /opt/tempmail/scripts/deploy-production.sh restart nginx" | sudo crontab -
```

## 🔥 防火墙配置

```bash
# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许 SMTP
sudo ufw allow 25/tcp
sudo ufw allow 587/tcp

# 允许 SSH（根据需要调整端口）
sudo ufw allow 22/tcp

# 启用防火墙
sudo ufw enable
```

## 📊 监控和日志

### 服务健康检查

```bash
# 检查所有服务健康状态
./scripts/deploy-production.sh health

# 查看 Docker 容器状态
docker ps

# 查看资源使用情况
docker stats
```

### 日志位置

- **应用日志**: `/opt/tempmail/logs/`
- **Nginx 日志**: `/opt/tempmail/logs/nginx/`
- **Postfix 日志**: `/opt/tempmail/logs/postfix/`
- **Docker 日志**: `docker-compose logs`

### 设置日志轮转

```bash
# 创建 logrotate 配置
sudo tee /etc/logrotate.d/tempmail << EOF
/opt/tempmail/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 tempmail tempmail
    postrotate
        docker-compose -f /opt/tempmail/docker-compose.prod.yml restart nginx
    endscript
}
EOF
```

## 🔧 故障排除

### 常见问题

1. **服务启动失败**

   ```bash
   # 查看详细日志
   ./scripts/deploy-production.sh logs

   # 检查磁盘空间
   df -h

   # 检查内存使用
   free -h
   ```

2. **邮件接收问题**

   ```bash
   # 检查 Postfix 状态
   docker exec tempmail-postfix-prod postfix status

   # 查看邮件日志
   ./scripts/deploy-production.sh logs mailserver

   # 测试端口连通性
   telnet your-domain.com 25
   ```

3. **数据库连接问题**

   ```bash
   # 检查 MongoDB
   docker exec tempmail-mongodb-prod mongosh --eval "db.adminCommand('ping')"

   # 检查 Redis
   docker exec tempmail-redis-prod redis-cli ping
   ```

### 性能优化

1. **数据库优化**
   - 监控慢查询
   - 添加适当的索引
   - 配置连接池

2. **缓存优化**
   - 监控 Redis 内存使用
   - 配置适当的过期策略
   - 设置 Redis 集群（如需要）

3. **Web 服务器优化**
   - 启用 HTTP/2
   - 配置适当的缓存头
   - 使用 CDN 加速静态资源

## 🔐 安全建议

1. **定期更新**
   - 保持 Docker 镜像更新
   - 应用系统安全补丁
   - 更新 SSL 证书

2. **访问控制**
   - 使用强密码
   - 限制 SSH 访问
   - 配置 fail2ban

3. **监控**
   - 监控可疑活动
   - 设置服务故障告警
   - 定期安全审计

## 📞 支持

如遇问题，请：

1. 查看日志：`./scripts/deploy-production.sh logs`
2. 检查服务状态：`./scripts/deploy-production.sh status`
3. 运行健康检查：`./scripts/deploy-production.sh health`

## 📄 许可证

本部署配置遵循与 TempMail 项目相同的许可证条款。

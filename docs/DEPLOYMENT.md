# 临时邮箱服务部署文档

## 项目概述

这是一个基于 `nnu.edu.kg` 域名的临时邮箱服务，用户可以通过 `mail.nnu.edu.kg` 访问前端界面，生成临时邮箱地址接收验证邮件。

## 架构说明

### 域名分配

- **mail.nnu.edu.kg**: 临时邮箱服务前端（React应用）
- **nnu.edu.kg**: 主域名，用于邮件接收（MX记录指向）
- **www.nnu.edu.kg**: 预留给其他用途

### 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS
- **后端**: Node.js + Express + TypeScript
- **数据库**: MongoDB + Redis
- **邮件服务**: Postfix
- **反向代理**: Nginx
- **容器化**: Docker + Docker Compose
- **CDN**: Cloudflare

### 服务端口

| 服务    | 端口   | 说明                   |
| ------- | ------ | ---------------------- |
| 前端    | 80     | React应用（通过Nginx） |
| 后端API | 3001   | Express服务器          |
| MongoDB | 27017  | 数据库                 |
| Redis   | 6379   | 缓存                   |
| Postfix | 25/587 | 邮件服务器             |
| Nginx   | 80/443 | 反向代理               |

## 部署准备

### 服务器要求

- **操作系统**: Ubuntu 20.04+ / CentOS 8+
- **内存**: 最低 2GB，推荐 4GB+
- **存储**: 最低 20GB，推荐 50GB+
- **网络**: 公网IP，开放端口 80, 443, 25, 587

### 软件依赖

```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

## Cloudflare DNS 配置

### 1. DNS记录设置

在 Cloudflare DNS 管理面板中添加以下记录：

#### A记录

| 类型 | 名称 | 内容           | 代理状态  | TTL  |
| ---- | ---- | -------------- | --------- | ---- |
| A    | @    | 148.135.73.118 | 🔘 仅DNS  | 自动 |
| A    | www  | 148.135.73.118 | 🔘 仅DNS  | 自动 |
| A    | mail | 148.135.73.118 | 🟠 已代理 | 自动 |

#### MX记录

| 类型 | 名称 | 内容       | 优先级 | 代理状态 | TTL  |
| ---- | ---- | ---------- | ------ | -------- | ---- |
| MX   | @    | nnu.edu.kg | 10     | 🔘 仅DNS | 自动 |

#### TXT记录（邮件安全）

| 类型 | 名称    | 内容                                                | 代理状态 | TTL  |
| ---- | ------- | --------------------------------------------------- | -------- | ---- |
| TXT  | @       | v=spf1 a mx ip4:148.135.73.118 ~all                 | 🔘 仅DNS | 自动 |
| TXT  | \_dmarc | v=DMARC1; p=quarantine; rua=mailto:admin@nnu.edu.kg | 🔘 仅DNS | 自动 |

### 2. SSL/TLS 设置

1. **加密模式**: 选择 "完全" 或 "完全(严格)"
2. **边缘证书**: 启用 "始终使用HTTPS"
3. **HSTS**: 启用 HTTP 严格传输安全

### 3. 性能优化

- 启用 **Brotli 压缩**
- 启用 **HTTP/2**
- 配置 **缓存规则**（静态资源缓存1年）

## 服务器配置

### 1. 防火墙设置

```bash
# 安装 UFW
sudo apt update
sudo apt install ufw

# 配置防火墙规则
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 25/tcp    # SMTP
sudo ufw allow 587/tcp   # SMTP提交

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 2. 系统优化

```bash
# 增加文件描述符限制
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 优化内核参数
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 应用部署

### 1. 获取代码

```bash
# 克隆项目
git clone <your-repository-url>
cd temp-mail-website

# 或者上传代码到服务器
scp -r ./temp-mail-website user@148.135.73.118:/opt/
```

### 2. 环境配置

```bash
# 复制环境变量文件
cp .env.example .env

# 编辑环境变量（重要：修改JWT密钥）
nano .env
```

关键环境变量说明：

```bash
# 生产环境配置
NODE_ENV=production
CORS_ORIGIN=https://mail.nnu.edu.kg

# 数据库配置（修改密码）
MONGODB_URI=mongodb://admin:your-strong-password@mongodb:27017/tempmail?authSource=admin

# JWT密钥（必须修改为强密码）
JWT_SECRET=your-super-secure-jwt-secret-key-for-production-min-32-chars

# 前端配置
REACT_APP_API_URL=https://mail.nnu.edu.kg/api
REACT_APP_WS_URL=https://mail.nnu.edu.kg
```

### 3. 创建必要目录

```bash
# 创建日志目录
mkdir -p logs/nginx

# 创建SSL证书目录（如果需要）
mkdir -p config/nginx/ssl

# 设置权限
sudo chown -R $USER:$USER logs/
```

### 4. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 5. 验证部署

```bash
# 检查容器状态
docker-compose ps

# 测试前端访问
curl -I https://mail.nnu.edu.kg

# 测试API接口
curl https://mail.nnu.edu.kg/api/health

# 测试邮件服务
telnet 148.135.73.118 25
```

## DNS 验证

### 验证DNS解析

```bash
# 检查A记录
dig A mail.nnu.edu.kg
dig A nnu.edu.kg

# 检查MX记录
dig MX nnu.edu.kg

# 检查TXT记录
dig TXT nnu.edu.kg
dig TXT _dmarc.nnu.edu.kg

# 使用在线工具验证
# https://mxtoolbox.com/
# https://dnschecker.org/
```

### 邮件服务测试

```bash
# 测试SMTP连接
telnet 148.135.73.118 25

# 在telnet会话中测试：
HELO test.com
MAIL FROM: test@example.com
RCPT TO: testuser@nnu.edu.kg
DATA
Subject: Test Email
This is a test email.
.
QUIT
```

## 监控和维护

### 1. 日志管理

```bash
# 查看应用日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx

# 查看系统日志
sudo journalctl -u docker
sudo tail -f /var/log/syslog
```

### 2. 数据备份

```bash
# MongoDB备份
docker exec tempmail-mongodb mongodump --out /backup --authenticationDatabase admin -u admin -p password

# Redis备份
docker exec tempmail-redis redis-cli BGSAVE

# 定期备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/$DATE"
mkdir -p $BACKUP_DIR

# 备份MongoDB
docker exec tempmail-mongodb mongodump --out $BACKUP_DIR/mongodb --authenticationDatabase admin -u admin -p password

# 备份Redis
docker exec tempmail-redis redis-cli --rdb $BACKUP_DIR/redis_dump.rdb

# 压缩备份
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

# 保留最近7天的备份
find /opt/backups -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# 添加到crontab（每天凌晨2点备份）
echo "0 2 * * * /opt/temp-mail-website/backup.sh" | crontab -
```

### 3. 性能监控

```bash
# 查看容器资源使用
docker stats

# 查看系统资源
htop
df -h
free -h

# 查看网络连接
netstat -tulpn | grep :80
netstat -tulpn | grep :25
```

### 4. 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新构建并部署
docker-compose down
docker-compose up -d --build

# 清理旧镜像
docker image prune -f
```

## 故障排除

### 常见问题

#### 1. 邮件无法接收

```bash
# 检查Postfix状态
docker-compose logs mailserver

# 检查端口是否开放
telnet 148.135.73.118 25

# 检查DNS MX记录
dig MX nnu.edu.kg
```

#### 2. 前端无法访问

```bash
# 检查Nginx配置
docker-compose logs nginx

# 检查Cloudflare代理状态
curl -I https://mail.nnu.edu.kg

# 检查SSL证书
openssl s_client -connect mail.nnu.edu.kg:443
```

#### 3. 数据库连接问题

```bash
# 检查MongoDB状态
docker-compose logs mongodb

# 检查Redis状态
docker-compose logs redis

# 测试数据库连接
docker exec -it tempmail-mongodb mongo -u admin -p password --authenticationDatabase admin
```

#### 4. 内存不足

```bash
# 查看内存使用
free -h
docker stats

# 增加swap空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 安全建议

### 1. 定期更新

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 更新Docker镜像
docker-compose pull
docker-compose up -d
```

### 2. 安全配置

- 修改所有默认密码
- 启用fail2ban防止暴力破解
- 定期检查安全日志
- 配置自动安全更新

### 3. 监控告警

- 配置邮件告警（磁盘空间、内存使用）
- 设置服务可用性监控
- 配置日志分析和异常检测

## 联系信息

如有部署问题，请联系：

- 技术支持：admin@nnu.edu.kg
- 项目地址：https://github.com/your-repo/temp-mail-website

---

**部署完成后访问地址**: https://mail.nnu.edu.kg

# 本地测试邮件接收的方法

## 使用 MailHog（推荐方式）

项目已经配置了 MailHog 作为开发环境的邮件测试工具：

启动开发环境：

```sh
# 启动包含 MailHog 的开发服务
docker-compose -f docker-compose.dev.yml up -d
# 启动前端和后端开发服务器
npm run dev
```

访问 MailHog Web 界面：

打开浏览器访问：http://localhost:8025
这里可以查看所有发送到本地 SMTP 服务器的邮件
发送测试邮件： 你可以通过以下几种方式发送测试邮件：

## 使用命令行工具发送测试邮件

方法一: 使用 curl 发送邮件

```sh
# 创建测试邮件内容
cat << 'EOF' > test_email.txt
From: test@example.com
To: your-temp-mailbox@127.0.0.1
Subject: 测试邮件
Content-Type: text/plain; charset=utf-8

这是一封测试邮件，用于验证临时邮箱功能。
EOF

# 通过 SMTP 发送邮件
curl --url 'smtp://localhost:1025' \
 --mail-from 'test@example.com' \
 --mail-rcpt 'your-temp-mailbox@127.0.0.1' \
 --upload-file test_email.txt
```

方法二: 使用 Python 脚本发送测试邮件 send_test_email.py

方法三: 使用 Node.js 脚本发送测试邮件 send_test_email.js

方法四: 直接通过 SMTP 协议测试

使用 telnet 直接连接 SMTP 服务器

```sh
# 连接到本地 SMTP 服务器
telnet localhost 1025

# 然后输入以下 SMTP 命令：
HELO localhost
MAIL FROM:<test@example.com>
RCPT TO:<your-mailbox@127.0.0.1>
DATA
Subject: 直接 SMTP 测试
From: test@example.com
To: your-mailbox@127.0.0.1

这是通过直接 SMTP 协议发送的测试邮件。
.
QUIT
```

## 完整的测试流程

步骤 1：启动开发环境

```sh
# 启动 Docker 服务（包括 MailHog）
docker-compose -f docker-compose.dev.yml up -d

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

步骤 2：生成临时邮箱

访问 <http://localhost:3000>, 点击"生成新邮箱"按钮, 复制生成的邮箱地址（例如：abc123@127.0.0.1）

步骤 3：发送测试邮件

使用 Python 脚本：

```sh
# 安装 Python（如果还没有）

# 发送单封测试邮件
python3 scripts/send_test_email.py abc123@127.0.0.1

# 发送 HTML 格式邮件
python3 scripts/send_test_email.py abc123@127.0.0.1 --html

# 发送多封邮件
python3 scripts/send_test_email.py abc123@127.0.0.1 --multiple 5
```

使用 Node.js 脚本：

```sh
# 安装 nodemailer（如果还没有）
npm install nodemailer

# 发送单封测试邮件
node scripts/send_test_email.js abc123@127.0.0.1

# 发送 HTML 格式邮件
node scripts/send_test_email.js abc123@127.0.0.1 --html

# 发送包含附件的邮件
node scripts/send_test_email.js abc123@127.0.0.1 --attachment

# 发送多封邮件
node scripts/send_test_email.js abc123@127.0.0.1 --multiple 3
```

步骤 4：查看邮件

在临时邮箱页面：<http://localhost:3000/mailbox/[邮箱ID]>
在 MailHog 界面：<http://localhost:8025>

发送邮件后，你应该能够：

- 在前端页面看到新邮件通知
- 在 MailHog 界面看到邮件
- 通过 WebSocket 实时接收到邮件更新

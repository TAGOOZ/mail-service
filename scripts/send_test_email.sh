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
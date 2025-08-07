#!/bin/bash

# 检查是否已经安装了 curl
if ! command -v curl &> /dev/null; then
    echo "curl 未安装，请先安装 curl。"
    exit 1
fi

# 邮件接受者
target=$1
if [ -z "$target" ]; then
    echo "Usage: $0 <target>"
    exit 1
fi

# 创建测试邮件内容
cat << 'EOF' > send_test_email.txt
From: test@example.com
To: ${target}
Subject: 测试邮件
Content-Type: text/plain; charset=utf-8

这是一封测试邮件，用于验证临时邮箱功能。
EOF

# 通过 SMTP 发送邮件
curl --url 'smtp://localhost:25' \
  --mail-from 'test@example.com' \
  --mail-rcpt "${target}" \
  --upload-file send_test_email.txt
#!/usr/bin/env python3
"""
测试邮件发送脚本
用于向本地临时邮箱发送测试邮件
"""

import smtplib
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import argparse

def send_test_email(to_address, subject="测试邮件", content="这是一封测试邮件"):
    """发送测试邮件到指定地址"""
    
    # SMTP 服务器配置（使用 MailHog）
    smtp_server = "localhost"
    smtp_port = 1025
    
    # 创建邮件
    msg = MIMEMultipart()
    msg['From'] = "test@example.com"
    msg['To'] = to_address
    msg['Subject'] = subject
    
    # 添加邮件正文
    msg.attach(MIMEText(content, 'plain', 'utf-8'))
    
    try:
        # 连接到 SMTP 服务器
        server = smtplib.SMTP(smtp_server, smtp_port)
        
        # 发送邮件
        text = msg.as_string()
        server.sendmail("test@example.com", to_address, text)
        server.quit()
        
        print(f"✅ 测试邮件已发送到: {to_address}")
        print(f"📧 主题: {subject}")
        print(f"🌐 可以在 http://localhost:8025 查看邮件")
        
    except Exception as e:
        print(f"❌ 发送邮件失败: {e}")
        return False
    
    return True

def send_html_email(to_address):
    """发送包含 HTML 内容的测试邮件"""
    
    html_content = """
    <html>
      <body>
        <h2>🎉 HTML 测试邮件</h2>
        <p>这是一封包含 <strong>HTML 格式</strong> 的测试邮件。</p>
        <ul>
          <li>支持 HTML 格式</li>
          <li>支持中文内容</li>
          <li>支持表情符号 😊</li>
        </ul>
        <p><a href="https://mail.nnu.edu.kg">访问临时邮箱服务</a></p>
      </body>
    </html>
    """
    
    smtp_server = "localhost"
    smtp_port = 1025
    
    msg = MIMEMultipart('alternative')
    msg['From'] = "html-test@example.com"
    msg['To'] = to_address
    msg['Subject'] = "HTML 格式测试邮件"
    
    # 添加纯文本版本
    text_part = MIMEText("这是纯文本版本的测试邮件", 'plain', 'utf-8')
    html_part = MIMEText(html_content, 'html', 'utf-8')
    
    msg.attach(text_part)
    msg.attach(html_part)
    
    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.sendmail("html-test@example.com", to_address, msg.as_string())
        server.quit()
        
        print(f"✅ HTML 测试邮件已发送到: {to_address}")
        
    except Exception as e:
        print(f"❌ 发送 HTML 邮件失败: {e}")
        return False
    
    return True

def main():
    parser = argparse.ArgumentParser(description='发送测试邮件到临时邮箱')
    parser.add_argument('email', help='目标邮箱地址')
    parser.add_argument('--subject', default='测试邮件', help='邮件主题')
    parser.add_argument('--content', default='这是一封测试邮件，用于验证临时邮箱功能。', help='邮件内容')
    parser.add_argument('--html', action='store_true', help='发送 HTML 格式邮件')
    parser.add_argument('--multiple', type=int, default=1, help='发送多封邮件的数量')
    
    args = parser.parse_args()
    
    print(f"🚀 开始发送测试邮件...")
    print(f"📧 目标地址: {args.email}")
    print(f"📊 发送数量: {args.multiple}")
    print("-" * 50)
    
    success_count = 0
    
    for i in range(args.multiple):
        if args.html:
            success = send_html_email(args.email)
        else:
            subject = f"{args.subject} #{i+1}" if args.multiple > 1 else args.subject
            content = f"{args.content}\n\n邮件编号: {i+1}/{args.multiple}" if args.multiple > 1 else args.content
            success = send_test_email(args.email, subject, content)
        
        if success:
            success_count += 1
    
    print("-" * 50)
    print(f"📈 发送完成: {success_count}/{args.multiple} 封邮件发送成功")
    
    if success_count > 0:
        print(f"🌐 请访问以下地址查看邮件:")
        print(f"   - MailHog: http://localhost:8025")
        print(f"   - 临时邮箱: http://localhost:3000")

if __name__ == "__main__":
    main()
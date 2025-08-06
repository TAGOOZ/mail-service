#!/usr/bin/env python3
"""
简化的WebSocket调试脚本
不需要额外依赖，只检查服务状态和邮件发送
"""

import smtplib
import requests
import time
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def check_services():
    """检查各个服务的状态"""
    print("🔍 检查服务状态...")
    api_base = "http://localhost:3001/api"

    services = {
        "后端服务": f"{api_base}/../health",
        "邮件服务": f"{api_base}/../health/mail",
        "WebSocket服务": f"{api_base}/../health/websocket",
        "集成服务": f"{api_base}/../health/integration",
    }

    for service_name, url in services.items():
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {service_name}: 正常")

                # 显示关键信息
                if service_name == "邮件服务":
                    mail_info = data.get("mailService", {})
                    print(f"   - 运行状态: {mail_info.get('isRunning', False)}")
                    print(f"   - 监听端口: {mail_info.get('port', 'unknown')}")

                elif service_name == "WebSocket服务":
                    ws_info = data.get("websocket", {})
                    print(f"   - 连接数: {ws_info.get('connectedClients', 0)}")
                    print(f"   - 订阅数: {ws_info.get('totalSubscriptions', 0)}")

                elif service_name == "集成服务":
                    integration_info = data.get("integration", {})
                    print(f"   - 健康状态: {integration_info.get('isHealthy', False)}")
                    print(f"   - 处理邮件数: {integration_info.get('totalMails', 0)}")
                    print(
                        f"   - 成功推送数: {integration_info.get('successfulBroadcasts', 0)}"
                    )
                    print(
                        f"   - 失败推送数: {integration_info.get('failedBroadcasts', 0)}"
                    )

            else:
                print(f"❌ {service_name}: HTTP {response.status_code}")

        except Exception as e:
            print(f"❌ {service_name}: 连接失败 - {e}")

    print("-" * 50)


def create_mailbox():
    """创建测试邮箱"""
    try:
        response = requests.post("http://localhost:3001/api/mailbox/generate")
        if response.status_code in [200, 201]:
            result = response.json()
            if result.get("success") and "data" in result:
                data = result["data"]
                print(f"✅ 邮箱创建成功: {data['address']}")
                return {
                    "address": data["address"],
                    "mailboxId": data["id"],
                    "token": data["token"],
                }
            else:
                print(f"❌ 邮箱创建失败: API返回错误")
                print(f"   响应内容: {response.text}")
                return None
        else:
            print(f"❌ 邮箱创建失败: {response.status_code}")
            print(f"   响应内容: {response.text}")
            return None
    except Exception as e:
        print(f"❌ 邮箱创建异常: {e}")
        return None


def send_test_email(to_address):
    """发送测试邮件到后端服务"""
    content = f"""
这是一封调试测试邮件。

发送时间: {time.strftime('%Y-%m-%d %H:%M:%S')}
收件地址: {to_address}

此邮件用于测试邮件接收和WebSocket推送功能。
    """.strip()

    msg = MIMEMultipart()
    msg["From"] = "debug-test@example.com"
    msg["To"] = to_address
    msg["Subject"] = "调试测试邮件"
    msg.attach(MIMEText(content, "plain", "utf-8"))

    try:
        # 发送到后端邮件服务端口 2525
        server = smtplib.SMTP("localhost", 2525)
        server.sendmail("debug-test@example.com", to_address, msg.as_string())
        server.quit()
        print(f"✅ 邮件已发送到后端服务 (端口2525)")
        return True
    except Exception as e:
        print(f"❌ 发送到后端服务失败: {e}")
        return False


def check_mailbox_emails(mailbox_id, token):
    """检查邮箱中的邮件"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"http://localhost:3001/api/mail/{mailbox_id}", headers=headers
        )

        if response.status_code == 200:
            result = response.json()
            if result.get("success") and "data" in result:
                emails = result["data"]
            else:
                # 可能是旧格式的响应，直接使用
                emails = result if isinstance(result, list) else []

            print(f"✅ 邮箱中有 {len(emails)} 封邮件")
            for i, email in enumerate(emails, 1):
                if isinstance(email, dict):
                    print(
                        f"   邮件 {i}: {email.get('subject', '无主题')} (来自: {email.get('from', '未知')})"
                    )
                else:
                    print(f"   邮件 {i}: 数据格式异常 - {type(email)}")
            return emails
        else:
            print(f"❌ 获取邮件失败: {response.status_code}")
            print(f"   响应内容: {response.text}")
            return []
    except Exception as e:
        print(f"❌ 检查邮件异常: {e}")
        import traceback

        traceback.print_exc()
        return []


def main():
    print("🚀 开始简化调试测试...")
    print("=" * 60)

    # 1. 检查服务状态
    check_services()

    # 2. 创建邮箱
    print("📧 创建测试邮箱...")
    mailbox = create_mailbox()
    if not mailbox:
        print("❌ 测试终止")
        return

    mailbox_address = mailbox["address"]
    mailbox_id = mailbox["mailboxId"]
    token = mailbox["token"]

    print(f"🌐 前端访问地址: http://localhost:3000/mailbox/{mailbox_id}")
    print("-" * 50)

    # 3. 发送测试邮件
    print("📤 发送测试邮件...")
    if not send_test_email(mailbox_address):
        print("❌ 测试终止")
        return

    print("-" * 50)

    # 4. 等待邮件处理
    print("⏳ 等待邮件处理...")
    for i in range(10):
        time.sleep(1)
        print(f"   等待中... {i+1}/10")

    print("-" * 50)

    # 5. 检查邮件是否到达
    print("📬 检查邮箱中的邮件...")
    emails = check_mailbox_emails(mailbox_id, token)

    print("-" * 50)

    # 6. 测试结果
    print("📊 测试结果:")
    print(f"   邮箱创建: ✅")
    print(f"   邮件发送: ✅")
    print(f"   邮件接收: {'✅' if len(emails) > 0 else '❌'}")

    if len(emails) > 0:
        print(f"\n🎉 基础功能正常！邮件已正确接收")
        print(f"📝 下一步：在浏览器中打开 http://localhost:3000/mailbox/{mailbox_id}")
        print(f"    然后发送另一封邮件，观察是否有实时推送")
    else:
        print(f"\n❌ 基础功能异常！邮件未能接收")
        print(f"\n🔧 故障排除建议:")
        print(f"   1. 确认后端服务正在运行")
        print(f"   2. 确认邮件服务监听在端口 2525")
        print(f"   3. 检查邮件域名验证逻辑")
        print(f"   4. 查看后端控制台日志")


if __name__ == "__main__":
    main()

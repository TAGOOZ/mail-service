#!/usr/bin/env python3
"""
完整的WebSocket推送测试脚本
"""

import smtplib
import requests
import time
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def main():
    print("🚀 完整的WebSocket推送测试")
    print("=" * 60)

    # 1. 创建邮箱
    print("📧 创建测试邮箱...")
    try:
        response = requests.post("http://localhost:3001/api/mailbox/generate")
        if response.status_code in [200, 201]:
            result = response.json()
            if result.get("success") and "data" in result:
                data = result["data"]
                mailbox_address = data["address"]
                mailbox_id = data["id"]
                token = data["token"]

                print(f"✅ 邮箱创建成功:")
                print(f"   地址: {mailbox_address}")
                print(f"   ID: {mailbox_id}")
                print(f"   Token: {token[:20]}...")

            else:
                print("❌ 邮箱创建失败")
                return
        else:
            print(f"❌ 邮箱创建失败: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ 邮箱创建异常: {e}")
        return

    print("-" * 60)

    # 2. 显示测试说明
    print("📋 测试步骤:")
    print("1. 在浏览器中打开以下地址:")
    print(f"   http://localhost:3000/mailbox/{mailbox_id}")
    print()
    print("2. 或者使用WebSocket测试页面:")
    print("   打开 scripts/test_frontend_websocket.html")
    print(f"   输入邮箱ID: {mailbox_id}")
    print(f"   输入令牌: {token}")
    print()
    print("3. 然后按回车键，脚本将发送测试邮件...")

    input("按回车键继续...")

    print("-" * 60)

    # 3. 发送测试邮件
    print("📤 发送测试邮件...")

    for i in range(3):
        subject = f"实时推送测试邮件 #{i+1}"
        content = f"""
这是第 {i+1} 封实时推送测试邮件。

发送时间: {time.strftime('%Y-%m-%d %H:%M:%S')}
收件地址: {mailbox_address}
邮件编号: {i+1}/3

如果WebSocket连接正常，您应该能在前端界面实时看到这封邮件。
        """.strip()

        msg = MIMEMultipart()
        msg["From"] = f"test-{i+1}@example.com"
        msg["To"] = mailbox_address
        msg["Subject"] = subject
        msg.attach(MIMEText(content, "plain", "utf-8"))

        try:
            server = smtplib.SMTP("localhost", 2525)
            server.sendmail(f"test-{i+1}@example.com", mailbox_address, msg.as_string())
            server.quit()
            print(f"✅ 邮件 {i+1} 已发送: {subject}")

            # 间隔发送
            if i < 2:
                print("   等待 3 秒...")
                time.sleep(3)

        except Exception as e:
            print(f"❌ 邮件 {i+1} 发送失败: {e}")

    print("-" * 60)

    # 4. 检查后端状态
    print("🔍 检查后端集成服务状态...")
    try:
        response = requests.get("http://localhost:3001/health/integration")
        if response.status_code == 200:
            integration_status = response.json()
            integration_info = integration_status.get("integration", {})
            print(f"✅ 集成服务状态:")
            print(
                f"   健康状态: {'✅ 健康' if integration_info.get('isHealthy') else '❌ 异常'}"
            )
            print(f"   处理邮件数: {integration_info.get('totalMails', 0)}")
            print(f"   成功推送数: {integration_info.get('successfulBroadcasts', 0)}")
            print(f"   失败推送数: {integration_info.get('failedBroadcasts', 0)}")
            print(f"   成功率: {integration_info.get('successRate', '0%')}")
        else:
            print(f"❌ 集成服务检查失败: {response.status_code}")
    except Exception as e:
        print(f"❌ 集成服务检查异常: {e}")

    print("-" * 60)

    # 5. 最终说明
    print("📊 测试完成!")
    print()
    print("🔍 如何验证WebSocket推送是否正常:")
    print("1. 在前端页面中，您应该能看到3封新邮件")
    print("2. 邮件应该实时出现，无需手动刷新")
    print("3. 如果需要手动刷新才能看到邮件，说明WebSocket推送有问题")
    print()
    print("🔧 如果WebSocket推送不工作，请检查:")
    print("1. 浏览器开发者工具的Console和Network标签")
    print("2. 确认WebSocket连接状态")
    print("3. 检查前端是否正确订阅了邮箱")
    print("4. 查看后端日志中的WebSocket相关信息")
    print()
    print(f"🌐 前端地址: http://localhost:3000/mailbox/{mailbox_id}")
    print(f"🔧 WebSocket测试页面: scripts/test_frontend_websocket.html")


if __name__ == "__main__":
    main()

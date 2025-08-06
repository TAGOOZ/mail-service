#!/usr/bin/env python3
"""
手动WebSocket测试脚本
使用手动创建的邮箱地址测试WebSocket推送
"""

import smtplib
import time
from email.mime.text import MIMEText


def main():
    print("🚀 手动WebSocket推送测试")
    print("=" * 60)

    # 使用一个固定的测试邮箱地址
    test_address = "websockettest@127.0.0.1"

    print("📋 测试说明:")
    print("1. 这个测试使用手动创建的邮箱地址")
    print(f"2. 测试邮箱地址: {test_address}")
    print("3. 你需要在前端手动输入这个邮箱信息来测试WebSocket")
    print()
    print("🔧 前端测试步骤:")
    print("1. 打开 scripts/test_frontend_websocket.html")
    print("2. 连接到 WebSocket 服务器")
    print("3. 输入以下信息进行订阅:")
    print(f"   - 邮箱ID: websockettest")
    print(f"   - 访问令牌: 需要一个有效的JWT令牌")
    print()
    print("⚠️  注意: 由于没有真实的邮箱记录，WebSocket订阅可能会失败")
    print("   但我们可以测试邮件发送到后端服务是否触发WebSocket事件")
    print()

    input("准备好后按回车键开始发送测试邮件...")

    print("-" * 60)

    # 发送测试邮件
    print("📤 发送测试邮件...")

    for i in range(3):
        subject = f"手动WebSocket测试邮件 #{i+1}"
        content = f"""
这是第 {i+1} 封手动WebSocket测试邮件。

发送时间: {time.strftime('%Y-%m-%d %H:%M:%S')}
收件地址: {test_address}
邮件编号: {i+1}/3

这个测试用于验证邮件接收服务是否能正确处理邮件。
        """.strip()

        msg = MIMEText(content, "plain", "utf-8")
        msg["From"] = f"manual-test-{i+1}@example.com"
        msg["To"] = test_address
        msg["Subject"] = subject

        try:
            server = smtplib.SMTP("localhost", 2525)
            server.sendmail(
                f"manual-test-{i+1}@example.com", test_address, msg.as_string()
            )
            server.quit()

            print(f"✅ 邮件 {i+1} 已发送: {subject}")

            # 间隔发送
            if i < 2:
                print("   等待 2 秒...")
                time.sleep(2)

        except Exception as e:
            print(f"❌ 邮件 {i+1} 发送失败: {e}")

    print("-" * 60)

    print("📊 测试完成!")
    print()
    print("🔍 如何验证:")
    print("1. 查看后端控制台日志，应该能看到邮件处理信息")
    print("2. 如果有WebSocket连接，应该能看到推送尝试")
    print("3. 检查集成服务状态:")
    print("   curl http://localhost:3001/health/integration")
    print()
    print("💡 下一步:")
    print("1. 重启后端服务以加载新的邮箱生成代码")
    print("2. 使用正确的域名重新测试完整流程")


if __name__ == "__main__":
    main()

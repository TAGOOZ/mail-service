#!/usr/bin/env python3
"""
测试当前设置的脚本
"""

import smtplib
import requests
import time
from email.mime.text import MIMEText


def test_with_127_domain():
    """使用127.0.0.1域名测试"""
    print("🧪 测试使用 127.0.0.1 域名...")

    # 手动创建一个测试邮箱地址
    test_address = f"test{int(time.time())}@127.0.0.1"
    print(f"📧 测试地址: {test_address}")

    # 发送邮件
    try:
        msg = MIMEText("这是一封测试邮件", "plain", "utf-8")
        msg["From"] = "test@example.com"
        msg["To"] = test_address
        msg["Subject"] = "域名测试邮件"

        server = smtplib.SMTP("localhost", 2525)
        server.sendmail("test@example.com", test_address, msg.as_string())
        server.quit()

        print("✅ 邮件发送成功")
        return True

    except Exception as e:
        print(f"❌ 邮件发送失败: {e}")
        return False


def test_with_nnu_domain():
    """使用nnu.edu.kg域名测试"""
    print("🧪 测试使用 nnu.edu.kg 域名...")

    # 手动创建一个测试邮箱地址
    test_address = f"test{int(time.time())}@nnu.edu.kg"
    print(f"📧 测试地址: {test_address}")

    # 发送邮件
    try:
        msg = MIMEText("这是一封测试邮件", "plain", "utf-8")
        msg["From"] = "test@example.com"
        msg["To"] = test_address
        msg["Subject"] = "域名测试邮件"

        server = smtplib.SMTP("localhost", 2525)
        server.sendmail("test@example.com", test_address, msg.as_string())
        server.quit()

        print("✅ 邮件发送成功")
        return True

    except Exception as e:
        print(f"❌ 邮件发送失败: {e}")
        return False


def check_backend_status():
    """检查后端状态"""
    print("🔍 检查后端状态...")

    try:
        # 检查健康状态
        response = requests.get("http://localhost:3001/health")
        if response.status_code == 200:
            print("✅ 后端服务正常")
        else:
            print(f"❌ 后端服务异常: {response.status_code}")

        # 检查邮件服务
        response = requests.get("http://localhost:3001/health/mail")
        if response.status_code == 200:
            data = response.json()
            mail_service = data.get("mailService", {})
            print(
                f"✅ 邮件服务: 端口 {mail_service.get('port')}, 运行状态 {mail_service.get('isRunning')}"
            )
        else:
            print(f"❌ 邮件服务检查失败: {response.status_code}")

    except Exception as e:
        print(f"❌ 后端状态检查失败: {e}")


def main():
    print("🚀 测试当前设置")
    print("=" * 50)

    # 检查后端状态
    check_backend_status()
    print("-" * 50)

    # 测试两种域名
    success_127 = test_with_127_domain()
    print("-" * 50)

    success_nnu = test_with_nnu_domain()
    print("-" * 50)

    # 总结
    print("📊 测试结果:")
    print(f"   127.0.0.1 域名: {'✅' if success_127 else '❌'}")
    print(f"   nnu.edu.kg 域名: {'✅' if success_nnu else '❌'}")

    if success_127:
        print("\n💡 建议: 使用 127.0.0.1 域名进行测试")
        print("   可以手动创建邮箱地址进行测试，例如: test123@127.0.0.1")
    elif success_nnu:
        print("\n💡 建议: 使用 nnu.edu.kg 域名进行测试")
        print("   需要修改环境变量 MAIL_DOMAIN=nnu.edu.kg")
    else:
        print("\n❌ 两种域名都无法工作，请检查:")
        print("   1. 后端服务是否正常运行")
        print("   2. 邮件接收服务是否正常监听端口 2525")
        print("   3. 域名验证逻辑是否正确")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
测试WebSocket验证修复
"""

import requests
import json


def test_mailbox_id_format():
    """测试邮箱ID格式"""
    print("🧪 测试邮箱ID格式...")

    try:
        response = requests.post("http://localhost:3001/api/mailbox/generate")
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get("success"):
                mailbox_id = data["data"]["id"]
                token = data["data"]["token"]
                address = data["data"]["address"]

                print(f"✅ 邮箱创建成功:")
                print(f"   地址: {address}")
                print(f"   ID: {mailbox_id}")
                print(f"   ID长度: {len(mailbox_id)}")
                print(f"   Token: {token[:20]}...")

                # 验证ID格式
                import re

                mongo_id_pattern = r"^[0-9a-fA-F]{24}$"
                if re.match(mongo_id_pattern, mailbox_id):
                    print("✅ 邮箱ID格式正确 (MongoDB ObjectId)")
                else:
                    print("❌ 邮箱ID格式不正确")

                return {"mailbox_id": mailbox_id, "token": token, "address": address}
            else:
                print("❌ 邮箱创建失败: API返回错误")
                print(f"   错误: {data}")
                return None
        else:
            print(f"❌ 邮箱创建失败: HTTP {response.status_code}")
            print(f"   响应: {response.text}")
            return None
    except Exception as e:
        print(f"❌ 邮箱创建异常: {e}")
        return None


def create_websocket_test_html(mailbox_id, token):
    """创建WebSocket测试HTML文件"""
    html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebSocket 验证测试</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .status {{
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }}
        .status.connected {{
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }}
        .status.disconnected {{
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }}
        .log {{
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            max-height: 400px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 12px;
        }}
        button {{
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }}
        button:hover {{
            background-color: #0056b3;
        }}
        .info {{
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔌 WebSocket 验证测试</h1>
        
        <div class="info">
            <h3>📋 测试信息</h3>
            <p><strong>邮箱ID:</strong> {mailbox_id}</p>
            <p><strong>访问令牌:</strong> {token[:30]}...</p>
            <p><strong>ID格式:</strong> MongoDB ObjectId (24位十六进制)</p>
        </div>
        
        <div id="status" class="status disconnected">
            状态: 未连接
        </div>
        
        <div>
            <button onclick="connect()">连接WebSocket</button>
            <button onclick="subscribe()">订阅邮箱</button>
            <button onclick="disconnect()">断开连接</button>
            <button onclick="clearLog()">清空日志</button>
        </div>
        
        <h3>📋 连接日志</h3>
        <div id="log" class="log"></div>
    </div>

    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <script>
        let socket = null;
        let isConnected = false;
        
        const MAILBOX_ID = '{mailbox_id}';
        const TOKEN = '{token}';
        
        function log(message, type = 'info') {{
            const logDiv = document.getElementById('log');
            const timestamp = new Date().toLocaleTimeString();
            const color = type === 'error' ? 'red' : type === 'success' ? 'green' : type === 'warning' ? 'orange' : 'black';
            logDiv.innerHTML += `<div style="color: ${{color}}">[$${{timestamp}}] ${{message}}</div>`;
            logDiv.scrollTop = logDiv.scrollHeight;
        }}
        
        function updateStatus(status, className) {{
            const statusDiv = document.getElementById('status');
            statusDiv.textContent = `状态: ${{status}}`;
            statusDiv.className = `status ${{className}}`;
        }}
        
        function connect() {{
            if (socket) {{
                socket.disconnect();
            }}
            
            log('正在连接到 WebSocket 服务器...');
            updateStatus('连接中...', 'disconnected');
            
            socket = io('http://localhost:3001', {{
                transports: ['websocket', 'polling'],
                timeout: 10000
            }});
            
            socket.on('connect', () => {{
                isConnected = true;
                log('✅ WebSocket 连接成功!', 'success');
                updateStatus('已连接', 'connected');
            }});
            
            socket.on('disconnect', (reason) => {{
                isConnected = false;
                log(`❌ WebSocket 连接断开: ${{reason}}`, 'error');
                updateStatus('已断开', 'disconnected');
            }});
            
            socket.on('connect_error', (error) => {{
                log(`❌ 连接错误: ${{error.message}}`, 'error');
                updateStatus('连接错误', 'disconnected');
            }});
            
            socket.on('connectionEstablished', (data) => {{
                log(`🎉 连接建立确认: ${{JSON.stringify(data)}}`, 'success');
            }});
            
            socket.on('newMail', (data) => {{
                log(`📧 收到新邮件事件!`, 'success');
                log(`邮件数据: ${{JSON.stringify(data, null, 2)}}`, 'info');
            }});
            
            socket.on('error', (data) => {{
                log(`❌ WebSocket 错误: ${{JSON.stringify(data)}}`, 'error');
            }});
        }}
        
        function subscribe() {{
            if (!socket || !isConnected) {{
                log('❌ 请先连接到 WebSocket 服务器', 'error');
                return;
            }}
            
            const subscribeData = {{
                mailboxId: MAILBOX_ID,
                token: TOKEN
            }};
            
            log(`📡 发送订阅请求...`, 'info');
            log(`邮箱ID: ${{MAILBOX_ID}}`, 'info');
            log(`令牌长度: ${{TOKEN.length}}`, 'info');
            
            socket.emit('subscribe', subscribeData);
            
            setTimeout(() => {{
                log('📡 订阅请求已发送，等待服务器响应...', 'info');
            }}, 100);
        }}
        
        function disconnect() {{
            if (socket) {{
                socket.disconnect();
                socket = null;
                isConnected = false;
                log('🔌 手动断开连接', 'warning');
                updateStatus('已断开', 'disconnected');
            }}
        }}
        
        function clearLog() {{
            document.getElementById('log').innerHTML = '';
        }}
        
        window.onload = function() {{
            log('🚀 WebSocket 验证测试页面已加载');
            log('💡 测试步骤:');
            log('1. 点击"连接WebSocket"按钮');
            log('2. 连接成功后，点击"订阅邮箱"按钮');
            log('3. 观察是否出现验证错误');
            log('');
        }};
    </script>
</body>
</html>"""

    with open("scripts/ws/test_websocket_validation.html", "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"✅ 创建了WebSocket测试页面: scripts/websocket_validation_test.html")


def main():
    print("🚀 WebSocket验证修复测试")
    print("=" * 60)

    # 测试邮箱ID格式
    mailbox_info = test_mailbox_id_format()
    if not mailbox_info:
        print("❌ 无法创建邮箱，测试终止")
        return

    print("-" * 60)

    # 创建测试页面
    print("📄 创建WebSocket测试页面...")
    create_websocket_test_html(mailbox_info["mailbox_id"], mailbox_info["token"])

    print("-" * 60)

    print("📋 下一步测试:")
    print("1. 确保后端服务已重启以加载新的验证规则")
    print("2. 在浏览器中打开: scripts/websocket_validation_test.html")
    print("3. 按照页面提示进行WebSocket连接和订阅测试")
    print("4. 如果订阅成功，说明验证问题已修复")
    print()
    print("🔧 如果仍然出现验证错误:")
    print("1. 检查shared包是否已重新构建")
    print("2. 确认后端服务使用了最新的验证schema")
    print("3. 查看后端控制台的详细错误信息")


if __name__ == "__main__":
    main()

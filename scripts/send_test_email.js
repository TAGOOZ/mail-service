#!/usr/bin/env node
/**
 * 测试邮件发送脚本 (Node.js 版本)
 * 用于向本地临时邮箱发送测试邮件
 */

const nodemailer = require('nodemailer');

// 创建 SMTP 传输器（使用 MailHog）
const transporter = nodemailer.createTransporter({
  host: 'localhost',
  port: 1025,
  secure: false, // MailHog 不使用 SSL
  auth: false, // MailHog 不需要认证
});

/**
 * 发送测试邮件
 * @param {string} to - 收件人地址
 * @param {string} subject - 邮件主题
 * @param {string} content - 邮件内容
 * @param {boolean} isHtml - 是否为 HTML 格式
 */
async function sendTestEmail(
  to,
  subject = '测试邮件',
  content = '这是一封测试邮件',
  isHtml = false
) {
  const mailOptions = {
    from: 'test@example.com',
    to: to,
    subject: subject,
  };

  if (isHtml) {
    mailOptions.html = content;
  } else {
    mailOptions.text = content;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ 测试邮件已发送到: ${to}`);
    console.log(`📧 主题: ${subject}`);
    console.log(`📨 Message ID: ${info.messageId}`);
    console.log(`🌐 可以在 http://localhost:8025 查看邮件`);
    return true;
  } catch (error) {
    console.error(`❌ 发送邮件失败: ${error.message}`);
    return false;
  }
}

/**
 * 发送 HTML 格式的测试邮件
 * @param {string} to - 收件人地址
 */
async function sendHtmlTestEmail(to) {
  const htmlContent = `
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
        <hr>
        <p><small>发送时间: ${new Date().toLocaleString('zh-CN')}</small></p>
      </body>
    </html>
  `;

  return await sendTestEmail(to, 'HTML 格式测试邮件', htmlContent, true);
}

/**
 * 发送多封测试邮件
 * @param {string} to - 收件人地址
 * @param {number} count - 邮件数量
 */
async function sendMultipleEmails(to, count = 3) {
  console.log(`🚀 开始发送 ${count} 封测试邮件到: ${to}`);
  console.log('-'.repeat(50));

  let successCount = 0;

  for (let i = 1; i <= count; i++) {
    const subject = `测试邮件 #${i}`;
    const content = `这是第 ${i} 封测试邮件，共 ${count} 封。\n\n发送时间: ${new Date().toLocaleString('zh-CN')}`;

    const success = await sendTestEmail(to, subject, content);
    if (success) {
      successCount++;
    }

    // 间隔 1 秒发送下一封
    if (i < count) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('-'.repeat(50));
  console.log(`📈 发送完成: ${successCount}/${count} 封邮件发送成功`);
}

/**
 * 发送包含附件的测试邮件
 * @param {string} to - 收件人地址
 */
async function sendEmailWithAttachment(to) {
  const mailOptions = {
    from: 'test@example.com',
    to: to,
    subject: '包含附件的测试邮件',
    text: '这是一封包含附件的测试邮件。',
    attachments: [
      {
        filename: 'test.txt',
        content:
          '这是一个测试附件的内容。\n\n创建时间: ' +
          new Date().toLocaleString('zh-CN'),
      },
      {
        filename: 'info.json',
        content: JSON.stringify(
          {
            message: '这是一个 JSON 格式的测试附件',
            timestamp: new Date().toISOString(),
            from: 'TempMail Test System',
          },
          null,
          2
        ),
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ 包含附件的测试邮件已发送到: ${to}`);
    console.log(`📎 附件数量: ${mailOptions.attachments.length}`);
    console.log(`📨 Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ 发送包含附件的邮件失败: ${error.message}`);
    return false;
  }
}

// 命令行参数处理
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('📧 测试邮件发送工具');
    console.log('');
    console.log('用法:');
    console.log('  node send_test_email.js <邮箱地址> [选项]');
    console.log('');
    console.log('选项:');
    console.log('  --html              发送 HTML 格式邮件');
    console.log('  --multiple <数量>   发送多封邮件');
    console.log('  --attachment        发送包含附件的邮件');
    console.log('  --subject <主题>    自定义邮件主题');
    console.log('  --content <内容>    自定义邮件内容');
    console.log('');
    console.log('示例:');
    console.log('  node send_test_email.js test@127.0.0.1');
    console.log('  node send_test_email.js test@127.0.0.1 --html');
    console.log('  node send_test_email.js test@127.0.0.1 --multiple 5');
    console.log('  node send_test_email.js test@127.0.0.1 --attachment');
    return;
  }

  const email = args[0];
  const options = {
    html: args.includes('--html'),
    attachment: args.includes('--attachment'),
    multiple: args.includes('--multiple')
      ? parseInt(args[args.indexOf('--multiple') + 1]) || 3
      : 1,
    subject: args.includes('--subject')
      ? args[args.indexOf('--subject') + 1]
      : '测试邮件',
    content: args.includes('--content')
      ? args[args.indexOf('--content') + 1]
      : '这是一封测试邮件，用于验证临时邮箱功能。',
  };

  console.log(`🚀 开始发送测试邮件...`);
  console.log(`📧 目标地址: ${email}`);
  console.log('-'.repeat(50));

  if (options.attachment) {
    sendEmailWithAttachment(email);
  } else if (options.html) {
    sendHtmlTestEmail(email);
  } else if (options.multiple > 1) {
    sendMultipleEmails(email, options.multiple);
  } else {
    sendTestEmail(email, options.subject, options.content);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  sendTestEmail,
  sendHtmlTestEmail,
  sendMultipleEmails,
  sendEmailWithAttachment,
};

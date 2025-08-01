import { MailParserService } from '../../services/mailParserService';

describe('MailParserService', () => {
  describe('parseRawMail', () => {
    it('should parse a simple text email', async () => {
      const rawMail = `From: sender@example.com
To: test@nnu.edu.kg
Subject: Test Email
Date: Mon, 1 Jan 2024 12:00:00 +0000

This is a test email body.`;

      const result = await MailParserService.parseRawMail(rawMail);

      expect(result.from).toBe('sender@example.com');
      expect(result.to).toBe('test@nnu.edu.kg');
      expect(result.subject).toBe('Test Email');
      expect(result.textContent).toBe('This is a test email body.');
      expect(result.htmlContent).toBeUndefined();
      expect(result.attachments).toHaveLength(0);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should parse an HTML email', async () => {
      const rawMail = `From: sender@example.com
To: test@nnu.edu.kg
Subject: HTML Test Email
Content-Type: text/html; charset=utf-8

<html>
<body>
<h1>Test HTML Email</h1>
<p>This is a <strong>test</strong> email with HTML content.</p>
<script>alert('xss')</script>
</body>
</html>`;

      const result = await MailParserService.parseRawMail(rawMail);

      expect(result.from).toBe('sender@example.com');
      expect(result.to).toBe('test@nnu.edu.kg');
      expect(result.subject).toBe('HTML Test Email');
      expect(result.htmlContent).toBeDefined();
      expect(result.htmlContent).not.toContain('<script>');
      expect(result.textContent.toLowerCase()).toContain('test html email');
      expect(result.textContent).toContain('test email with HTML content');
    });

    it('should parse email with attachments', async () => {
      const rawMail = `From: sender@example.com
To: test@nnu.edu.kg
Subject: Email with Attachment
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/plain

This email has an attachment.

--boundary123
Content-Type: application/pdf; name="document.pdf"
Content-Disposition: attachment; filename="document.pdf"
Content-Transfer-Encoding: base64

JVBERi0xLjQKJcOkw7zDtsO4CjIgMCBvYmoKPDwKL0xlbmd0aCAzIDAgUgo+PgpzdHJlYW0K

--boundary123--`;

      const result = await MailParserService.parseRawMail(rawMail);

      expect(result.from).toBe('sender@example.com');
      expect(result.to).toBe('test@nnu.edu.kg');
      expect(result.subject).toBe('Email with Attachment');
      expect(result.textContent).toContain('This email has an attachment');
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].filename).toBe('document.pdf');
      expect(result.attachments[0].contentType).toBe('application/pdf');
      expect(result.attachments[0].size).toBeGreaterThan(0);
    });

    it('should handle email with no subject', async () => {
      const rawMail = `From: sender@example.com
To: test@nnu.edu.kg
Date: Mon, 1 Jan 2024 12:00:00 +0000

Email without subject.`;

      const result = await MailParserService.parseRawMail(rawMail);

      expect(result.subject).toBe('(No Subject)');
      expect(result.textContent).toBe('Email without subject.');
    });

    it('should sanitize HTML content', async () => {
      const rawMail = `From: sender@example.com
To: test@nnu.edu.kg
Subject: Malicious Email
Content-Type: text/html

<html>
<body>
<p onclick="alert('xss')">Click me</p>
<script>alert('xss')</script>
<style>body { background: red; }</style>
<a href="javascript:alert('xss')">Link</a>
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" />
</body>
</html>`;

      const result = await MailParserService.parseRawMail(rawMail);

      expect(result.htmlContent).not.toContain('<script>');
      expect(result.htmlContent).not.toContain('<style>');
      expect(result.htmlContent).not.toContain('onclick=');
      expect(result.htmlContent).not.toContain('javascript:');
      expect(result.htmlContent).not.toContain('data:');
    });
  });

  describe('isOurDomain', () => {
    it('should return true for nnu.edu.kg domain', () => {
      expect(MailParserService.isOurDomain('test@nnu.edu.kg')).toBe(true);
      expect(MailParserService.isOurDomain('user123@nnu.edu.kg')).toBe(true);
    });

    it('should return false for other domains', () => {
      expect(MailParserService.isOurDomain('test@gmail.com')).toBe(false);
      expect(MailParserService.isOurDomain('user@example.com')).toBe(false);
      expect(MailParserService.isOurDomain('test@nnu.edu.cn')).toBe(false);
    });
  });

  describe('extractMailboxIdFromEmail', () => {
    it('should extract mailbox ID from email address', () => {
      expect(
        MailParserService.extractMailboxIdFromEmail('test123@nnu.edu.kg')
      ).toBe('test123');
      expect(
        MailParserService.extractMailboxIdFromEmail('user@nnu.edu.kg')
      ).toBe('user');
      expect(
        MailParserService.extractMailboxIdFromEmail('a1b2c3@nnu.edu.kg')
      ).toBe('a1b2c3');
    });
  });
});

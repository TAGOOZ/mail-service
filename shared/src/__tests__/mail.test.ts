import {
  generateMailId,
  sanitizeHtmlContent,
  extractTextFromHtml,
  validateEmailAddress,
  parseMailSubject,
  calculateMailSize,
  validateAttachment,
  formatMailSize,
  containsSensitiveContent,
} from '../utils/mail';
import { Attachment } from '../types/mail';

describe('Mail Utilities', () => {
  describe('generateMailId', () => {
    it('should generate a valid UUID format', () => {
      const id = generateMailId();
      expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateMailId();
      const id2 = generateMailId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('sanitizeHtmlContent', () => {
    it('should remove script tags', () => {
      const html = '<div>Hello</div><script>alert("xss")</script><p>World</p>';
      const sanitized = sanitizeHtmlContent(html);
      expect(sanitized).toBe('<div>Hello</div><p>World</p>');
    });

    it('should remove event handlers', () => {
      const html = '<div onclick="alert(\'xss\')" onmouseover="hack()">Hello</div>';
      const sanitized = sanitizeHtmlContent(html);
      expect(sanitized).toBe('<div>Hello</div>');
    });

    it('should remove javascript: protocols', () => {
      const html = '<a href="javascript:alert(\'xss\')">Click me</a>';
      const sanitized = sanitizeHtmlContent(html);
      expect(sanitized).toBe('<a href="">Click me</a>');
    });

    it('should remove iframe tags', () => {
      const html = '<div>Content</div><iframe src="evil.com"></iframe>';
      const sanitized = sanitizeHtmlContent(html);
      expect(sanitized).toBe('<div>Content</div>');
    });
  });

  describe('extractTextFromHtml', () => {
    it('should extract text from HTML', () => {
      const html = '<div><p>Hello <strong>World</strong></p></div>';
      const text = extractTextFromHtml(html);
      expect(text).toBe('Hello World');
    });

    it('should decode HTML entities', () => {
      const html = '<p>&lt;Hello&gt; &amp; &quot;World&quot;</p>';
      const text = extractTextFromHtml(html);
      expect(text).toBe('<Hello> & "World"');
    });

    it('should clean up whitespace', () => {
      const html = '<p>  Hello   \n\n  World  </p>';
      const text = extractTextFromHtml(html);
      expect(text).toBe('Hello World');
    });
  });

  describe('validateEmailAddress', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmailAddress('test@example.com')).toBe(true);
      expect(validateEmailAddress('user.name+tag@domain.co.uk')).toBe(true);
      expect(validateEmailAddress('123@456.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmailAddress('invalid-email')).toBe(false);
      expect(validateEmailAddress('@domain.com')).toBe(false);
      expect(validateEmailAddress('user@')).toBe(false);
      expect(validateEmailAddress('user@domain')).toBe(false);
    });
  });

  describe('parseMailSubject', () => {
    it('should remove common prefixes', () => {
      expect(parseMailSubject('Re: Hello World')).toBe('Hello World');
      expect(parseMailSubject('RE: Hello World')).toBe('Hello World');
      expect(parseMailSubject('Fwd: Hello World')).toBe('Hello World');
      expect(parseMailSubject('回复: Hello World')).toBe('Hello World');
    });

    it('should clean up whitespace', () => {
      expect(parseMailSubject('  Hello   World  ')).toBe('Hello World');
    });

    it('should return default for empty subject', () => {
      expect(parseMailSubject('')).toBe('(无主题)');
      expect(parseMailSubject('   ')).toBe('(无主题)');
    });
  });

  describe('calculateMailSize', () => {
    it('should calculate size correctly', () => {
      const textContent = 'Hello World'; // 11 bytes
      const htmlContent = '<p>Hello World</p>'; // 18 bytes
      const attachments: Attachment[] = [
        { filename: 'test.txt', contentType: 'text/plain', size: 100 }
      ];

      const size = calculateMailSize(textContent, htmlContent, attachments);
      expect(size).toBe(11 + 18 + 100);
    });

    it('should work without HTML content', () => {
      const textContent = 'Hello World';
      const size = calculateMailSize(textContent);
      expect(size).toBe(11);
    });
  });

  describe('validateAttachment', () => {
    it('should validate correct attachment', () => {
      const attachment: Attachment = {
        filename: 'test.txt',
        contentType: 'text/plain',
        size: 1000
      };
      expect(validateAttachment(attachment)).toBe(true);
    });

    it('should reject invalid attachments', () => {
      expect(validateAttachment({
        filename: '',
        contentType: 'text/plain',
        size: 1000
      })).toBe(false);

      expect(validateAttachment({
        filename: 'test.txt',
        contentType: '',
        size: 1000
      })).toBe(false);

      expect(validateAttachment({
        filename: 'test.txt',
        contentType: 'text/plain',
        size: -1
      })).toBe(false);

      expect(validateAttachment({
        filename: 'test.txt',
        contentType: 'invalid-content-type',
        size: 1000
      })).toBe(false);

      expect(validateAttachment({
        filename: 'test.txt',
        contentType: 'text/plain',
        size: 11 * 1024 * 1024 // > 10MB
      })).toBe(false);
    });
  });

  describe('formatMailSize', () => {
    it('should format sizes correctly', () => {
      expect(formatMailSize(0)).toBe('0 B');
      expect(formatMailSize(1024)).toBe('1 KB');
      expect(formatMailSize(1024 * 1024)).toBe('1 MB');
      expect(formatMailSize(1536)).toBe('1.5 KB');
    });
  });

  describe('containsSensitiveContent', () => {
    it('should detect sensitive content', () => {
      expect(containsSensitiveContent('Your password is: 123456')).toBe(true);
      expect(containsSensitiveContent('密码：123456')).toBe(true);
      expect(containsSensitiveContent('Credit card number: 1234')).toBe(true);
      expect(containsSensitiveContent('身份证号码')).toBe(true);
    });

    it('should not flag normal content', () => {
      expect(containsSensitiveContent('Hello world')).toBe(false);
      expect(containsSensitiveContent('Welcome to our service')).toBe(false);
    });
  });
});
import { MailReceivingService } from '../../services/mailReceivingService';

describe('MailReceivingService', () => {
  let mailService: MailReceivingService;

  beforeEach(() => {
    mailService = new MailReceivingService(2526); // Use different port for testing
  });

  afterEach(async () => {
    if (mailService) {
      await mailService.stop();
    }
  });

  describe('service lifecycle', () => {
    it('should initialize with correct default values', () => {
      expect(mailService.getStatus().isRunning).toBe(false);
      expect(mailService.getStatus().port).toBe(2526);
    });

    it('should start and stop the mail service', async () => {
      expect(mailService.getStatus().isRunning).toBe(false);

      await mailService.start();
      expect(mailService.getStatus().isRunning).toBe(true);

      await mailService.stop();
      expect(mailService.getStatus().isRunning).toBe(false);
    });

    it('should not start if already running', async () => {
      await mailService.start();
      expect(mailService.getStatus().isRunning).toBe(true);

      // Starting again should not throw error
      await mailService.start();
      expect(mailService.getStatus().isRunning).toBe(true);
    });
  });

  describe('SMTP command handling', () => {
    it('should handle HELO command', () => {
      const mockSocket = {
        write: jest.fn(),
      };

      const result = (mailService as any).handleSmtpCommand(
        mockSocket,
        'HELO example.com'
      );
      expect(mockSocket.write).toHaveBeenCalledWith('250 nnu.edu.kg Hello\r\n');
    });

    it('should handle EHLO command', () => {
      const mockSocket = {
        write: jest.fn(),
      };

      const result = (mailService as any).handleSmtpCommand(
        mockSocket,
        'EHLO example.com'
      );
      expect(mockSocket.write).toHaveBeenCalledWith('250 nnu.edu.kg Hello\r\n');
    });

    it('should handle MAIL FROM command', () => {
      const mockSocket = {
        write: jest.fn(),
      };

      const result = (mailService as any).handleSmtpCommand(
        mockSocket,
        'MAIL FROM:<sender@example.com>'
      );
      expect(mockSocket.write).toHaveBeenCalledWith('250 OK\r\n');
    });

    it('should handle DATA command', () => {
      const mockSocket = {
        write: jest.fn(),
      };

      const result = (mailService as any).handleSmtpCommand(mockSocket, 'DATA');
      expect(mockSocket.write).toHaveBeenCalledWith(
        '354 Start mail input; end with <CRLF>.<CRLF>\r\n'
      );
      expect(result).toBe('DATA_MODE');
    });

    it('should handle QUIT command', () => {
      const mockSocket = {
        write: jest.fn(),
        end: jest.fn(),
      };

      const result = (mailService as any).handleSmtpCommand(mockSocket, 'QUIT');
      expect(mockSocket.write).toHaveBeenCalledWith('221 Bye\r\n');
      expect(mockSocket.end).toHaveBeenCalled();
    });

    it('should handle unknown command', () => {
      const mockSocket = {
        write: jest.fn(),
      };

      const result = (mailService as any).handleSmtpCommand(
        mockSocket,
        'UNKNOWN'
      );
      expect(mockSocket.write).toHaveBeenCalledWith(
        '500 Command not recognized\r\n'
      );
    });
  });

  describe('email address extraction', () => {
    it('should extract email from RCPT TO command', () => {
      const email = (mailService as any).extractEmailFromCommand(
        'RCPT TO:<test@nnu.edu.kg>'
      );
      expect(email).toBe('test@nnu.edu.kg');
    });

    it('should extract email from MAIL FROM command', () => {
      const email = (mailService as any).extractEmailFromCommand(
        'MAIL FROM:<sender@example.com>'
      );
      expect(email).toBe('sender@example.com');
    });

    it('should return empty string for invalid format', () => {
      const email = (mailService as any).extractEmailFromCommand(
        'INVALID COMMAND'
      );
      expect(email).toBe('');
    });
  });
});

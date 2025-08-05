import { BackupService } from '../../services/backupService';
import { logger } from '../../utils/logger';
import * as fs from 'fs/promises';
import { exec } from 'child_process';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('fs/promises');
jest.mock('child_process');
jest.mock('../../config/database');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExec = exec as jest.MockedFunction<typeof exec>;

describe('BackupService', () => {
  let backupService: BackupService;

  beforeEach(() => {
    jest.clearAllMocks();
    backupService = BackupService.getInstance();

    // Mock environment variables
    process.env.BACKUP_ENABLED = 'true';
    process.env.BACKUP_PATH = '/tmp/test-backups';
    process.env.BACKUP_RETENTION_DAYS = '7';
  });

  afterEach(() => {
    backupService.stop();
    delete process.env.BACKUP_ENABLED;
    delete process.env.BACKUP_PATH;
    delete process.env.BACKUP_RETENTION_DAYS;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = BackupService.getInstance();
      const instance2 = BackupService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('start', () => {
    it('should start backup service when enabled', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);

      await backupService.start();

      expect(mockFs.mkdir).toHaveBeenCalledWith('/tmp/test-backups', {
        recursive: true,
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Backup scheduler started')
      );
    });

    it('should not start when disabled', async () => {
      process.env.BACKUP_ENABLED = 'false';
      backupService = BackupService.getInstance();

      await backupService.start();

      expect(logger.info).toHaveBeenCalledWith('Backup service is disabled');
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });

    it('should handle start errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(backupService.start()).rejects.toThrow('Permission denied');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to start backup service:',
        expect.any(Error)
      );
    });
  });

  describe('performBackup', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.rm.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 1024 } as any);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('log content');
      mockFs.readdir.mockResolvedValue(['app.log'] as any);
      mockFs.copyFile.mockResolvedValue(undefined);
    });

    it('should perform successful backup', async () => {
      // Mock successful command execution
      mockExec.mockImplementation((command, callback) => {
        if (callback) callback(null, { stdout: 'success', stderr: '' } as any);
        return {} as any;
      });

      const result = await backupService.performBackup();

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(result.size).toBe(1024);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle backup failures', async () => {
      // Mock command execution failure
      mockExec.mockImplementation((command, callback) => {
        if (callback) callback(new Error('Command failed'), null);
        return {} as any;
      });

      const result = await backupService.performBackup();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should cleanup on failure', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Disk full'));

      const result = await backupService.performBackup();

      expect(result.success).toBe(false);
      expect(mockFs.rm).toHaveBeenCalled();
    });
  });

  describe('listBackups', () => {
    it('should list available backups', async () => {
      const mockFiles = [
        'backup_2024-01-01T00-00-00-000Z.tar.gz',
        'other-file.txt',
      ];
      mockFs.readdir.mockResolvedValue(mockFiles as any);
      mockFs.stat.mockResolvedValue({
        size: 1024,
        mtime: new Date('2024-01-01'),
      } as any);

      const backups = await backupService.listBackups();

      expect(backups).toHaveLength(1);
      expect(backups[0].filename).toBe(
        'backup_2024-01-01T00-00-00-000Z.tar.gz'
      );
      expect(backups[0].size).toBe(1024);
    });

    it('should handle listing errors', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      const backups = await backupService.listBackups();

      expect(backups).toHaveLength(0);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to list backups:',
        expect.any(Error)
      );
    });
  });

  describe('cleanupOldBackups', () => {
    it('should delete old backups', async () => {
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      mockFs.readdir.mockResolvedValue([
        'backup_old.tar.gz',
        'backup_recent.tar.gz',
        'other-file.txt',
      ] as any);

      mockFs.stat
        .mockResolvedValueOnce({ mtime: oldDate } as any)
        .mockResolvedValueOnce({ mtime: recentDate } as any);

      mockFs.unlink.mockResolvedValue(undefined);

      const deletedCount = await backupService.cleanupOldBackups();

      expect(deletedCount).toBe(1);
      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('backup_old.tar.gz')
      );
      expect(mockFs.unlink).not.toHaveBeenCalledWith(
        expect.stringContaining('backup_recent.tar.gz')
      );
    });

    it('should handle cleanup errors', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const deletedCount = await backupService.cleanupOldBackups();

      expect(deletedCount).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to cleanup old backups:',
        expect.any(Error)
      );
    });
  });

  describe('getStatus', () => {
    it('should return service status', () => {
      const status = backupService.getStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('schedule');
      expect(status).toHaveProperty('config');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        retentionDays: 14,
        compressionLevel: 9,
      };

      backupService.updateConfig(newConfig);

      const status = backupService.getStatus();
      expect(status.config.retentionDays).toBe(14);
      expect(status.config.compressionLevel).toBe(9);
      expect(logger.info).toHaveBeenCalledWith(
        'Backup service configuration updated'
      );
    });
  });
});

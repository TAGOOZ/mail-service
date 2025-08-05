import { DataCleanupService } from '../../services/dataCleanupService';
import { Mailbox } from '../../models/Mailbox';
import { Mail } from '../../models/Mail';
import { getRedisClient } from '../../config/database';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../models/Mailbox');
jest.mock('../../models/Mail');
jest.mock('../../config/database');
jest.mock('../../utils/logger');

const mockMailbox = Mailbox as jest.Mocked<typeof Mailbox>;
const mockMail = Mail as jest.Mocked<typeof Mail>;
const mockGetRedisClient = getRedisClient as jest.MockedFunction<
  typeof getRedisClient
>;

describe('DataCleanupService', () => {
  let cleanupService: DataCleanupService;
  let mockRedisClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    cleanupService = DataCleanupService.getInstance();

    // Mock Redis client
    mockRedisClient = {
      keys: jest.fn(),
      del: jest.fn(),
      get: jest.fn(),
      info: jest.fn(),
    };
    mockGetRedisClient.mockReturnValue(mockRedisClient);

    // Mock environment variables
    process.env.CLEANUP_ENABLED = 'true';
    process.env.CLEANUP_BATCH_SIZE = '10';
  });

  afterEach(() => {
    cleanupService.stop();
    delete process.env.CLEANUP_ENABLED;
    delete process.env.CLEANUP_BATCH_SIZE;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DataCleanupService.getInstance();
      const instance2 = DataCleanupService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('start', () => {
    it('should start cleanup service when enabled', async () => {
      await cleanupService.start();

      expect(logger.info).toHaveBeenCalledWith(
        'Data cleanup service started successfully'
      );
    });

    it('should not start when disabled', async () => {
      process.env.CLEANUP_ENABLED = 'false';
      cleanupService = DataCleanupService.getInstance();

      await cleanupService.start();

      expect(logger.info).toHaveBeenCalledWith(
        'Data cleanup service is disabled'
      );
    });
  });

  describe('cleanupExpiredMailboxes', () => {
    it('should cleanup expired mailboxes successfully', async () => {
      const mockExpiredMailboxes = [
        {
          id: '1',
          address: 'test1@nnu.edu.kg',
          isActive: true,
          save: jest.fn(),
        },
        {
          id: '2',
          address: 'test2@nnu.edu.kg',
          isActive: true,
          save: jest.fn(),
        },
      ];

      mockMailbox.find.mockResolvedValue(mockExpiredMailboxes as any);
      mockMail.deleteMany.mockResolvedValue({ deletedCount: 5 } as any);
      mockRedisClient.keys.mockResolvedValue([
        'session:1:token1',
        'session:2:token2',
      ]);
      mockRedisClient.del.mockResolvedValue(2);

      const result = await cleanupService.cleanupExpiredMailboxes();

      expect(result.type).toBe('expiredMailboxes');
      expect(result.processed).toBe(2);
      expect(result.deleted).toBe(2);
      expect(result.errors).toBe(0);
      expect(mockMail.deleteMany).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'session:1:token1',
        'session:2:token2',
      ]);
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockExpiredMailboxes = [
        {
          id: '1',
          address: 'test1@nnu.edu.kg',
          isActive: true,
          save: jest.fn().mockRejectedValue(new Error('Save failed')),
        },
      ];

      mockMailbox.find.mockResolvedValue(mockExpiredMailboxes as any);
      mockMail.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await cleanupService.cleanupExpiredMailboxes();

      expect(result.errors).toBe(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup mailbox'),
        expect.any(Error)
      );
    });

    it('should process in batches', async () => {
      // First batch
      const firstBatch = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        address: `test${i + 1}@nnu.edu.kg`,
        isActive: true,
        save: jest.fn(),
      }));

      // Second batch (empty to stop)
      mockMailbox.find
        .mockResolvedValueOnce(firstBatch as any)
        .mockResolvedValueOnce([] as any);

      mockMail.deleteMany.mockResolvedValue({ deletedCount: 1 } as any);
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await cleanupService.cleanupExpiredMailboxes();

      expect(result.processed).toBe(10);
      expect(mockMailbox.find).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanupOldMails', () => {
    it('should cleanup old mails successfully', async () => {
      const mockOldMails = [
        { _id: '1', receivedAt: new Date('2023-01-01') },
        { _id: '2', receivedAt: new Date('2023-01-02') },
      ];

      mockMail.find.mockResolvedValue(mockOldMails as any);
      mockMail.deleteMany.mockResolvedValue({ deletedCount: 2 } as any);

      const result = await cleanupService.cleanupOldMails();

      expect(result.type).toBe('oldMails');
      expect(result.processed).toBe(2);
      expect(result.deleted).toBe(2);
      expect(result.errors).toBe(0);
    });

    it('should handle deletion errors', async () => {
      const mockOldMails = [{ _id: '1', receivedAt: new Date('2023-01-01') }];

      mockMail.find.mockResolvedValue(mockOldMails as any);
      mockMail.deleteMany.mockRejectedValue(new Error('Delete failed'));

      const result = await cleanupService.cleanupOldMails();

      expect(result.errors).toBe(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to delete batch of old mails:',
        expect.any(Error)
      );
    });
  });

  describe('cleanupRedisData', () => {
    it('should cleanup Redis data successfully', async () => {
      // Mock session cleanup
      mockRedisClient.keys.mockResolvedValueOnce(['session:1', 'session:2']);
      mockRedisClient.get.mockResolvedValue(
        JSON.stringify({
          lastAccessAt: new Date(
            Date.now() - 25 * 60 * 60 * 1000
          ).toISOString(), // 25 hours ago
        })
      );
      mockRedisClient.del.mockResolvedValue(1);

      // Mock temp cache cleanup
      mockRedisClient.keys
        .mockResolvedValueOnce(['temp:key1'])
        .mockResolvedValueOnce(['cache:key1']);

      const result = await cleanupService.cleanupRedisData();

      expect(result.type).toBe('redisCleanup');
      expect(result.deleted).toBeGreaterThan(0);
      expect(result.errors).toBe(0);
    });

    it('should handle Redis errors', async () => {
      mockRedisClient.keys.mockRejectedValue(
        new Error('Redis connection failed')
      );

      const result = await cleanupService.cleanupRedisData();

      expect(result.errors).toBeGreaterThan(0);
      expect(logger.error).toHaveBeenCalledWith(
        'Redis cleanup failed:',
        expect.any(Error)
      );
    });
  });

  describe('triggerCleanup', () => {
    it('should trigger specific cleanup type', async () => {
      mockMailbox.find.mockResolvedValue([]);

      const result = await cleanupService.triggerCleanup('expiredMailboxes');

      expect(result.type).toBe('expiredMailboxes');
      expect(logger.info).toHaveBeenCalledWith(
        'Manual cleanup triggered: expiredMailboxes'
      );
    });

    it('should throw error for invalid cleanup type', async () => {
      await expect(
        cleanupService.triggerCleanup('invalid' as any)
      ).rejects.toThrow('Unknown cleanup type: invalid');
    });
  });

  describe('getCleanupStats', () => {
    it('should return cleanup statistics', async () => {
      mockMailbox.countDocuments
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(20); // expired

      mockMail.countDocuments
        .mockResolvedValueOnce(500) // total
        .mockResolvedValueOnce(50); // old

      mockRedisClient.info.mockResolvedValue('db0:keys=150,expires=0');

      const stats = await cleanupService.getCleanupStats();

      expect(stats.totalMailboxes).toBe(100);
      expect(stats.activeMailboxes).toBe(80);
      expect(stats.expiredMailboxes).toBe(20);
      expect(stats.totalMails).toBe(500);
      expect(stats.oldMails).toBe(50);
      expect(stats.redisKeys).toBe(150);
    });

    it('should handle stats errors gracefully', async () => {
      mockMailbox.countDocuments.mockRejectedValue(new Error('Database error'));

      const stats = await cleanupService.getCleanupStats();

      expect(stats.totalMailboxes).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get cleanup stats:',
        expect.any(Error)
      );
    });
  });

  describe('getStatus', () => {
    it('should return service status', () => {
      const status = cleanupService.getStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('activeJobs');
      expect(status).toHaveProperty('config');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        retentionPolicies: {
          expiredMailboxGracePeriod: 4,
          oldMailsRetentionDays: 14,
          logRetentionDays: 60,
          sessionRetentionHours: 48,
        },
      };

      cleanupService.updateConfig(newConfig);

      const status = cleanupService.getStatus();
      expect(status.config.retentionPolicies.expiredMailboxGracePeriod).toBe(4);
      expect(logger.info).toHaveBeenCalledWith(
        'Data cleanup service configuration updated'
      );
    });
  });
});

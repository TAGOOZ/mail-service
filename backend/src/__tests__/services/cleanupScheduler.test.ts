import { CleanupScheduler } from '../../services/cleanupScheduler';
import { MailboxService } from '../../services/mailboxService';
import * as cron from 'node-cron';

// Mock dependencies
jest.mock('../../services/mailboxService');
jest.mock('node-cron');
jest.mock('../../utils/logger');

const MockedMailboxService = MailboxService as jest.Mocked<
  typeof MailboxService
>;
const mockedCron = cron as jest.Mocked<typeof cron>;

describe('CleanupScheduler', () => {
  let mockScheduledTask: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockScheduledTask = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
      id: 'test-task',
      getStatus: jest.fn(),
      execute: jest.fn(),
      getNextRun: jest.fn(),
      getPreviousRun: jest.fn(),
      getRunning: jest.fn(),
      getSchedule: jest.fn(),
    };

    mockedCron.schedule.mockReturnValue(mockScheduledTask as any);
  });

  afterEach(() => {
    // Clean up any running schedulers
    CleanupScheduler.stop();
  });

  describe('start', () => {
    it('should start the cleanup scheduler', () => {
      // Act
      CleanupScheduler.start();

      // Assert
      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '*/15 * * * *',
        expect.any(Function),
        {
          timezone: 'UTC',
        }
      );
      // Task starts automatically with cron.schedule
    });

    it('should not start if already running', () => {
      // Arrange
      CleanupScheduler.start();
      jest.clearAllMocks();

      // Act
      CleanupScheduler.start();

      // Assert
      expect(mockedCron.schedule).not.toHaveBeenCalled();
    });

    it('should trigger immediate cleanup on start', () => {
      // Arrange
      MockedMailboxService.cleanupExpiredMailboxes.mockResolvedValue(3);
      MockedMailboxService.getMailboxStats.mockResolvedValue({
        totalActive: 10,
        expiringIn1Hour: 2,
        totalMails: 25,
      });

      // Act
      CleanupScheduler.start();

      // Assert - The immediate cleanup is called asynchronously
      expect(MockedMailboxService.cleanupExpiredMailboxes).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop the cleanup scheduler', () => {
      // Arrange
      CleanupScheduler.start();

      // Act
      CleanupScheduler.stop();

      // Assert
      expect(mockScheduledTask.stop).toHaveBeenCalled();
      expect(mockScheduledTask.destroy).toHaveBeenCalled();
    });

    it('should handle stop when not running', () => {
      // Act & Assert - Should not throw
      expect(() => CleanupScheduler.stop()).not.toThrow();
    });
  });

  describe('triggerCleanup', () => {
    it('should manually trigger cleanup and return count', async () => {
      // Arrange
      MockedMailboxService.cleanupExpiredMailboxes.mockResolvedValue(5);

      // Act
      const result = await CleanupScheduler.triggerCleanup();

      // Assert
      expect(result).toBe(5);
      expect(MockedMailboxService.cleanupExpiredMailboxes).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return running status when active', () => {
      // Arrange
      CleanupScheduler.start();

      // Act
      const status = CleanupScheduler.getStatus();

      // Assert
      expect(status).toEqual({
        isRunning: true,
        nextRun: 'Every 15 minutes',
      });
    });

    it('should return stopped status when inactive', () => {
      // Act
      const status = CleanupScheduler.getStatus();

      // Assert
      expect(status).toEqual({
        isRunning: false,
        nextRun: null,
      });
    });
  });

  describe('setCustomSchedule', () => {
    it('should set custom cron schedule', () => {
      // Arrange
      const customCron = '0 */6 * * *'; // Every 6 hours

      // Act
      CleanupScheduler.setCustomSchedule(customCron);

      // Assert
      expect(mockedCron.schedule).toHaveBeenCalledWith(
        customCron,
        expect.any(Function),
        {
          timezone: 'UTC',
        }
      );
      // Task starts automatically with cron.schedule
    });

    it('should stop existing scheduler before setting new one', () => {
      // Arrange
      CleanupScheduler.start();
      const firstTask = mockScheduledTask;

      // Create new mock for second schedule call
      const secondTask = {
        start: jest.fn(),
        stop: jest.fn(),
        destroy: jest.fn(),
        id: 'test-task-2',
        getStatus: jest.fn(),
        execute: jest.fn(),
        getNextRun: jest.fn(),
        getPreviousRun: jest.fn(),
        getRunning: jest.fn(),
        getSchedule: jest.fn(),
      };
      mockedCron.schedule.mockReturnValue(secondTask as any);

      // Act
      CleanupScheduler.setCustomSchedule('0 */6 * * *');

      // Assert
      expect(firstTask.stop).toHaveBeenCalled();
      expect(firstTask.destroy).toHaveBeenCalled();
      // Second task starts automatically with cron.schedule
    });
  });
});

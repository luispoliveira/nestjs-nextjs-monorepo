import { NotFoundException } from '@nestjs/common';
import { BaseDlqService } from '@repo/shared';
import { Queue } from 'bullmq';

class TestDlqService extends BaseDlqService {}

const makeMockJob = (overrides: Record<string, unknown> = {}) => ({
  id: 'job-1',
  name: 'test-job',
  data: { email: 'test@example.com' },
  failedReason: 'SMTP error',
  timestamp: 1000,
  remove: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('BaseDlqService', () => {
  let service: TestDlqService;
  let dlqQueue: jest.Mocked<Pick<Queue, 'getJobs' | 'getJob' | 'getJobCounts'>>;
  let originalQueue: jest.Mocked<Pick<Queue, 'add'>>;

  beforeEach(() => {
    dlqQueue = {
      getJobs: jest.fn(),
      getJob: jest.fn(),
      getJobCounts: jest.fn(),
    };
    originalQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };
    service = new TestDlqService(
      dlqQueue as unknown as Queue,
      originalQueue as unknown as Queue,
    );
  });

  describe('list()', () => {
    it('should return paginated jobs and total count', async () => {
      const mockJob = makeMockJob();
      dlqQueue.getJobs.mockResolvedValue([mockJob] as never);
      dlqQueue.getJobCounts.mockResolvedValue({ waiting: 5 } as never);

      const result = await service.list(1, 20);

      expect(result.total).toBe(5);
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0]).toMatchObject({
        id: 'job-1',
        name: 'test-job',
        failedReason: 'SMTP error',
      });
    });
  });

  describe('replay()', () => {
    it('should re-enqueue to original queue and remove from DLQ', async () => {
      const mockJob = makeMockJob();
      dlqQueue.getJob.mockResolvedValue(mockJob as never);

      await service.replay('job-1');

      expect(originalQueue.add).toHaveBeenCalledWith(mockJob.name, mockJob.data);
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException when job does not exist', async () => {
      dlqQueue.getJob.mockResolvedValue(null as never);

      await expect(service.replay('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('purge()', () => {
    it('should remove all DLQ jobs and return count', async () => {
      const mockJobs = [makeMockJob({ id: '1' }), makeMockJob({ id: '2' })];
      dlqQueue.getJobs.mockResolvedValue(mockJobs as never);

      const count = await service.purge();

      expect(count).toBe(2);
      mockJobs.forEach((j) => expect(j.remove).toHaveBeenCalled());
    });

    it('should return 0 when DLQ is empty', async () => {
      dlqQueue.getJobs.mockResolvedValue([] as never);

      const count = await service.purge();

      expect(count).toBe(0);
    });
  });

  describe('count()', () => {
    it('should return the waiting job count', async () => {
      dlqQueue.getJobCounts.mockResolvedValue({ waiting: 7 } as never);

      const count = await service.count();

      expect(count).toBe(7);
    });
  });
});

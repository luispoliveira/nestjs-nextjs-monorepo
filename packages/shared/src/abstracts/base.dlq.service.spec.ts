import { NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BaseDlqService } from './base.dlq.service';

class TestDlqService extends BaseDlqService {}

const makeJob = (id = 'job-1', name = 'job-name') => ({
  id,
  name,
  data: { email: 'test@example.com' },
  failedReason: 'timeout',
  timestamp: 1000,
  remove: jest.fn().mockResolvedValue(undefined),
});

describe('BaseDlqService', () => {
  let service: TestDlqService;
  let dlqQueue: jest.Mocked<Queue>;
  let originalQueue: jest.Mocked<Queue>;

  beforeEach(() => {
    dlqQueue = {
      getJobs: jest.fn(),
      getJob: jest.fn(),
      getJobCounts: jest.fn(),
    } as unknown as jest.Mocked<Queue>;

    originalQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Queue>;

    service = new TestDlqService(dlqQueue, originalQueue);
  });

  describe('list', () => {
    it('should return jobs mapped to DlqJobDto format', async () => {
      const mockJob = makeJob();
      dlqQueue.getJobs.mockResolvedValue([mockJob] as never);
      dlqQueue.getJobCounts.mockResolvedValue({ waiting: 1 } as never);

      const result = await service.list();

      expect(result.total).toBe(1);
      expect(result.jobs[0]).toMatchObject({
        id: 'job-1',
        name: 'job-name',
        failedReason: 'timeout',
        timestamp: 1000,
      });
    });

    it('should use ?? 0 when waiting count is undefined', async () => {
      dlqQueue.getJobs.mockResolvedValue([] as never);
      dlqQueue.getJobCounts.mockResolvedValue({} as never);

      const result = await service.list();

      expect(result.total).toBe(0);
    });

    it('should paginate using page and limit', async () => {
      dlqQueue.getJobs.mockResolvedValue([] as never);
      dlqQueue.getJobCounts.mockResolvedValue({ waiting: 0 } as never);

      await service.list(2, 10);

      expect(dlqQueue.getJobs).toHaveBeenCalledWith(['waiting'], 10, 19);
    });
  });

  describe('replay', () => {
    it('should add job to original queue and remove from DLQ', async () => {
      const mockJob = makeJob();
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

  describe('replayAll', () => {
    it('should replay all jobs and return count', async () => {
      const jobs = [makeJob('j1'), makeJob('j2')];
      dlqQueue.getJobs.mockResolvedValue(jobs as never);

      const count = await service.replayAll();

      expect(count).toBe(2);
      expect(originalQueue.add).toHaveBeenCalledTimes(2);
      jobs.forEach((j) => expect(j.remove).toHaveBeenCalled());
    });
  });

  describe('purge', () => {
    it('should remove all jobs and return count', async () => {
      const jobs = [makeJob('j1'), makeJob('j2'), makeJob('j3')];
      dlqQueue.getJobs.mockResolvedValue(jobs as never);

      const count = await service.purge();

      expect(count).toBe(3);
      jobs.forEach((j) => expect(j.remove).toHaveBeenCalled());
    });
  });

  describe('count', () => {
    it('should return waiting count', async () => {
      dlqQueue.getJobCounts.mockResolvedValue({ waiting: 7 } as never);
      expect(await service.count()).toBe(7);
    });

    it('should return 0 when waiting is undefined', async () => {
      dlqQueue.getJobCounts.mockResolvedValue({} as never);
      expect(await service.count()).toBe(0);
    });
  });
});

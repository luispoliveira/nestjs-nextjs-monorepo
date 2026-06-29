import { BaseDlqService } from '@repo/shared';
import { Queue } from 'bullmq';
import { EmailDlqService } from './email.dlq.service';

describe('EmailDlqService', () => {
  it('should be defined and extend BaseDlqService', () => {
    const dlqQueue = {
      getJobs: jest.fn(),
      getJob: jest.fn(),
      getJobCounts: jest.fn(),
    } as unknown as Queue;
    const originalQueue = { add: jest.fn() } as unknown as Queue;

    const service = new EmailDlqService(dlqQueue, originalQueue);

    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(BaseDlqService);
  });
});

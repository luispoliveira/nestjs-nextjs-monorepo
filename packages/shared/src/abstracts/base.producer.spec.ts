import { Queue } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import { BaseProducer } from './base.producer';

class TestProducer extends BaseProducer {
  addTestJob<T>(name: string, data: T) {
    return this.addJob(name, data);
  }
}

describe('BaseProducer', () => {
  let producer: TestProducer;
  let queue: jest.Mocked<Queue>;
  let clsService: jest.Mocked<ClsService>;

  beforeEach(() => {
    queue = {
      add: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Queue>;

    clsService = {
      get: jest.fn().mockReturnValue('corr-xyz'),
    } as unknown as jest.Mocked<ClsService>;

    producer = new TestProducer(queue, clsService);
  });

  it('should call queue.add with job name and merged data including correlationId', async () => {
    const jobName = 'test-job';
    const jobData = { email: 'user@example.com', userId: '123' };

    await producer.addTestJob(jobName, jobData);

    expect(queue.add).toHaveBeenCalledWith(jobName, {
      email: 'user@example.com',
      userId: '123',
      correlationId: 'corr-xyz',
    });
  });

  it('should retrieve correlationId from ClsService', async () => {
    await producer.addTestJob('job-name', { payload: 'value' });

    expect(clsService.get).toHaveBeenCalledWith('correlationId');
  });

  it('should spread correlationId even when it is undefined (no CLS)', async () => {
    clsService.get.mockReturnValue(undefined);

    await producer.addTestJob('job-name', { key: 'value' });

    expect(queue.add).toHaveBeenCalledWith('job-name', {
      key: 'value',
      correlationId: undefined,
    });
  });
});

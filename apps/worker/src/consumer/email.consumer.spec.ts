import { getQueueToken } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '@repo/mail';
import { QUEUES } from '@repo/shared';
import { Job } from 'bullmq';
import { QueueMetricsService } from '../metrics/queue-metrics.service';
import { EmailConsumer } from './email.consumer';

const mockDlqQueue = { add: jest.fn().mockResolvedValue(undefined) };
const mockQueueMetrics: Partial<QueueMetricsService> = {
  recordDuration: jest.fn(),
  recordFailure: jest.fn(),
};

describe('EmailConsumer', () => {
  let consumer: EmailConsumer;
  let mailService: jest.Mocked<MailService>;

  beforeEach(async () => {
    mailService = {
      send: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MailService>;

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailConsumer,
        { provide: MailService, useValue: mailService },
        { provide: QueueMetricsService, useValue: mockQueueMetrics },
        {
          provide: getQueueToken(QUEUES.EMAIL_DLQ),
          useValue: mockDlqQueue,
        },
      ],
    }).compile();

    consumer = module.get<EmailConsumer>(EmailConsumer);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('sendWelcomeEmail()', () => {
    it('should call mailService.send with the correct payload', async () => {
      const job = { id: 'job-1', data: { email: 'welcome@example.com' } } as Job;
      await consumer['sendWelcomeEmail'](job as Job<{ email: string }>);
      expect(mailService.send).toHaveBeenCalledTimes(1);
      expect(mailService.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: [{ email: 'welcome@example.com' }] }),
      );
    });

    it('should throw when job data is missing email', async () => {
      const job = { id: 'job-2', data: {} } as Job;
      await expect(consumer['sendWelcomeEmail'](job as Job<{ email: string }>)).rejects.toThrow();
      expect(mailService.send).not.toHaveBeenCalled();
    });
  });

  describe('onFailed()', () => {
    it('should call recordFailure and captureException on any failure', () => {
      const job = {
        id: 'job-3',
        name: 'send-welcome-email',
        data: { email: 'test@example.com' },
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as unknown as Job;
      const error = new Error('SMTP error');

      consumer.onFailed(job, error);

      expect(mockQueueMetrics.recordFailure).toHaveBeenCalledWith(job.name);
    });

    it('should route to DLQ when all attempts are exhausted', () => {
      const job = {
        id: 'job-4',
        name: 'send-welcome-email',
        data: { email: 'test@example.com' },
        attemptsMade: 3,
        opts: { attempts: 3 },
      } as unknown as Job;
      const error = new Error('SMTP error');

      consumer.onFailed(job, error);

      expect(mockDlqQueue.add).toHaveBeenCalledWith(
        job.name,
        job.data,
        expect.objectContaining({ removeOnFail: expect.anything() }),
      );
    });

    it('should not route to DLQ when retries remain', () => {
      const job = {
        id: 'job-5',
        name: 'send-welcome-email',
        data: { email: 'test@example.com' },
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as unknown as Job;
      const error = new Error('SMTP error');

      consumer.onFailed(job, error);

      expect(mockDlqQueue.add).not.toHaveBeenCalled();
    });
  });
});

import { NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';

export interface DlqJobDto {
  id: string | undefined;
  name: string;
  data: unknown;
  failedReason: string | undefined;
  timestamp: number;
}

export interface DlqListResult {
  jobs: DlqJobDto[];
  total: number;
}

export abstract class BaseDlqService {
  constructor(
    protected readonly dlqQueue: Queue,
    protected readonly originalQueue: Queue,
  ) {}

  async list(page = 1, limit = 20): Promise<DlqListResult> {
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const [jobs, counts] = await Promise.all([
      this.dlqQueue.getJobs(['waiting'], start, end),
      this.dlqQueue.getJobCounts('waiting'),
    ]);
    return {
      jobs: jobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
      })),
      total: counts.waiting ?? 0,
    };
  }

  async replay(jobId: string): Promise<void> {
    const job = await this.dlqQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found in DLQ`);
    }
    await this.originalQueue.add(job.name, job.data);
    await job.remove();
  }

  async replayAll(): Promise<number> {
    const jobs = await this.dlqQueue.getJobs(['waiting']);
    await Promise.all(
      jobs.map(async (job) => {
        await this.originalQueue.add(job.name, job.data);
        await job.remove();
      }),
    );
    return jobs.length;
  }

  async purge(): Promise<number> {
    const jobs = await this.dlqQueue.getJobs(['waiting']);
    await Promise.all(jobs.map((job) => job.remove()));
    return jobs.length;
  }

  async count(): Promise<number> {
    const counts = await this.dlqQueue.getJobCounts('waiting');
    return counts.waiting ?? 0;
  }
}

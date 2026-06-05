import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUES } from '@repo/shared';
import { Queue } from 'bullmq';
import { Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class QueueMetricsService implements OnModuleInit {
  private durationHistogram!: Histogram;
  private failureCounter!: Counter;

  constructor(@InjectQueue(QUEUES.EMAIL) private readonly emailQueue: Queue) {}

  onModuleInit(): void {
    const queue = this.emailQueue;
    const queueName = QUEUES.EMAIL;

    new Gauge({
      name: 'bullmq_queue_depth',
      help: 'BullMQ queue depth by state',
      labelNames: ['queue', 'state'],
      async collect() {
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'delayed',
          'failed',
        );
        this.set({ queue: queueName, state: 'waiting' }, counts.waiting ?? 0);
        this.set({ queue: queueName, state: 'active' }, counts.active ?? 0);
        this.set({ queue: queueName, state: 'delayed' }, counts.delayed ?? 0);
        this.set({ queue: queueName, state: 'failed' }, counts.failed ?? 0);
      },
    });

    this.durationHistogram = new Histogram({
      name: 'bullmq_job_duration_seconds',
      help: 'BullMQ job processing duration in seconds',
      labelNames: ['queue', 'job_name'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
    });

    this.failureCounter = new Counter({
      name: 'bullmq_job_failures_total',
      help: 'Total number of permanently failed BullMQ jobs',
      labelNames: ['queue', 'job_name'],
    });
  }

  recordDuration(jobName: string, durationMs: number): void {
    this.durationHistogram.observe(
      { queue: QUEUES.EMAIL, job_name: jobName },
      durationMs / 1000,
    );
  }

  recordFailure(jobName: string): void {
    this.failureCounter.inc({ queue: QUEUES.EMAIL, job_name: jobName });
  }
}

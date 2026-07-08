import { ExampleCronService } from './example-cron.service';

describe('ExampleCronService', () => {
  it('runs the scheduled handler without throwing', () => {
    const service = new ExampleCronService();
    expect(() => service.handleCron()).not.toThrow();
  });
});

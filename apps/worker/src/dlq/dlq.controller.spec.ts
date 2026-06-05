import { Test, TestingModule } from '@nestjs/testing';
import { DlqController } from './dlq.controller';
import { EmailDlqService } from './email.dlq.service';

describe('DlqController', () => {
  let controller: DlqController;
  let emailDlqService: jest.Mocked<EmailDlqService>;

  beforeEach(async () => {
    emailDlqService = {
      list: jest.fn(),
      replay: jest.fn().mockResolvedValue(undefined),
      purge: jest.fn(),
    } as unknown as jest.Mocked<EmailDlqService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DlqController],
      providers: [{ provide: EmailDlqService, useValue: emailDlqService }],
    }).compile();

    controller = module.get<DlqController>(DlqController);
  });

  describe('list()', () => {
    it('should delegate to emailDlqService.list and return the result', async () => {
      const mockResult = { jobs: [], total: 0 };
      emailDlqService.list.mockResolvedValue(mockResult);

      const result = await controller.list({ page: 1, limit: 20 });

      expect(emailDlqService.list).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(mockResult);
    });

    it('should pass undefined page and limit when not provided', async () => {
      emailDlqService.list.mockResolvedValue({ jobs: [], total: 0 });

      await controller.list({});

      expect(emailDlqService.list).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('replay()', () => {
    it('should delegate to emailDlqService.replay and return success', async () => {
      const result = await controller.replay({ jobId: 'job-123' });

      expect(emailDlqService.replay).toHaveBeenCalledWith('job-123');
      expect(result).toEqual({ success: true });
    });
  });

  describe('purge()', () => {
    it('should delegate to emailDlqService.purge and return removed count', async () => {
      emailDlqService.purge.mockResolvedValue(5);

      const result = await controller.purge();

      expect(emailDlqService.purge).toHaveBeenCalled();
      expect(result).toEqual({ removed: 5 });
    });
  });
});

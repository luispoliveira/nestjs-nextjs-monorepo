import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailLog } from './schema/email-log.schema';
import { Log } from './schema/log.schema';
import { MongoService } from './mongo.service';

describe('MongoService', () => {
  let service: MongoService;

  const mockSave = jest.fn();
  const mockExec = jest.fn();
  const mockFindByIdAndUpdate = jest.fn().mockReturnValue({ exec: mockExec });

  function createModelMock() {
    const ctor = jest.fn().mockReturnValue({ save: mockSave });
    (ctor as unknown as Record<string, jest.Mock>).findByIdAndUpdate = mockFindByIdAndUpdate;
    return ctor;
  }

  beforeEach(async () => {
    mockSave.mockReset();
    mockExec.mockReset();
    mockFindByIdAndUpdate.mockReturnValue({ exec: mockExec });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoService,
        { provide: getModelToken(Log.name), useValue: createModelMock() },
        { provide: getModelToken(EmailLog.name), useValue: createModelMock() },
      ],
    }).compile();

    service = module.get<MongoService>(MongoService);
  });

  describe('createLog', () => {
    it('should create a log document and call save', async () => {
      const savedLog = { _id: 'log-1', method: 'GET', url: '/test' };
      mockSave.mockResolvedValue(savedLog);

      const result = await service.createLog({ method: 'GET', url: '/test' });

      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(savedLog);
    });
  });

  describe('updateLog', () => {
    it('should call findByIdAndUpdate and return the updated document', async () => {
      const updated = { _id: 'log-1', statusCode: 200 };
      mockExec.mockResolvedValue(updated);

      const result = await service.updateLog('log-1', { statusCode: 200 } as Partial<Log>);

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'log-1',
        { statusCode: 200 },
        { returnDocument: 'after' },
      );
      expect(result).toEqual(updated);
    });
  });

  describe('createEmailLog', () => {
    it('should create an email log document and call save', async () => {
      const savedLog = { _id: 'el-1', to: 'a@b.com' };
      mockSave.mockResolvedValue(savedLog);

      const result = await service.createEmailLog({ to: 'a@b.com' } as Partial<EmailLog>);

      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(savedLog);
    });
  });

  describe('updateEmailLog', () => {
    it('should call findByIdAndUpdate and return the updated email log', async () => {
      const updated = { _id: 'el-1', status: 'sent' };
      mockExec.mockResolvedValue(updated);

      const result = await service.updateEmailLog('el-1', { status: 'sent' } as Partial<EmailLog>);

      expect(result).toEqual(updated);
    });
  });
});

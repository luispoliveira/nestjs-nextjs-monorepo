import { ClientProxy } from '@nestjs/microservices';
import { ClsService } from 'nestjs-cls';
import { CLS_CORRELATION_ID } from '../constants';
import { BasePublisher } from './base.publisher';

class TestPublisher extends BasePublisher {
  testPublish<T>(pattern: string, data: T) {
    return this.publish(pattern, data);
  }
}

describe('BasePublisher', () => {
  let publisher: TestPublisher;
  let client: jest.Mocked<ClientProxy>;
  let clsService: jest.Mocked<ClsService>;

  beforeEach(() => {
    client = { emit: jest.fn() } as unknown as jest.Mocked<ClientProxy>;
    clsService = { get: jest.fn().mockReturnValue('corr-pub-1') } as unknown as jest.Mocked<ClsService>;
    publisher = new TestPublisher(client, clsService);
  });

  it('should call client.emit with the pattern and data merged with correlationId', () => {
    publisher.testPublish('user.created', { userId: '1', email: 'a@b.com' });

    expect(client.emit).toHaveBeenCalledWith('user.created', {
      userId: '1',
      email: 'a@b.com',
      correlationId: 'corr-pub-1',
    });
  });

  it('should retrieve correlationId from ClsService with the CLS_CORRELATION_ID key', () => {
    publisher.testPublish('some.pattern', {});

    expect(clsService.get).toHaveBeenCalledWith(CLS_CORRELATION_ID);
  });

  it('should still emit when correlationId is undefined', () => {
    clsService.get.mockReturnValue(undefined);
    publisher.testPublish('event', { key: 'value' });

    expect(client.emit).toHaveBeenCalledWith('event', {
      key: 'value',
      correlationId: undefined,
    });
  });
});

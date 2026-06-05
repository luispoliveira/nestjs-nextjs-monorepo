import { CallHandler, ExecutionContext } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { of } from 'rxjs';
import { CLS_CORRELATION_ID } from '../constants';
import { CorrelationInterceptor } from './correlation.interceptor';

const makeCallHandler = (): CallHandler => ({
  handle: jest.fn().mockReturnValue(of(null)),
});

describe('CorrelationInterceptor', () => {
  let interceptor: CorrelationInterceptor;
  let clsService: jest.Mocked<ClsService>;

  beforeEach(() => {
    clsService = {
      set: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<ClsService>;

    interceptor = new CorrelationInterceptor(clsService);
  });

  it('should not set correlationId for HTTP context', () => {
    const context = {
      getType: jest.fn().mockReturnValue('http'),
      switchToRpc: jest.fn(),
    } as unknown as ExecutionContext;

    interceptor.intercept(context, makeCallHandler());

    expect(clsService.set).not.toHaveBeenCalled();
    expect(context.switchToRpc).not.toHaveBeenCalled();
  });

  it('should set correlationId in CLS for RPC context when present', () => {
    const correlationId = 'corr-abc-123';
    const context = {
      getType: jest.fn().mockReturnValue('rpc'),
      switchToRpc: jest.fn().mockReturnValue({
        getData: jest.fn().mockReturnValue({ correlationId }),
      }),
    } as unknown as ExecutionContext;

    interceptor.intercept(context, makeCallHandler());

    expect(clsService.set).toHaveBeenCalledWith(CLS_CORRELATION_ID, correlationId);
  });

  it('should NOT set correlationId when payload lacks it', () => {
    const context = {
      getType: jest.fn().mockReturnValue('rpc'),
      switchToRpc: jest.fn().mockReturnValue({
        getData: jest.fn().mockReturnValue({ someOtherField: 'value' }),
      }),
    } as unknown as ExecutionContext;

    interceptor.intercept(context, makeCallHandler());

    expect(clsService.set).not.toHaveBeenCalled();
  });

  it('should NOT set correlationId when correlationId is not a string', () => {
    const context = {
      getType: jest.fn().mockReturnValue('rpc'),
      switchToRpc: jest.fn().mockReturnValue({
        getData: jest.fn().mockReturnValue({ correlationId: 42 }),
      }),
    } as unknown as ExecutionContext;

    interceptor.intercept(context, makeCallHandler());

    expect(clsService.set).not.toHaveBeenCalled();
  });

  it('should call next.handle() regardless of context type', () => {
    const handler = makeCallHandler();
    const context = {
      getType: jest.fn().mockReturnValue('http'),
    } as unknown as ExecutionContext;

    interceptor.intercept(context, handler);

    expect(handler.handle).toHaveBeenCalled();
  });
});

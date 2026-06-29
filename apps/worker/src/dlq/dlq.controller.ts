import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from '@repo/shared';
import { EmailDlqService } from './email.dlq.service';

interface DlqListPayload {
  page?: number;
  limit?: number;
}

interface DlqReplayPayload {
  jobId: string;
}

@Controller()
export class DlqController {
  constructor(private readonly emailDlqService: EmailDlqService) {}

  @MessagePattern(MESSAGE_PATTERNS.DLQ_LIST)
  async list(payload: DlqListPayload) {
    return this.emailDlqService.list(payload.page, payload.limit);
  }

  @MessagePattern(MESSAGE_PATTERNS.DLQ_REPLAY)
  async replay(payload: DlqReplayPayload) {
    await this.emailDlqService.replay(payload.jobId);
    return { success: true };
  }

  @MessagePattern(MESSAGE_PATTERNS.DLQ_PURGE)
  async purge() {
    const removed = await this.emailDlqService.purge();
    return { removed };
  }
}

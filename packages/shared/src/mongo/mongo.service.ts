import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailLog } from './schema/email-log.schema';
import { Log } from './schema/log.schema';

@Injectable()
export class MongoService {
  constructor(
    @InjectModel(Log.name) private readonly logModel: Model<Log>,
    @InjectModel(EmailLog.name) private readonly emailLogModel: Model<EmailLog>,
  ) {}

  async createLog(logData: Partial<Log>): Promise<Log> {
    const createdLog = new this.logModel(logData);
    return createdLog.save();
  }

  async updateLog(id: string, updateData: Partial<Log>): Promise<Log | null> {
    return this.logModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async createEmailLog(emailLogData: Partial<EmailLog>): Promise<EmailLog> {
    const createdEmailLog = new this.emailLogModel(emailLogData);
    return createdEmailLog.save();
  }

  async updateEmailLog(
    id: string,
    updateData: Partial<EmailLog>,
  ): Promise<EmailLog | null> {
    return this.emailLogModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }
}

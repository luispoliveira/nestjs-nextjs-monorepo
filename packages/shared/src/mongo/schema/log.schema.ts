import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Log extends Document {
  @Prop({ type: 'ObjectId', auto: true })
  id!: string;

  @Prop({ required: true })
  method!: string;

  @Prop({ required: true })
  url!: string;

  @Prop({ type: Object })
  headers!: Record<string, unknown>;

  @Prop({ type: Object })
  requestBody!: Record<string, unknown>;

  @Prop({ type: Object })
  responseBody!: Record<string, unknown>;

  @Prop()
  statusCode!: number;

  @Prop()
  duration!: number;

  @Prop({ type: Object })
  user!: Record<string, unknown>;

  @Prop()
  ip!: string;

  @Prop({ required: false })
  correlationId?: string;
}

export const LogSchema = SchemaFactory.createForClass(Log);

LogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
LogSchema.index({ correlationId: 1 });

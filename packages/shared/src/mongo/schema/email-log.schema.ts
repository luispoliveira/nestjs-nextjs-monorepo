import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class EmailLog extends Document {
  @Prop({ type: 'ObjectId', auto: true })
  id!: string;

  @Prop({ required: true, type: Object })
  from!: { name?: string; email: string };
  @Prop({ required: true, type: [Object] })
  to!: { name?: string; email: string }[];
  @Prop()
  subject?: string;
  @Prop()
  text?: string;
  @Prop()
  templateId?: string;
  @Prop({ type: Object })
  params?: Record<string, unknown>;

  @Prop({ required: false })
  correlationId?: string;
}

export const EmailLogSchema = SchemaFactory.createForClass(EmailLog);
EmailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
EmailLogSchema.index({ correlationId: 1 });

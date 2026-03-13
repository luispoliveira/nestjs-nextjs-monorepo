import { Mail } from './mail.interface';

export interface MailProvider {
  send(mail: Mail): Promise<void>;
}

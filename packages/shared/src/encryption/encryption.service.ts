import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionUtil } from './encryption.util';

/**
 * Injectable wrapper around {@link EncryptionUtil} that loads the encryption
 * and HMAC keys from `ConfigService`. Provide it in the feature modules that
 * handle sensitive fields at rest (PII). Requires two base64-encoded env vars:
 * `FIELD_ENCRYPTION_KEY` (32 bytes) and `FIELD_ENCRYPTION_HMAC_KEY`.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly hmacKey: Buffer;

  constructor(config: ConfigService) {
    this.key = this.loadKey(config, 'FIELD_ENCRYPTION_KEY', 32);
    this.hmacKey = this.loadKey(config, 'FIELD_ENCRYPTION_HMAC_KEY');
  }

  encrypt(plaintext: string): string {
    return EncryptionUtil.encrypt(plaintext, this.key);
  }

  decrypt(ciphertext: string): string {
    return EncryptionUtil.decrypt(ciphertext, this.key);
  }

  blindIndex(plaintext: string): string {
    return EncryptionUtil.blindIndex(plaintext, this.hmacKey);
  }

  private loadKey(
    config: ConfigService,
    name: string,
    requiredBytes?: number,
  ): Buffer {
    const key = Buffer.from(config.getOrThrow<string>(name), 'base64');
    if (requiredBytes && key.length !== requiredBytes) {
      throw new Error(
        `${name} must be a base64-encoded ${requiredBytes}-byte key`,
      );
    }
    return key;
  }
}

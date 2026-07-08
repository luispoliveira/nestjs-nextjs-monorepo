import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Pure AES-256-GCM field encryption primitives. Keys are passed in so the
 * crypto stays unit-testable without DI; `EncryptionService` wires the keys
 * from `ConfigService`. Use for encrypting sensitive fields at rest (PII).
 */
export class EncryptionUtil {
  /** Returns `base64(iv || authTag || ciphertext)`. Non-deterministic (random IV). */
  static encrypt(plaintext: string, key: Buffer): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
  }

  /** Reverses {@link encrypt}. Throws if the payload was tampered with (GCM auth). */
  static decrypt(payload: string, key: Buffer): string {
    const data = Buffer.from(payload, 'base64');
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  /** Deterministic keyed hash (HMAC-SHA256) for blind-index equality/uniqueness. */
  static blindIndex(plaintext: string, key: Buffer): string {
    return createHmac('sha256', key).update(plaintext).digest('hex');
  }
}

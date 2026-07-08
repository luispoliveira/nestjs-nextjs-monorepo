import { randomBytes } from 'node:crypto';
import { EncryptionUtil } from './encryption.util';

describe('EncryptionUtil', () => {
  const key = randomBytes(32);
  const hmacKey = randomBytes(32);

  it('round-trips encrypt/decrypt', () => {
    const plaintext = 'PT50000201231234567890154';
    const encrypted = EncryptionUtil.encrypt(plaintext, key);
    expect(EncryptionUtil.decrypt(encrypted, key)).toBe(plaintext);
  });

  it('produces non-deterministic ciphertext for the same plaintext', () => {
    const a = EncryptionUtil.encrypt('same', key);
    const b = EncryptionUtil.encrypt('same', key);
    expect(a).not.toBe(b);
    expect(EncryptionUtil.decrypt(a, key)).toBe('same');
    expect(EncryptionUtil.decrypt(b, key)).toBe('same');
  });

  it('rejects tampered ciphertext', () => {
    const encrypted = EncryptionUtil.encrypt('secret', key);
    const tampered = Buffer.from(encrypted, 'base64');
    tampered[tampered.length - 1] ^= 0xff;
    expect(() =>
      EncryptionUtil.decrypt(tampered.toString('base64'), key),
    ).toThrow();
  });

  it('fails to decrypt with the wrong key', () => {
    const encrypted = EncryptionUtil.encrypt('secret', key);
    expect(() => EncryptionUtil.decrypt(encrypted, randomBytes(32))).toThrow();
  });

  it('produces a deterministic blind index', () => {
    expect(EncryptionUtil.blindIndex('value', hmacKey)).toBe(
      EncryptionUtil.blindIndex('value', hmacKey),
    );
  });

  it('produces different blind indexes for different values', () => {
    expect(EncryptionUtil.blindIndex('a', hmacKey)).not.toBe(
      EncryptionUtil.blindIndex('b', hmacKey),
    );
  });
});

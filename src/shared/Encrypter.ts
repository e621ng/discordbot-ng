// Based off this stackoverflow answer: https://stackoverflow.com/a/66476430
// No point reinventing the wheel

import crypto from 'crypto';

export class Encrypter {
  private static algorithm = 'aes-256-cbc';
  private static key: Buffer;

  static initialize(encryptionKey: string) {
    console.log(`Initializing encrypter with key: ${encryptionKey}`);
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }

  static encrypt(clearText: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = cipher.update(clearText, 'utf8', 'hex');

    return [
      encrypted + cipher.final('hex'),
      Buffer.from(iv).toString('hex'),
    ].join('|');
  }

  static decrypt(encryptedText: string): string {
    const [encrypted, iv] = encryptedText.split('|');

    if (!iv) throw new Error('IV not found');

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );

    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  }

  static hash(clearText: string): string {
    return crypto.createHash('sha256', this.key).update(clearText).digest('base64');
  }
}
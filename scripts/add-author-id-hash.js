import crypto from 'crypto';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function main() {
  Encrypter.initialize(process.env.DATABASE_SECRET);

  const db = await open({
    filename: './data/discord-main.db',
    driver: sqlite3.Database
  });

  const messages = await db.all('SELECT * FROM messages');

  db.exec('BEGIN TRANSACTION');
  for (const message of messages) {
    db.run('UPDATE messages SET author_id_hash = ? WHERE id = ?', Encrypter.hash(Encrypter.decrypt(message.author_id)), message.id);
  }
  db.exec('COMMIT');
}

class Encrypter {
  static initialize(encryptionKey) {
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }
  static encrypt(clearText) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = cipher.update(clearText, 'utf8', 'hex');
    return [
      encrypted + cipher.final('hex'),
      Buffer.from(iv).toString('hex'),
    ].join('|');
  }
  static decrypt(encryptedText) {
    const [encrypted, iv] = encryptedText.split('|');
    if (!iv)
      throw new Error('IV not found');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(iv, 'hex'));
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  }
  static hash(clearText) {
    return crypto.createHmac('sha256', this.key).update(clearText).digest('base64');
  }
}
Encrypter.algorithm = 'aes-256-cbc';

main();

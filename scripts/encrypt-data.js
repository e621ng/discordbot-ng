import crypto from 'crypto';
import dotenv from 'dotenv';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

dotenv.config();

async function main() {
  Encrypter.initialize(process.env.DATABASE_SECRET);

  const db = await open({
    filename: './data/discord-main.db',
    driver: sqlite3.Database
  });

  const discordNames = await db.all('SELECT * FROM discord_names');

  db.exec('BEGIN TRANSACTION');
  for (const name of discordNames) {
    db.run('UPDATE discord_names SET discord_id = ?, discord_username = ?, discord_id_hash = ?, discord_username_hash = ? WHERE id = ?', Encrypter.encrypt(name.user_id), Encrypter.encrypt(name.discord_username), Encrypter.hash(name.user_id), Encrypter.hash(name.discord_username), name.id);
  }
  db.exec('COMMIT');

  const ticketPhrases = await db.all('SELECT * FROM ticket_phrases');

  db.exec('BEGIN TRANSACTION');
  for (const phrase of ticketPhrases) {
    db.run('UPDATE ticket_phrases SET user_id = ?, user_id_hash = ? WHERE id = ?', Encrypter.encrypt(phrase.user_id), Encrypter.hash(phrase.user_id), phrase.id);
  }
  db.exec('COMMIT');

  const notes = await db.all('SELECT * FROM notes');

  db.exec('BEGIN TRANSACTION');
  for (const note of notes) {
    db.run('UPDATE notes SET user_id = ?, mod_id = ?, user_id_hash = ? WHERE id = ?', Encrypter.encrypt(note.user_id), Encrypter.encrypt(note.mod_id), Encrypter.hash(note.user_id), note.id);
  }
  db.exec('COMMIT');

  const noteEdits = await db.all('SELECT * FROM note_edits');

  db.exec('BEGIN TRANSACTION');
  for (const note of noteEdits) {
    db.run('UPDATE note_edits SET mod_id = ? WHERE id = ?', Encrypter.encrypt(note.mod_id), note.id);
  }
  db.exec('COMMIT');

  const bans = await db.all('SELECT * FROM bans');

  db.exec('BEGIN TRANSACTION');
  for (const ban of bans) {
    db.run('UPDATE bans SET user_id = ?, user_id_hash = ? WHERE id = ?', Encrypter.encrypt(ban.user_id), Encrypter.hash(ban.user_id), ban.id);
  }
  db.exec('COMMIT');

  const githubUserMappings = await db.all('SELECT * FROM github_user_mapping');

  db.exec('BEGIN TRANSACTION');
  for (const mapping of githubUserMappings) {
    db.run('UPDATE github_user_mapping SET discord_id = ?, discord_id_hash = ? WHERE id = ?', Encrypter.encrypt(mapping.discord_id), Encrypter.hash(mapping.discord_id), mapping.id);
  }
  db.exec('COMMIT');

  const privateHelpTickets = await db.all('SELECT * FROM private_help_tickets');

  db.exec('BEGIN TRANSACTION');
  for (const mapping of privateHelpTickets) {
    db.run('UPDATE private_help_tickets SET user_id = ?, user_id_hash = ? WHERE id = ?', Encrypter.encrypt(mapping.user_id), Encrypter.hash(mapping.user_id), mapping.id);
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
    const encrypted = cipher.update(clearText.toString(), 'utf8', 'hex');
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
    return crypto.createHash('sha256', this.key).update(clearText.toString()).digest('base64');
  }
}
Encrypter.algorithm = 'aes-256-cbc';

main();

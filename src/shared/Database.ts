import sqlite3 from 'sqlite3';
import { open, Database as SqliteDatabase } from 'sqlite';
import { config } from '../config';
import DiscordOAuth2 from 'discord-oauth2';
import { serializeMessage, wait } from '../utils';
import { GuildSettings, LoggedMessage, TicketMessage, TicketPhrase, Note } from '../types';
import { Message } from '../events';

const DB_SCHEMA = `
    CREATE TABLE IF NOT EXISTS discord_names (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        discord_id TEXT NOT NULL,
        discord_username TEXT NOT NULL,
        added_on datetime NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
        guild_id TEXT PRIMARY KEY,
        general_chat_id TEXT,
        new_member_channel_id TEXT,
        tickets_channel_id TEXT,
        event_logs_channel_id TEXT,
        audit_logs_channel_id TEXT,
        voice_logs_channel_id TEXT,
        admin_role_id TEXT,
        private_help_role_id TEXT,
        staff_categories TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY ON CONFLICT REPLACE,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      attachments TEXT NOT NULL,
      stickers TEXT NOT NULL,
      content TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS index_authors ON messages (author_id);

    CREATE INDEX IF NOT EXISTS index_channels ON messages (channel_id);

    CREATE TABLE IF NOT EXISTS tickets (
			id INTEGER PRIMARY KEY,
			message_id TEXT NOT NULL
		);

    CREATE TABLE IF NOT EXISTS ticket_phrases (
			id INTEGER PRIMARY KEY,
			user_id TEXT NOT NULL,
      phrase TEXT NOT NULL
		);

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      user_id TEXT,
      reason TEXT,
      mod_id TEXT,
      timestamp datetime NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
`;

export class Database {
  private static db: SqliteDatabase;

  static async open(file: string): Promise<void> {
    if (Database.db) return;

    Database.db = await open({
      filename: file,
      driver: sqlite3.Database
    });

    console.log('SQLite database opened');

    await Database.ensure();
  }

  private static async ensure() {
    await Database.db.exec(DB_SCHEMA);
    console.log('SQLite database ensured');
  }

  // -- START WHOIS --

  static async getE621Ids(discordId: string): Promise<number[]> {
    const ids = await Database.db.all<{ user_id: number }[]>('SELECT DISTINCT user_id FROM discord_names WHERE discord_id = ?', discordId);

    return ids.map(r => r.user_id);
  }

  static async getDiscordIds(e621Id: string | number): Promise<string[]> {
    const ids = await Database.db.all<{ discord_id: string }[]>('SELECT DISTINCT discord_id FROM discord_names WHERE user_id = ?', e621Id);

    return ids.map(r => r.discord_id);
  }

  static async getCombinedIds(id: string): Promise<{ userId: string, discordId: string }[]> {
    const ids = await Database.db.all<{ discord_id: string, user_id: number }[]>(`
        WITH RECURSIVE rec AS (
            SELECT DISTINCT d1.user_id, d1.discord_id, 1 AS depth FROM discord_names d1 WHERE d1.user_id = ? or d1.discord_id = ?
            UNION
            SELECT d3.user_id, d3.discord_id, depth + 1 AS depth FROM rec
                LEFT OUTER JOIN discord_names d2 ON rec.discord_id = d2.discord_id
                LEFT OUTER JOIN discord_names d3 ON d2.user_id = d3.user_id
            WHERE depth <= 5 AND rec.depth = depth
        ) SELECT DISTINCT user_id, discord_id FROM rec`, id, id);

    return ids.map(r => ({ userId: r.user_id.toString(), discordId: r.discord_id }));
  }

  static async putUser(id: number, user: DiscordOAuth2.User) {
    await Database.db.run('INSERT INTO discord_names(user_id, discord_id, discord_username) VALUES (?, ?, ?)', id, user.id, user.username);
  }

  // -- END WHOIS --

  // -- START SETTINGS --

  static async getGuildSettings(guildId: string): Promise<GuildSettings | undefined> {
    return await Database.db.get<GuildSettings>('SELECT * FROM settings WHERE guild_id = ?', guildId);
  }

  static async putGuild(guildId: string) {
    await Database.db.run('INSERT INTO settings(guild_id) VALUES (?)', guildId);
  }

  static async setGuildGeneralChatId(guildId: string, id: string) {
    await Database.db.run('UPDATE settings SET general_chat_id = ? WHERE guild_id = ?', id, guildId);
  }

  static async setGuildTicketsLogsChannelId(guildId: string, id: string) {
    await Database.db.run('UPDATE settings SET tickets_channel_id = ? WHERE guild_id = ?', id, guildId);
  }

  static async setGuildEventsLogsChannelId(guildId: string, id: string) {
    await Database.db.run('UPDATE settings SET event_logs_channel_id = ? WHERE guild_id = ?', id, guildId);
  }

  static async setGuildAuditLogsChannelId(guildId: string, id: string) {
    await Database.db.run('UPDATE settings SET audit_logs_channel_id = ? WHERE guild_id = ?', id, guildId);
  }

  static async setGuildVoiceLogsChannelId(guildId: string, id: string) {
    await Database.db.run('UPDATE settings SET voice_logs_channel_id = ? WHERE guild_id = ?', id, guildId);
  }

  static async setGuildAdminRole(guildId: string, id: string) {
    await Database.db.run('UPDATE settings SET admin_role_id = ? WHERE guild_id = ?', id, guildId);
  }

  static async setGuildPrivateHelperRole(guildId: string, id: string) {
    await Database.db.run('UPDATE settings SET private_help_role_id = ? WHERE guild_id = ?', id, guildId);
  }

  static async getGuildStaffCategories(guildId: string): Promise<string[]> {
    const settings = await Database.db.get<{ staff_categories: string }>('SELECT staff_categories FROM settings WHERE guild_id = ?', guildId);

    if (!settings || !settings.staff_categories) return [];

    return settings.staff_categories.split(',');
  }

  static async putGuildStaffCategory(guildId: string, categoryId: string) {
    const categories = await Database.getGuildStaffCategories(guildId);

    categories.push(categoryId);

    const newString = categories.join(',');

    await Database.db.run('UPDATE settings SET staff_categories = ? WHERE guild_id = ?', newString, guildId);
  }

  static async removeGuildStaffCategory(guildId: string, categoryId: string): Promise<boolean> {
    const categories = await Database.getGuildStaffCategories(guildId);

    const index = categories.indexOf(categoryId);
    if (index == -1) return false;

    categories.splice(index, 1);

    const newString = categories.join(',');

    await Database.db.run('UPDATE settings SET staff_categories = ? WHERE guild_id = ?', newString, guildId);

    return true;
  }

  // -- END SETTINGS --

  // START MESSAGE LOGS --

  static async putMessage(message: Message): Promise<boolean> {
    try {
      const serializedMessage = serializeMessage(message);

      await Database.db.run(`
        INSERT INTO messages (id, author_id, author_name, channel_id, attachments, stickers, content) VALUES
        (:id, :author_id, :author_name, :channel_id, :attachments, :stickers, :content)
      `, ...serializedMessage);

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  static async getMessage(id: string): Promise<LoggedMessage | undefined> {
    return await Database.db.get<LoggedMessage>('SELECT * FROM messages WHERE id = ?', id);
  }

  static async getMessageWithRetry(id: string, retries = 5, delay = 500): Promise<LoggedMessage | undefined> {
    let tried = 0;
    while (tried < retries) {
      tried++;
      const message = await Database.db.get<LoggedMessage>('SELECT * FROM messages WHERE id = ?', id);

      if (message) return message;

      await wait(delay);
    }
  }

  // -- END MESSAGE LOGS --

  // -- START TICKETS --

  static async putTicket(ticketId: number, messageId: string) {
    await Database.db.run('INSERT INTO tickets(id, message_id) VALUES (?, ?)', ticketId, messageId);
  }

  static async getTicketMessageId(ticketId: number): Promise<string | undefined> {
    const ticket = await Database.db.get<Pick<TicketMessage, 'message_id'>>('SELECT message_id FROM tickets WHERE id = ?', ticketId);
    return ticket?.message_id;
  }

  static async putTicketPhrase(userId: string, phrase: string) {
    await Database.db.run('INSERT INTO ticket_phrases(user_id, phrase) VALUES (?, ?)', userId, phrase);
  }

  static async removeTicketPhrase(id: number) {
    await Database.db.run('DELETE from ticket_phrases WHERE id = ?', id);
  }

  static async removeAllTicketPhrasesFor(id: string): Promise<number> {
    return (await Database.db.run('DELETE from ticket_phrases WHERE user_id = ?', id)).changes!;
  }

  static async getTicketPhrasesFor(userId: string): Promise<TicketPhrase[]> {
    return await Database.db.all<TicketPhrase[]>('SELECT * from ticket_phrases WHERE user_id = ?', userId);
  }

  static async getAllTicketPhrases(cb: (ticketPhrase: TicketPhrase) => void) {
    await Database.db.each<TicketPhrase>('SELECT * from ticket_phrases', (err: any, ticketPhrase: TicketPhrase) => {
      if (err) return console.error(err);

      cb(ticketPhrase);
    });
  }

  // -- END TICKETS --

  // -- START NOTES --

  static async putNote(userId: string, reason: string, modId: string) {
    await Database.db.run('INSERT INTO notes(user_id, reason, mod_id) VALUES (?, ?, ?)', userId, reason, modId);
  }

  static async removeNote(id: number): Promise<boolean> {
    const res = await Database.db.run('DELETE from notes WHERE id = ?', id);

    return (res.changes ?? 0) > 0;
  }

  static async getNotes(userId: string): Promise<Note[]> {
    return await Database.db.all<Note[]>('SELECT * from notes WHERE user_id = ?', userId);
  }

  // -- END NOTES --
}
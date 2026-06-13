import path from 'path';
import { open, Database as SqliteDatabase } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Message } from '../events';
import { AppealMessage, Ban, GithubUserMapping, GuildArraySetting, GuildSetting, GuildSettings, KnowledgebaseItem, LoggedMessage, Note, PrivateHelpTicket, RoleButton, TicketMessage, TicketPhrase } from '../types';
import { serializeMessage, wait } from '../utils';
import { readFileSync } from 'fs';

export const enum PrivateHelpTicketStatus {
  OPEN = 0,
  CLOSED = 1
}

export class Database {
  private static db: SqliteDatabase;

  static async open(file: string): Promise<void> {
    if (Database.db) return;

    console.log('Opening SQLite database');

    Database.db = await open({
      filename: file,
      driver: sqlite3.Database
    });

    console.log('SQLite database opened');

    await Database.ensure();

    await Database.migrate();
  }

  private static async ensure() {
    const schema = readFileSync(path.join(__dirname, '..', '..', 'sql', 'structure.sql'), { encoding: 'utf-8' });
    await Database.db.exec(schema);
    console.log('SQLite database ensured');
  }

  private static async migrate() {
    console.log('Starting database migrations');

    await Database.db.migrate({
      migrationsPath: path.join(__dirname, '..', '..', 'sql', 'migrations')
    });

    console.log('Database migrations ran');
  }

  //#region WHOIS

  static async getE621Ids(discordId: string): Promise<number[]> {
    const ids = await Database.db.all<{ user_id: number }[]>('SELECT DISTINCT user_id FROM discord_names WHERE discord_id = ?', discordId);

    return ids.map(r => r.user_id);
  }

  static async getDiscordIds(e621Id: string | number): Promise<string[]> {
    // Perhaps this would be better and then we can return all the data: SELECT * FROM (SELECT * FROM discord_names WHERE user_id = ?  ORDER BY id DESC) GROUP BY discord_id;
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

  static async putUser(id: number, user: { id: string, username: string }) {
    await Database.db.run('INSERT INTO discord_names(user_id, discord_id, discord_username) VALUES (?, ?, ?)', id, user.id, user.username);
  }

  static async removeUser(id: number, discordId: string) {
    await Database.db.run('DELETE from discord_names WHERE user_id = ? AND discord_id = ?', id, discordId);
  }

  //#endregion

  //#region Guild Settings

  static async getGuildSettings(guildId: string): Promise<GuildSettings> {
    return await Database.db.get<GuildSettings>('SELECT * FROM settings WHERE guild_id = ?', guildId) as GuildSettings;
  }

  static async putGuild(guildId: string) {
    await Database.db.run('INSERT INTO settings(guild_id) VALUES (?)', guildId);
  }

  static async updateGuildSettings(guildId: string, key: GuildSetting, value: string) {
    await Database.db.run(`UPDATE settings SET ${key} = ? WHERE guild_id = ?`, value, guildId);
  }

  // Since "setting" has guaranteed values and is never set by the user, this shouldn't cause any security issues.
  // But it does allow me to skip rewriting this a bunch.
  static async getGuildArraySetting(setting: GuildArraySetting, guildId: string): Promise<string[]> {
    const settings = await Database.db.get<{ [setting]: string }>(`SELECT ${setting} FROM settings WHERE guild_id = ?`, guildId);

    if (!settings || !settings[setting]) return [];

    return settings[setting].split(',');
  }

  static async putGuildArraySetting(setting: GuildArraySetting, guildId: string, value: string) {
    const values = await Database.getGuildArraySetting(setting, guildId);

    if (values.indexOf(value) == -1) values.push(value);

    const newString = values.join(',');

    await Database.db.run(`UPDATE settings SET ${setting} = ? WHERE guild_id = ?`, newString, guildId);
  }

  static async removeGuildArraySetting(setting: GuildArraySetting, guildId: string, value: string): Promise<boolean> {
    const values = await Database.getGuildArraySetting(setting, guildId);

    const index = values.indexOf(value);
    if (index == -1) return false;

    values.splice(index, 1);

    const newString = values.join(',');

    await Database.db.run(`UPDATE settings SET ${setting} = ? WHERE guild_id = ?`, newString, guildId);

    return true;
  }

  //#endregion

  //#region Message Logs

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

  //#endregion

  //#region Tickets

  static async putTicket(ticketId: number, messageId: string) {
    await Database.db.run('INSERT INTO tickets(id, message_id) VALUES (?, ?)', ticketId, messageId);
  }

  static async updateTicketMessageId(ticketId: number, messageId: string) {
    await Database.db.run('UPDATE tickets SET message_id = ? WHERE id = ?', messageId, ticketId);
  }

  static async putTicketOrUpdate(ticketId: number, messageId: string) {
    if (await Database.getTicketMessageId(ticketId)) {
      await Database.updateTicketMessageId(ticketId, messageId);
    } else {
      await Database.putTicket(ticketId, messageId);
    }
  }

  static async removeTicket(ticketId: number) {
    await Database.db.run('DELETE from tickets WHERE id = ?', ticketId);
  }

  static async getTicketMessageId(ticketId: number): Promise<string | undefined> {
    const ticket = await Database.db.get<Pick<TicketMessage, 'message_id'>>('SELECT message_id FROM tickets WHERE id = ?', ticketId);
    return ticket?.message_id;
  }

  static async putTicketPhrase(userId: string, phrase: string) {
    await Database.db.run('INSERT INTO ticket_phrases(user_id, phrase) VALUES (?, ?)', userId, phrase);
  }

  static async getTicketPhrase(id: number): Promise<TicketPhrase | undefined> {
    return await Database.db.get<TicketPhrase>('SELECT * FROM ticket_phrases WHERE id = ?', id);
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

  //#endregion

  //#region Appeals

  static async putAppeal(appealId: number, messageId: string) {
    await Database.db.run('INSERT INTO appeals(id, message_id) VALUES (?, ?)', appealId, messageId);
  }

  static async updateAppealMessageId(appealId: number, messageId: string) {
    await Database.db.run('UPDATE appeals SET message_id = ? WHERE id = ?', messageId, appealId);
  }

  static async putAppealOrUpdate(ticketId: number, messageId: string) {
    if (await Database.getAppealMessageId(ticketId)) {
      await Database.updateAppealMessageId(ticketId, messageId);
    } else {
      await Database.putAppeal(ticketId, messageId);
    }
  }

  static async removeAppeal(appealId: number) {
    await Database.db.run('DELETE from appeals WHERE id = ?', appealId);
  }

  static async getAppealMessageId(appealId: number): Promise<string | undefined> {
    const appeal = await Database.db.get<Pick<AppealMessage, 'message_id'>>('SELECT message_id FROM appeals WHERE id = ?', appealId);
    return appeal?.message_id;
  }

  //#endregion

  //#region Notes

  static async putNote(userId: string, reason: string, modId: string) {
    await Database.db.run('INSERT INTO notes(user_id, reason, mod_id) VALUES (?, ?, ?)', userId, reason, modId);
  }

  static async editNote(id: number, oldReason: string, newReason: string, modId: string) {
    await Database.db.run('UPDATE notes SET reason = ?, mod_id = ? WHERE id = ?', newReason, modId, id);
    await Database.db.run('INSERT INTO note_edits(note_id, mod_id, previous_reason) VALUES (?, ?, ?)', id, modId, oldReason);
  }

  static async removeNote(id: number): Promise<boolean> {
    const res = await Database.db.run('DELETE from notes WHERE id = ?', id);

    return (res.changes ?? 0) > 0;
  }

  static async getNotes(userId: string): Promise<Note[]> {
    return await Database.db.all<Note[]>('SELECT * from notes WHERE user_id = ?', userId);
  }

  //#endregion

  //#region Bans

  static async putBan(userId: string, expiresAt: Date | null, fullBan = false) {
    await Database.db.run('INSERT INTO bans(user_id, expires, expires_at, full_ban) VALUES (?, ?, ?, ?)', userId, expiresAt != null ? 1 : 0, expiresAt, fullBan);
  }

  static async getBan(userId: string): Promise<Ban | undefined> {
    return await Database.db.get('SELECT * from bans WHERE user_id = ? ORDER BY id DESC', userId);
  }

  static async getExpiredBans(date: Date): Promise<Ban[]> {
    return await Database.db.all<Ban[]>('SELECT * from bans WHERE expires = 1 AND expires_at <= ?', date);
  }

  static async pruneExpiredBans(date: Date) {
    await Database.db.all<Ban[]>('DELETE from bans WHERE expires = 1 AND expires_at <= ?', date);
  }

  static async removeBan(userId: string) {
    await Database.db.run('DELETE from bans WHERE user_id = ?', userId);
  }

  //#endregion

  //# GitHub User Mapping

  // github_user_mapping
  static async putGithubUserMapping(discordId: string, githubUsername: string) {
    await Database.db.run('INSERT INTO github_user_mapping(discord_id, github_username) VALUES (?, ?)', discordId, githubUsername);
  }

  static async getDiscordIdFromGithub(githubUsername: string): Promise<string | null> {
    const mapping = await Database.db.get<Pick<GithubUserMapping, 'discord_id'>>('SELECT discord_id FROM github_user_mapping WHERE github_username = ?', githubUsername);

    return mapping?.discord_id ?? null;
  }

  static async getGithubFromDiscordId(discordId: string): Promise<string | null> {
    const mapping = await Database.db.get<Pick<GithubUserMapping, 'github_username'>>('SELECT github_username FROM github_user_mapping WHERE discord_id = ?', discordId);

    return mapping?.github_username ?? null;
  }

  static async getAllGithubUserMappings(): Promise<GithubUserMapping[]> {
    return await Database.db.all<GithubUserMapping[]>('SELECT * from github_user_mapping');
  }

  static async removeGithubUserMapping(discordId: string) {
    await Database.db.run('DELETE from github_user_mapping WHERE discord_id = ?', discordId);
  }

  //#endregion

  //# Knowledgebase

  static async addToKnowledgebase(guildId: string, name: string, content: string) {
    if (content.length > 2000) return;

    await Database.db.run('INSERT INTO knowledgebase(guild_id, name, content) VALUES (?, ?, ?)', guildId, name, content);
  }

  static async removeFromKnowledgebase(id: number) {
    await Database.db.run('DELETE from knowledgebase WHERE id = ?', id);
  }

  static async editKnowledgebaseItem(id: number, content: string) {
    if (content.length > 2000) return;

    await Database.db.run('UPDATE knowledgebase SET content = ? WHERE id = ?', content, id);
  }

  static async getFromKnowledgebaseByName(guildId: string, name: string): Promise<KnowledgebaseItem | undefined> {
    return await Database.db.get<KnowledgebaseItem>('SELECT * from knowledgebase WHERE guild_id = ? AND name = ?', guildId, name);
  }

  static async getFromKnowledgebase(id: number): Promise<KnowledgebaseItem | undefined> {
    return await Database.db.get<KnowledgebaseItem>('SELECT * from knowledgebase WHERE id = ?', id);
  }

  static async getAllKnowledgebaseItems(guildId: string): Promise<KnowledgebaseItem[]> {
    return await Database.db.all<KnowledgebaseItem[]>('SELECT * from knowledgebase WHERE guild_id = ?', guildId);
  }

  //#endregion

  //#region Private Help Tickets

  static async createPrivateHelpTicket(userId: string, threadId: string) {
    await Database.db.run('INSERT INTO private_help_tickets(user_id, thread_id, status) VALUES (?, ?, ?)', userId, threadId, PrivateHelpTicketStatus.OPEN);
  }

  static async closePrivateHelpTicket(threadId: string) {
    await Database.db.run('UPDATE private_help_tickets SET status = ? WHERE thread_id = ?', PrivateHelpTicketStatus.CLOSED, threadId);
  }

  static async getLatestPrivateHelpTicketBy(userId: string): Promise<PrivateHelpTicket | undefined> {
    return await Database.db.get<PrivateHelpTicket>('SELECT * from private_help_tickets WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1', userId);
  }

  static async getAllOpenPrivateHelpTickets(): Promise<PrivateHelpTicket[]> {
    return await Database.db.all<PrivateHelpTicket[]>('SELECT * from private_help_tickets WHERE status = ?', PrivateHelpTicketStatus.OPEN);
  }

  //#endregion

  //#region Role Buttons

  static async putRoleButton(messageId: string, roleId: string) {
    await Database.db.run('INSERT INTO role_buttons(message_id, role_id) VALUES (?, ?)', messageId, roleId);
  }

  static async getRoleFromButton(messageId: string): Promise<string | null> {
    const data = await Database.db.get<Pick<RoleButton, 'role_id'>>('SELECT role_id from role_buttons WHERE message_id = ?', messageId);

    return data?.role_id ?? null;
  }


  //#endregion
}

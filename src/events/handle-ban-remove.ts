import { GuildBan } from 'discord.js';
import { Database } from '../shared/Database';

export async function handleBanRemove(ban: GuildBan) {
  await Database.removeBan(ban.user.id);
}
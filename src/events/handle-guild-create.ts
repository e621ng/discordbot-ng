import { Guild } from 'discord.js';
import { Database } from '../shared/Database';

export async function handleGuildCreate(guild: Guild) {
  await Database.getOrCreateSettings(guild.id);
}

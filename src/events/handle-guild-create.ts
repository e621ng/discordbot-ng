import { Guild } from 'discord.js';
import { Database } from '../shared/Database';

export async function handleGuildCreate(guild: Guild) {
  await Database.getOrCreateSettings(guild.id); // TODO: Proper error catching. Consider instrumentation.
}
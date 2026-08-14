import { Guild } from 'discord.js';
import { Database } from '../shared/Database';

export async function handleGuildCreate(guild: Guild) {
  await Database.GetOrCreateSettings(guild.id); // TODO: Proper error catching. Consider instrumentation.
}
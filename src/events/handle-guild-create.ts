import { Guild } from 'discord.js';
import { Database } from '../shared/Database';

export async function handleGuildCreate(guild: Guild) {
  try {
    if (!await Database.getGuildSettings(guild.id)) await Database.putGuild(guild.id);
  } catch (e) {
    console.error(e);
  }
}
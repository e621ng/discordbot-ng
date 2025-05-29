import { Database } from '../shared/Database';

export async function handleGuildCreate(guild) {
  try {
    if (!await Database.getGuildSettings(guild.id)) await Database.putGuild(guild.id);
  } catch (e) {
    console.error(e);
  }
}
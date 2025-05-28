import { Database } from '../shared/Database';

export async function handleGuildCreate(guild) {
  try {
    if (!await Database.getGuildSettings(guild.id)) await Database.addGuild(guild.id);
  } catch (e) {
    console.error(e);
  }
}
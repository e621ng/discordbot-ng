import { Client } from 'discord.js';
import { Database } from '../shared/Database';
import { config } from '../config';

export async function checkExpiredBans(client: Client) {
  const guild = await client.guilds.fetch(config.DISCORD_GUILD_ID!);

  if (!guild) return;

  const date = new Date();

  for (const ban of await Database.getExpiredBans(date)) {
    try {
      await guild.bans.remove(ban.user_id);
    } catch (e) {
      console.error(`Error unbanning user: ${ban.user_id}`);
      console.error(e);
    }
  }

  await Database.pruneExpiredBans(date);
}
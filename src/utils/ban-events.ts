import { Client } from 'discord.js';
import { BanUpdate } from '../types';
import { Database } from '../shared/Database';
import { config } from '../config';

export async function banUpdateHandler(client: Client, update: string) {
  const data: BanUpdate = JSON.parse(update);

  if (data.action == 'create') {
    kickDiscordAccounts(client, data);
  }
  // else if (data.action == 'delete') {
  //   // unbanDiscordAccounts(data);
  // }
}

async function kickDiscordAccounts(client: Client, data: BanUpdate) {
  const guild = await client.guilds.fetch(config.DISCORD_GUILD_ID!);

  const discordIds = await Database.getDiscordIds(data.ban.user_id);

  for (const id of discordIds) {
    const member = await guild.members.fetch(id);

    if (member) await member.kick(`Banned from e621 by: https://e621.net/users/${data.ban.banner_id}. Reason:\n${data.ban.reason}`);
  }
}

// async function banDiscordAccounts(data: BanUpdate) {
//   const guild = await discordClient.guilds.fetch(config.DISCORD_GUILD_ID!);

//   const discordIds = await Database.getDiscordIds(data.ban.user_id);

//   for (const id of discordIds) {
//     await guild.bans.create(id, {
//       reason: data.ban.reason
//     });
//   }
// }

// async function unbanDiscordAccounts(data: BanUpdate) {
//   const guild = await discordClient.guilds.fetch(config.DISCORD_GUILD_ID!);

//   const discordIds = await Database.getDiscordIds(data.ban.user_id);

//   for (const id of discordIds) {
//     await guild.bans.remove(id);
//   }
// }
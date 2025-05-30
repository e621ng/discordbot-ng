import { Guild, GuildMember, GuildTextBasedChannel } from 'discord.js';
import { Database } from '../shared/Database';
import { config } from '../config';
import { userIsBanned } from '../utils';

export async function handleMemberJoin(member: GuildMember) {
  const guildSettings = await Database.getGuildSettings(member.guild.id);

  if (guildSettings?.new_member_channel_id) {
    const channel = await member.guild.channels.fetch(guildSettings.new_member_channel_id) as GuildTextBasedChannel;

    if (channel) {
      const content = `${member.toString()}'s e621 and discord account(s):\n${await getE621Alts(member.id, member.guild)}`;

      channel.send(content).catch(console.error);
    }
  }
}

async function getE621Alts(discordId: string, guild: Guild, depth = 1, ignore: number[] = []): Promise<string> {
  const e621UserIds = await Database.getE621Ids(discordId);

  const toIgnore = ignore.concat(e621UserIds);

  let content = '';

  for (const e621Id of e621UserIds) {
    if (ignore.includes(e621Id)) continue;

    const alts = await getDiscordAlts(e621Id, guild, depth + 1, toIgnore);

    const banned = await userIsBanned(e621Id);

    content += `${'- '.repeat(depth)}${config.E621_BASE_URL}/users/${e621Id}${banned ? ' [BANNED]' : ''}\n${alts}`;
  }

  return content;
}

async function getDiscordAlts(e621Id: number, guild: Guild, depth = 1, ignore: number[] = []): Promise<string> {
  const discordIds = await Database.getDiscordIds(e621Id);

  let content = '';

  for (const discordId of discordIds) {
    const alts = await getE621Alts(discordId, guild, depth + 1, ignore);

    let banned = false;

    // It's either this or fetch all the bans and sift through them for every discord alt.
    try {
      banned = !!(await guild.bans.fetch(discordId));
    } catch (e) { }

    if (alts || banned) content += `${'- '.repeat(depth)}<@${discordId}>${banned ? ' [BANNED]' : ''}\n${alts}`;
  }

  return content;
}
import { Guild, GuildMember, GuildTextBasedChannel } from 'discord.js';
import { Database } from '../shared/Database';
import { config } from '../config';
import { getE621Alts, userIsBanned } from '../utils';

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
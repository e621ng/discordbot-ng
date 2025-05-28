import { GuildMember, GuildTextBasedChannel } from 'discord.js';
import { Database } from '../shared/Database';
import { config } from '../config';

export async function handleMemberJoin(member: GuildMember) {
  const guildSettings = await Database.getGuildSettings(member.guild.id);

  if (guildSettings?.new_member_channel_id) {
    const e621UserIds = await Database.getE621Ids(member.id);
    const channel = await member.guild.channels.fetch(guildSettings.new_member_channel_id) as GuildTextBasedChannel;

    if (channel) {
      let content = `${member.toString()}'s e621 and discord account(s):\n`;

      for (const e621Id of e621UserIds) {
        content += `- ${config.E621_BASE_URL}/users/${e621Id}\n`;

        const discordIds = await Database.getDiscordIds(e621Id);

        for (const discordId of discordIds) {
          content += `- - <@${discordId}>\n`;
        }
      }

      channel.send(content).catch(console.error);
    }
  }
}
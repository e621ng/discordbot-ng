import { Channel, GuildBasedChannel, GuildChannel, GuildTextBasedChannel, TextBasedChannel, VoiceBasedChannel } from 'discord.js';
import { Database } from '../shared/Database';

export async function channelIsInStaffCategory(channel: GuildBasedChannel) {
  if (!channel.guildId || !channel.parentId) return false;

  const staffCategories = await Database.getGuildStaffCategories(channel.guildId);

  const parentChannel = await channel.guild.channels.fetch(channel.parentId);

  return parentChannel?.parentId ? staffCategories.includes(parentChannel.parentId) : staffCategories.includes(channel.parentId);
}
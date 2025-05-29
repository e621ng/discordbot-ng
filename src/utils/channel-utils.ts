import { Channel, GuildBasedChannel, GuildChannel, GuildTextBasedChannel, TextBasedChannel, VoiceBasedChannel } from 'discord.js';
import { Database } from '../shared/Database';

export async function channelIsInStaffCategory(channel: GuildBasedChannel) {
  const staffCategories = await Database.getGuildStaffCategories(channel.guildId);

  return staffCategories.includes(channel.parentId!);
}
import { Channel, GuildBasedChannel, GuildChannel, GuildTextBasedChannel, TextBasedChannel, VoiceBasedChannel } from 'discord.js';
import { Database } from '../shared/Database';

export async function channelIsInStaffCategory(channel: GuildBasedChannel) {
  if (!channel.guildId || !channel.parentId) return false;

  const staffCategories = await Database.getGuildArraySetting('staff_categories', channel.guildId);

  const parentChannel = await channel.guild.channels.fetch(channel.parentId);

  return parentChannel?.parentId ? staffCategories.includes(parentChannel.parentId) : staffCategories.includes(channel.parentId);
}

export async function channelIsSafe(channel: GuildBasedChannel) {
  if (!channel.guildId) return false;

  const safeChannels = await Database.getGuildArraySetting('safe_channels', channel.guildId);

  return safeChannels.includes(channel.id);
}

export async function channelIgnoresLinks(channel: GuildBasedChannel) {
  if (!channel.guildId) return false;

  const linkSkipChannels = await Database.getGuildArraySetting('link_skip_channels', channel.guildId);

  return linkSkipChannels.includes(channel.id);
}
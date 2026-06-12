import { APIEmbedField, EmbedBuilder, Guild, GuildBasedChannel, GuildTextBasedChannel } from 'discord.js';
import { Database } from '../shared/Database';
import { channelIsInStaffCategory } from './channel-utils';

type CustomEventLogData = {
  title: string
  description: string | null
  color: number | null
  timestamp: Date | number | null
  fields: APIEmbedField[] | null
}

export async function logCustomEvent(guild: Guild, data: CustomEventLogData) {
  const channel = await getEventLogChannel(guild);

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(data.title)
    .setColor(data.color)
    .setTimestamp(data.timestamp);

  if (data.fields) embed.addFields(...data.fields);

  channel.send({ embeds: [embed] });
}

async function getEventLogChannel(guild: Guild, channel: GuildBasedChannel | null = null): Promise<GuildTextBasedChannel | null> {
  const settings = await Database.getGuildSettings(guild.id);

  if (!settings) return null;

  if (channel && await channelIsInStaffCategory(channel)) {
    if (!settings.event_logs_channel_id) return null;

    const channel = await guild.channels.fetch(settings.event_logs_channel_id);

    if (!channel || !channel.isSendable()) return null;

    return channel;
  } else {
    if (!settings.discord_logs_channel_id) return null;

    const channel = await guild.channels.fetch(settings.discord_logs_channel_id);

    if (!channel || !channel.isSendable()) return null;

    return channel;
  }
}
import { Client, Guild, GuildTextBasedChannel, VoiceState } from 'discord.js';
import { Database } from '../../shared/Database';
import { Event } from '../../types';
import { CreateDefaultEmbed, SetSeverity } from '../../utils';

async function getVoiceLogsChannel(guild: Guild): Promise<GuildTextBasedChannel | undefined> {
  const settings = await Database.getOrCreateSettings(guild.id);
  if (!settings || !settings.voice_logs_channel_id) return;

  const channel = await guild.channels.fetch(settings.voice_logs_channel_id);
  if (!channel || !channel.isSendable()) return;

  return channel as GuildTextBasedChannel;
}

async function memberJoinedChannel(_: VoiceState, state: VoiceState) {
  const channel = await getVoiceLogsChannel(state.guild);
  if (!channel) return;

  await channel.send({
    embeds: [{
      ...CreateDefaultEmbed(state.client),
      ...SetSeverity('success'),

      title: 'Joined Voice Channel',
      fields: [
        { name: 'Member', value: `<@${state.member?.id}>`, inline: false },
        { name: 'Channel', value: `${state.channel?.name} (${state.channelId})`, inline: true },
        { name: 'Mention', value: `<#${state.channelId}>`, inline: true },
      ]
    }]
  });
}

async function memberLeftChannel(state: VoiceState, _: VoiceState) {
  const channel = await getVoiceLogsChannel(state.guild);
  if (!channel) return;

  await channel.send({
    embeds: [{
      ...CreateDefaultEmbed(state.client),
      ...SetSeverity('error'),

      title: 'Left Voice Channel',
      fields: [
        { name: 'Member', value: `<@${state.member?.id}>`, inline: false },
        { name: 'Channel', value: `${state.channel?.name} (${state.channelId})`, inline: true },
        { name: 'Mention', value: `<#${state.channelId}>`, inline: true },
      ]
    }]
  });
}

async function memberMovedChannel(oldState: VoiceState, newState: VoiceState) {
  const channel = await getVoiceLogsChannel(newState.guild);
  if (!channel) return;

  await channel.send({
    embeds: [{
      ...CreateDefaultEmbed(newState.client),
      ...SetSeverity('warning'),

      title: 'Moved Voice Channel',
      fields: [
        { name: 'Member', value: `<@${newState.member?.id}>`, inline: false },
        { name: 'Channel', value: `<#${oldState.channelId}> -> <#${newState.channelId}>`, inline: false },
      ]
    }]
  });
}

class VoiceStateUpdateEvent implements Event<Client, 'voiceStateUpdate'> {
  event = 'voiceStateUpdate' as const;

  async execute(context: Client<boolean>, oldState: VoiceState, newState: VoiceState): Promise<void> {
    // Ignore non-movement voiceStateUpdate events.
    if (oldState.channelId === newState.channelId) return;

    if (newState.channelId != null && oldState.channelId != null && newState.channelId != oldState.channelId)
      await memberMovedChannel(oldState, newState);
    else if (oldState.channelId == null && newState.channelId != null)
      await memberJoinedChannel(oldState, newState);
    else if (newState.channelId == null && oldState.channelId != null)
      await memberLeftChannel(oldState, newState);
  }
}

export default new VoiceStateUpdateEvent();

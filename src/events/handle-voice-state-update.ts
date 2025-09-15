import { Guild, GuildMember, GuildTextBasedChannel, time, VoiceBasedChannel, VoiceState } from 'discord.js';
import { Database } from '../shared/Database';

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  // The logChannel declaration being inside is purposeful, as this event is fired a lot for users talking.
  if (newState.channelId != null && oldState.channelId != null && newState.channelId != oldState.channelId) {
    const logChannel = await getVoiceLogsChannel(newState.guild);
    if (!logChannel) return;

    await sendMovedMessage(logChannel, newState.member!, oldState.channel!, newState.channel!);
  } else if (oldState.channelId == null && newState.channelId != null) {
    const logChannel = await getVoiceLogsChannel(newState.guild);
    if (!logChannel) return;

    await sendJoinMessage(logChannel, newState.member!, newState.channel!);
  } else if (newState.channelId == null && oldState.channelId != null) {
    const logChannel = await getVoiceLogsChannel(newState.guild);
    if (!logChannel) return;

    await sendLeftMessage(logChannel, newState.member!, oldState.channel!);
  }
}

async function sendJoinMessage(channel: GuildTextBasedChannel, member: GuildMember, voiceChannel: VoiceBasedChannel) {
  await channel.send(`${member} joined ${voiceChannel} at ${time()}`);
}

async function sendLeftMessage(channel: GuildTextBasedChannel, member: GuildMember, voiceChannel: VoiceBasedChannel) {
  await channel.send(`${member} left ${voiceChannel} at ${time()}`);
}

async function sendMovedMessage(channel: GuildTextBasedChannel, member: GuildMember, oldVoiceChannel: VoiceBasedChannel, newVoiceChannel: VoiceBasedChannel) {
  await channel.send(`${member} moved from ${oldVoiceChannel} to ${newVoiceChannel} at ${time()}`);
}

async function getVoiceLogsChannel(guild: Guild): Promise<GuildTextBasedChannel | undefined> {
  const settings = await Database.getGuildSettings(guild.id);

  if (!settings || !settings.voice_logs_channel_id) return;

  const channel = await guild.channels.fetch(settings.voice_logs_channel_id);

  if (!channel || !channel.isSendable()) return;

  return channel as GuildTextBasedChannel;
}
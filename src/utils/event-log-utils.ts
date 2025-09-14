import { APIEmbedField, AttachmentBuilder, EmbedBuilder, Guild, GuildBasedChannel, GuildTextBasedChannel, MessageCreateOptions } from 'discord.js';
import { Message } from '../events';
import { Database } from '../shared/Database';
import { LoggedMessage } from '../types';
import { channelIsInStaffCategory } from './channel-utils';
import { deserializeMessagePart, getModifiedAttachments, getModifiedStickers } from './message-utils';

type CustomEventLogData = {
  title: string
  description: string | null
  color: number | null
  timestamp: Date | number | null
  fields: APIEmbedField[] | null
}

export async function logEdit(loggedMessage: LoggedMessage, newMessage: Message<true>) {
  const channel = await getEventLogChannel(newMessage.guild, newMessage.channel);

  if (!channel) return;

  const includeContentInEmbed = loggedMessage.content.length <= 1024 && newMessage.content.length <= 1024;

  const fields: APIEmbedField[] = [];
  fields.push(...getMainEmbeds(loggedMessage, newMessage));
  fields.push(...getEditEmbeds(loggedMessage, newMessage, includeContentInEmbed));

  const embed = new EmbedBuilder()
    .setTitle('Edited Message')
    .setColor(0xFFFF00)
    .setTimestamp(newMessage.createdTimestamp)
    .addFields(...fields);

  const messagePayload: MessageCreateOptions = { embeds: [embed] };

  if (!includeContentInEmbed) {
    const before = new AttachmentBuilder(Buffer.from(loggedMessage.content), { name: 'before.txt' });
    const after = new AttachmentBuilder(Buffer.from(newMessage.content), { name: 'after.txt' });

    messagePayload.files = [before, after];
  }

  channel.send(messagePayload);
}

export async function logDeletion(loggedMessage: LoggedMessage, deletedMessage: Message<true>) {
  const channel = await getEventLogChannel(deletedMessage.guild, deletedMessage.channel);

  if (!channel) return;

  const includeContentInEmbed = loggedMessage.content.length <= 1024;

  const fields: APIEmbedField[] = [];
  fields.push(...getMainEmbeds(loggedMessage, deletedMessage));
  fields.push(...getDeletedEmbeds(loggedMessage, includeContentInEmbed));

  const embed = new EmbedBuilder()
    .setTitle('Deleted Message')
    .setColor(0xFF0000)
    .setTimestamp(deletedMessage.createdTimestamp)
    .addFields(...fields);

  const messagePayload: MessageCreateOptions = { embeds: [embed] };

  if (!includeContentInEmbed) {
    const before = new AttachmentBuilder(Buffer.from(loggedMessage.content), { name: 'content.txt' });

    messagePayload.files = [before];
  }

  channel.send(messagePayload);
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

function getMainEmbeds(loggedMessage: LoggedMessage, newMessage: Message<true>): APIEmbedField[] {
  const channelString = `${newMessage.channel.toString()}\n${newMessage.channel.name}`;
  const userString = `<@${loggedMessage.author_id}>\n${loggedMessage.author_name}`;

  return [
    {
      name: 'Channel',
      value: channelString,
      inline: true
    },
    {
      name: 'User',
      value: userString,
      inline: true
    },
    {
      name: 'Message',
      value: `[${newMessage.id}](${newMessage.url})`,
      inline: true
    },
  ];
}

function getDeletedEmbeds(loggedMessage: LoggedMessage, includeContentInEmbed = true): APIEmbedField[] {
  const fields: APIEmbedField[] = [];

  if (includeContentInEmbed && loggedMessage.content != '') {
    fields.push({
      name: 'Content',
      value: loggedMessage.content,
      inline: false
    });
  }

  for (const attachment of deserializeMessagePart(loggedMessage.attachments)) {
    fields.push({
      name: 'Attachment',
      value: attachment,
      inline: true
    });
  }

  for (const sticker of deserializeMessagePart(loggedMessage.stickers)) {
    fields.push({
      name: 'Stickers',
      value: sticker,
      inline: true
    });
  }

  return fields;
}

function getEditEmbeds(loggedMessage: LoggedMessage, newMessage: Message<true>, includeContentInEmbed = true): APIEmbedField[] {
  const fields: APIEmbedField[] = [];
  if (includeContentInEmbed && loggedMessage.content != newMessage.content) {
    fields.push(
      {
        name: 'Before',
        value: loggedMessage.content,
        inline: false
      },
      {
        name: 'After',
        value: newMessage.content,
        inline: false
      }
    );
  }

  const { addedAttachments, removedAttachments } = getModifiedAttachments(loggedMessage, newMessage);

  for (const removedAttachment of removedAttachments) {
    fields.push({
      name: 'Removed Attachment',
      value: removedAttachment,
      inline: true
    });
  }

  for (const addedAttachment of addedAttachments) {
    fields.push({
      name: 'Added Attachment',
      value: addedAttachment,
      inline: true
    });
  }

  const { addedStickers, removedStickers } = getModifiedStickers(loggedMessage, newMessage);

  for (const removedSticker of addedStickers) {
    fields.push({
      name: 'Removed Sticker',
      value: removedSticker,
      inline: true
    });
  }

  for (const addedSticker of removedStickers) {
    fields.push({
      name: 'Added Sticker',
      value: addedSticker,
      inline: true
    });
  }

  return fields;
}
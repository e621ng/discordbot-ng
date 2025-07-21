import { APIEmbedField, Channel, EmbedBuilder, Guild, GuildTextBasedChannel, messageLink, TextBasedChannel } from 'discord.js';
import { Database } from '../shared/Database';
import { Message } from '../events';
import { deserializeMessagePart, getModifiedAttachments, getModifiedStickers } from './message-utils';
import { LoggedMessage } from '../types';

type CustomEventLogData = {
  title: string
  description: string | null
  color: number | null
  timestamp: Date | number | null
  fields: APIEmbedField[] | null
}

export async function logEdit(loggedMessage: LoggedMessage, newMessage: Message<true>) {
  const channel = await getEventLogChannel(newMessage.guild, newMessage.channel.parentId);

  if (!channel) return;

  const fields: APIEmbedField[] = [];
  fields.push(...getMainEmbeds(loggedMessage, newMessage));
  fields.push(...getEditEmbeds(loggedMessage, newMessage));

  const embed = new EmbedBuilder()
    .setTitle('Edited Message')
    .setColor(0xFFFF00)
    .setTimestamp(newMessage.createdTimestamp)
    .addFields(...fields);

  channel.send({ embeds: [embed] });
}

export async function logDeletion(loggedMessage: LoggedMessage, deletedMessage: Message<true>) {
  const channel = await getEventLogChannel(deletedMessage.guild, deletedMessage.channel.parentId);

  if (!channel) return;

  const fields: APIEmbedField[] = [];
  fields.push(...getMainEmbeds(loggedMessage, deletedMessage));
  fields.push(...getDeletedEmbeds(loggedMessage));

  const embed = new EmbedBuilder()
    .setTitle('Deleted Message')
    .setColor(0xFF0000)
    .setTimestamp(deletedMessage.createdTimestamp)
    .addFields(...fields);

  channel.send({ embeds: [embed] });
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

async function getEventLogChannel(guild: Guild, parentId: string | null = null): Promise<GuildTextBasedChannel | null> {
  const settings = await Database.getGuildSettings(guild.id);

  if (!settings) return null;

  const staffCategories = await Database.getGuildArraySetting('staff_categories', guild.id);

  if (parentId != null && staffCategories.includes(parentId)) {
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

function getDeletedEmbeds(loggedMessage: LoggedMessage): APIEmbedField[] {
  const fields: APIEmbedField[] = [];

  if (loggedMessage.content != '') {
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

function getEditEmbeds(loggedMessage: LoggedMessage, newMessage: Message<true>): APIEmbedField[] {
  const fields: APIEmbedField[] = [];
  if (loggedMessage.content != newMessage.content) {
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
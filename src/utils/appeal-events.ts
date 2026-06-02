import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder } from 'discord.js';
import { config } from '../config';
import { Appeal, AppealUpdate } from '../types';
import { getAuthor, getColor, getDescription, getFields } from './event-utils';
import { humanizeCapitalization } from './string-utils';
import { Database } from '../shared/Database';

export async function appealUpdateHandler(client: Client, update: string) {
  const data: AppealUpdate = JSON.parse(update);

  if (data.action == 'create') {
    postAppeal(client, data);
  } else {
    updateAppeal(client, data);
  }
}

async function postAppeal(client: Client, data: AppealUpdate) {
  const guildSettings = await Database.getGuildSettings(config.DISCORD_GUILD_ID!);

  if (!guildSettings || !guildSettings.appeals_channel_id) return;

  const channel = await client.channels.fetch(guildSettings.appeals_channel_id);

  if (!channel || !channel.isSendable()) return;

  const appeal = data.appeal;

  const embed = await createEmbedFromAppeal(appeal);

  const row = await getButtons(appeal);

  const message = await channel.send({ embeds: [embed], components: [row] });

  await Database.putAppeal(appeal.id, message.id);
}

async function updateAppeal(client: Client, data: AppealUpdate) {
  const guildSettings = await Database.getGuildSettings(config.DISCORD_GUILD_ID!);

  if (!guildSettings || !guildSettings.appeals_channel_id) return;

  const channel = await client.channels.fetch(guildSettings.appeals_channel_id);

  if (!channel || !channel.isSendable()) return;

  const messageId = await Database.getAppealMessageId(data.appeal.id);

  if (!messageId) return postAppeal(client, data);

  const message = await channel.messages.fetch(messageId);
  const embed = await createEmbedFromAppeal(data.appeal);

  if (!message || message.author.id != config.DISCORD_CLIENT_ID) {
    const newMessage = await channel.send({ embeds: [embed] });
    await Database.removeAppeal(data.appeal.id);
    await Database.putAppeal(data.appeal.id, newMessage.id);
  } else {
    await message.edit({ embeds: [embed] });
  }
}

function getTitle(appeal: Appeal): string {
  if (!appeal.target) return `${humanizeCapitalization(appeal.category)} appeal from ${appeal.user}`;

  switch (appeal.category) {
    case 'flag':
      return `Flag by ${appeal.target}`;
    default:
      return 'Uknown appeal category';
  }
}

function getURL(appeal: Appeal): string {
  return `${config.E621_BASE_URL}/appeals/${appeal.id}`;
}

async function createEmbedFromAppeal(appeal: Appeal): Promise<EmbedBuilder> {
  return new EmbedBuilder()
    .setTitle(getTitle(appeal))
    .setURL(await getURL(appeal))
    .setDescription(await getDescription(appeal))
    .setAuthor(getAuthor(appeal))
    .setColor(getColor(appeal))
    .setFields(...getFields(appeal))
    .setFooter({ text: `Appeal #${appeal.id}` });
}

async function getButtons(appeal: Appeal): Promise<ActionRowBuilder<ButtonBuilder>> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  const primaryButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Link);

  if (appeal.category == 'flag') {
    primaryButton
      .setLabel('Open Flag')
      .setURL(`${config.E621_BASE_URL}/post_flags/${appeal.target_id}`);
  }

  row.addComponents(primaryButton);

  return row;
}
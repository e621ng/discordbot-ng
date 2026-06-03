import { ActionRowBuilder, APIEmbedField, ButtonBuilder, ButtonStyle, Client, DiscordAPIError, EmbedBuilder, Message } from 'discord.js';
import { config } from '../config';
import { Database } from '../shared/Database';
import { Appeal, AppealUpdate, E621Post, PostFlag } from '../types';
import { getAuthor, getColor, getDescription, getFields } from './event-utils';
import { humanizeCapitalization } from './string-utils';
import { getE621Post, getE621PostFlag } from './e621-utils';

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

  const flag = await getE621PostFlag(appeal.target_id);
  const post = await getE621Post(flag!.post_id);

  const embed = await createEmbedFromAppeal(appeal, flag!, post!);

  const row = await getButtons(appeal, flag!, post!);

  const message = await channel.send({ embeds: [embed], components: row.components.length > 0 ? [row] : [] });

  await Database.putAppealOrUpdate(appeal.id, message.id);
}

async function updateAppeal(client: Client, data: AppealUpdate) {
  const guildSettings = await Database.getGuildSettings(config.DISCORD_GUILD_ID!);

  if (!guildSettings || !guildSettings.appeals_channel_id) return;

  const channel = await client.channels.fetch(guildSettings.appeals_channel_id);

  if (!channel || !channel.isSendable()) return;

  const messageId = await Database.getAppealMessageId(data.appeal.id);

  if (!messageId) return postAppeal(client, data);

  let message: Message | undefined;

  try {
    message = await channel.messages.fetch(messageId);
  } catch (e) {
    // Ignore unknown message errors
    if (!(e instanceof DiscordAPIError && e.code == 10008)) {
      throw e;
    }
  }

  if (!message || message.author.id != config.DISCORD_CLIENT_ID) return postAppeal(client, data);

  const flag = await getE621PostFlag(data.appeal.target_id);
  const post = await getE621Post(flag!.post_id);

  const embed = await createEmbedFromAppeal(data.appeal, flag!, post!);
  await message.edit({ embeds: [embed] });
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

function getCustomFields(appeal: Appeal, flag: PostFlag, post: E621Post): APIEmbedField[] {
  return [
    {
      name: 'Deletion Reason',
      value: flag.reason,
      inline: true
    }
  ];
}

async function createEmbedFromAppeal(appeal: Appeal, flag: PostFlag, post: E621Post): Promise<EmbedBuilder> {
  return new EmbedBuilder()
    .setTitle(getTitle(appeal))
    .setURL(await getURL(appeal))
    .setDescription(await getDescription(appeal))
    .setAuthor(getAuthor(appeal))
    .setColor(getColor(appeal))
    .setFields(...getFields(appeal), ...getCustomFields(appeal, flag, post))
    .setFooter({ text: `Appeal #${appeal.id}` });
}

async function getButtons(appeal: Appeal, flag: PostFlag, post: E621Post): Promise<ActionRowBuilder<ButtonBuilder>> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  const primaryButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Link);

  if (appeal.category == 'flag') {
    primaryButton
      .setLabel('Open Flag')
      .setURL(`${config.E621_BASE_URL}/post_flags/${appeal.target_id}`);

    row.addComponents(primaryButton);
  }

  const button = new ButtonBuilder()
    .setLabel('Open Post')
    .setStyle(ButtonStyle.Link)
    .setURL(`${config.E621_BASE_URL}/posts/${post.id}`);

  row.addComponents(button);

  return row;
}
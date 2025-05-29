import { ActionRowBuilder, APIEmbedField, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, MessageActionRowComponentBuilder, time } from 'discord.js';
import { Database } from '../shared/Database';
import { Warning } from '../types';

type MessageContent = { content: string, components: ActionRowBuilder<ButtonBuilder>[] };

const WARNINGS_PER_PAGE = 5;

function getWarningText(warning: Warning): string {
  const timestamp = time(new Date(warning.timestamp));

  return `### Warning from <@${warning.mod_id}> (${timestamp}):\n${warning.reason}`;
}

export async function getWarningMessage(userId: string, page: number): Promise<MessageContent | null> {
  const warnings = await Database.getWarnings(userId);

  page = page - 1;

  const maxPage = Math.floor(warnings.length / WARNINGS_PER_PAGE);

  if (warnings.length == 0) return null;

  const warningTexts: string[] = [];

  for (let i = page * WARNINGS_PER_PAGE; i < page * WARNINGS_PER_PAGE + WARNINGS_PER_PAGE; i++) {
    if (i >= warnings.length) break;

    warningTexts.push(getWarningText(warnings[i]));
  }

  const prevPage = new ButtonBuilder()
    .setLabel('Previous Page')
    .setCustomId(`warning-previous_${userId}_${page + 1}`)
    .setDisabled(page == 0)
    .setStyle(ButtonStyle.Primary);

  const nextPage = new ButtonBuilder()
    .setLabel('Next Page')
    .setCustomId(`warning-next_${userId}_${page + 1}`)
    .setDisabled(page >= maxPage)
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(prevPage, nextPage);

  return {
    content: `<@${userId}>'s Warnings\n` + warningTexts.join('\n\n') + `\n\n-# Page ${page + 1}/${maxPage + 1}`,
    components: [row]
  };
}
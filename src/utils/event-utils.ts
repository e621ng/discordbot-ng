import { APIEmbedField, EmbedAuthorOptions } from 'discord.js';
import { config } from '../config';
import { parseDTextToMarkdown } from './dtext-utils';

const MAX_DESCRIPTION_LENGTH = 1024;

export async function parseMarkdownToField(input: string): Promise<string> {
  const text = await parseDTextToMarkdown(input);
  return text.length >= MAX_DESCRIPTION_LENGTH ? text.slice(0, MAX_DESCRIPTION_LENGTH - 3) + '...' : text;
}

export function getAuthor(data: { user_id: number, user: string }): EmbedAuthorOptions {
  return {
    url: `${config.E621_BASE_URL}/users/${data.user_id}`,
    name: data.user
  };
}

export function getColor(data: { claimant: string | null }): number {
  if (!data.claimant) {
    return 0xff0000;
  } else {
    return 0x00ffff;
  }
}

export function getFields(data: { category: string, status: string, claimant: string | null }): APIEmbedField[] {
  return [
    {
      name: 'Type',
      value: data.category,
      inline: true
    },
    {
      name: 'Status',
      value: data.status,
      inline: true
    },
    {
      name: 'Claimed By',
      value: !data.claimant ? '<Unclaimed>' : data.claimant,
      inline: true
    }
  ];
}
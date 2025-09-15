import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Guild } from 'discord.js';
import { config } from '../config';
import { E621User, MessageContent, Record, RecordCategory } from '../types';
import { comprehensiveAltLookupFromDiscord, e621IdsFromAltData } from './alt-utils';
import { getE621User, getUserRecords } from './e621-utils';

type RecordWithUserData = Record & { user: E621User, creator: E621User, updater: E621User }
type AllRecords = RecordWithUserData[];

const RECORDS_PER_PAGE = 5;

export async function getAllRecordsFromDiscordId(id: string, guild: Guild): Promise<AllRecords> {
  const altData = await comprehensiveAltLookupFromDiscord(id, guild);
  const userCache: Map<number, E621User> = new Map();

  const allRecords: AllRecords = [];

  const e621UserIds = e621IdsFromAltData(altData);

  for (const id of e621UserIds) {
    const user = userCache.get(id) ?? await getE621User(id);
    if (!user) continue;
    userCache.set(id, user);

    const records = await getUserRecords(id);
    for (const record of records) {
      const creator = userCache.get(record.creator_id) ?? await getE621User(record.creator_id);
      if (!creator) continue;
      userCache.set(record.creator_id, creator);

      const updater = userCache.get(record.updater_id) ?? await getE621User(record.updater_id);
      if (!updater) continue;
      userCache.set(record.updater_id, updater);

      allRecords.push({
        user,
        creator,
        updater,
        ...record
      });
    }
  }

  return allRecords;
}

export async function getRecordMessageFromDiscordId(id: string, page: number, guild: Guild): Promise<MessageContent | null> {
  const records = await getAllRecordsFromDiscordId(id, guild);

  if (records.length == 0) return null;

  page = page - 1;

  const maxPage = Math.floor(records.length / RECORDS_PER_PAGE);

  const embeds: EmbedBuilder[] = [];

  for (let i = page * RECORDS_PER_PAGE; i < page * RECORDS_PER_PAGE + RECORDS_PER_PAGE; i++) {
    if (i >= records.length) break;

    embeds.push(getRecordEmbed(records[i]));
  }

  const prevPage = new ButtonBuilder()
    .setLabel('Previous Page')
    .setCustomId(`records-previous_${id}_${page + 1}`)
    .setDisabled(page == 0)
    .setStyle(ButtonStyle.Primary);

  const nextPage = new ButtonBuilder()
    .setLabel('Next Page')
    .setCustomId(`records-next_${id}_${page + 1}`)
    .setDisabled(page >= maxPage)
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(prevPage, nextPage);

  return { content: `Records found for <@${id}>`, embeds, components: [row] };
}

function getRecordColor(category: RecordCategory) {
  switch (category) {
    case 'positive': return 0x00ff00;
    case 'negative': return 0xff0000;
    case 'neutral': return 0xaaaaaa;
  }
}

function getRecordEmbed(record: RecordWithUserData): EmbedBuilder {
  const isUpdated = record.updated_at != record.created_at;
  const creator = isUpdated ? record.updater : record.creator;
  return new EmbedBuilder()
    .setColor(getRecordColor(record.category))
    .setTitle(`Record from ${record.creator.name} for ${record.user.name}`)
    .setDescription(record.body.trim())
    .setURL(`${config.E621_BASE_URL}/user_feedbacks/${record.id}`)
    .setAuthor({
      name: `${isUpdated ? 'Last updated by' : 'Created by'}: ${creator.name}`,
      url: `${config.E621_BASE_URL}/users/${creator.id}`
    })
    .setTimestamp(new Date(record.updated_at));
}
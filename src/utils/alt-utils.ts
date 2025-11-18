import { Guild } from 'discord.js';
import { Database } from '../shared/Database';
import { userIsBanned } from './e621-utils';
import { config } from '../config';

export type AltData = {
  type: 'e621' | 'discord'
  thisId: number | string
  banned: boolean
  alts: AltData[]
};


export async function getE621Alts(discordId: string, guild: Guild, depth = 1, ignore: number[] = []): Promise<string> {
  const e621UserIds = await Database.getE621Ids(discordId);

  const toIgnore = ignore.concat(e621UserIds);

  let content = '';

  for (const e621Id of e621UserIds) {
    if (ignore.includes(e621Id)) continue;

    const alts = await getDiscordAlts(e621Id, guild, depth + 1, toIgnore);

    const banned = await userIsBanned(e621Id);

    content += `${' '.repeat((depth - 1) * 2)}- ${config.E621_BASE_URL}/users/${e621Id}${banned ? ' [BANNED]' : ''}\n${alts}`;
  }

  return content;
}

export async function getDiscordAlts(e621Id: number, guild: Guild, depth = 1, ignore: number[] = []): Promise<string> {
  const discordIds = await Database.getDiscordIds(e621Id);

  let content = '';

  for (const discordId of discordIds) {
    const alts = await getE621Alts(discordId, guild, depth + 1, ignore);

    let banned = false;

    // It's either this or fetch all the bans and sift through them for every discord alt.
    try {
      banned = !!(await guild.bans.fetch(discordId));
    } catch (e) { }

    content += `${' '.repeat((depth - 1) * 2)}- <@${discordId}> (${discordId})${banned ? ' [BANNED]' : ''}\n${alts}`;
  }

  return content;
}

export async function comprehensiveAltLookupFromDiscord(discordId: string, guild: Guild | null): Promise<AltData> {
  return getE621AltData(discordId, guild);
}

export async function comprehensiveAltLookupFromE621(e621Id: number, guild: Guild | null): Promise<AltData> {
  return getDiscordAltData(e621Id, guild);
}

async function getE621AltData(discordId: string, guild: Guild | null, depth = 1, ignore: number[] = []): Promise<AltData> {
  const e621UserIds = await Database.getE621Ids(discordId);

  const toIgnore = ignore.concat(e621UserIds);

  let banned = false;

  // It's either this or fetch all the bans and sift through them for every discord alt.
  try {
    banned = guild ? !!(await guild.bans.fetch(discordId)) : false;
  } catch (e) { }

  const data: AltData = { type: 'discord', thisId: discordId, banned, alts: [] };

  for (const e621Id of e621UserIds) {
    if (ignore.includes(e621Id)) continue;

    data.alts.push(await getDiscordAltData(e621Id, guild, depth + 1, toIgnore));
  }

  return data;
}

async function getDiscordAltData(e621Id: number, guild: Guild | null, depth = 1, ignore: number[] = []): Promise<AltData> {
  const discordIds = await Database.getDiscordIds(e621Id);

  const data: AltData = { type: 'e621', thisId: e621Id, banned: await userIsBanned(e621Id), alts: [] };

  for (const discordId of discordIds) {
    data.alts.push(await getE621AltData(discordId, guild, depth + 1, ignore));
  }

  return data;
}

export function e621IdsFromAltData(altData: AltData, data: number[] = []) {
  if (altData.type == 'e621' && !data.includes(altData.thisId as number)) data.push(altData.thisId as number);

  for (const alt of altData.alts) {
    e621IdsFromAltData(alt, data);
  }

  return data;
}
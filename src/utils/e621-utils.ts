import { Guild } from 'discord.js';
import { config } from '../config';
import { E621Post, E621User } from '../types';
import { Database } from '../shared/Database';

const BLACKLISTED_TAGS: string[] = [];
const BLACKLISTED_NONSAFE_TAGS: string[] = ['young'];

const USER_AGENT = 'E621DiscordBot';
const E621_NAME_URL = `${config.E621_BASE_URL}/users/{idOrName}.json`;
const E621_POST_URL = `${config.E621_BASE_URL}/posts/{id}.json`;
const E621_MD5_POST_URL = `${config.E621_BASE_URL}/posts.json?md5={md5}`;

export async function getE621User(idOrName: string | number): Promise<E621User | null> {
  const res = await fetch(E621_NAME_URL.replace('{idOrName}', idOrName.toString()), {
    headers: {
      'User-Agent': USER_AGENT
    }
  });

  if (!res.ok) return null;

  return await res.json() as E621User;
}

export async function getE621Post(id: string | number): Promise<E621Post | null> {
  const res = await fetch(E621_POST_URL.replace('{id}', id.toString()), {
    headers: {
      'User-Agent': USER_AGENT
    }
  });

  if (!res.ok) return null;

  return (await res.json() as { post: E621Post }).post as E621Post;
}

export async function getE621PostByMd5(md5: string): Promise<E621Post | null> {
  const res = await fetch(E621_MD5_POST_URL.replace('{md5}', md5), {
    headers: {
      'User-Agent': USER_AGENT
    }
  });

  if (!res.ok) return null;

  return (await res.json() as { post: E621Post }).post as E621Post;
}

export function hasBlacklistedTags(post: E621Post): boolean {
  for (const tags of Object.values(post.tags)) {
    if (tags.some(t => BLACKLISTED_TAGS.includes(t))) return true;
    if (post.rating != 's' && tags.some(t => BLACKLISTED_NONSAFE_TAGS.includes(t))) return true;
  }

  return false;
}

export function getPostUrl(post: E621Post): string {
  if (post.rating == 's') return `${config.E926_BASE_URL}/post/${post.id}`;
  return `${config.E621_BASE_URL}/post/${post.id}`;
}

export async function userIsBanned(idOrName: string | number): Promise<boolean> {
  const user = await getE621User(idOrName);
  return user?.is_banned ?? false;
}

type AltData = {
  type: 'e621' | 'discord'
  thisId: number | string
  banned: boolean
  alts: AltData[]
};

export async function comprehensiveAltLookupFromDiscord(discordId: string, guild: Guild): Promise<AltData> {
  return getE621Alts(discordId, guild);
}

export async function comprehensiveAltLookupFromE621(e621Id: number, guild: Guild): Promise<AltData> {
  return getDiscordAlts(e621Id, guild);
}

async function getE621Alts(discordId: string, guild: Guild, depth = 1, ignore: number[] = []): Promise<AltData> {
  const e621UserIds = await Database.getE621Ids(discordId);

  const toIgnore = ignore.concat(e621UserIds);

  let banned = false;

  // It's either this or fetch all the bans and sift through them for every discord alt.
  try {
    banned = !!(await guild.bans.fetch(discordId));
  } catch (e) { }

  const data: AltData = { type: 'discord', thisId: discordId, banned, alts: [] };

  for (const e621Id of e621UserIds) {
    if (ignore.includes(e621Id)) continue;

    data.alts.push(await getDiscordAlts(e621Id, guild, depth + 1, toIgnore));
  }

  return data;
}

async function getDiscordAlts(e621Id: number, guild: Guild, depth = 1, ignore: number[] = []): Promise<AltData> {
  const discordIds = await Database.getDiscordIds(e621Id);

  const data: AltData = { type: 'e621', thisId: e621Id, banned: await userIsBanned(e621Id), alts: [] };

  for (const discordId of discordIds) {
    data.alts.push(await getE621Alts(discordId, guild, depth + 1, ignore));
  }

  return data;
}
import { Guild } from 'discord.js';
import { config } from '../config';
import { E621Post, E621User, Record } from '../types';
import { Database } from '../shared/Database';

const BLACKLISTED_TAGS: string[] = [];
const BLACKLISTED_NONSAFE_TAGS: string[] = ['young'];

const USER_AGENT = 'E621DiscordBot';

async function request(path: string, query?: { [name: string]: string }): Promise<any> {
  const url = new URL(config.E621_BASE_URL!);
  url.pathname = path + '.json';

  if (query) {
    for (const [name, value] of Object.entries(query)) {
      url.searchParams.set(name, value);
    }
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT
    }
  });

  if (!res.ok) return null;

  return await res.json();
}

export async function getE621User(idOrName: string | number): Promise<E621User | null> {
  return await request(`/users/${idOrName}`) as E621User;
}

export async function getE621Post(id: string | number): Promise<E621Post | null> {
  return (await request(`/posts/${id}`)).post as E621Post;
}

export async function getE621PostByMd5(md5: string): Promise<E621Post | null> {
  return (await request('/posts', { md5 })).post as E621Post;
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

export async function getUserRecords(id: number): Promise<Record[]> {
  const records = await request('/user_feedbacks', { 'search[user_id]': id.toString() });

  if (records.user_feedbacks) return [];

  return records as Record[];
}
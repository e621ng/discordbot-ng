import { config } from '../config';
import { E621Post, E621User, Record } from '../types';

const BLACKLISTED_TAGS: string[] = [];
const BLACKLISTED_NONSAFE_TAGS: string[] = ['young'];

const SPOILERED_TAGS: string[] = ['gore', 'feces', 'watersports'];
const SPOILERED_NONSAFE_TAGS: string[] = [];

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
  return (await request(`/posts/${id}`))?.post as E621Post ?? null;
}

export async function getE621PostByMd5(md5: string): Promise<E621Post | null> {
  return (await request('/posts', { md5 }))?.post as E621Post ?? null;
}

export const enum PostAction {
  NoAction = 0,
  Spoiler = 1,
  Blacklist = 2
}

export function spoilerOrBlacklist(post: E621Post): { action: PostAction, tag: string } {
  const tags = Object.values(post.tags).flat();

  for (const tag of tags) {
    if (BLACKLISTED_TAGS.includes(tag)) return { action: PostAction.Blacklist, tag };
    if (post.rating != 's' && BLACKLISTED_NONSAFE_TAGS.includes(tag)) return { action: PostAction.Blacklist, tag };
  }

  for (const tag of tags) {
    if (SPOILERED_TAGS.includes(tag)) return { action: PostAction.Spoiler, tag };
    if (post.rating != 's' && SPOILERED_NONSAFE_TAGS.includes(tag)) return { action: PostAction.Spoiler, tag };
  }

  return { action: PostAction.NoAction, tag: '' };
}

export function getPostUrl(post: E621Post): string {
  if (post.rating == 's') return `${config.E926_BASE_URL}/posts/${post.id}`;
  return `${config.E621_BASE_URL}/posts/${post.id}`;
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
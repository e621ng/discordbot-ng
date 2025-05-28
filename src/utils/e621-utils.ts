import { config } from '../config';
import { E621Post, E621User } from '../types';

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
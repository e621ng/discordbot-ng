import { Client, User } from 'discord.js';

export async function resolveUser(client: Client, value: string): Promise<User | null | undefined> {
  let user: User | null | undefined = null;

  try {
    user = await client.users.fetch(value);
  } catch (e) {
    user = client.users.cache.find(u => u.username == value);
  }

  return user;
}
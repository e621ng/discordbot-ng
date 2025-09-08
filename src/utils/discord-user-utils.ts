import { Client, Guild, User } from 'discord.js';

export async function resolveUser(client: Client, value: string, guild: Guild | null = null): Promise<User | null | undefined> {
  let user: User | null | undefined = null;

  try {
    user = await client.users.fetch(value);
  } catch {
    user = client.users.cache.find(u => u.username == value);

    if (!user && guild) {
      user = guild.members.cache.find(m => m.displayName == value)?.user;

      if (!user) {
        try {
          const users = await guild.members.fetch({
            query: value
          });

          if (users.size > 0) user = users.first()!.user;
        } catch { }
      }
    }
  }

  return user;
}
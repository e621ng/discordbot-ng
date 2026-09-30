import { Client, Guild } from 'discord.js';
import { Database } from '../../shared/Database';
import { Event } from '../../types';

class GuildCreateEvent implements Event<Client, 'guildCreate'> {
  event = 'guildCreate' as const;

  async execute(context: Client<boolean>, guild: Guild): Promise<void> {
    await Database.getOrCreateSettings(guild.id);
  }
}

export default new GuildCreateEvent();

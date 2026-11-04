import { Client, Guild } from 'discord.js';
import { config } from '../../config';
import { Database } from '../../shared/Database';
import { Event } from '../../types';

class GuildCreateEvent implements Event<Client, 'guildCreate'> {
  event = 'guildCreate' as const;

  async execute(context: Client<boolean>, guild: Guild): Promise<void> {
    if (guild.id != config.DISCORD_GUILD_ID) {
      await guild.leave();
      return;
    }

    await Database.getOrCreateSettings(guild.id);
  }
}

export default new GuildCreateEvent();

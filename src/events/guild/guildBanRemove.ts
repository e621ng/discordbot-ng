import { Client, GuildBan } from 'discord.js';
import { Database } from '../../shared/Database';
import { Event } from '../../types';

class GuildBanRemoveEvent implements Event<Client, 'guildBanRemove'> {
  event = 'guildBanRemove' as const;

  async execute(context: Client<boolean>, ban: GuildBan): Promise<void> {
    await Database.removeBan(ban.user.id);
  }
}

export default new GuildBanRemoveEvent();

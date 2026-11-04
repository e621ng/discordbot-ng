import { Client } from 'discord.js';
import { config } from '../../config';
import { Event } from '../../types';

class ClientReadyEvent implements Event<Client, 'clientReady'> {
  event = 'clientReady' as const;

  async execute(context: Client<boolean>): Promise<void> {
    for (const guild of context.guilds.cache.values()) {
      if (guild.id != config.DISCORD_GUILD_ID) await guild.leave();
    }
  }
}

export default new ClientReadyEvent();

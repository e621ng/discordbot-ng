import { Client, GuildTextBasedChannel, Message, OmitPartialGroupDMChannel, PartialMessage, ReadonlyCollection } from 'discord.js';
import { Database } from '../../shared/Database';
import { Event } from '../../types';
import { logDeletion } from '../../utils';

class MessageDeleteBulkEvent implements Event<Client, 'messageDeleteBulk'> {
  event = 'messageDeleteBulk' as const;

  async execute(context: Client<boolean>, messages: ReadonlyCollection<string, Message | OmitPartialGroupDMChannel<PartialMessage>>, channel: GuildTextBasedChannel): Promise<void> {
    for (const message of messages.values()) {
      const loggedMessage = await Database.getMessageWithRetry(message.id);
      if (!loggedMessage) continue;

      await Database.removeMessge(message.id);
      if (message.inGuild()) await logDeletion(loggedMessage, message);
    }
  }
}

export default new MessageDeleteBulkEvent();

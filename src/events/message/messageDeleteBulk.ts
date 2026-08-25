import { GuildTextBasedChannel, Message, OmitPartialGroupDMChannel, PartialMessage, ReadonlyCollection } from 'discord.js';
import { Database } from '../../shared/Database';
import { logDeletion } from '../../utils';

export default {
  event: 'messageDeleteBulk',

  handler: async (messages: ReadonlyCollection<string, Message | OmitPartialGroupDMChannel<PartialMessage>>, channel: GuildTextBasedChannel) => {
    for (const message of messages.values()) {
      const loggedMessage = await Database.getMessageWithRetry(message.id);
      if (!loggedMessage) continue;

      await Database.removeMessge(message.id);

      if (message.inGuild()) await logDeletion(loggedMessage, message);
    }
  }
};

import { Client, Message, PartialMessage } from 'discord.js';
import { Database } from '../../shared/Database';
import { Event } from '../../types';
import { logDeletion } from '../../utils';

class MessageDeleteEvent implements Event<Client, 'messageDelete'> {
  event = 'messageDelete' as const;

  async execute(context: Client<boolean>, message: Message | PartialMessage): Promise<void> {
    const loggedMessage = await Database.getMessageWithRetry(message.id);
    if (!loggedMessage) return;

    await Database.removeMessge(message.id);

    if (message.inGuild()) await logDeletion(loggedMessage, message);
  }
}

export default new MessageDeleteEvent();

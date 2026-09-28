import { Client, PartialMessage } from 'discord.js';
import { config } from '../../config';
import { Database } from '../../shared/Database';
import { Event } from '../../types';
import { isEdited, logEdit, Message, regexTesters, uniqueRegexMatches } from '../../utils';

class MessageUpdateEvent implements Event<Client, 'messageUpdate'> {
  event = 'messageUpdate' as const;

  async execute(context: Client<boolean>, oldMessage: Message | PartialMessage, newMessage: Message): Promise<void> {
    if (newMessage.author.bot) return;

    const loggedMessage = await Database.getMessageWithRetry(newMessage.id);

    if (!loggedMessage) {
      if (newMessage.inGuild()) await Database.putMessage(newMessage);
      return;
    }

    if (newMessage.inGuild() && isEdited(loggedMessage, newMessage)) {
      await Database.putMessage(newMessage);
      await logEdit(loggedMessage, newMessage);
    }

    if (loggedMessage.content == newMessage.content) return;

    const responses: string[] = [];

    for (const test of regexTesters) {
      if (config.DEV_MODE && !test.runInDev) continue;

      const hasMatches = test.regex.test(newMessage.content);
      test.regex.lastIndex = 0;

      if (!hasMatches) continue;

      const oldMatches: RegExpExecArray[] = [];
      const newMatches: RegExpExecArray[] = [];
      let match: RegExpExecArray | null;

      while ((match = test.regex.exec(newMessage.content)) != null) newMatches.push(match);
      test.regex.lastIndex = 0;

      while ((match = test.regex.exec(loggedMessage.content)) != null) oldMatches.push(match);
      test.regex.lastIndex = 0;

      const properMatches: RegExpExecArray[] = [];

      for (const newMatch of newMatches) {
        if (!oldMatches.find(m => m[1] == newMatch[1])) properMatches.push(newMatch);
      }

      if (properMatches.length == 0) continue;
      const response = await test.handler(newMessage, properMatches.filter(uniqueRegexMatches));

      if (response === false) return;
      if (response !== true) responses.push(response as string);
    }

    if (responses.length > 0) {
      await newMessage.reply(responses.join('\n'));
    }
  }
}

export default new MessageUpdateEvent();

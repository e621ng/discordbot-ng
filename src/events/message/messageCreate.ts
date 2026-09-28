import { Client } from 'discord.js';
import { config } from '../../config';
import { Database } from '../../shared/Database';
import { Event } from '../../types';
import { ALLOWED_MIMETYPES, blacklistIfNecessary, calculateMD5FromURL, getE621PostByMd5, getPostUrl, md5Regex, Message, regexTesters, uniqueRegexMatches } from '../../utils';

class MessageCreateEvent implements Event<Client, 'messageCreate'> {
  event = 'messageCreate' as const;

  async execute(context: Client<boolean>, message: Message): Promise<void> {
    if (message.author.bot) return;
    if (message.inGuild()) await Database.putMessage(message);

    const responses: string[] = [];

    for (const test of regexTesters) {
      if (config.DEV_MODE && !test.runInDev) continue;

      const hasMatches = test.regex.test(message.content);
      test.regex.lastIndex = 0;

      if (hasMatches) {
        const matches: RegExpExecArray[] = [];
        let match: RegExpExecArray | null;

        while ((match = test.regex.exec(message.content)) != null) {
          matches.push(match);
        }
        test.regex.lastIndex = 0;

        const response = await test.handler(message, matches.filter(uniqueRegexMatches));

        if (response === false) return;

        if (response !== true) responses.push(response as string);
      }
    }

    for (const attachment of message.attachments.values()) {
      const match = md5Regex.exec(attachment.name);
      md5Regex.lastIndex = 0;

      const md5s: string[] = [];

      if (match) md5s.push(match[1]);
      else if (ALLOWED_MIMETYPES.includes(attachment.contentType!)) {
        const md5Data = await calculateMD5FromURL(attachment.url);
        if (!md5Data) continue;
        md5s.push(md5Data.correctedFileMD5, md5Data.originalFileMD5);
      }

      if (md5s.length == 0) continue;

      for (const md5 of md5s) {
        const post = await getE621PostByMd5(md5, false);

        if (post) {
          if (await blacklistIfNecessary(message, [post])) return;

          responses.push(`<${getPostUrl(post)}>`);

          continue;
        }
      }
    }

    if (responses.length > 0) {
      await message.reply(responses.join('\n'));
    }
  }
}

export default new MessageCreateEvent();

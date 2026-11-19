import { Client, DiscordAPIError } from 'discord.js';
import { config } from '../../config';
import { Database } from '../../shared/Database';
import { Event } from '../../types';
import { ALLOWED_MIMETYPES, blacklistIfNecessary, calculateMD5FromURL, getE621PostByMd5, getPostUrl, md5Regex, Message, regexTesters, SetSeverity, uniqueRegexMatches } from '../../utils';

// TODO: Once commands have been converted to classes, this will receive
// its own file and event handler to avoid blocking the main handler.
async function handleHoneypot(context: Client<boolean>, message: Message): Promise<boolean> {
  if (!message.inGuild()) return false;

  const settings = await Database.getOrCreateSettings(message.guildId);
  if (!settings.honeypot_channel_id || message.channelId !== settings.honeypot_channel_id) return false;

  try {
    const guild = await context.guilds.fetch(message.guildId);
    const member = await guild.members.fetch(message.author.id);
    const immuneRoles = await Database.getGuildArraySetting('honeypot_role_ids', message.guildId);
    if (!member.bannable || immuneRoles.some(roleId => member.roles.cache.has(roleId))) return true;

    // Delete messages within 30 seconds of the ban. This does an okay job at cleanup.
    await member.ban({ reason: "Banned by Honeypot. This ban doesn't expire.", deleteMessageSeconds: 30 });
    await Database.putBan(member.id, null);
    return true;
  } catch (error: Error | any) {
    if (error instanceof DiscordAPIError[10007]) return true;
    console.log('An error occurred while handling a honeypot action: ', error);

    if (!settings.moderator_channel_id) return true;

    try {
      const guild = await context.guilds.fetch(message.guildId);
      const modChannel = await guild.channels.fetch(settings.moderator_channel_id);
      if (!modChannel || !modChannel.isSendable()) return true;

      await message.forward(modChannel.id);
      await modChannel.send({
        embeds: [{
          ...SetSeverity('error'),
          title: 'Honeypot | Error',
          description: `I was unable to ban ${message.author}. Please review the message above in <#${settings.honeypot_channel_id}>.`,
        }],
      });
    } catch (error: Error | any) {
      console.log('An error occurred while trying to send a mod notification: ', error);
    }

    return true;
  }
}

class MessageCreateEvent implements Event<Client, 'messageCreate'> {
  event = 'messageCreate' as const;

  async execute(context: Client<boolean>, message: Message): Promise<void> {
    if (message.author.bot) return;
    if (await handleHoneypot(context, message)) return; // If true, don't bother handling the message.

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
